# company-brain

The Claude Code plugin that keeps a company brain true. A company brain is a Markdown repository built from the [company-brain template](https://github.com/mariomile/company-brain-template): the shared memory of an organization that people and AI agents read before they work and write back to after.

The plugin gives every agent working in that repository the same method: how to capture, how to write minutes and decisions, how to answer with citations, how to keep living documents verified, how to review the week, and what it must never do. A guard hook enforces the hard rules; a script measures health and use; six agents and six scheduled automations run the routines.

## Install

```
/plugin marketplace add mariomile/company-brain
/plugin install company-brain@company-brain
```

Requires Node.js 18 or newer: the guard, the lint and the script run on it. Inside a brain, if Node is missing, the guard blocks writes and says why instead of switching itself off.

Development: `claude --plugin-dir /path/to/company-brain` from a brain folder. Validate with `claude plugin validate .`; test with `bash tests/run.sh` (checks against a copy of the template); evals in `evals/`.

The plugin is silent outside a company brain (it walks up looking for `_system/brain.config.json`).

## What it does

| Skill | Use it for |
|---|---|
| `using-company-brain` | the entry point, injected at session start: boot, routing, what to watch while working |
| `conventions` | how a note is written: frontmatter, tags, wikilinks, dated fact lines, naming |
| `capture` | anything entering the brain: documents, links, threads, `_inbox/` triage; ADD / UPDATE / NOOP against existing notes |
| `meeting` | one meeting → minutes, decision records, actions, project update |
| `decide` | a decision record with context, options, consequences, revisit conditions, dissent |
| `ask` | a question answered from the brain with citations and a gap list |
| `project` | project notes: new, update, status, close |
| `people` | people and organizations, typed relationships, work contact data only |
| `promote` | inputs → concepts, glossary entries, MOCs, playbooks |
| `maintain` | health: links, orphans, tags, staleness, root guard, secrets, rule cap |
| `review` | the Friday review: numbers, what the brain learned, what is stale, five proposals |
| `brief` | the morning brief |
| `governance` | verify a living document, owners, confidentiality, PRs, the autonomy ladder, structure changes |
| `setup` | the first thing in a new brain, and safe to re-run: where it lives (this machine or GitHub), onboarding, input sources (the meeting recorder first), routines (the morning brief first), owners, health |
| `onboard` | fill a fresh brain from the company's own material (site, deck, docs) plus about ten confirmations; onboard a teammate with a reading path. Scales to a whole vault, repo and meeting archive: dossier, parallel writers, integration |
| `ingest` | pull new material from the sources in `_system/sources.md` (Slack, Drive, Notion, the meeting recorder), or a one-time export, into `Input/` |

Agents: `brain-triager`, `brain-scribe`, `brain-librarian`, `brain-curator`, `brain-analyst`, `brain-onboarder`.

Hooks: session start (briefing), pre-write guard (root, archive, `.git`, read-only sources, secrets, contract and agent-config files; fails closed), post-write lint (frontmatter and links advice). The guard sees file tools, not shell commands.

## The script

`node scripts/brain.mjs <command>` from the brain root. Node built-ins only.

```
brief                    session briefing
health [--json|--strict] structural checks; --strict fails on errors (CI)
stale | links | orphans | tags | ratio
index [--write]          regenerate the indices
new <type> "Title"       scaffold a note from the brain's templates
verify <note> --by "[[Owner]]"
log <op> "title" [--result answered|partial|gap|stale]   append to _system/log.md
run <automation>         print an automation's full prompt for any scheduler
scope <automation>       after a run: fail if anything changed outside its scope
search "query"           index-first search
metrics                  the weekly numbers, with questions answered and gaps
samples [--archive]      list or archive the template's sample notes
sync ["message"]         commit, pull --rebase, push (commit only when sharing is local or there is no remote)
setup [--json]           the setup checklist: done, left, next step
routine <automation>     run an automation here with Claude Code, check its scope, commit locally; --cron prints the crontab line (--install adds it), --dry-run shows what would run; a failed run holds the routines until brain sync
guard | lint-file        the hooks (stdin JSON)
```

## How the brain grows

Ingest → capture → compile → query → promote → maintain → verify → review → measure. Automations climb an autonomy ladder (`report` → `propose` → `act`) one step at a time; they run on this machine with `brain routine` and cron, or on GitHub with the template's workflow, which lands their output as an issue comment or a pull request. The health check runs on every pull request. The weekly review proposes, people accept. Details: `references/autonomy-ladder.md` and the template's `_system/Brain Blueprint.md`.

## Portability

Skills name capabilities, not tools (`references/capability-map.md`). The portable bundle is `skills/`, `references/`, `scripts/`; `agents/`, `hooks/` and `.claude-plugin/` are Claude Code adapters. Other hosts: `docs/hosts.md`.

## License

MIT. By [Mario Miletta](https://marioverse.ai).
