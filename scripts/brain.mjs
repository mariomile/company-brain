#!/usr/bin/env node
// company-brain script. Node built-ins only. Run from the brain root (the folder holding AGENTS.md and _system/brain.config.json).
//
//   node brain.mjs brief                       session briefing: stale docs, inbox, loops due, proposals, health summary
//   node brain.mjs health [--json] [--strict]  structural checks; --strict exits 1 on any error
//   node brain.mjs stale [--json]              living documents past review_due, by owner
//   node brain.mjs links [--json]              broken wikilinks (body and frontmatter)
//   node brain.mjs orphans [--json]            notes with fewer than 2 links
//   node brain.mjs tags [--json]               unregistered, missing, malformed tags
//   node brain.mjs ratio                       Input : Knowledge ratio
//   node brain.mjs index [--write]             regenerate _system/indices/*.md (prints what differs; --write applies)
//   node brain.mjs new <type> "Title" [--project P] [--owner O] [--domain D] [--date YYYY-MM-DD] [--source S] [--company C]
//   node brain.mjs verify <note path or title> [--by "[[Person]]"]   owner verified: set last_verified, bump review_due
//   node brain.mjs log <op> "title" [--actor name] [--result answered|gap|stale]   append a line to _system/log.md
//   node brain.mjs run <automation>            print the full prompt of _system/automations/<automation>.md with mode and scope
//   node brain.mjs search "query" [--limit N]  index-first search: titles, aliases, tags, then content
//   node brain.mjs metrics [--json]            weekly numbers for the review, including questions asked and gaps
//   node brain.mjs samples [--archive]         list the template's sample notes, or move them to .archive/
//   node brain.mjs sync ["message"] [--pull]   pull --rebase, commit everything in the brain, push
//   node brain.mjs scope <automation>          after a run: list uncommitted changes outside the automation's scope; exit 1 if any
//   node brain.mjs setup [--json]              setup checklist: what is done, what is left, the next step
//   node brain.mjs routine <automation> [--dry-run] [--cron [--install]] [--scheduled]   run an automation here with Claude Code, check the scope, commit locally;
//                                              --cron prints the crontab line (--install adds it), --scheduled skips a disabled automation
//   node brain.mjs guard                       PreToolUse hook (stdin JSON): refuse root files, archive edits, read-only edits, secrets
//   node brain.mjs lint-file                   PostToolUse hook (stdin JSON): frontmatter advice on the written note
//
// Options: --root <dir> sets the brain root (default: cwd, or the nearest parent holding _system/brain.config.json).

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';

// ---------- args ----------
const BOOL_FLAGS = new Set(['--json', '--strict', '--write', '--force', '--archive', '--pull', '--dry-run', '--cron', '--install', '--scheduled']);
const argv0 = process.argv.slice(2);
const ri = argv0.indexOf('--root');
const ROOT_OPT = ri >= 0 ? argv0[ri + 1] : undefined;
const argv = ri >= 0 ? argv0.filter((_, i) => i !== ri && i !== ri + 1) : argv0;
const cmd = argv[0];
const args = argv.slice(1);
const opt = (name) => { const i = args.indexOf(name); if (i < 0 || BOOL_FLAGS.has(name)) return undefined; const v = args[i + 1]; return v !== undefined && !v.startsWith('--') ? v : undefined; };
const flag = (name) => args.includes(name);
const positional = () => { const out = []; for (let i = 0; i < args.length; i++) { const a = args[i]; if (a.startsWith('--')) { if (!BOOL_FLAGS.has(a) && args[i + 1] !== undefined && !args[i + 1].startsWith('--')) i++; continue; } out.push(a); } return out; };

function findRoot(start) { // nearest ancestor holding the config
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, '_system', 'brain.config.json'))) return dir;
    const parent = path.dirname(dir); if (parent === dir) return null; dir = parent;
  }
}
function findOutermostRoot(start) { // brains do not nest: a config deeper down is not a brain
  let dir = path.resolve(start), found = null;
  for (;;) {
    if (fs.existsSync(path.join(dir, '_system', 'brain.config.json'))) found = dir;
    const parent = path.dirname(dir); if (parent === dir) return found; dir = parent;
  }
}
const ROOT = ROOT_OPT ? path.resolve(ROOT_OPT) : findRoot(process.cwd());
const DAY = 86400000;
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => ymd(new Date());
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };

// ---------- config ----------
const DEFAULT_CONFIG = {
  company: 'Company', language: 'en', sharing: '',
  root_allowlist: ['AGENTS.md', 'CLAUDE.md', 'README.md', 'CODEOWNERS', 'LICENSE'],
  readonly: ['Input/Meetings/Granola/**', 'Input/**/Raw/**'],
  living_docs: ['Knowledge/Company/**', 'Resources/Playbooks/**', 'Resources/Policies/**', 'Active/Projects/*/*.md', 'Active/Goals/**'],
  review_cadence_days: { 'type/living': 90, 'type/playbook': 180, 'type/policy': 365, 'type/project': 14, 'type/goal': 90 },
  moc_threshold: 50, input_knowledge_ratio_warn: 2.0, max_rules: 8,
  secret_patterns: [
    '(?i)(api[_-]?key|secret|token|password|passwd)["\']?\\s*[:=]\\s*["\']?(?=[A-Za-z0-9_\\-]*[0-9])(?=[A-Za-z0-9_\\-]*[A-Za-z])[A-Za-z0-9_\\-]{20,}',
    'sk-[A-Za-z0-9_\\-]{20,}', 'ghp_[A-Za-z0-9]{30,}', 'github_pat_[A-Za-z0-9_]{30,}', 'xox[baprs]-[A-Za-z0-9-]{10,}', 'AKIA[0-9A-Z]{16}', '-----BEGIN [A-Z ]*PRIVATE KEY-----',
  ],
};
function mergeConfig(user) {
  const c = structuredClone(DEFAULT_CONFIG);
  if (!user || typeof user !== 'object' || Array.isArray(user)) return c;
  for (const [k, v] of Object.entries(user)) {
    if (v == null) continue;
    const d = DEFAULT_CONFIG[k];
    if (Array.isArray(d)) { if (Array.isArray(v)) c[k] = v.filter((x) => typeof x === 'string'); continue; }
    if (d && typeof d === 'object') { if (typeof v === 'object' && !Array.isArray(v)) c[k] = { ...d, ...v }; continue; }
    if (typeof d === 'number') { if (typeof v === 'number' && Number.isFinite(v)) c[k] = v; continue; }
    c[k] = v;
  }
  return c;
}
function loadConfigAt(root) {
  if (!root) return mergeConfig(null);
  try { return mergeConfig(JSON.parse(fs.readFileSync(path.join(root, '_system', 'brain.config.json'), 'utf8'))); }
  catch { return mergeConfig(null); }
}
const CFG = loadConfigAt(ROOT);
function compilePatterns(list) {
  const ok = [], bad = [];
  for (const p of list) { try { const ci = /^\(\?i\)/.test(p); ok.push(new RegExp(ci ? p.slice(4) : p, ci ? 'i' : '')); } catch { bad.push(p); } }
  return { ok, bad };
}

// ---------- glob (minimal: **, *, ?) ----------
const globCache = new Map();
function globToRegex(glob, flags = '') {
  const k = flags + '\u0000' + glob;
  if (globCache.has(k)) return globCache.get(k);
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
  const rx = new RegExp(re + '$', flags);
  globCache.set(k, rx);
  return rx;
}
const matchesAny = (rel, globs, flags = '') => (globs || []).some((g) => globToRegex(g, flags).test(rel));

// ---------- files ----------
const SKIP_DIRS = new Set(['.git', '.obsidian', '.claude', '.codex', '.trash', 'node_modules', '.agents', '.github']);
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
const norm = (t) => String(t).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
const read = (rel) => norm(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const isArchived = (rel) => rel.startsWith('.archive/');
const isReadonly = (rel) => !isArchived(rel) && matchesAny(rel, CFG.readonly);

// ---------- frontmatter (YAML subset: scalars, block and flow lists, quoted wikilinks, block scalars) ----------
function scalar(v) {
  v = String(v).trim();
  if (v[0] === '"' || v[0] === "'") { const end = v.indexOf(v[0], 1); return end > 0 ? v.slice(1, end) : v.slice(1); }
  return v.replace(/\s+#.*$/, '').trim();
}
function splitFlow(s) {
  const out = []; let cur = '', q = null, depth = 0;
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '[') depth++; else if (ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((x) => x.trim());
}
function parseFrontmatter(text0) {
  const text = norm(text0);
  const m = text.match(/^---[ \t]*\n([\s\S]*?)\n?---[ \t]*(?:\n|$)/);
  if (!m) return { fm: {}, body: text, raw: '', has: false, dupKeys: [] };
  const raw = m[1];
  // a block between two rules that is not key: value lines is a horizontal rule, not frontmatter
  if (!raw.split('\n').every((l) => /^\s*(#.*)?$/.test(l) || /^[A-Za-z0-9_\-;/]+:(\s|$)/.test(l) || /^\s+\S/.test(l) || /^-\s/.test(l))) return { fm: {}, body: text, raw: '', has: false, dupKeys: [] };
  const body = text.slice(m[0].length);
  const fm = {}; const dupKeys = [];
  const lines = raw.split('\n');
  let key = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*#/.test(line) || !line.trim()) continue;
    const kv = line.match(/^([A-Za-z0-9_\-;/]+):(?:\s+(.*)|\s*)$/);
    if (kv) {
      key = kv[1];
      if (Object.prototype.hasOwnProperty.call(fm, key)) dupKeys.push(key);
      const v = (kv[2] || '').trim();
      if (v === '' ) fm[key] = null;
      else if (/^[|>][-+]?$/.test(v)) { const buf = []; while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || !lines[i + 1].trim())) buf.push(lines[++i].trim()); fm[key] = buf.join(v[0] === '|' ? '\n' : ' ').trim(); }
      else if (v.startsWith('[') && (!v.startsWith('[[') || v.startsWith('[[['))) {
        let buf = v;
        while (!/\]\s*(#.*)?$/.test(buf) && i + 1 < lines.length) buf += ' ' + lines[++i].trim();
        const inner = buf.slice(1, buf.lastIndexOf(']'));
        fm[key] = splitFlow(inner).map(scalar).filter(Boolean);
      } else fm[key] = scalar(v);
      continue;
    }
    const li = line.match(/^\s*-\s+(.*)$/);
    if (li && key) { if (!Array.isArray(fm[key])) fm[key] = []; const s = scalar(li[1]); if (s) fm[key].push(s); }
  }
  return { fm, body, raw, has: true, dupKeys };
}
const asList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const tagsOf = (fm) => asList(fm.tags).map((t) => String(t).replace(/^#/, '').trim()).filter(Boolean);
const typeOf = (fm) => tagsOf(fm).find((t) => t.startsWith('type/')) || null;

// ---------- links ----------
function stripNonContent(t) { return t.replace(/(```|~~~)[\s\S]*?\1/g, '').replace(/`[^`\n]*`/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/%%[\s\S]*?%%/g, ''); }
const ILLUSTRATIVE = new Set(['wikilink', 'note', 'person', 'project', 'owner', 'decider', 'parent or moc', 'team']);
function wikilinks(text) {
  const out = [];
  const re = /!?\[\[([^\]|#\\\n]+)(?:#[^\]|\n]*)?(?:\\?\|[^\]\n]*)?\]\]/g;
  let m;
  while ((m = re.exec(text))) { const t = m[1].trim(); if (t && !/^\{\{/.test(t) && !ILLUSTRATIVE.has(t.toLowerCase())) out.push(t); }
  return out;
}
const FM_LINK_KEYS = ['up', 'related', 'project', 'owner', 'company', 'works_at', 'customer', 'source', 'decider', 'reports_to', 'manages', 'customer_of', 'partner_of', 'competitor_of', 'backed_by', 'attendees', 'participants', 'person', 'supersedes', 'superseded_by'];
const fmLinks = (fm) => FM_LINK_KEYS.flatMap((k) => asList(fm[k])).flatMap((v) => wikilinks(String(v)));
const linkCount = (fm, body) => new Set([...wikilinks(stripNonContent(body)), ...fmLinks(fm)]).size;
const nkey = (s) => s.normalize('NFC').toLowerCase();
function buildNameIndex(files) {
  const byName = new Set(), byPath = new Set(), aliases = new Set();
  for (const f of files) { const noExt = f.replace(/\.md$/, ''); byPath.add(nkey(noExt)); byName.add(nkey(path.posix.basename(noExt))); }
  return { byName, byPath, aliases };
}
function resolveLink(target, idx) {
  if (/\.[A-Za-z0-9]{2,5}$/.test(target) && !/\.md$/i.test(target)) return true; // attachment
  const t = nkey(target.replace(/\.md$/i, ''));
  return idx.byPath.has(t) || idx.byName.has(path.posix.basename(t)) || idx.aliases.has(t);
}

// ---------- notes model ----------
function loadNotes() {
  const files = walk(ROOT);
  const notes = [];
  for (const rel of files) {
    let text = '';
    try { text = read(rel); } catch { continue; }
    const { fm, body, has, dupKeys } = parseFrontmatter(text);
    notes.push({ rel, fm, body, text, has, dupKeys, tags: tagsOf(fm), type: typeOf(fm), links: wikilinks(stripNonContent(body)), fmLinks: fmLinks(fm) });
  }
  const idx = buildNameIndex(files);
  for (const n of notes) for (const a of asList(n.fm.aliases)) idx.aliases.add(nkey(String(a)));
  return { notes, idx };
}
const isTemplatePath = (rel) => rel.startsWith('_system/templates/');
const isExempt = (rel) => !rel.includes('/') || rel.startsWith('.') || rel.startsWith('_system/agent/') || rel === '_system/log.md' || /(^|\/)README\.md$/.test(rel);
const isLiving = (rel) => matchesAny(rel, CFG.living_docs) && !/\/README\.md$/.test(rel);
const isSample = (n) => String(n.fm.sample) === 'true';

// ---------- registry ----------
function registeredTags() {
  const set = new Set();
  try {
    const t = read('_system/_tags.md');
    for (const m of t.matchAll(/`((?:type|domain|crm|customer|product)\/[a-z0-9\-]+)`/g)) set.add(m[1]);
    for (const m of t.matchAll(/`((?:customer|product)\/\*)`/g)) set.add(m[1]);
    const crmRow = t.match(/`crm\/\*`\s*\|\s*`([^`]+)`/);
    if (crmRow) for (const v of crmRow[1].split('·')) set.add('crm/' + v.trim());
  } catch {}
  return set;
}
const tagRegistered = (tag, reg) => reg.has(tag) || reg.has(tag.split('/')[0] + '/*');

// ---------- dates ----------
function parseDay(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  const d = Date.parse(String(s)); return Number.isNaN(d) ? null : d;
}
function daysSince(s) { const d = parseDay(s); if (d == null) return null; const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((t.getTime() - d) / DAY); }
function daysUntil(s) { const v = daysSince(s); return v == null ? null : -v; }

// ---------- checks ----------
function checkStale(notes) {
  const out = [];
  for (const n of notes) {
    if (isArchived(n.rel) || isTemplatePath(n.rel)) continue;
    const living = isLiving(n.rel);
    if (!living && !n.fm.review_due) continue;
    if (living && n.type && n.type !== 'type/note' && !n.fm.owner) out.push({ rel: n.rel, issue: 'missing owner', owner: null, due: null, days: null });
    if (living && !n.fm.review_due) { out.push({ rel: n.rel, issue: 'missing review_due', owner: n.fm.owner || null, due: null, days: null }); continue; }
    const due = n.fm.review_due;
    if (/\{\{/.test(String(due))) { if (living) out.push({ rel: n.rel, issue: 'review_due is a placeholder', owner: n.fm.owner || null, due: String(due), days: null }); continue; }
    const left = daysUntil(due);
    if (left == null) { out.push({ rel: n.rel, issue: `unparseable review_due "${due}"`, owner: n.fm.owner || null, due, days: null }); continue; }
    if (left < 0) {
      const cad = CFG.review_cadence_days[n.type] ?? 90;
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
    for (const [l, where] of [...n.links.map((l) => [l, 'body']), ...n.fmLinks.map((l) => [l, 'frontmatter'])]) {
      if (seen.has(l)) continue; seen.add(l);
      if (!resolveLink(l, idx)) out.push({ rel: n.rel, link: l, where });
    }
  }
  return out;
}
function checkOrphans(notes) {
  const out = [];
  for (const n of notes) {
    if (isArchived(n.rel) || isReadonly(n.rel) || isExempt(n.rel) || n.rel.startsWith('_system/') || n.rel.startsWith('Journal/') || n.rel.startsWith('_inbox/')) continue;
    const total = new Set([...n.links, ...n.fmLinks]).size;
    if (total < 2) out.push({ rel: n.rel, links: total });
  }
  return out;
}
function checkTags(notes) {
  const reg = registeredTags();
  const missing = [], unregistered = [], malformed = [], tooMany = [];
  for (const n of notes) {
    if (isArchived(n.rel) || isReadonly(n.rel) || isExempt(n.rel) || isTemplatePath(n.rel) || n.rel.startsWith('_inbox/')) continue;
    if (n.tags.length === 0) { missing.push({ rel: n.rel }); continue; }
    if (!n.type) malformed.push({ rel: n.rel, tag: '(no type/* tag)' });
    if (n.tags.filter((t) => t.startsWith('type/')).length > 1) malformed.push({ rel: n.rel, tag: '(more than one type/* tag)' });
    if (n.tags.length > 4) tooMany.push({ rel: n.rel, count: n.tags.length });
    for (const t of n.tags) {
      if (/\{\{/.test(t)) continue;
      if (!/^[a-z0-9\-]+\/[a-z0-9\-]+$/.test(t)) { malformed.push({ rel: n.rel, tag: t }); continue; }
      if (reg.size && !tagRegistered(t, reg)) unregistered.push({ rel: n.rel, tag: t });
    }
  }
  return { missing, unregistered, malformed, tooMany };
}
const CONTENT_FOLDERS = ['_inbox', 'Input', 'Knowledge', 'CRM', 'Decisions', 'Active', 'Output', 'Journal', 'Resources', '_system'];
function checkRoot() {
  const out = [];
  for (const e of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    if (e.isDirectory()) { if (!CONTENT_FOLDERS.includes(e.name)) out.push({ name: e.name + '/', kind: 'folder' }); }
    else if (!CFG.root_allowlist.includes(e.name)) out.push({ name: e.name, kind: 'file' });
  }
  return out;
}
function checkSecrets(notes) {
  const { ok, bad } = compilePatterns(CFG.secret_patterns);
  const out = [];
  for (const n of notes) {
    if (isArchived(n.rel)) continue;
    for (const re of ok) { const m = n.text.match(re); if (m) { out.push({ rel: n.rel, match: m[0].slice(0, 4) + '…' }); break; } }
  }
  return { found: out, badPatterns: bad };
}
function checkRules() {
  const dir = path.join(ROOT, '_system/memory/rules');
  if (!fs.existsSync(dir)) return { count: 0, over: false };
  const count = fs.readdirSync(dir).filter((f) => /^rule-.*\.md$/.test(f)).length;
  return { count, over: count > CFG.max_rules };
}
function checkOpenLoops() {
  let t;
  try { t = read('_system/memory/open-loops.md'); } catch { return { closed: 0, open: 0, due: [] }; }
  t = t.replace(/(```|~~~)[\s\S]*?\1/g, ''); // the format example is not a loop
  const blocks = t.split(/^## (?=loop-)/m).slice(1).map((b) => { const nl = b.indexOf('\n'); return { id: (nl < 0 ? b : b.slice(0, nl)).trim(), body: nl < 0 ? '' : b.slice(nl + 1) }; });
  const due = []; let closed = 0, open = 0;
  for (const b of blocks) {
    const get = (k) => (b.body.match(new RegExp(`^- ${k}: (.+)$`, 'm')) || [])[1]?.trim();
    if (get('status') === 'closed') { closed++; continue; }
    open++;
    const r = daysUntil(get('resurface')), d = daysUntil(get('due'));
    if ((r != null && r <= 0) || (d != null && d <= 3)) due.push({ id: b.id, title: get('title') || b.id, owner: get('owner') || '', resurface: get('resurface'), due: get('due') });
  }
  return { closed, open, due };
}
function checkDecisions(notes) {
  const stuck = []; let proposed = 0, accepted = 0;
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
  const live = notes.filter((n) => !isArchived(n.rel) && !isReadonly(n.rel) && !/\/README\.md$/.test(n.rel));
  const input = live.filter((n) => n.rel.startsWith('Input/')).length;
  const knowledge = live.filter((n) => n.rel.startsWith('Knowledge/')).length;
  return { input, knowledge, ratio: knowledge ? +(input / knowledge).toFixed(2) : null };
}
function placeholders(notes) {
  const out = [];
  for (const n of notes) {
    if (isArchived(n.rel) || isTemplatePath(n.rel)) continue;
    const m = stripNonContent(n.text).match(/\{\{[a-z\-_ ]+\}\}/);
    if (m) out.push({ rel: n.rel, placeholder: m[0] });
  }
  return out;
}
function openProposals(notes) {
  return notes.filter((n) => n.rel.startsWith('_system/reports/proposals/') && !/\/README\.md$/.test(n.rel) && !['applied', 'rejected', 'done', 'closed'].includes(String(n.fm.status || 'open')))
    .map((n) => ({ rel: n.rel, owner: n.fm.owner || null, days: daysSince(n.fm.date || n.fm.created) }));
}

// ---------- health ----------
function health() {
  const { notes, idx } = loadNotes();
  const live = notes.filter((n) => !isArchived(n.rel));
  const secrets = checkSecrets(notes);
  const r = {
    date: today(), notes: live.length,
    root: checkRoot(), secrets: secrets.found, stale: checkStale(notes), links: checkLinks(notes, idx), orphans: checkOrphans(notes),
    tags: checkTags(notes), rules: checkRules(), loops: checkOpenLoops(), decisions: checkDecisions(notes), mocs: checkMocs(notes),
    ratio: ratio(notes), placeholders: placeholders(notes), samples: live.filter(isSample).map((n) => n.rel),
    duplicateKeys: live.filter((n) => n.dupKeys.length).map((n) => ({ rel: n.rel, keys: n.dupKeys })), proposals: openProposals(notes),
  };
  const errors = [], warnings = [];
  if (r.root.length) errors.push(`root intrusion: ${r.root.map((x) => x.name).join(', ')}`);
  if (r.secrets.length) errors.push(`possible secrets in ${r.secrets.length} note(s): ${r.secrets.slice(0, 3).map((x) => x.rel).join(', ')}`);
  if (secrets.badPatterns.length) errors.push(`invalid secret_patterns in brain.config.json (not applied): ${secrets.badPatterns.join(', ')}`);
  if (r.rules.over) errors.push(`rules: ${r.rules.count} over the cap of ${CFG.max_rules}`);
  if (r.links.length) warnings.push(`${r.links.length} broken wikilink(s)`);
  if (r.orphans.length) warnings.push(`${r.orphans.length} orphan(s) with fewer than 2 links`);
  if (r.tags.missing.length) warnings.push(`${r.tags.missing.length} note(s) without tags`);
  if (r.tags.unregistered.length) warnings.push(`${r.tags.unregistered.length} unregistered tag use(s)`);
  if (r.tags.malformed.length) warnings.push(`${r.tags.malformed.length} malformed tag(s) or type/* problems`);
  if (r.tags.tooMany.length) warnings.push(`${r.tags.tooMany.length} note(s) with more than 4 tags`);
  const staleReal = r.stale.filter((s) => s.issue.startsWith('stale'));
  const staleMeta = r.stale.filter((s) => !s.issue.startsWith('stale'));
  if (staleReal.length) warnings.push(`${staleReal.length} living document(s) past review_due`);
  if (staleMeta.length) warnings.push(`${staleMeta.length} living document(s) with missing or invalid owner/review_due`);
  if (r.loops.closed) warnings.push(`${r.loops.closed} closed loop(s) still in open-loops.md`);
  if (r.decisions.stuck.length) warnings.push(`${r.decisions.stuck.length} decision(s) proposed for more than 14 days`);
  if (r.mocs.length) warnings.push(`domain(s) over ${CFG.moc_threshold} notes without a MOC: ${r.mocs.map((m) => m.domain).join(', ')}`);
  if (r.ratio.ratio != null && r.ratio.ratio > CFG.input_knowledge_ratio_warn) warnings.push(`Input:Knowledge ratio ${r.ratio.ratio} above ${CFG.input_knowledge_ratio_warn}: promotion is the bottleneck`);
  if (r.duplicateKeys.length) warnings.push(`${r.duplicateKeys.length} note(s) with duplicate frontmatter keys (a merge kept both sides)`);
  if (r.placeholders.length) warnings.push(`${r.placeholders.length} note(s) still carry {{placeholders}}`);
  if (r.samples.length) warnings.push(`${r.samples.length} sample note(s) from the template are still live (\`brain samples --archive\` when the real ones exist)`);
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
  lines.push(`- Broken links: ${ex(r.links, (l) => `${l.rel} → [[${l.link}]]${l.where === 'frontmatter' ? ' (frontmatter)' : ''}`)}`);
  lines.push(`- Orphans: ${ex(r.orphans, (o) => o.rel)}`);
  lines.push(`- Unregistered tags: ${ex(r.tags.unregistered, (t) => `${t.tag} in ${t.rel}`)}`);
  lines.push(`- Malformed: ${ex(r.tags.malformed, (t) => `${t.tag} in ${t.rel}`)}`);
  lines.push(`- Rules: ${r.rules.count}/${CFG.max_rules} · Decisions: ${r.decisions.accepted} accepted, ${r.decisions.proposed} proposed · Loops open: ${r.loops.open}, due now: ${r.loops.due.length} · Proposals open: ${r.proposals.length}`);
  lines.push(`- Input:Knowledge: ${r.ratio.input}:${r.ratio.knowledge} = ${r.ratio.ratio ?? 'n/a'}`);
  if (r.placeholders.length) lines.push(`- Placeholders: ${ex(r.placeholders, (p) => `${p.placeholder} in ${p.rel}`)}`);
  if (r.duplicateKeys.length) lines.push(`- Duplicate keys: ${ex(r.duplicateKeys, (d) => `${d.keys.join(', ')} in ${d.rel}`)}`);
  lines.push('', 'Safe to fix mechanically: index drift (`brain index --write`), a malformed tag with one registered replacement, missing `up:` where the folder implies it. Everything else is a person\'s call.');
  return lines.join('\n');
}

// ---------- brief ----------
function brief() {
  const r = health();
  const lines = [];
  const stale = r.stale.filter((s) => s.issue.startsWith('stale'));
  lines.push(`Brain: ${CFG.company} · ${r.notes} notes · health ${r.status.toUpperCase()}${r.errors.length ? ' (' + r.errors.join('; ') + ')' : ''}`);
  lines.push(stale.length ? `Stale living documents (${stale.length}): ` + stale.slice(0, 5).map((s) => `${path.basename(s.rel, '.md')} (${s.days}d, ${s.owner || 'no owner'})`).join(', ') : 'Stale living documents: none');
  if (r.loops.due.length) lines.push(`Loops due or resurfacing (${r.loops.due.length}): ` + r.loops.due.slice(0, 5).map((l) => `${l.title} (${l.owner || '?'})`).join('; '));
  const inboxDir = path.join(ROOT, '_inbox');
  const inbox = fs.existsSync(inboxDir) ? fs.readdirSync(inboxDir).filter((f) => !f.startsWith('.') && f !== 'README.md').length : 0;
  lines.push(`Inbox: ${inbox} item(s) · proposed decisions: ${r.decisions.proposed} · open proposals: ${r.proposals.length}${r.proposals.length ? ' (oldest ' + Math.max(...r.proposals.map((p) => p.days || 0)) + 'd)' : ''}`);
  const weekly = path.join(ROOT, 'Journal/Weekly');
  if (fs.existsSync(weekly)) { const w = fs.readdirSync(weekly).filter((f) => /^\d{4}-W\d{2}\.md$/.test(f)).sort().pop(); lines.push(`Last weekly review: ${w ? w.replace('.md', '') : 'none yet'}`); }
  try { const fm = parseFrontmatter(read('_system/agent/NOW.md')).fm; const left = daysUntil(fm.review_due); if (left != null && left < 0) lines.push(`NOW.md is ${-left} day(s) past its review: verify with its owner before relying on it`); } catch {}
  if (r.warnings.length) lines.push(`Attention: ${r.warnings.slice(0, 4).join('; ')}`);
  const held = readHold();
  if (held) lines.push(`Routine held: ${held} Review with git status; brain sync releases it.`);
  const st = setupStatus(r);
  if (st.left.length) lines.push(`Setup: ${st.left.length} step(s) left, next: ${st.left[0].label}. Offer the setup skill (company-brain:setup) before other work.`);
  return lines.join('\n');
}

// ---------- index ----------
function buildIndices(notes) {
  const out = {};
  const live = notes.filter((n) => !isArchived(n.rel) && !isTemplatePath(n.rel));
  const hdr = (title, extra) => `---\ntags:\n  - type/index\nlast_updated: ${today()}\ncreated_by: brain-script\n---\n# ${title}\n\n${extra}\n`;
  const base = (n) => path.basename(n.rel, '.md');
  const projects = live.filter((n) => n.type === 'type/project');
  const groups = { active: [], backlog: [], paused: [], done: [] };
  for (const p of projects) (groups[String(p.fm.status || 'backlog')] || groups.backlog).push(p);
  const desc = (p) => { const m = p.body.match(/^>\s*(.+)$/m); return m ? m[1].trim() : ''; };
  let s = hdr('Project index', 'Regenerated by `brain index` from `Active/Projects/*/*.md`. Do not edit by hand. Entry: `[[Project]] · owner · status · one line · last updated`.');
  for (const g of ['active', 'backlog', 'paused', 'done']) {
    s += `\n## ${g[0].toUpperCase() + g.slice(1)}\n\n`;
    for (const p of groups[g].sort((a, b) => a.rel.localeCompare(b.rel))) s += `- [[${base(p)}]] · ${p.fm.owner || 'no owner'} · ${p.fm.status || ''} · ${desc(p)} · last updated ${p.fm.last_updated || p.fm.last_verified || ''}\n`;
  }
  out['_system/indices/project-index.md'] = s;
  const people = live.filter((n) => n.type === 'type/person');
  const relOfP = (p) => (p.tags.find((t) => t.startsWith('crm/')) || 'crm/other').slice(4);
  s = hdr('People index', 'Regenerated by `brain index` from `CRM/People/`. Do not edit by hand. Grouped by `crm/*`.');
  const pg = {};
  for (const p of people) (pg[relOfP(p)] = pg[relOfP(p)] || []).push(p);
  for (const g of Object.keys(pg).sort()) {
    s += `\n## ${g[0].toUpperCase() + g.slice(1)}\n\n`;
    for (const p of pg[g].sort((a, b) => a.rel.localeCompare(b.rel))) s += `- [[${base(p)}]] · ${p.fm.role || ''}${p.fm.company ? ' at ' + p.fm.company : ''}${p.fm.owner ? ' · owner ' + p.fm.owner : ''}\n`;
  }
  out['_system/indices/people-index.md'] = s;
  const cos = live.filter((n) => n.type === 'type/company');
  s = hdr('Companies index', 'Regenerated by `brain index` from `CRM/Companies/`. Do not edit by hand. Grouped by `stage`.');
  const cg = {};
  for (const c of cos) { const st = String(c.fm.stage || 'other'); (cg[st] = cg[st] || []).push(c); }
  for (const g of Object.keys(cg).sort()) {
    s += `\n## ${g[0].toUpperCase() + g.slice(1)}\n\n`;
    for (const c of cg[g].sort((a, b) => a.rel.localeCompare(b.rel))) s += `- [[${base(c)}]] · ${c.fm.industry || ''}${c.fm.since ? ' · since ' + c.fm.since : ''}${c.fm.owner ? ' · owner ' + c.fm.owner : ''}\n`;
  }
  out['_system/indices/companies-index.md'] = s;
  const dec = live.filter((n) => n.type === 'type/decision').sort((a, b) => String(b.fm.decided || '').localeCompare(String(a.fm.decided || '')));
  s = hdr('Decisions index', 'Regenerated by `brain index` from `Decisions/`, newest first. Do not edit by hand. Entry: `date · title · status · decider · project`.') + '\n';
  for (const d of dec) s += `- ${d.fm.decided || ''} · [[${base(d)}]] · ${d.fm.status || ''} · ${d.fm.decider || ''} · ${d.fm.project || 'none'}\n`;
  out['_system/indices/decisions-index.md'] = s;
  const domains = [...registeredTags()].filter((t) => t.startsWith('domain/')).sort();
  s = hdr('Domain index', 'Regenerated by `brain index`. Do not edit by hand. Domains are tags `#domain/*`. Each row: the tag, the `Knowledge/` folder, the MOC if it exists, note counts across the brain.') + '\n| Domain | Folder | MOC | Notes |\n|---|---|---|---|\n';
  const kdir = path.join(ROOT, 'Knowledge');
  const kfolders = fs.existsSync(kdir) ? fs.readdirSync(kdir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : [];
  for (const d of domains) {
    const name = d.slice(7);
    const folder = kfolders.find((f) => f.toLowerCase() === name);
    const moc = folder ? (fs.readdirSync(path.join(kdir, folder)).find((f) => f.startsWith('_MOC ')) || '') : '';
    const count = live.filter((n) => n.tags.includes(d)).length;
    s += `| \`${d}\` | ${folder ? '`Knowledge/' + folder + '/`' : ''} | ${moc ? '[[' + moc.replace('.md', '') + ']]' : ''} | ${count} |\n`;
  }
  out['_system/indices/domain-index.md'] = s;
  return out;
}
function indexCmd() {
  const built = buildIndices(loadNotes().notes);
  let changed = 0;
  const strip = (t) => norm(t).replace(/^last_updated: .*$/m, '');
  for (const [rel, content] of Object.entries(built)) {
    const p = path.join(ROOT, rel);
    const cur = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    const same = strip(cur) === strip(content);
    if (!same) { changed++; if (flag('--write')) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); } }
    console.log(`${same ? '=' : flag('--write') ? 'W' : '~'} ${rel}`);
  }
  if (flag('--write') && changed) appendLog('index', `regenerated ${changed} index file(s)`, 'brain-script');
  console.log(changed ? (flag('--write') ? `${changed} index file(s) written.` : `${changed} index file(s) differ. Run with --write to apply.`) : 'Indices are current.');
}

// ---------- new ----------
const TEMPLATE_BY_TYPE = { living: 'Living Document', project: 'Project', decision: 'Decision', meeting: 'Meeting', person: 'Person', company: 'Company', concept: 'Concept', feedback: 'Feedback', conversation: 'Conversation', playbook: 'Playbook', daily: 'Daily', weekly: 'Weekly Review' };
const DEST_BY_TYPE = { living: 'Knowledge/Company', decision: 'Decisions', meeting: 'Input/Meetings', person: 'CRM/People', company: 'CRM/Companies', feedback: 'Input/Feedback', conversation: 'Input/Conversations', playbook: 'Resources/Playbooks' };
const BAD_TITLE = /[\\/:*?"<>|#^[\]]/;
function fail(msg) { console.error(msg); process.exit(1); }
function newCmd() {
  const [type, ...rest] = positional();
  const title = rest.join(' ').trim();
  if (!type || !TEMPLATE_BY_TYPE[type]) fail(`usage: brain new <${Object.keys(TEMPLATE_BY_TYPE).join('|')}> "Title"`);
  if (!title && !['daily', 'weekly'].includes(type)) fail('a title is required');
  if (title && (BAD_TITLE.test(title) || title.startsWith('.'))) fail(`"${title}" cannot be a note title: it may not start with a dot or contain \\ / : * ? " < > | # ^ [ ]. They break links or file names.`);
  if (/\.md$/i.test(title)) fail(`"${title}" cannot be a note title: it ends in .md, so the file would be "${title}.md" and links to it break. Drop the extension or reword it (for example "file CLAUDE").`);
  const date = opt('--date') || today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('--date must be YYYY-MM-DD');
  const tpl = path.join(ROOT, '_system/templates', TEMPLATE_BY_TYPE[type] + '.md');
  if (!fs.existsSync(tpl)) fail(`template missing: _system/templates/${TEMPLATE_BY_TYPE[type]}.md`);
  let text = norm(fs.readFileSync(tpl, 'utf8'));
  const clean = (v) => String(v || '').trim().replace(/^"(.*)"$/, '$1').replace(/^\[\[(.*)\]\]$/, '$1').trim();
  const link = (v) => (v ? `"[[${v}]]"` : '');
  const domain = (opt('--domain') || 'product').toLowerCase();
  const kdir = path.join(ROOT, 'Knowledge');
  const domainFolder = (fs.existsSync(kdir) && fs.readdirSync(kdir).find((f) => f.toLowerCase() === domain)) || domain[0].toUpperCase() + domain.slice(1);
  const cad = CFG.review_cadence_days;
  const cadence = type === 'project' ? cad['type/project'] : type === 'playbook' ? cad['type/playbook'] : cad['type/living'];
  const owner = clean(opt('--owner')), project = clean(opt('--project')), company = clean(opt('--company')), customer = clean(opt('--customer'));
  const src = String(opt('--source') || '').trim();
  const moc = `_MOC ${domainFolder}`;
  const vars = {
    title, today: today(), date, domain, domain_title: domainFolder,
    owner, owner_link: link(owner), owner_ref: owner ? `[[${owner}]]` : 'to verify', decider_link: link(owner),
    project, project_link: project ? link(project) : 'none',
    source_link: !src ? '' : /^\[\[.*\]\]$/.test(src.replace(/^"|"$/g, '')) ? link(clean(src)) : JSON.stringify(src),
    company_link: link(company), customer_link: link(customer),
    up_link: fs.existsSync(path.join(kdir, domainFolder, moc + '.md')) ? link(moc) : '',
    relationship: opt('--relationship') || 'other', channel: opt('--channel') || 'email', area: opt('--area') || 'core',
    review_due: addDays(cadence ?? 90), week: isoWeek(new Date(parseDay(date))),
  };
  text = text.replace(/\{\{([a-z_]+)\}\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  let dest;
  if (type === 'project') dest = `Active/Projects/${title}/${title}.md`;
  else if (type === 'concept') dest = `Knowledge/${domainFolder}/${title}.md`;
  else if (type === 'daily') dest = `Journal/Daily/${date}.md`;
  else if (type === 'weekly') dest = `Journal/Weekly/${vars.week}.md`;
  else if (['decision', 'meeting', 'feedback', 'conversation'].includes(type)) dest = `${DEST_BY_TYPE[type]}/${date} ${title}.md`;
  else dest = `${DEST_BY_TYPE[type]}/${title}.md`;
  const p = path.join(ROOT, dest);
  const relCheck = path.relative(ROOT, p);
  if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) fail(`refusing to write outside the brain: ${dest}`);
  if (fs.existsSync(p) && !flag('--force')) fail(`exists: ${dest} (use --force to overwrite)`);
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
function setFrontmatter(text, pairs) {
  const t = norm(text);
  const m = t.match(/^---[ \t]*\n([\s\S]*?)\n?---[ \t]*(?:\n|$)/);
  if (!m) return null;
  let raw = m[1];
  for (const [k, v] of pairs) {
    const re = new RegExp(`^${k}:.*$`, 'm');
    raw = re.test(raw) ? raw.replace(re, `${k}: ${v}`) : `${raw}\n${k}: ${v}`;
  }
  return `---\n${raw.replace(/^\n/, '')}\n---\n${t.slice(m[0].length)}`;
}
function verifyCmd() {
  const q = positional().join(' ').trim();
  if (!q) fail('usage: brain verify <note path or title> [--by "[[Person]]"]');
  const { notes } = loadNotes();
  const live = notes.filter((x) => !isArchived(x.rel));
  let hits = live.filter((x) => x.rel === q || x.rel === q + '.md');
  if (!hits.length) hits = live.filter((x) => path.basename(x.rel, '.md').toLowerCase() === q.toLowerCase());
  if (!hits.length) fail(`note not found: ${q}`);
  if (hits.length > 1) fail(`"${q}" matches ${hits.length} notes, pass the path: ${hits.map((h) => h.rel).join(', ')}`);
  const n = hits[0];
  if (!n.has) fail(`${n.rel} has no frontmatter: add owner and review_due first`);
  const cad = CFG.review_cadence_days[n.type] ?? 90;
  const d = today(), due = addDays(cad);
  const by = clean2(opt('--by'));
  const pairs = [['last_verified', d], ['review_due', due], ['last_updated', d]];
  if (by) pairs.push(['last_edited_by', `"[[${by}]]"`]);
  fs.writeFileSync(path.join(ROOT, n.rel), setFrontmatter(n.text, pairs));
  appendLog('verify', `${n.rel} verified${by ? ' by [[' + by + ']]' : ''}, next review ${due}`, by || 'owner');
  console.log(`Verified ${n.rel}: last_verified ${d}, review_due ${due} (cadence ${cad}d for ${n.type || 'unknown type'})`);
}
function clean2(v) { return String(v || '').trim().replace(/^"(.*)"$/, '$1').replace(/^\[\[(.*)\]\]$/, '$1').trim(); }

// ---------- log ----------
function stampNow() { const d = new Date(); return `${ymd(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function appendLog(op, title, actor, result) {
  if (!ROOT) return;
  const p = path.join(ROOT, '_system/log.md');
  const line = `## [${stampNow()}] ${op} | ${String(title).replace(/\n/g, ' ')} | ${actor || 'agent'}${result ? ' | ' + result : ''}\n`;
  try { fs.appendFileSync(p, (fs.existsSync(p) && !fs.readFileSync(p, 'utf8').endsWith('\n') ? '\n' : '') + line); } catch {}
}
function logCmd() {
  const [op, ...t] = positional();
  if (!op) fail('usage: brain log <op> "title" [--actor name] [--result answered|gap|stale]');
  const result = opt('--result');
  if (result && !['answered', 'gap', 'stale', 'partial'].includes(result)) fail('--result must be answered, partial, gap or stale');
  appendLog(op, t.join(' '), opt('--actor'), result);
  console.log('logged');
}
function readLog(days) {
  let t = ''; try { t = read('_system/log.md'); } catch { return []; }
  const out = [];
  for (const line of t.split('\n')) {
    const m = line.match(/^## \[(\d{4}-\d{2}-\d{2})[^\]]*\] ([^|]+?) \| (.*?) \| ([^|]*?)(?: \| (\w+))?\s*$/);
    if (!m) continue;
    const age = daysSince(m[1]);
    if (age != null && age >= 0 && age <= days) out.push({ date: m[1], op: m[2].trim(), title: m[3].trim(), actor: m[4].trim(), result: m[5] || null, age });
  }
  return out;
}

// ---------- run (automation prompt) ----------
function automationFile(name, usage) {
  if (!name || BAD_TITLE.test(name)) fail(usage);
  const dir = path.join(ROOT, '_system/automations');
  if (!fs.existsSync(dir)) fail('no _system/automations/ folder in this brain.');
  const p = path.join(dir, `${name}.md`);
  if (!fs.existsSync(p)) fail(`automation not found: ${name}. Available: ${fs.readdirSync(path.join(ROOT, '_system/automations')).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => f.slice(0, -3)).join(', ')}`);
  return parseFrontmatter(fs.readFileSync(p, 'utf8'));
}
function runCmd() { console.log(runPrompt(positional()[0], 'usage: brain run <automation>')); }
function runPrompt(name, usage) {
  const { fm, body } = automationFile(name, usage);
  const mode = ['report', 'propose', 'act'].includes(fm.mode) ? fm.mode : 'report';
  const scope = asList(fm.scope);
  const modeText = {
    report: 'write your output to _system/reports/ (or where the automation says) and one run line in today\'s daily note under ## Agents. Change nothing else.',
    propose: 'write proposals to _system/reports/proposals/ (frontmatter `status: open`, `owner:` the person who decides, `date:`), the files the automation names, and one run line in today\'s daily note under ## Agents. Change nothing else.',
    act: 'apply changes only inside the scope globs, then one line in _system/log.md and one run line in today\'s daily note under ## Agents.',
  }[mode];
  return (`# Automation: ${fm.name || name}\nMode: ${mode} · Enabled: ${fm.enabled} · When: ${asList(fm.when).join(', ')}\nScope (files this run may write): ${scope.length ? scope.join(', ') : 'the report only'}\n\nYou are running unattended, with nobody to answer questions. Mode "${mode}": ${modeText}\nFollow AGENTS.md. Never invent. Never delete a file. Do not commit or push: the scheduler that runs you checks the scope (brain scope ${name}) and decides how changes land.\n\n---\n\n${body.trim()}`);
}

// ---------- search ----------
function searchCmd() {
  const q = positional().join(' ').toLowerCase();
  if (!q) fail('usage: brain search "query"');
  const lim = parseInt(opt('--limit') || '15', 10);
  const limit = Number.isFinite(lim) && lim > 0 ? lim : 15;
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
    if (isSample(n)) s *= 0.3;
    return s;
  };
  const hits = notes.map((n) => ({ n, s: score(n) })).filter((h) => h.s > 0).sort((a, b) => b.s - a.s).slice(0, limit);
  if (!hits.length) { console.log('No hits in the brain. Say so, name where you looked, and go to connected sources or the web.'); return; }
  for (const h of hits) {
    const line = h.n.body.split('\n').find((l) => terms.some((t) => l.toLowerCase().includes(t))) || '';
    const flags = [h.n.fm.review_due && daysUntil(h.n.fm.review_due) < 0 ? 'stale' : '', h.n.fm.confidentiality && h.n.fm.confidentiality !== 'internal' ? h.n.fm.confidentiality : '', isSample(h.n) ? 'sample' : ''].filter(Boolean);
    console.log(`${h.s.toFixed(0).padStart(3)}  ${h.n.rel}${flags.length ? '  [' + flags.join(', ') + ']' : ''}\n      ${line.trim().slice(0, 140)}`);
  }
}

// ---------- git ----------
function gitRun(a) { const r = spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' }); return { ok: r.status === 0, out: r.stdout || '', err: (r.stderr || '') + (r.error ? r.error.message : '') }; }
const git = (a) => { const r = gitRun(a); return r.ok ? r.out : ''; };

// ---------- metrics ----------
function metrics() {
  const r = health();
  const { notes } = loadNotes();
  const isGit = gitRun(['rev-parse', '--is-inside-work-tree']).ok;
  const changed = (since, until) => new Set(git(['log', `--since=${since}`, ...(until ? [`--until=${until}`] : []), '--no-merges', '--name-only', '--relative', '--format=', '--', '.']).split('\n').filter((l) => l.endsWith('.md') && !l.startsWith('_system/reports') && !l.startsWith('Journal/') && !l.startsWith('_system/log')));
  const inLast = (s, days) => { const d = daysSince(s); return d != null && d >= 0 && d <= days; };
  const added7 = git(['log', '--since=7 days ago', '--diff-filter=A', '--name-only', '--relative', '--format=', '--', '.']).split('\n').filter(Boolean);
  const subjects = git(['log', '--since=7 days ago', '--format=%s']);
  const log7 = readLog(7), log30 = readLog(30);
  const asks = log7.filter((l) => l.op === 'ask');
  const normQ = (s) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();
  const qCount = {};
  for (const l of log30.filter((x) => x.op === 'ask')) { const k = normQ(l.title); qCount[k] = (qCount[k] || 0) + 1; }
  const m = {
    week: isoWeek(new Date()), git: isGit,
    notes_updated: isGit ? changed('7 days ago').size : null, notes_updated_prev: isGit ? changed('14 days ago', '7 days ago').size : null,
    decisions_recorded: notes.filter((n) => n.type === 'type/decision' && !isArchived(n.rel) && inLast(n.fm.decided, 7)).length,
    meetings_with_minutes: notes.filter((n) => n.type === 'type/meeting' && !isArchived(n.rel) && inLast(n.fm.date, 7)).length,
    meetings_synced: added7.filter((f) => f.startsWith('Input/Meetings/') && matchesAny(f, CFG.readonly) && !/README\.md$/.test(f)).length,
    questions_asked: asks.length, questions_answered: asks.filter((a) => a.result === 'answered').length,
    questions_gap: asks.filter((a) => a.result === 'gap' || a.result === 'partial').length, questions_stale: asks.filter((a) => a.result === 'stale').length,
    repeated_questions: Object.entries(qCount).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([q, c]) => ({ question: q, times: c })),
    living_stale: r.stale.filter((s) => s.issue.startsWith('stale')).length, proposals_open: r.proposals.length,
    input_knowledge: r.ratio.ratio, agent_commits: (subjects.match(/^brain:/gm) || []).length, reverts: (subjects.match(/^revert/gim) || []).length, health: r.status,
  };
  if (flag('--json')) return console.log(JSON.stringify(m, null, 2));
  const na = (v) => (v == null ? 'n/a (not git)' : v);
  const rate = m.questions_asked ? Math.round((100 * m.questions_answered) / m.questions_asked) + '%' : 'n/a';
  console.log(`| Metric | This week | Last week |\n|---|---|---|\n| Notes updated | ${na(m.notes_updated)} | ${na(m.notes_updated_prev)} |\n| Decisions recorded | ${m.decisions_recorded} | |\n| Meetings with minutes | ${m.meetings_with_minutes}${m.meetings_synced ? ' of ' + m.meetings_synced + ' synced' : ''} | |\n| Questions asked / answered from the brain | ${m.questions_asked} / ${rate} | |\n| Gaps found / stale answers | ${m.questions_gap} / ${m.questions_stale} | |\n| Living documents stale | ${m.living_stale} | |\n| Proposals waiting for a person | ${m.proposals_open} | |\n| Input : Knowledge | ${m.input_knowledge ?? 'n/a'} | |\n| Agent commits / reverts | ${m.agent_commits} / ${m.reverts} | |\n| Health | ${m.health} | |`);
  if (m.repeated_questions.length) console.log(`\nAsked more than once in 30 days (candidates for a FAQ line or a living document section):\n${m.repeated_questions.map((q) => `- ${q.question} (${q.times}x)`).join('\n')}`);
}

// ---------- samples ----------
function samplesCmd() {
  const s = loadNotes().notes.filter((n) => !isArchived(n.rel) && isSample(n));
  if (!flag('--archive')) {
    if (!s.length) return console.log('No sample notes left.');
    console.log(`${s.length} sample note(s) (frontmatter sample: true):\n${s.map((n) => '  ' + n.rel).join('\n')}\nMove them to .archive/ with: brain samples --archive`);
    return;
  }
  for (const n of s) {
    const dest = path.join(ROOT, '.archive', n.rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(path.join(ROOT, n.rel), dest);
  }
  // remove folders the move left empty (project folders)
  for (const n of s) { let d = path.dirname(path.join(ROOT, n.rel)); while (d.startsWith(ROOT + path.sep) && fs.existsSync(d) && !fs.readdirSync(d).length) { fs.rmdirSync(d); d = path.dirname(d); } }
  if (s.length) appendLog('archive', `${s.length} sample note(s) moved to .archive/`, opt('--actor') || 'brain-script');
  console.log(`Archived ${s.length} sample note(s) to .archive/ with the same relative path. Run \`brain links\` to find real notes that still point at them.`);
}

// ---------- sync ----------
function syncCmd() {
  if (!gitRun(['rev-parse', '--is-inside-work-tree']).ok) fail('Not a git repository: nothing to sync. The brain works without git; sharing it needs git.');
  const remote = git(['remote']).trim().split('\n')[0];
  const local = CFG.sharing === 'local';
  const conflictHelp = 'Resolve it: `git status` lists the notes in conflict. Keep both sides\' facts (the newest verified one wins, the other becomes a dated "before:" trace), `git add` them, `git rebase --continue`, then run brain sync again.';
  if (flag('--pull')) {
    if (local) return console.log('sharing is local: nothing to pull.');
    if (!remote) return console.log('No remote: nothing to pull.');
    const pull = gitRun(['pull', '--rebase', '--autostash']);
    if (!pull.ok) fail(`git pull --rebase failed:\n${(pull.err || pull.out).trim()}\n${conflictHelp}`);
    return console.log('Pulled.');
  }
  // commit first, then rebase on the remote, then push: local work is never left half-stashed
  if (git(['status', '--porcelain', '--', '.']).trim()) {
    let msg = positional().join(' ').trim() || `sync ${today()}`;
    if (!/^brain:/.test(msg)) msg = `brain: ${msg}`;
    const add = gitRun(['add', '-A', '--', '.']); if (!add.ok) fail(add.err);
    const c = gitRun(['commit', '-m', msg]); if (!c.ok) fail(`git commit failed:\n${(c.err || c.out).trim()}`);
    console.log(`Committed: ${msg}`);
  } else console.log('Nothing to commit.');
  clearHold();
  if (local) return console.log('sharing is local: the commit stays on this machine, nothing pushed.');
  if (!remote) return console.log('No remote configured: the commit stays on this machine.');
  const pull = gitRun(['pull', '--rebase']);
  if (!pull.ok) fail(`git pull --rebase failed:\n${(pull.err || pull.out).trim()}\n${conflictHelp}`);
  const push = gitRun(['push']);
  if (!push.ok) fail(`git push failed:\n${push.err.trim()}\nIf the branch is protected, open a pull request instead: git switch -c brain/${today()} && git push -u ${remote} HEAD, then gh pr create --fill.`);
  console.log('Pushed.');
}

// ---------- scope (after an unattended run) ----------
const ALWAYS_WRITABLE = ['_system/reports/**', '_system/log.md', 'Journal/Daily/**'];
function scopeCmd() {
  const name = positional()[0];
  const { mode, allowed, changed, bad } = scopeCheck(name, 'usage: brain scope <automation>');
  if (flag('--json')) console.log(JSON.stringify({ automation: name, mode, allowed, changed, outside: bad }, null, 2));
  else if (!bad.length) console.log(`${changed.length} changed file(s), all inside the scope of ${name} (${mode}): ${allowed.join(', ')}`);
  else console.log(`Outside the scope of ${name} (${mode}; allowed: ${allowed.join(', ')}):\n${bad.map((b) => `  ${b.st} ${b.f}${b.st.includes('D') ? '  (deleted: never allowed)' : ''}`).join('\n')}`);
  if (bad.length) process.exit(1);
}
function scopeCheck(name, usage) {
  const { fm } = automationFile(name, usage);
  if (!gitRun(['rev-parse', '--is-inside-work-tree']).ok) fail('brain scope needs a git repository: it compares the working tree with the last commit.');
  const mode = ['report', 'propose', 'act'].includes(fm.mode) ? fm.mode : 'report';
  const allowed = [...ALWAYS_WRITABLE, ...(mode === 'report' ? [] : asList(fm.scope).map(String))];
  const prefix = git(['rev-parse', '--show-prefix']).trim();
  const entries = git(['status', '--porcelain=v1', '-z', '-uall', '--', '.']).split('\0').filter(Boolean);
  const changed = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]; const st = e.slice(0, 2); let f = e.slice(3);
    if (st[0] === 'R' || st[0] === 'C') i++; // the next entry is the source path
    if (prefix && f.startsWith(prefix)) f = f.slice(prefix.length);
    changed.push({ st: st.trim(), f });
  }
  const bad = changed.filter((c) => c.st.includes('D') || !matchesAny(c.f, allowed));
  return { fm, mode, allowed, changed, bad };
}

// ---------- setup ----------
function sourcesTable() {
  let t = ''; try { t = read('_system/sources.md'); } catch { return []; }
  const lines = stripNonContent(t).split('\n').map((l) => l.trim());
  const first = lines.findIndex((l) => l.startsWith('|'));
  if (first < 0) return [];
  let last = first; while (last + 1 < lines.length && lines[last + 1].startsWith('|')) last++;
  const rows = lines.slice(first, last + 1).map((l) => l.replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim()));
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.toLowerCase());
  const si = head.indexOf('status'), ni = Math.max(0, head.indexOf('source'));
  if (si < 0) return [];
  return rows.slice(1).filter((c) => !/^:?-+:?$/.test(c[0] || '')).map((c) => ({ name: c[ni], status: (c[si] || '').toLowerCase().replace(/[^a-z]/g, '') }));
}
function automationList() {
  const dir = path.join(ROOT, '_system/automations');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => {
    const { fm } = parseFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8'));
    return { name: f.slice(0, -3), enabled: String(fm.enabled) === 'true' };
  });
}
function setupStatus(r = health()) {
  const isGit = gitRun(['rev-parse', '--is-inside-work-tree']).ok;
  const remote = isGit ? git(['remote']).trim().split('\n')[0] : '';
  const settingsFiles = [path.join(ROOT, '.claude/settings.json'), path.join(ROOT, '.claude/settings.local.json'), path.join(os.homedir(), '.claude/settings.json')];
  const enabledIn = settingsFiles.find((f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8'))?.enabledPlugins?.['company-brain@company-brain'] === true; } catch { return false; } });
  const pluginOn = !!enabledIn;
  const sharing = String(CFG.sharing || ''), company = String(CFG.company || '');
  const src = sourcesTable(), active = src.filter((x) => x.status.startsWith('active'));
  const on = automationList().filter((a) => a.enabled);
  let owners = ''; try { owners = fs.readFileSync(path.join(ROOT, 'CODEOWNERS'), 'utf8'); } catch {}
  const ph = r.placeholders.filter((x) => x.rel !== '_system/sources.md'); // unused source rows may keep theirs
  const steps = [
    { id: 'node', label: 'Node 18 or newer', done: parseInt(process.versions.node, 10) >= 18, detail: `Node ${process.versions.node}` },
    { id: 'git', label: 'the brain is a git repository', done: isGit, detail: isGit ? 'yes' : 'not yet: git init' },
    { id: 'plugin', label: 'the plugin is enabled for this project', done: pluginOn, detail: pluginOn ? (enabledIn.startsWith(ROOT) ? path.relative(ROOT, enabledIn) : '~/.claude/settings.json') : 'no settings file enables company-brain@company-brain' },
    { id: 'sharing', label: 'where the brain lives: on this machine or on GitHub', done: sharing === 'local' || (sharing === 'github' && !!remote), detail: sharing === 'github' && !remote ? 'github, but no remote yet' : sharing || 'not chosen (sharing in _system/brain.config.json)' },
    { id: 'identity', label: 'company name and language', done: !!company && company !== 'Company' && !company.includes('{{'), detail: `${company || 'none'} · ${CFG.language}` },
    { id: 'onboard', label: 'ORG, NOW and the living documents filled', done: !ph.length, detail: ph.length ? `${ph.length} note(s) with {{placeholders}}` : 'no placeholders left' },
    { id: 'samples', label: 'the template\'s sample notes archived', done: !r.samples.length, detail: r.samples.length ? `${r.samples.length} still live` : 'none live' },
    { id: 'sources', label: 'at least one input source active (the meeting recorder first)', done: active.length > 0, detail: active.length ? active.map((x) => x.name).join(', ') : `${src.length} source(s) in _system/sources.md, all paused` },
    { id: 'routines', label: 'at least one routine on (the morning brief first)', done: on.length > 0, detail: on.length ? on.map((a) => a.name).join(', ') : 'every automation is disabled' },
  ];
  if (sharing === 'github') steps.push({ id: 'codeowners', label: 'CODEOWNERS handles filled', done: !!owners && !owners.includes('{{'), detail: !owners ? 'no CODEOWNERS' : owners.includes('{{') ? 'placeholders left' : 'filled' });
  steps.push({ id: 'health', label: 'health without errors', done: r.status !== 'error', detail: r.status });
  return { steps, left: steps.filter((x) => !x.done) };
}
function setupCmd() {
  const st = setupStatus();
  if (flag('--json')) return console.log(JSON.stringify(st, null, 2));
  const lines = [`# Setup of the ${CFG.company} brain: ${st.steps.length - st.left.length} of ${st.steps.length} steps done`, ''];
  for (const x of st.steps) lines.push(`${x.done ? '✓' : '✗'} ${x.label}: ${x.detail}`);
  lines.push('', st.left.length ? `Next: ${st.left[0].label}. The setup skill (company-brain:setup) walks every step.` : 'Setup complete.');
  console.log(lines.join('\n'));
}

// ---------- routine (an automation run on this machine) ----------
const ROUTINE_TOOLS = 'Read,Glob,Grep,Write,Edit,MultiEdit,Bash(node:*),Bash(git status:*),Bash(git diff:*),Bash(git log:*)';
function cronFor(when) {
  const m = String(when).trim().toLowerCase().match(/^(daily|weekdays|weekly (mon|tue|wed|thu|fri|sat|sun))\s+(\d{1,2}):(\d{2})$/);
  if (!m || +m[3] > 23 || +m[4] > 59) return null;
  const dow = m[1] === 'daily' ? '*' : m[1] === 'weekdays' ? '1-5' : String(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(m[2]));
  return `${+m[4]} ${+m[3]} * * ${dow}`;
}
function findOnPath(bin) { for (const d of (process.env.PATH || '').split(path.delimiter)) { if (d && fs.existsSync(path.join(d, bin))) return path.join(d, bin); } return null; }
// a run that failed or left its scope holds the routines until a person looks: the next run must not commit its leftovers
function holdFile() { const d = gitRun(['rev-parse', '--absolute-git-dir']); return d.ok ? path.join(d.out.trim(), 'company-brain-routine-held') : null; }
function readHold() { const f = holdFile(); try { return f && fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim() : null; } catch { return null; } }
function clearHold() { const f = holdFile(); try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch {} }
function holdAndFail(msg) {
  if (git(['status', '--porcelain', '--', '.']).trim()) { const f = holdFile(); if (f) fs.writeFileSync(f, `${stampNow()} ${msg.split('\n')[0]}\n`); }
  fail(`${msg}\nRoutines are held until a person reviews the changes (git status) and runs brain sync.`);
}
function cronLines(name, fm, claudeBin) {
  // the marketplace clone keeps its path across plugin updates; the versioned cache does not
  const stable = path.join(os.homedir(), '.claude/plugins/marketplaces/company-brain/scripts/brain.mjs');
  const script = fs.existsSync(stable) ? stable : fileURLToPath(import.meta.url);
  const q = (v) => `'${String(v).replace(/'/g, `'\\''`)}'`;
  const logDir = path.join(os.homedir(), '.company-brain', 'logs');
  const pathDirs = [...new Set([path.dirname(process.execPath), claudeBin && path.dirname(claudeBin), '/usr/local/bin', '/usr/bin', '/bin'].filter(Boolean))].join(':');
  const times = asList(fm.when).map(cronFor);
  if (!times.length || times.some((t) => !t)) fail(`when: ${asList(fm.when).join(', ') || '(empty)'} does not translate to cron. Use "daily HH:MM", "weekdays HH:MM" or "weekly Mon HH:MM", or write the crontab line by hand.`);
  const marker = `# company-brain ${ROOT} ${name}`;
  // cron reads an unescaped % as a newline
  return { marker, lines: times.map((t) => `${t} mkdir -p ${q(logDir)} && cd ${q(ROOT)} && PATH=${q(pathDirs)} ${q(process.execPath)} ${q(script)} routine ${name} --scheduled >> ${q(path.join(logDir, path.basename(ROOT) + '.log'))} 2>&1 ${marker}`.replace(/%/g, '\\%')) };
}
function routineCmd() {
  const name = positional()[0];
  const usage = 'usage: brain routine <automation> [--dry-run] [--cron [--install]] [--scheduled]';
  const { fm } = automationFile(name, usage);
  const claudeBin = process.env.BRAIN_CLAUDE_BIN || findOnPath('claude');
  if (flag('--cron')) {
    const { marker, lines } = cronLines(name, fm, claudeBin);
    if (!claudeBin) console.error('warning: claude is not on PATH here; the line assumes it will be.');
    if (!flag('--install')) return console.log(lines.join('\n'));
    const crontab = process.env.BRAIN_CRONTAB_BIN || 'crontab';
    const cur = spawnSync(crontab, ['-l'], { encoding: 'utf8' });
    if (cur.error) fail(`cannot run ${crontab}: ${cur.error.message}`);
    const kept = (cur.status === 0 ? cur.stdout : '').split('\n').filter((l) => l.trim() && !l.replace(/\\%/g, '%').endsWith(marker));
    const put = spawnSync(crontab, ['-'], { input: [...kept, ...lines].join('\n') + '\n', encoding: 'utf8' });
    if (put.status !== 0) fail(`crontab refused the new table: ${(put.stderr || '').trim()}`);
    appendLog('routine', `${name} scheduled: ${lines.map((l) => l.split(' ').slice(0, 5).join(' ')).join('; ')}`, 'brain-routine');
    return console.log(`Scheduled ${name} (${lines.length} line(s), local time). Replaces any earlier line for it; other crontab lines are kept.\n${lines.join('\n')}`);
  }
  if (flag('--scheduled') && String(fm.enabled) !== 'true') return console.log(`[${stampNow()}] ${name}: enabled is not true in its file, skipped.`);
  if (!gitRun(['rev-parse', '--is-inside-work-tree']).ok) fail('brain routine needs a git repository: the scope check compares the run with the last commit.');
  const held = readHold();
  if (held) fail(`[${stampNow()}] ${name}: routines are held since ${held}\nReview the changes with git status, keep what is right, revert the rest, then brain sync releases the hold.`);
  if (!git(['config', 'user.email']).trim() || !git(['config', 'user.name']).trim()) fail('git has no user.name or user.email here: set them (git config user.name / user.email) so the routine can commit.');
  const prompt = runPrompt(name, usage);
  if (flag('--dry-run')) return console.log(`Would run in ${ROOT}:\n  ${claudeBin || 'claude (not on PATH)'} -p "<brain run ${name}>" --max-turns 40 --allowedTools "${ROUTINE_TOOLS}"\nthen brain scope ${name}, then a local commit "brain: ${name} ${today()}". Nothing is pushed.`);
  if (!claudeBin) fail('claude is not on PATH: install Claude Code (https://code.claude.com) or set BRAIN_CLAUDE_BIN.');
  // what people left uncommitted is theirs: commit it first, so the scope check sees only this run
  if (git(['status', '--porcelain', '--', '.']).trim()) {
    const a = gitRun(['add', '-A', '--', '.']), c = a.ok && gitRun(['commit', '-m', `brain: changes before the ${name} routine`]);
    if (!a.ok || !c.ok) fail(`could not commit the changes already in the brain:\n${a.ok ? (c.err || c.out).trim() : a.err.trim()}`);
  }
  console.log(`[${stampNow()}] ${name}: running`);
  const run = spawnSync(claudeBin, ['-p', prompt, '--max-turns', '40', '--allowedTools', ROUTINE_TOOLS], { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'], timeout: 30 * 60 * 1000 });
  if (run.status !== 0) holdAndFail(`[${stampNow()}] ${name}: claude stopped (${run.error ? run.error.message : run.signal || 'exit ' + run.status}). Changes, if any, are left uncommitted.`);
  const { mode, bad, changed } = scopeCheck(name, usage);
  if (bad.length) holdAndFail(`[${stampNow()}] ${name}: changes outside the scope of ${mode} mode, nothing committed:\n${bad.map((x) => `  ${x.st} ${x.f}`).join('\n')}`);
  if (!changed.length) return console.log(`[${stampNow()}] ${name}: nothing changed.`);
  appendLog('routine', `${name} (${mode}): ${changed.length} file(s)`, 'brain-routine');
  const add = gitRun(['add', '-A', '--', '.']); if (!add.ok) fail(add.err);
  const c = gitRun(['commit', '-m', `brain: ${name} ${today()}`]); if (!c.ok) fail(`git commit failed:\n${(c.err || c.out).trim()}`);
  console.log(`[${stampNow()}] ${name}: committed ${changed.length} file(s) on this machine.${CFG.sharing === 'local' ? '' : ' brain sync shares them if the brain has a remote.'}`);
}

// ---------- hooks ----------
function realish(p, depth = 0) { // resolve symlinks (including a dangling leaf link) and the on-disk case of existing parts
  const rest = []; let dir = p;
  for (;;) {
    let st = null; try { st = fs.lstatSync(dir); } catch {}
    if (st) {
      if (st.isSymbolicLink() && !fs.existsSync(dir) && depth < 20) return realish(path.join(path.resolve(path.dirname(dir), fs.readlinkSync(dir)), ...rest), depth + 1);
      break;
    }
    rest.unshift(path.basename(dir)); const parent = path.dirname(dir); if (parent === dir) break; dir = parent;
  }
  try { return path.join(fs.realpathSync.native(dir), ...rest); } catch { return p; }
}
function locate(filePath, cwd) {
  if (typeof filePath !== 'string' || !filePath) return null;
  const base = cwd || process.cwd();
  const abs = realish(path.isAbsolute(filePath) ? filePath : path.resolve(base, filePath));
  const inside = (root) => { const r = path.relative(root, abs); return r !== '' && r !== '..' && !r.startsWith('..' + path.sep) && !path.isAbsolute(r); };
  const sessionRoot = ROOT_OPT ? path.resolve(ROOT_OPT) : findOutermostRoot(base);
  let root = sessionRoot ? realish(sessionRoot) : null;
  if (!root || !inside(root, abs)) { const r2 = findOutermostRoot(path.dirname(abs)); root = r2 ? realish(r2) : null; }
  if (!root || !inside(root, abs)) return null;
  let rel = path.relative(root, abs).split(path.sep).join('/');
  if (process.platform === 'win32') rel = rel.split('/').map((s) => s.replace(/[. ]+$/, '')).join('/');
  return { rel, key: rel.normalize('NFC').toLowerCase(), root, abs };
}
function deny(reason) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }) + '\n');
  process.exit(0);
}
function ask(reason) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: reason } }) + '\n');
  process.exit(0);
}
const ROOT_DOTFILES = ['.gitignore', '.gitattributes'];
const OPEN_DOT_FOLDERS = ['.github', '.obsidian'];
const AGENT_CONFIG_FOLDERS = ['.claude', '.codex', '.agents'];
const CONTRACTS = ['agents.md', 'claude.md', 'codeowners', '_system/_tags.md', '_system/object-schema.md', '_system/brain blueprint.md', '_system/brain.config.json'];
function guardCore(input) {
  const ti = input.tool_input || {};
  const fp = ti.file_path ?? ti.notebook_path ?? ti.path;
  if (fp == null) return;
  if (typeof fp !== 'string') deny('company-brain guard: the tool call has no readable file path, so it cannot be checked.');
  const loc = locate(fp, input.cwd);
  if (!loc) return; // not inside a brain
  const { rel, key, root, abs } = loc;
  const cfg = loadConfigAt(root);
  const parts = key.split('/');
  const top = parts[0];
  // 0. a second brain config inside the brain would move the root
  if (key.endsWith('_system/brain.config.json') && key !== '_system/brain.config.json') deny('company-brain guard: a brain.config.json outside _system/ at the root would make that folder look like a brain. Brains do not nest.');
  // 1. root files
  if (parts.length === 1) {
    if (cfg.root_allowlist.some((a) => a.toLowerCase() === key) || ROOT_DOTFILES.includes(key)) { /* allowed */ }
    else deny(`company-brain guard: nothing new at the root of the brain. "${rel}" is not in root_allowlist (${cfg.root_allowlist.join(', ')}). Put it in the folder that says what it is (see AGENTS.md).`);
  } else if (top === '.archive') deny('company-brain guard: .archive/ is move-only. Archive with `git mv <note> .archive/<same path>` (or `brain samples --archive`); restore by moving back. Never write or edit inside it.');
  else if (top === '.git') deny('company-brain guard: .git/ is git\'s own storage. Use git commands, never write there.');
  else if (AGENT_CONFIG_FOLDERS.includes(top)) ask(`company-brain: "${rel}" configures the agents (and can switch this guard off). Confirm the person asked for this change.`);
  else if (OPEN_DOT_FOLDERS.includes(top)) { /* allowed */ }
  else if (!CONTENT_FOLDERS.some((f) => f.toLowerCase() === top)) deny(`company-brain guard: "${rel.split('/')[0]}/" is not a folder of this brain. A new top-level folder is a decision (Decisions/), not an edit. Folders: ${CONTENT_FOLDERS.join(', ')}.`);
  // 2. read-only synced sources (only the README at the root of the synced folder is writable)
  for (const g of cfg.readonly) {
    if (!globToRegex(g, 'i').test(key)) continue;
    const prefix = g.slice(0, g.search(/[*?]|$/)).toLowerCase();
    if (key === prefix + 'readme.md') continue;
    deny(`company-brain guard: "${rel}" is a synced source (${g}): read-only. Link to it from a new note (minutes, a summary) instead of editing it.`);
  }
  // 3. secrets in the content being written
  const content = [ti.content, ti.new_string, ti.new_source, ...(Array.isArray(ti.edits) ? ti.edits.map((e) => e && e.new_string) : [])].filter((x) => typeof x === 'string').join('\n');
  if (content) for (const re of compilePatterns(cfg.secret_patterns).ok) if (re.test(content)) deny('company-brain guard: the content looks like it contains a secret (key, token, password or private key). Secrets never enter the brain. Write where the secret lives (the password manager entry), not the secret.');
  // 4. contract files: a decision, except while onboarding fills the placeholders
  if (CONTRACTS.includes(key) || /^_system\/memory\/rules\/rule-[^/]+\.md$/.test(key)) {
    let filling = false; try { filling = /\{\{[a-z\-_ ]+\}\}/.test(fs.readFileSync(abs, 'utf8')); } catch {}
    if (!filling) ask(`company-brain: "${rel}" is a contract. Changing it is a decision (Decisions/, type/decision, domain/knowledge). Confirm this edit is backed by one, or by an explicit request.`);
  }
}
function guard() {
  let input;
  try { const s = fs.readFileSync(0, 'utf8'); input = s.trim() ? JSON.parse(s) : {}; } catch { return; }
  try { guardCore(input); } catch (e) { deny(`company-brain guard could not check this write (${e && e.message}), so it was blocked. Fix the cause (often _system/brain.config.json) or ask the person.`); }
}
function lintFile() {
  let input = {}; try { const s = fs.readFileSync(0, 'utf8'); input = s.trim() ? JSON.parse(s) : {}; } catch { return; }
  const ti = input.tool_input || {};
  const loc = locate(ti.file_path, input.cwd);
  if (!loc || !loc.rel.endsWith('.md') || !fs.existsSync(loc.abs)) return;
  const { rel, root, abs } = loc;
  if (/^(_system\/(reports|templates|indices)\/|\.archive\/)/.test(rel) || /(^|\/)README\.md$/.test(rel) || !rel.includes('/')) return;
  const cfg = loadConfigAt(root);
  if (matchesAny(rel, cfg.readonly)) return;
  const text = norm(fs.readFileSync(abs, 'utf8'));
  const { fm, body, has } = parseFrontmatter(text);
  const tags = tagsOf(fm);
  const advice = [];
  if (!has) advice.push('no frontmatter: add tags (1 to 4, with type/*)');
  else {
    if (tags.length === 0) advice.push('no tags: add 1 to 4 from _system/_tags.md, including type/*');
    else if (!tags.some((t) => t.startsWith('type/'))) advice.push('no type/* tag');
    if (tags.length > 4) advice.push(`${tags.length} tags: the cap is 4`);
    if (matchesAny(rel, cfg.living_docs)) {
      if (!fm.owner) advice.push('living document without owner:');
      if (!fm.review_due) advice.push('living document without review_due:');
      const edits = [ti.new_string, ...(Array.isArray(ti.edits) ? ti.edits.map((e) => e && e.new_string) : [])].filter((x) => typeof x === 'string').join('\n');
      if (/^(Edit|MultiEdit)$/.test(input.tool_name || '') && /last_verified:/.test(edits)) advice.push('you changed last_verified: only the owner verifies an existing document, through the verify flow (brain verify)');
    }
    if (rel.startsWith('CRM/People/') && /(\+?\d[\d \-]{8,}\d)/.test(body) && !/linkedin|email/i.test(body)) advice.push('a phone-like number in a people note: work contact data only');
    if (['Input/Meetings/', 'Input/Conversations/', 'Decisions/', 'Input/Feedback/'].some((p) => rel.startsWith(p)) && fm.project === undefined) advice.push('no project: property (use "[[Project]]", none, or to verify)');
    if (rel.startsWith('Decisions/') && !fm.source) advice.push('decision without source:');
  }
  const links = linkCount(fm, body);
  if (links < 2 && !rel.startsWith('Journal/') && !rel.startsWith('_system/') && !rel.startsWith('_inbox/')) advice.push(`${links} link(s) in body and frontmatter: a note needs at least 2 to compose`);
  if (/—/.test(body) && !rel.startsWith('Input/')) advice.push('em-dash found: use a full stop, comma or colon');
  if (!advice.length) return;
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: `company-brain lint on ${rel}: ${advice.join('; ')}. Fix in this turn if the note is yours to change; otherwise mention it.` } }) + '\n');
}

// ---------- main ----------
function requireRoot() { if (!ROOT) { console.error('Not inside a company brain (no _system/brain.config.json found up the tree). Pass --root <dir>.'); process.exit(2); } }
switch (cmd) {
  case 'guard': guard(); break;
  case 'lint-file': lintFile(); break;
  case 'brief': requireRoot(); console.log(brief()); break;
  case 'health': { requireRoot(); const r = health(); if (flag('--json')) console.log(JSON.stringify(r, null, 2)); else console.log(printHealth(r)); if (flag('--strict') && r.status === 'error') process.exit(1); break; }
  case 'stale': { requireRoot(); const s = checkStale(loadNotes().notes); if (flag('--json')) console.log(JSON.stringify(s, null, 2)); else { if (!s.length) console.log('No stale living documents.'); for (const x of s) console.log(`${x.issue.padEnd(34)} ${x.rel}  owner ${x.owner || 'none'}${x.due ? '  due ' + x.due : ''}${x.days ? '  (' + x.days + 'd)' : ''}`); } break; }
  case 'links': { requireRoot(); const { notes, idx } = loadNotes(); const l = checkLinks(notes, idx); if (flag('--json')) console.log(JSON.stringify(l, null, 2)); else { if (!l.length) console.log('No broken wikilinks.'); for (const x of l) console.log(`${x.rel} → [[${x.link}]]${x.where === 'frontmatter' ? '  (frontmatter)' : ''}`); } break; }
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
  case 'samples': requireRoot(); samplesCmd(); break;
  case 'sync': requireRoot(); syncCmd(); break;
  case 'scope': requireRoot(); scopeCmd(); break;
  case 'setup': requireRoot(); setupCmd(); break;
  case 'routine': requireRoot(); routineCmd(); break;
  default:
    console.log(fs.readFileSync(new URL(import.meta.url)).toString().split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
    process.exit(cmd ? 1 : 0);
}
