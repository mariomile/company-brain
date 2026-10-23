# Changelog

## 0.3.0 (2026-10-23)

From building the first real brain (DeepAgent) end to end.

- **Setup first:** new `setup` skill, the first thing in a new brain and safe to re-run. It walks where the brain lives (this machine or GitHub), identity, onboarding, input sources (the meeting recorder first, with a first pull), routines (the morning brief first, run once and then scheduled), owners, health. The template's `AGENTS.md`, `CLAUDE.md` and README point to it; the briefing says how many setup steps are left.
- **`brain setup`:** the checklist behind the skill, from the brain's own files (`--json` too).
- **Brain on one machine:** `"sharing": "local"` in the config. `brain routine <automation>` runs an automation with Claude Code here, checks its scope and commits locally; `--cron` prints the crontab line, `--dry-run` what would run. `CODEOWNERS` is asked for only on GitHub.
- **Onboarding from a lot of material** (a vault, a repository, months of meetings): dossier, parallel writers on separate folders, integration; samples archived first; what never travels (HR, personal, security) and what stays in confidential notes; contradictions become open loops.
- **Conventions:** source origins a teammate can find (meetings, repository paths, `doc "Title" (Owner, date)`), never a path on one machine.
- **Fix:** `brain new` refuses titles ending in `.md`, which produced `Title.md.md` and broken links.

## 0.2.0 (2026-10-22)

After an independent code review (38 findings) and a product review (12).

- **Guard:** closed bypasses (a second `brain.config.json` moving the root, case differences on macOS, `..name` paths, dot folders, `.git/`, new files in `.archive/`, NotebookEdit secrets, nested READMEs in read-only folders, dangling symlinks, deep paths). Fails closed on errors and when Node is missing. No prompts on contract files while onboarding fills their placeholders. Secret pattern no longer flags ordinary prose.
- **Parser:** CRLF, BOM, unindented and multi-line lists, unquoted wikilinks, trailing comments, block scalars, horizontal rules, escaped pipes, case-insensitive and Unicode-normalized links, tilde fences, comments. The last open loop is no longer dropped. Frontmatter links are checked. Duplicate keys are reported.
- **CLI:** `new` writes real values or blanks (no `[[[[x]]]]`, no `[[none]]`, `decided` follows `--date`), refuses unsafe titles; `verify` refuses ambiguous or frontmatter-less notes and quotes `--by`; local dates; config merged per key; `index`, `metrics` and `search` edge cases.
- **New commands:** `sync` (commit, rebase, push), `scope` (check an unattended run), `samples` (list or archive the template's sample notes), `log --result` and question metrics.
- **Hooks:** session start works from a subfolder and warns when Node is missing; Windows paths fixed; LF enforced.
- **Skills:** new `ingest`; `onboard` drafts from the company's own material; every skill aligned with the template's v0.2 structure.
- **Template:** one automation file per role (bundles, souls, agent memory, memory inbox, `Resources/Templates/` removed), living documents as skeletons, samples marked, two git lanes, scheduled routines on GitHub Actions, sources table.

## 0.1.0 (2026-10-22)

First release. Fourteen skills, six agents, three hooks, the `brain.mjs` script (brief, health, stale, links, orphans, tags, ratio, index, new, verify, log, run, search, metrics, guard, lint-file), references (capability map, frontmatter, autonomy ladder, config schema), a test suite against the template.
