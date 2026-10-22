#!/usr/bin/env node
// company-brain script. Node built-ins only. Run from the brain root (the folder holding AGENTS.md and _system/brain.config.json).
//
//   node brain.mjs brief                       session briefing: stale docs, inbox, loops due, last review, health summary
//   node brain.mjs health [--json] [--strict]  structural checks; --strict exits 1 on any error
//   node brain.mjs stale [--json]              living documents past review_due, by owner
//   node brain.mjs links [--json]              broken wikilinks
//   node brain.mjs orphans [--json]            notes with fewer than 2 outgoing links
//   node brain.mjs tags [--json]               unregistered, missing, malformed tags
//   node brain.mjs ratio                       Input : Knowledge ratio
//   node brain.mjs index [--write]             regenerate _system/indices/*.md (prints a diff summary; --write applies)
//   node brain.mjs new <type> "Title" [--project P] [--owner O] [--domain D]   scaffold a note from _system/templates
//   node brain.mjs verify <note path or title> [--by "[[Person]]"]            owner verified: set last_verified, bump review_due
//   node brain.mjs log <op> "title" [--actor name]                              append a line to _system/log.md
//   node brain.mjs run <automation>            print the full prompt of _system/automations/<automation>.md with mode and scope
//   node brain.mjs search "query" [--limit N]  index-first search: indices, titles, aliases, then content
//   node brain.mjs metrics [--json]            weekly numbers for the review
//   node brain.mjs guard                       PreToolUse hook (stdin JSON): refuse root files, archive edits, read-only edits, secrets
//   node brain.mjs lint-file                   PostToolUse hook (stdin JSON): frontmatter advice on the written note
//
// Options: --root <dir> sets the brain root (default: cwd, or the nearest parent holding _system/brain.config.json).

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const argv0 = process.argv.slice(2);
const ri = argv0.indexOf('--root');
const ROOT_OPT = ri >= 0 ? argv0[ri + 1] : undefined;
const argv = ri >= 0 ? argv0.filter((_, i) => i !== ri && i !== ri + 1) : argv0;
const cmd = argv[0];
const args = argv.slice(1);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : undefined; };
const flag = (name) => args.includes(name);
const positional = () => args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && opt(args[i - 1]) === a));

function findRoot(start) {
  let dir = path.resolve(start);
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(dir, '_system', 'brain.config.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
const ROOT = ROOT_OPT ? path.resolve(ROOT_OPT) : findRoot(process.cwd());
const today = () => new Date().toISOString().slice(0, 10);
const DAY = 86400000;

// ---------- config ----------
const DEFAULT_CONFIG = {
  company: 'Company', language: 'en',
  root_allowlist: ['AGENTS.md', 'CLAUDE.md', 'README.md', 'CODEOWNERS', 'LICENSE'],
  readonly: ['Input/Meetings/Granola/**', 'Input/**/Raw/**', '.archive/**'],
  living_docs: ['Knowledge/Company/**', 'Resources/Playbooks/**', 'Resources/Policies/**', 'Active/Projects/*/*.md', 'Active/Goals/**'],
  review_cadence_days: { 'type/living': 90, 'type/playbook': 180, 'type/policy': 365, 'type/project': 14, 'type/goal': 90, 'type/index': 30 },
  moc_threshold: 50, input_knowledge_ratio_warn: 2.0, max_rules: 8, max_agent_memory_lines: 40,
  secret_patterns: ['(?i)(api[_-]?key|secret|token|password)\\s*[:=]\\s*[\'"]?[A-Za-z0-9_\\-]{16,}', 'sk-[A-Za-z0-9]{20,}', 'ghp_[A-Za-z0-9]{30,}', 'xox[baprs]-[A-Za-z0-9-]{10,}', 'AKIA[0-9A-Z]{16}', '-----BEGIN [A-Z ]*PRIVATE KEY-----'],
};
function loadConfig() {
  if (!ROOT) return DEFAULT_CONFIG;
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(path.join(ROOT, '_system', 'brain.config.json'), 'utf8')) }; }
  catch { return DEFAULT_CONFIG; }
}
const CFG = loadConfig();

// ---------- glob (minimal: **, *, ?) ----------
function globToRegex(glob) {
  let re = '^';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') { re += (glob[i + 2] === '/') ? '(?:.*/)?' : '.*'; i += (glob[i + 2] === '/') ? 2 : 1; }
      else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else if ('.+^$()[]{}|\\'.includes(c)) re += '\\' + c;
    else re += c;
  }
  return new RegExp(re + '$');
}
const matchesAny = (rel, globs) => (globs || []).some((g) => globToRegex(g).test(rel));

// ---------- files ----------
const SKIP_DIRS = new Set(['.git', '.obsidian', '.claude', '.codex', '.trash', 'node_modules', '.claudian', '.agents']);
function walk(dir, out = [], rel = '') {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(path.join(dir, e.name), out, r);
    else if (e.isFile() && e.name.endsWith('.md')) out.push(r);
  }
  return out;
}
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const isArchived = (rel) => rel.startsWith('.archive/');

// ---------- frontmatter (YAML subset: scalars, lists, quoted wikilinks) ----------
function parseFrontmatter(text) {
  if (!text.startsWith('---')) return { fm: {}, body: text, raw: '' };
  const end = text.indexOf('\n---', 3);
  if (end < 0) return { fm: {}, body: text, raw: '' };
  const raw = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^\r?\n/, '');
  const fm = {};
  let key = null;
  for (const line of raw.split('\n')) {
    if (/^\s*#/.test(line) || !line.trim()) continue;
    const list = line.match(/^\s+-\s*(.*)$/);
    if (list && key) { if (!Array.isArray(fm[key])) fm[key] = []; fm[key].push(unq(list[1])); continue; }
    const kv = line.match(/^([A-Za-z0-9_\-;/]+):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      const v = kv[2].trim();
      if (v === '') fm[key] = null;
      else if (v.startsWith('[') && v.endsWith(']')) fm[key] = v.slice(1, -1).split(',').map((s) => unq(s.trim())).filter(Boolean);
      else fm[key] = unq(v);
    }
  }
  return { fm, body, raw };
}
function unq(s) { s = String(s).trim(); if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1); return s; }
const asList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const tagsOf = (fm) => asList(fm.tags).map((t) => String(t).replace(/^#/, '').trim()).filter(Boolean);
const typeOf = (fm) => tagsOf(fm).find((t) => t.startsWith('type/')) || null;

// ---------- links ----------
function stripCode(body) { return body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, ''); }
function wikilinks(text) {
  const out = [];
  const re = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
  let m;
  while ((m = re.exec(text))) { const t = m[1].trim(); if (t && !/^\{\{/.test(t) && t !== 'wikilink' && t !== 'Note' && t !== 'Person' && t !== 'note' && t !== 'Project') out.push(t); }
  return out;
}
function buildNameIndex(files) {
  const byName = new Map(); // base name (no .md) -> [rel]
  const byPath = new Set(files.map((f) => f.replace(/\.md$/, '')));
  const aliases = new Map();
  for (const f of files) {
    const base = path.basename(f, '.md');
    if (!byName.has(base)) byName.set(base, []);
    byName.get(base).push(f);
  }
  return { byName, byPath, aliases };
}
function resolveLink(target, idx) {
  const t = target.replace(/\.md$/, '');
  if (idx.byPath.has(t)) return true;
  if (idx.byName.has(path.basename(t))) return true;
  if (idx.aliases.has(t)) return true;
  if (/\.(base|canvas|png|jpg|jpeg|svg|pdf|excalidraw)$/i.test(target)) return true;
  return false;
}

// ---------- notes model ----------
function loadNotes() {
  const files = walk(ROOT);
  const notes = [];
  for (const rel of files) {
    let text = '';
    try { text = read(rel); } catch { continue; }
    const { fm, body, raw } = parseFrontmatter(text);
    notes.push({ rel, fm, body, raw, text, tags: tagsOf(fm), type: typeOf(fm), links: wikilinks(stripCode(body)) });
  }
  const idx = buildNameIndex(files);
  for (const n of notes) for (const a of asList(n.fm.aliases)) idx.aliases.set(String(a), n.rel);
  return { notes, idx };
}
const isTemplatePath = (rel) => rel.startsWith('_system/templates/') || rel.startsWith('Resources/Templates/');
const isExempt = (rel) => !rel.includes('/') || rel.startsWith('.') || rel.startsWith('_system/agent/') || /^_system\/agents\/[^/]+\/SOUL\.md$/.test(rel) || rel === '_system/log.md' || /\/README\.md$/.test(rel);
const isLiving = (rel) => matchesAny(rel, CFG.living_docs) && !/\/README\.md$/.test(rel);

// ---------- registry ----------
function registeredTags() {
  const set = new Set();
  try {
    const t = read('_system/_tags.md');
    for (const m of t.matchAll(/`((?:type|domain|crm|customer|product)\/[a-z0-9\-]+)`/g)) set.add(m[1]);
    // namespaces whose values are declared free (customer/*, product/*)
    for (const m of t.matchAll(/`((?:customer|product)\/\*)`/g)) set.add(m[1]);
    const crmRow = t.match(/`crm\/\*`\s*\|\s*`([^`]+)`/);
    if (crmRow) for (const v of crmRow[1].split('·')) set.add('crm/' + v.trim());
  } catch {}
  return set;
}
function tagRegistered(tag, reg) {
  if (reg.has(tag)) return true;
  const ns = tag.split('/')[0] + '/*';
  return reg.has(ns);
}

// ---------- checks ----------
function daysSince(dateStr) { if (!dateStr) return null; const d = Date.parse(String(dateStr)); if (Number.isNaN(d)) return null; return Math.floor((Date.now() - d) / DAY); }
function daysUntil(dateStr) { const s = daysSince(dateStr); return s == null ? null : -s; }

function checkStale(notes) {
  const out = [];
  for (const n of notes) {
    if (isArchived(n.rel) || isTemplatePath(n.rel)) continue;
    if (!isLiving(n.rel) && !n.fm.review_due) continue;
    if (isLiving(n.rel) && n.type && n.type !== 'type/note' && !n.fm.owner) out.push({ rel: n.rel, issue: 'missing owner', owner: null, due: null, days: null });
    if (isLiving(n.rel) && !n.fm.review_due) { out.push({ rel: n.rel, issue: 'missing review_due', owner: n.fm.owner || null, due: null, days: null }); continue; }
    const due = n.fm.review_due;
    if (!due || /\{\{/.test(String(due))) { if (isLiving(n.rel)) out.push({ rel: n.rel, issue: 'review_due is a placeholder', owner: n.fm.owner || null, due: String(due), days: null }); continue; }
    const left = daysUntil(due);
    if (left == null) { out.push({ rel: n.rel, issue: `unparseable review_due "${due}"`, owner: n.fm.owner || null, due, days: null }); continue; }
    if (left < 0) {
      const cad = CFG.review_cadence_days[n.type] || 90;
      out.push({ rel: n.rel, issue: -left > 2 * cad ? 'stale (past twice the cadence)' : 'stale', owner: n.fm.owner || null, due, days: -left });
    }
  }
  return out.sort((a, b) => (b.days || 0) - (a.days || 0));
}

function checkLinks(notes, idx) {
  const out = [];
  for (const n of notes) {
    if (isArchived(n.rel) || isTemplatePath(n.rel) || n.rel.startsWith('_system/reports/')) continue;
    const seen = new Set();
    for (const l of n.links) {
      if (seen.has(l)) continue; seen.add(l);
      if (!resolveLink(l, idx)) out.push({ rel: n.rel, link: l });
    }
  }
  return out;
}

function checkOrphans(notes) {
  const out = [];
  for (const n of notes) {
    if (isArchived(n.rel) || isExempt(n.rel) || n.rel.startsWith('_system/') || n.rel.startsWith('Journal/') || isTemplatePath(n.rel) || n.rel.startsWith('_inbox/')) continue;
    const fmLinks = ['up', 'related', 'project', 'owner', 'company', 'works_at', 'customer', 'source', 'decider', 'reports_to', 'manages', 'customer_of', 'partner_of', 'competitor_of', 'attendees', 'participants', 'person']
      .flatMap((k) => asList(n.fm[k])).flatMap((v) => wikilinks(String(v)));
    const total = new Set([...n.links, ...fmLinks]).size;
    if (total < 2) out.push({ rel: n.rel, links: total });
  }
  return out;
}

function checkTags(notes) {
  const reg = registeredTags();
  const missing = [], unregistered = [], malformed = [], tooMany = [];
  for (const n of notes) {
    if (isArchived(n.rel) || isExempt(n.rel) || isTemplatePath(n.rel) || n.rel.startsWith('_inbox/')) continue;
    if (n.tags.length === 0) { missing.push({ rel: n.rel }); continue; }
    if (!n.type) malformed.push({ rel: n.rel, tag: '(no type/* tag)' });
    if (n.tags.length > 4) tooMany.push({ rel: n.rel, count: n.tags.length });
    for (const t of n.tags) {
      if (/\{\{/.test(t)) continue;
      if (!/^[a-z0-9\-]+\/[a-z0-9\-]+$/.test(t)) { malformed.push({ rel: n.rel, tag: t }); continue; }
      if (reg.size && !tagRegistered(t, reg)) unregistered.push({ rel: n.rel, tag: t });
    }
  }
  return { missing, unregistered, malformed, tooMany };
}

function checkRoot() {
  const out = [];
  for (const e of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    if (e.isDirectory()) {
      if (!['_inbox', 'Input', 'Knowledge', 'CRM', 'Decisions', 'Active', 'Output', 'Journal', 'Resources', '_system'].includes(e.name)) out.push({ name: e.name + '/', kind: 'folder' });
    } else if (!CFG.root_allowlist.includes(e.name)) out.push({ name: e.name, kind: 'file' });
  }
  return out;
}

function checkSecrets(notes) {
  const out = [];
  const res = CFG.secret_patterns.map((p) => { const m = p.match(/^\(\?i\)/); return new RegExp(m ? p.slice(4) : p, m ? 'i' : ''); });
  for (const n of notes) {
    if (n.rel === '_system/brain.config.json') continue;
    for (const re of res) { const m = n.text.match(re); if (m) { out.push({ rel: n.rel, match: m[0].slice(0, 12) + '…' }); break; } }
  }
  return out;
}

function checkRules() {
  const dir = path.join(ROOT, '_system/memory/rules');
  if (!fs.existsSync(dir)) return { count: 0, over: false };
  const count = fs.readdirSync(dir).filter((f) => /^rule-.*\.md$/.test(f)).length;
  return { count, over: count > CFG.max_rules };
}
function checkAgentMemory() {
  const dir = path.join(ROOT, '_system/memory/agents');
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.md')) continue;
    const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n').length;
    if (lines > CFG.max_agent_memory_lines) out.push({ rel: `_system/memory/agents/${f}`, lines });
    const slug = f.replace(/\.md$/, '');
    if (!fs.existsSync(path.join(ROOT, '_system/agents', slug)) && !fs.existsSync(path.join(ROOT, '_system/automations', slug + '.md'))) out.push({ rel: `_system/memory/agents/${f}`, lines, issue: 'no agent bundle or automation with this slug' });
  }
  return out;
}
function checkMemoryInbox() {
  const dir = path.join(ROOT, '_system/memory/inbox');
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
    if (!m) continue;
    const age = daysSince(m[1]);
    if (age != null && age > 7) out.push({ rel: `_system/memory/inbox/${f}`, days: age });
  }
  return out;
}
function checkOpenLoops() {
  try {
    const t = read('_system/memory/open-loops.md');
    const closed = (t.match(/^- status: closed/gm) || []).length;
    const blocks = [...t.matchAll(/^## (loop-[^\n]+)\n([\s\S]*?)(?=^## loop-|\Z)/gm)];
    const due = [];
    for (const b of blocks) {
      const body = b[2];
      const st = (body.match(/^- status: (\w+)/m) || [])[1];
      const res = (body.match(/^- resurface: (\S+)/m) || [])[1];
      const dueD = (body.match(/^- due: (\S+)/m) || [])[1];
      const title = (body.match(/^- title: (.+)$/m) || [])[1] || b[1];
      const owner = (body.match(/^- owner: (.+)$/m) || [])[1] || '';
      if (st === 'closed') continue;
      const r = daysUntil(res), d = daysUntil(dueD);
      if ((r != null && r <= 0) || (d != null && d <= 3)) due.push({ id: b[1], title, owner, resurface: res, due: dueD });
    }
    return { closed, open: blocks.filter((b) => !/^- status: closed/m.test(b[2])).length, due };
  } catch { return { closed: 0, open: 0, due: [] }; }
}
function checkDecisions(notes) {
  const stuck = [];
  let proposed = 0, accepted = 0;
  for (const n of notes) {
    if (n.type !== 'type/decision' || isArchived(n.rel) || isTemplatePath(n.rel)) continue;
    if (n.fm.status === 'proposed') { proposed++; const age = daysSince(n.fm.decided); if (age != null && age > 14) stuck.push({ rel: n.rel, days: age }); }
    if (n.fm.status === 'accepted') accepted++;
  }
  return { proposed, accepted, stuck };
}
function checkMocs(notes) {
  const counts = {};
  for (const n of notes) {
    const m = n.rel.match(/^Knowledge\/([^/]+)\//);
    if (!m || m[1] === 'Company' || /\/README\.md$/.test(n.rel)) continue;
    counts[m[1]] = counts[m[1]] || { notes: 0, moc: false };
    counts[m[1]].notes++;
    if (/\/_MOC /.test(n.rel)) counts[m[1]].moc = true;
  }
  return Object.entries(counts).filter(([, v]) => v.notes >= CFG.moc_threshold && !v.moc).map(([d, v]) => ({ domain: d, notes: v.notes }));
}
function ratio(notes) {
  const live = notes.filter((n) => !isArchived(n.rel) && !/\/README\.md$/.test(n.rel));
  const input = live.filter((n) => n.rel.startsWith('Input/')).length;
  const knowledge = live.filter((n) => n.rel.startsWith('Knowledge/')).length;
  return { input, knowledge, ratio: knowledge ? +(input / knowledge).toFixed(2) : null };
}
function checkTemplateDrift() {
  const out = [];
  const a = path.join(ROOT, '_system/templates'), b = path.join(ROOT, 'Resources/Templates');
  if (!fs.existsSync(a) || !fs.existsSync(b)) return out;
  for (const f of fs.readdirSync(b)) {
    if (!f.endsWith('.md') || f === 'README.md') continue;
    const pa = path.join(a, f);
    if (!fs.existsSync(pa)) continue;
    if (fs.readFileSync(pa, 'utf8') !== fs.readFileSync(path.join(b, f), 'utf8')) out.push({ file: f });
  }
  return out;
}
function placeholders(notes) {
  const out = [];
  for (const n of notes) {
    if (isArchived(n.rel) || isTemplatePath(n.rel)) continue;
    const m = n.text.match(/\{\{[a-z\-_ ]+\}\}/);
    if (m) out.push({ rel: n.rel, placeholder: m[0] });
  }
  return out;
}

// ---------- health ----------
function health() {
  const { notes, idx } = loadNotes();
  const r = {
    date: today(), notes: notes.filter((n) => !isArchived(n.rel)).length,
    root: checkRoot(), secrets: checkSecrets(notes), stale: checkStale(notes), links: checkLinks(notes, idx), orphans: checkOrphans(notes),
    tags: checkTags(notes), rules: checkRules(), agentMemory: checkAgentMemory(), memoryInbox: checkMemoryInbox(), loops: checkOpenLoops(),
    decisions: checkDecisions(notes), mocs: checkMocs(notes), ratio: ratio(notes), templateDrift: checkTemplateDrift(), placeholders: placeholders(notes),
  };
  const errors = [], warnings = [];
  if (r.root.length) errors.push(`root intrusion: ${r.root.map((x) => x.name).join(', ')}`);
  if (r.secrets.length) errors.push(`possible secrets in ${r.secrets.length} note(s): ${r.secrets.slice(0, 3).map((x) => x.rel).join(', ')}`);
  if (r.rules.over) errors.push(`rules: ${r.rules.count} over the cap of ${CFG.max_rules}`);
  if (r.links.length) warnings.push(`${r.links.length} broken wikilink(s)`);
  if (r.orphans.length) warnings.push(`${r.orphans.length} orphan(s) with fewer than 2 links`);
  if (r.tags.missing.length) warnings.push(`${r.tags.missing.length} note(s) without tags`);
  if (r.tags.unregistered.length) warnings.push(`${r.tags.unregistered.length} unregistered tag use(s)`);
  if (r.tags.malformed.length) warnings.push(`${r.tags.malformed.length} malformed tag(s) or missing type/*`);
  if (r.tags.tooMany.length) warnings.push(`${r.tags.tooMany.length} note(s) with more than 4 tags`);
  const staleReal = r.stale.filter((s) => s.issue.startsWith('stale'));
  const staleMeta = r.stale.filter((s) => !s.issue.startsWith('stale'));
  if (staleReal.length) warnings.push(`${staleReal.length} living document(s) past review_due`);
  if (staleMeta.length) warnings.push(`${staleMeta.length} living document(s) with missing or invalid owner/review_due`);
  if (r.agentMemory.length) warnings.push(`${r.agentMemory.length} agent memory file(s) too long or unowned`);
  if (r.memoryInbox.length) warnings.push(`${r.memoryInbox.length} memory inbox file(s) older than 7 days`);
  if (r.loops.closed) warnings.push(`${r.loops.closed} closed loop(s) still in open-loops.md`);
  if (r.decisions.stuck.length) warnings.push(`${r.decisions.stuck.length} decision(s) proposed for more than 14 days`);
  if (r.mocs.length) warnings.push(`domain(s) over ${CFG.moc_threshold} notes without a MOC: ${r.mocs.map((m) => m.domain).join(', ')}`);
  if (r.ratio.ratio != null && r.ratio.ratio > CFG.input_knowledge_ratio_warn) warnings.push(`Input:Knowledge ratio ${r.ratio.ratio} above ${CFG.input_knowledge_ratio_warn}: promotion is the bottleneck`);
  if (r.templateDrift.length) warnings.push(`template drift between _system/templates and Resources/Templates: ${r.templateDrift.map((t) => t.file).join(', ')}`);
  if (r.placeholders.length) warnings.push(`${r.placeholders.length} note(s) still carry {{placeholders}}`);
  r.errors = errors; r.warnings = warnings;
  r.status = errors.length ? 'error' : warnings.length ? 'warn' : 'ok';
  return r;
}
function printHealth(r) {
  const lines = [`# Brain health ${r.date}: ${r.status.toUpperCase()} (${r.notes} notes)`];
  if (r.errors.length) { lines.push('', '## Errors'); for (const e of r.errors) lines.push(`- ✗ ${e}`); }
  if (r.warnings.length) { lines.push('', '## Warnings'); for (const w of r.warnings) lines.push(`- ⚠ ${w}`); }
  const ex = (arr, f, n = 3) => arr.slice(0, n).map(f).join('; ');
  lines.push('', '## Details');
  lines.push(`- Stale: ${ex(r.stale, (s) => `${s.rel} (${s.issue}${s.days ? ', ' + s.days + 'd' : ''}, owner ${s.owner || 'none'})`)}`);
  lines.push(`- Broken links: ${ex(r.links, (l) => `${l.rel} → [[${l.link}]]`)}`);
  lines.push(`- Orphans: ${ex(r.orphans, (o) => o.rel)}`);
  lines.push(`- Unregistered tags: ${ex(r.tags.unregistered, (t) => `${t.tag} in ${t.rel}`)}`);
  lines.push(`- Malformed: ${ex(r.tags.malformed, (t) => `${t.tag} in ${t.rel}`)}`);
  lines.push(`- Rules: ${r.rules.count}/${CFG.max_rules} · Decisions: ${r.decisions.accepted} accepted, ${r.decisions.proposed} proposed · Loops open: ${r.loops.open}, due now: ${r.loops.due.length}`);
  lines.push(`- Input:Knowledge: ${r.ratio.input}:${r.ratio.knowledge} = ${r.ratio.ratio ?? 'n/a'}`);
  if (r.placeholders.length) lines.push(`- Placeholders: ${ex(r.placeholders, (p) => `${p.placeholder} in ${p.rel}`)}`);
  lines.push('', 'Safe to fix mechanically: index drift (`brain index --write`), a malformed tag with one registered replacement, missing `up:` where the folder implies it. Everything else is a person\'s call.');
  return lines.join('\n');
}

// ---------- brief ----------
function brief() {
  const r = health();
  const lines = [];
  const stale = r.stale.filter((s) => s.issue.startsWith('stale'));
  lines.push(`Brain: ${CFG.company} · ${r.notes} notes · health ${r.status.toUpperCase()}${r.errors.length ? ' (' + r.errors.join('; ') + ')' : ''}`);
  if (stale.length) lines.push(`Stale living documents (${stale.length}): ` + stale.slice(0, 5).map((s) => `${path.basename(s.rel, '.md')} (${s.days}d, ${s.owner || 'no owner'})`).join(', '));
  else lines.push('Stale living documents: none');
  if (r.loops.due.length) lines.push(`Loops due or resurfacing (${r.loops.due.length}): ` + r.loops.due.slice(0, 5).map((l) => `${l.title} (${l.owner || '?'})`).join('; '));
  const inbox = fs.existsSync(path.join(ROOT, '_inbox')) ? fs.readdirSync(path.join(ROOT, '_inbox')).filter((f) => !f.startsWith('.') && f !== 'README.md').length : 0;
  lines.push(`Inbox: ${inbox} item(s) · memory inbox: ${fs.existsSync(path.join(ROOT, '_system/memory/inbox')) ? fs.readdirSync(path.join(ROOT, '_system/memory/inbox')).filter((f) => /^\d{4}-/.test(f)).length : 0} file(s) · proposed decisions: ${r.decisions.proposed}`);
  const weekly = path.join(ROOT, 'Journal/Weekly');
  if (fs.existsSync(weekly)) { const w = fs.readdirSync(weekly).filter((f) => /^\d{4}-W\d{2}\.md$/.test(f)).sort().pop(); lines.push(`Last weekly review: ${w ? w.replace('.md', '') : 'none yet'}`); }
  try { const now = read('_system/agent/NOW.md'); const fm = parseFrontmatter(now).fm; if (fm.review_due) { const left = daysUntil(fm.review_due); if (left != null && left < 0) lines.push(`NOW.md is ${-left} day(s) past its review: verify with its owner before relying on it`); } } catch {}
  if (r.warnings.length) lines.push(`Attention: ${r.warnings.slice(0, 4).join('; ')}`);
  if (r.placeholders.length) lines.push('This brain still has template placeholders: run the onboard skill.');
  return lines.join('\n');
}

// ---------- index ----------
function fmtDate(d) { return d ? String(d) : ''; }
function buildIndices(notes) {
  const out = {};
  const live = notes.filter((n) => !isArchived(n.rel) && !isTemplatePath(n.rel));
  const hdr = (title, owner, extra) => `---\ntags:\n  - type/index\nowner: "${owner}"\nreview_due: ${new Date(Date.now() + 30 * DAY).toISOString().slice(0, 10)}\nlast_updated: ${today()}\ncreated_by: brain-script\n---\n# ${title}\n\n${extra}\n`;
  const ownerBrain = (() => { try { return parseFrontmatter(read('_system/indices/project-index.md')).fm.owner || '[[Owner]]'; } catch { return '[[Owner]]'; } })();
  // projects
  const projects = live.filter((n) => n.type === 'type/project');
  const groups = { active: [], backlog: [], paused: [], done: [] };
  for (const p of projects) {
    const st = String(p.fm.status || 'backlog'); (groups[st] || groups.backlog).push(p);
  }
  const desc = (p) => { const m = p.body.match(/^>\s*(.+)$/m); return m ? m[1].trim() : ''; };
  let s = hdr('Project index', ownerBrain, 'Regenerated by `brain index` from `Active/Projects/*/*.md`. Entry: `[[Project]] · owner · status · one line · last updated`.');
  for (const g of ['active', 'backlog', 'paused', 'done']) {
    s += `\n## ${g[0].toUpperCase() + g.slice(1)}\n\n`;
    for (const p of groups[g].sort((a, b) => a.rel.localeCompare(b.rel))) s += `- [[${path.basename(p.rel, '.md')}]] · ${p.fm.owner || 'no owner'} · ${p.fm.status || ''} · ${desc(p)} · last updated ${fmtDate(p.fm.last_updated || p.fm.last_verified)}\n`;
  }
  out['_system/indices/project-index.md'] = s;
  // people
  const people = live.filter((n) => n.type === 'type/person');
  const rel = (p) => (p.tags.find((t) => t.startsWith('crm/')) || 'crm/other').slice(4);
  s = hdr('People index', ownerBrain, 'Regenerated by `brain index` from `CRM/People/`. Grouped by `crm/*`.');
  const pg = {};
  for (const p of people) (pg[rel(p)] = pg[rel(p)] || []).push(p);
  for (const g of Object.keys(pg).sort()) {
    s += `\n## ${g[0].toUpperCase() + g.slice(1)}\n\n`;
    for (const p of pg[g].sort((a, b) => a.rel.localeCompare(b.rel))) s += `- [[${path.basename(p.rel, '.md')}]] · ${p.fm.role || ''}${p.fm.company ? ' at ' + p.fm.company : ''}${p.fm.owner ? ' · owner ' + p.fm.owner : ''}\n`;
  }
  out['_system/indices/people-index.md'] = s;
  // companies
  const cos = live.filter((n) => n.type === 'type/company');
  s = hdr('Companies index', ownerBrain, 'Regenerated by `brain index` from `CRM/Companies/`. Grouped by `stage`.');
  const cg = {};
  for (const c of cos) { const st = String(c.fm.stage || 'other'); (cg[st] = cg[st] || []).push(c); }
  for (const g of Object.keys(cg).sort()) {
    s += `\n## ${g[0].toUpperCase() + g.slice(1)}\n\n`;
    for (const c of cg[g].sort((a, b) => a.rel.localeCompare(b.rel))) s += `- [[${path.basename(c.rel, '.md')}]] · ${c.fm.industry || ''}${c.fm.since ? ' · since ' + c.fm.since : ''}${c.fm.owner ? ' · owner ' + c.fm.owner : ''}\n`;
  }
  out['_system/indices/companies-index.md'] = s;
  // decisions
  const dec = live.filter((n) => n.type === 'type/decision').sort((a, b) => String(b.fm.decided || '').localeCompare(String(a.fm.decided || '')));
  s = hdr('Decisions index', ownerBrain, 'Regenerated by `brain index` from `Decisions/`, newest first. Entry: `date · [[title]] · status · decider · project`.') + '\n';
  for (const d of dec) s += `- ${fmtDate(d.fm.decided)} · [[${path.basename(d.rel, '.md')}]] · ${d.fm.status || ''} · ${d.fm.decider || ''} · ${d.fm.project || 'none'}\n`;
  out['_system/indices/decisions-index.md'] = s;
  // domains
  const reg = registeredTags();
  const domains = [...reg].filter((t) => t.startsWith('domain/')).sort();
  s = hdr('Domain index', ownerBrain, 'Domains are tags `#domain/*`. Each row: the tag, the `Knowledge/` folder, the MOC if it exists, note counts across the brain.') + '\n| Domain | Folder | MOC | Notes |\n|---|---|---|---|\n';
  for (const d of domains) {
    const name = d.slice(7);
    const folder = fs.readdirSync(path.join(ROOT, 'Knowledge')).find((f) => f.toLowerCase() === name);
    const moc = folder ? (fs.readdirSync(path.join(ROOT, 'Knowledge', folder)).find((f) => f.startsWith('_MOC ')) || '') : '';
    const count = live.filter((n) => n.tags.includes(d)).length;
    s += `| \`${d}\` | ${folder ? '`Knowledge/' + folder + '/`' : ''} | ${moc ? '[[' + moc.replace('.md', '') + ']]' : ''} | ${count} |\n`;
  }
  out['_system/indices/domain-index.md'] = s;
  return out;
}
function indexCmd() {
  const { notes } = loadNotes();
  const built = buildIndices(notes);
  let changed = 0;
  for (const [rel, content] of Object.entries(built)) {
    const p = path.join(ROOT, rel);
    const cur = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    const same = cur.replace(/review_due: .*|last_updated: .*/g, '') === content.replace(/review_due: .*|last_updated: .*/g, '');
    if (!same) { changed++; if (flag('--write')) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); } }
    console.log(`${same ? '=' : flag('--write') ? 'W' : '~'} ${rel}`);
  }
  if (flag('--write') && changed) appendLog('index', `regenerated ${changed} index file(s)`, 'brain-script');
  console.log(changed ? (flag('--write') ? `${changed} index file(s) written.` : `${changed} index file(s) differ. Run with --write to apply.`) : 'Indices are current.');
}

// ---------- new ----------
const TEMPLATE_BY_TYPE = { living: 'Living Document', project: 'Project', decision: 'Decision', meeting: 'Meeting', person: 'Person', company: 'Company', concept: 'Concept', feedback: 'Feedback', conversation: 'Conversation', playbook: 'Playbook', daily: 'Daily', weekly: 'Weekly Review' };
const DEST_BY_TYPE = { living: 'Knowledge/Company', project: 'Active/Projects', decision: 'Decisions', meeting: 'Input/Meetings', person: 'CRM/People', company: 'CRM/Companies', concept: 'Knowledge', feedback: 'Input/Feedback', conversation: 'Input/Conversations', playbook: 'Resources/Playbooks', daily: 'Journal/Daily', weekly: 'Journal/Weekly' };
function newCmd() {
  const [type, ...rest] = positional();
  const title = rest.join(' ').trim();
  if (!type || !TEMPLATE_BY_TYPE[type]) { console.error(`usage: brain new <${Object.keys(TEMPLATE_BY_TYPE).join('|')}> "Title"`); process.exit(1); }
  if (!title && !['daily', 'weekly'].includes(type)) { console.error('a title is required'); process.exit(1); }
  const tpl = path.join(ROOT, '_system/templates', TEMPLATE_BY_TYPE[type] + '.md');
  let text = fs.readFileSync(tpl, 'utf8');
  const d = today();
  const domain = opt('--domain') || 'product';
  const cad = CFG.review_cadence_days;
  const reviewDue = (days) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);
  const vars = {
    title, today: d, date: opt('--date') || d, domain, domain_title: domain[0].toUpperCase() + domain.slice(1),
    owner: (opt('--owner') || 'Owner').replace(/^\[\[|\]\]$/g, ''), decider: (opt('--owner') || 'Decider').replace(/^\[\[|\]\]$/g, ''),
    project: (opt('--project') || 'none').replace(/^\[\[|\]\]$/g, ''), source: opt('--source') || '', customer: (opt('--customer') || 'Customer').replace(/^\[\[|\]\]$/g, ''),
    company: (opt('--company') || 'Company').replace(/^\[\[|\]\]$/g, ''), relationship: opt('--relationship') || 'other', channel: opt('--channel') || 'email', area: opt('--area') || 'core',
    review_due: reviewDue(type === 'project' ? cad['type/project'] : type === 'playbook' ? cad['type/playbook'] : cad['type/living'] || 90),
    week: isoWeek(new Date()),
  };
  text = text.replace(/\{\{([a-z_]+)\}\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  let dest;
  if (type === 'project') dest = `Active/Projects/${title}/${title}.md`;
  else if (type === 'concept') dest = `Knowledge/${vars.domain_title}/${title}.md`;
  else if (type === 'daily') dest = `Journal/Daily/${vars.date}.md`;
  else if (type === 'weekly') dest = `Journal/Weekly/${vars.week}.md`;
  else if (['decision', 'meeting', 'feedback', 'conversation'].includes(type)) dest = `${DEST_BY_TYPE[type]}/${vars.date} ${title}.md`;
  else dest = `${DEST_BY_TYPE[type]}/${title}.md`;
  const p = path.join(ROOT, dest);
  if (fs.existsSync(p) && !flag('--force')) { console.error(`exists: ${dest} (use --force to overwrite)`); process.exit(1); }
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
  appendLog('new', `${type}: ${dest}`, opt('--actor') || 'brain-script');
  console.log(`📄 Created: [[${dest.replace(/\.md$/, '')}]]`);
}
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day);
  const y = d.getUTCFullYear(); const w = Math.ceil((((d - Date.UTC(y, 0, 1)) / DAY) + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

// ---------- verify ----------
function findNote(q, notes) {
  const n = notes.find((x) => x.rel === q || x.rel === q + '.md' || path.basename(x.rel, '.md').toLowerCase() === q.toLowerCase());
  return n || null;
}
function verifyCmd() {
  const q = positional().join(' ');
  const { notes } = loadNotes();
  const n = findNote(q, notes);
  if (!n) { console.error(`note not found: ${q}`); process.exit(1); }
  const cad = CFG.review_cadence_days[n.type] || 90;
  const d = today(); const due = new Date(Date.now() + cad * DAY).toISOString().slice(0, 10);
  let text = n.text;
  const setFm = (key, val) => { const re = new RegExp(`^${key}:.*$`, 'm'); if (re.test(text.split('\n---')[0] + '\n---')) text = text.replace(re, `${key}: ${val}`); else text = text.replace(/^---\n/, `---\n${key}: ${val}\n`); };
  setFm('last_verified', d); setFm('review_due', due); setFm('last_updated', d);
  if (opt('--by')) setFm('last_edited_by', opt('--by'));
  fs.writeFileSync(path.join(ROOT, n.rel), text);
  appendLog('verify', `${n.rel} verified${opt('--by') ? ' by ' + opt('--by') : ''}, next review ${due}`, opt('--by') || 'owner');
  console.log(`Verified ${n.rel}: last_verified ${d}, review_due ${due} (cadence ${cad}d for ${n.type || 'unknown type'})`);
}

// ---------- log ----------
function appendLog(op, title, actor) {
  if (!ROOT) return;
  const p = path.join(ROOT, '_system/log.md');
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const line = `## [${stamp}] ${op} | ${title} | ${actor || 'agent'}\n`;
  try { fs.appendFileSync(p, (fs.existsSync(p) && !fs.readFileSync(p, 'utf8').endsWith('\n') ? '\n' : '') + line); } catch {}
}
function logCmd() { const [op, ...t] = positional(); if (!op) { console.error('usage: brain log <op> "title" [--actor name]'); process.exit(1); } appendLog(op, t.join(' '), opt('--actor')); console.log('logged'); }

// ---------- run (automation prompt) ----------
function runCmd() {
  const name = positional()[0];
  const p = path.join(ROOT, '_system/automations', `${name}.md`);
  if (!fs.existsSync(p)) { console.error(`automation not found: ${name}`); process.exit(1); }
  const { fm, body } = parseFrontmatter(fs.readFileSync(p, 'utf8'));
  let prompt = body.trim();
  if (fm.agent) {
    const ap = path.join(ROOT, '_system/agents', String(fm.agent), 'AGENT.md');
    const sp = path.join(ROOT, '_system/agents', String(fm.agent), 'SOUL.md');
    if (fs.existsSync(ap)) prompt = (fs.existsSync(sp) ? fs.readFileSync(sp, 'utf8') + '\n\n' : '') + parseFrontmatter(fs.readFileSync(ap, 'utf8')).body.trim();
  }
  const scope = asList(fm.scope);
  console.log(`# Automation: ${fm.name || name}\nMode: ${fm.mode || 'report'} · Enabled: ${fm.enabled} · When: ${asList(fm.when).join(', ')}\nScope (act mode may write only here): ${scope.length ? scope.join(', ') : 'nothing'}\n\nYou are running unattended. Mode "${fm.mode || 'report'}": ${fm.mode === 'act' ? 'apply within scope, commit, one line in _system/log.md and in today\'s daily note under ## Agents.' : fm.mode === 'propose' ? 'write proposals to _system/reports/proposals/, change nothing else.' : 'write a report to _system/reports/, change nothing in the brain.'}\nFollow AGENTS.md. Never invent.\n\n---\n\n${prompt}`);
}

// ---------- search ----------
function searchCmd() {
  const q = positional().join(' ').toLowerCase();
  if (!q) { console.error('usage: brain search "query"'); process.exit(1); }
  const limit = +(opt('--limit') || 15);
  const { notes } = loadNotes();
  const terms = q.split(/\s+/).filter(Boolean);
  const score = (n) => {
    if (isArchived(n.rel) || isTemplatePath(n.rel)) return 0;
    let s = 0;
    const name = path.basename(n.rel, '.md').toLowerCase();
    const aliases = asList(n.fm.aliases).map((a) => String(a).toLowerCase());
    const body = n.text.toLowerCase();
    for (const t of terms) {
      if (name.includes(t)) s += 10;
      if (aliases.some((a) => a.includes(t))) s += 8;
      if (n.tags.some((x) => x.includes(t))) s += 4;
      const c = body.split(t).length - 1; if (c) s += Math.min(5, c);
    }
    if (n.rel.startsWith('Knowledge/Company/') || n.type === 'type/decision') s *= 1.5;
    if (n.rel.startsWith('_system/')) s *= 0.5;
    return s;
  };
  const hits = notes.map((n) => ({ n, s: score(n) })).filter((h) => h.s > 0).sort((a, b) => b.s - a.s).slice(0, limit);
  if (!hits.length) { console.log('No hits in the brain. Say so, name where you looked, and go to connected sources or the web.'); return; }
  for (const h of hits) {
    const line = h.n.body.split('\n').find((l) => terms.some((t) => l.toLowerCase().includes(t))) || '';
    console.log(`${h.s.toFixed(0).padStart(3)}  ${h.n.rel}${h.n.fm.review_due && daysUntil(h.n.fm.review_due) < 0 ? '  [stale]' : ''}${h.n.fm.confidentiality && h.n.fm.confidentiality !== 'internal' ? '  [' + h.n.fm.confidentiality + ']' : ''}\n      ${line.trim().slice(0, 140)}`);
  }
}

// ---------- metrics ----------
function git(args) { try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }); } catch { return ''; } }
function metrics() {
  const { notes } = loadNotes();
  const r = health();
  const changed7 = new Set(git(['log', '--since=7 days ago', '--no-merges', '--name-only', '--format=']).split('\n').filter((l) => l.endsWith('.md') && !l.startsWith('_system/reports') && !l.startsWith('Journal/')));
  const changedPrev = new Set(git(['log', '--since=14 days ago', '--until=7 days ago', '--no-merges', '--name-only', '--format=']).split('\n').filter((l) => l.endsWith('.md') && !l.startsWith('_system/reports') && !l.startsWith('Journal/')));
  const dec7 = notes.filter((n) => n.type === 'type/decision' && daysSince(n.fm.decided) != null && daysSince(n.fm.decided) <= 7).length;
  const meetings7 = notes.filter((n) => n.type === 'type/meeting' && daysSince(n.fm.date) != null && daysSince(n.fm.date) <= 7).length;
  const synced = notes.filter((n) => matchesAny(n.rel, CFG.readonly) && n.rel.startsWith('Input/Meetings/') && !/\/README\.md$/.test(n.rel));
  const synced7 = synced.filter((n) => { const st = fs.statSync(path.join(ROOT, n.rel)); return (Date.now() - st.birthtimeMs) / DAY <= 7; }).length;
  const reverts = (git(['log', '--since=7 days ago', '--format=%s']).match(/revert/gi) || []).length;
  const agentCommits = (git(['log', '--since=7 days ago', '--format=%s']).match(/^brain:/gm) || []).length;
  const m = {
    week: isoWeek(new Date()), notes_updated: changed7.size, notes_updated_prev: changedPrev.size, decisions_recorded: dec7,
    meetings_with_minutes: meetings7, meetings_synced: synced7, living_stale: r.stale.filter((s) => s.issue.startsWith('stale')).length,
    input_knowledge: r.ratio.ratio, agent_commits: agentCommits, reverts, health: r.status,
  };
  if (flag('--json')) return console.log(JSON.stringify(m, null, 2));
  console.log(`| Metric | This week | Last week |\n|---|---|---|\n| Notes updated | ${m.notes_updated} | ${m.notes_updated_prev} |\n| Decisions recorded | ${m.decisions_recorded} | |\n| Meetings with minutes | ${m.meetings_with_minutes}${m.meetings_synced ? ' of ' + m.meetings_synced + ' synced' : ''} | |\n| Living documents stale | ${m.living_stale} | |\n| Input : Knowledge | ${m.input_knowledge ?? 'n/a'} | |\n| Agent commits / reverts | ${m.agent_commits} / ${m.reverts} | |\n| Health | ${m.health} | |`);
}

// ---------- hooks ----------
function readStdinJson() { try { const s = fs.readFileSync(0, 'utf8'); return s.trim() ? JSON.parse(s) : {}; } catch { return {}; } }
function relOf(filePath, cwd) {
  if (!filePath) return null;
  const realish = (p) => { // realpath of the nearest existing ancestor, plus the rest
    let dir = p; const rest = [];
    while (dir && !fs.existsSync(dir)) { rest.unshift(path.basename(dir)); const parent = path.dirname(dir); if (parent === dir) break; dir = parent; }
    try { return path.join(fs.realpathSync(dir), ...rest); } catch { return p; }
  };
  const abs = realish(path.isAbsolute(filePath) ? filePath : path.resolve(cwd || process.cwd(), filePath));
  const root0 = findRoot(path.dirname(abs)) || ROOT;
  if (!root0) return null;
  const root = realish(root0);
  const rel = path.relative(root, abs);
  if (rel.startsWith('..')) return null;
  return { rel: rel.split(path.sep).join('/'), root, abs };
}
function deny(reason) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }) + '\n');
  process.exit(0);
}
function guard() {
  const input = readStdinJson();
  const ti = input.tool_input || {};
  const fp = ti.file_path || ti.notebook_path || ti.path;
  const loc = relOf(fp, input.cwd);
  if (!loc) process.exit(0); // not inside a brain: silent
  const { rel, root, abs } = loc;
  const cfg = (() => { try { return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(path.join(root, '_system/brain.config.json'), 'utf8')) }; } catch { return DEFAULT_CONFIG; } })();
  const exists = fs.existsSync(abs);
  // 1. root guard
  if (!rel.includes('/') && !cfg.root_allowlist.includes(rel) && !rel.startsWith('.')) deny(`company-brain guard: nothing new at the root of the brain. "${rel}" is not in root_allowlist (${cfg.root_allowlist.join(', ')}). Put it in the folder that says what it is (see AGENTS.md).`);
  const top = rel.split('/')[0];
  const known = ['_inbox', 'Input', 'Knowledge', 'CRM', 'Decisions', 'Active', 'Output', 'Journal', 'Resources', '_system', '.archive', '.claude', '.obsidian', '.github', '.agents', '.codex'];
  if (rel.includes('/') && !known.includes(top) && !top.startsWith('.')) deny(`company-brain guard: "${top}/" is not a folder of this brain. A new top-level folder is a decision (Decisions/), not an edit. Known folders: ${known.filter((k) => !k.startsWith('.')).join(', ')}.`);
  // 2. archive is move-only
  if (rel.startsWith('.archive/') && exists) deny('company-brain guard: .archive/ is read-only. Restore by moving the note back; never edit in place.');
  // 3. read-only synced sources
  if (matchesAny(rel, cfg.readonly) && !rel.startsWith('.archive/') && !/\/README\.md$/.test(rel)) deny(`company-brain guard: "${rel}" matches a read-only source (${cfg.readonly.join(', ')}). Synced content is never edited; write minutes or links in a new note instead.`);
  // 4. secrets in content
  const content = [ti.content, ti.new_string, ...(Array.isArray(ti.edits) ? ti.edits.map((e) => e.new_string) : [])].filter(Boolean).join('\n');
  if (content) {
    for (const p of cfg.secret_patterns) {
      const m = p.match(/^\(\?i\)/); const re = new RegExp(m ? p.slice(4) : p, m ? 'i' : '');
      if (re.test(content)) deny('company-brain guard: the content looks like it contains a secret (key, token, password or private key). Secrets never enter the brain. Reference where the secret lives instead.');
    }
  }
  // 5. contract files: advise, do not block
  const contracts = ['AGENTS.md', 'CLAUDE.md', '_system/_tags.md', '_system/object-schema.md', '_system/Brain Blueprint.md', '_system/brain.config.json'];
  if (contracts.includes(rel)) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: `company-brain: "${rel}" is a contract. Changing it is a decision (Decisions/, type/decision, domain/knowledge). Confirm this edit is backed by one, or by an explicit request.` } }) + '\n');
    process.exit(0);
  }
  process.exit(0);
}
function lintFile() {
  const input = readStdinJson();
  const ti = input.tool_input || {};
  const loc = relOf(ti.file_path, input.cwd);
  if (!loc || !loc.rel.endsWith('.md') || !fs.existsSync(loc.abs)) process.exit(0);
  const { rel, root, abs } = loc;
  if (rel.startsWith('_system/reports/') || rel.startsWith('_system/templates/') || rel.startsWith('Resources/Templates/') || rel.startsWith('.archive/') || /\/README\.md$/.test(rel) || rel === 'AGENTS.md' || rel === 'CLAUDE.md' || rel === 'README.md') process.exit(0);
  const cfg = (() => { try { return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(path.join(root, '_system/brain.config.json'), 'utf8')) }; } catch { return DEFAULT_CONFIG; } })();
  const text = fs.readFileSync(abs, 'utf8');
  const { fm, body } = parseFrontmatter(text);
  const tags = tagsOf(fm);
  const advice = [];
  if (!text.startsWith('---')) advice.push('no frontmatter: add tags (1 to 4, with type/*)');
  else {
    if (tags.length === 0) advice.push('no tags: add 1 to 4 from _system/_tags.md, including type/*');
    else if (!tags.some((t) => t.startsWith('type/'))) advice.push('no type/* tag');
    if (tags.length > 4) advice.push(`${tags.length} tags: the cap is 4`);
    const living = matchesAny(rel, cfg.living_docs);
    if (living) { if (!fm.owner) advice.push('living document without owner:'); if (!fm.review_due) advice.push('living document without review_due:'); if (fm.last_verified && String(fm.last_verified) === today() && !(input.tool_input && /verify/i.test(JSON.stringify(input)))) advice.push('you set last_verified: only the owner verifies, through the verify flow'); }
    if (rel.startsWith('CRM/People/') && /(\+?\d[\d \-]{8,}\d)/.test(body) && !/linkedin|email/i.test(body)) advice.push('a phone-like number in a people note: work contact data only');
    if (['Input/Meetings/', 'Input/Conversations/', 'Decisions/', 'Input/Feedback/'].some((p) => rel.startsWith(p)) && fm.project === undefined && !rel.includes('/Granola/')) advice.push('no project: property (use "[[Project]]", none, or to verify)');
    if (rel.startsWith('Decisions/') && !fm.source) advice.push('decision without source:');
  }
  const links = wikilinks(stripCode(body)).length;
  if (links < 2 && !rel.startsWith('Journal/') && !rel.startsWith('_system/') && !rel.startsWith('_inbox/')) advice.push(`${links} outgoing wikilink(s): a note needs at least 2 to compose`);
  if (/—/.test(text)) advice.push('em-dash found: use a full stop, comma or colon');
  if (!advice.length) process.exit(0);
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: `company-brain lint on ${rel}: ${advice.join('; ')}. Fix in this turn if the note is yours to change; otherwise mention it.` } }) + '\n');
  process.exit(0);
}

// ---------- main ----------
function requireRoot() { if (!ROOT) { console.error('Not inside a company brain (no _system/brain.config.json found up the tree). Pass --root <dir>.'); process.exit(2); } }
switch (cmd) {
  case 'guard': guard(); break;
  case 'lint-file': lintFile(); break;
  case 'brief': requireRoot(); console.log(brief()); break;
  case 'health': { requireRoot(); const r = health(); if (flag('--json')) console.log(JSON.stringify(r, null, 2)); else console.log(printHealth(r)); if (flag('--strict') && r.status === 'error') process.exit(1); break; }
  case 'stale': { requireRoot(); const s = checkStale(loadNotes().notes); if (flag('--json')) console.log(JSON.stringify(s, null, 2)); else { if (!s.length) console.log('No stale living documents.'); for (const x of s) console.log(`${x.issue.padEnd(34)} ${x.rel}  owner ${x.owner || 'none'}${x.due ? '  due ' + x.due : ''}${x.days ? '  (' + x.days + 'd)' : ''}`); } break; }
  case 'links': { requireRoot(); const { notes, idx } = loadNotes(); const l = checkLinks(notes, idx); if (flag('--json')) console.log(JSON.stringify(l, null, 2)); else { if (!l.length) console.log('No broken wikilinks.'); for (const x of l) console.log(`${x.rel} → [[${x.link}]]`); } break; }
  case 'orphans': { requireRoot(); const o = checkOrphans(loadNotes().notes); if (flag('--json')) console.log(JSON.stringify(o, null, 2)); else { if (!o.length) console.log('No orphans.'); for (const x of o) console.log(`${x.links} link(s)  ${x.rel}`); } break; }
  case 'tags': { requireRoot(); const t = checkTags(loadNotes().notes); if (flag('--json')) console.log(JSON.stringify(t, null, 2)); else { console.log(`Missing tags: ${t.missing.length}\n${t.missing.map((x) => '  ' + x.rel).join('\n')}\nUnregistered: ${t.unregistered.length}\n${t.unregistered.map((x) => '  ' + x.tag + '  ' + x.rel).join('\n')}\nMalformed: ${t.malformed.length}\n${t.malformed.map((x) => '  ' + x.tag + '  ' + x.rel).join('\n')}\nOver 4: ${t.tooMany.length}`); } break; }
  case 'ratio': { requireRoot(); const r = ratio(loadNotes().notes); console.log(`Input ${r.input} : Knowledge ${r.knowledge} = ${r.ratio ?? 'n/a'}${r.ratio > CFG.input_knowledge_ratio_warn ? '  (above ' + CFG.input_knowledge_ratio_warn + ': promote, do not ingest more)' : ''}`); break; }
  case 'index': requireRoot(); indexCmd(); break;
  case 'new': requireRoot(); newCmd(); break;
  case 'verify': requireRoot(); verifyCmd(); break;
  case 'log': requireRoot(); logCmd(); break;
  case 'run': requireRoot(); runCmd(); break;
  case 'search': requireRoot(); searchCmd(); break;
  case 'metrics': requireRoot(); metrics(); break;
  default:
    console.log(fs.readFileSync(new URL(import.meta.url)).toString().split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
    process.exit(cmd ? 1 : 0);
}
