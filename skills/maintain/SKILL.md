---
name: maintain
description: "Use for the brain's structural health: 'health', 'broken links', 'orphans', 'stale', 'unregistered tags', 'clean up', the Monday librarian run, or after a batch of changes. Runs the script, fixes only what is mechanical and safe, counts and reports the rest."
argument-hint: "[--fix]"
---

# Maintain

The script measures; the model judges; nobody deletes. Content changes belong to the owners and to the review; this skill keeps the container true.

## 1. Run

From the brain root: `brain health` (or `--json`). It reports:

| Check | Error or warning | Safe to fix mechanically |
|---|---|---|
| root intrusion (a file or folder at the root not in the allowlist) | error | no: find out who wrote it, then move its content to the right folder and record it |
| possible secrets | error | no: tell the brain owner; the secret is rotated, not just removed |
| rules over the cap (8) | error | no: a decision retires or merges one |
| broken wikilinks | warning | yes when one target is obvious (a rename, a typo); otherwise list |
| orphans (fewer than 2 outgoing links) | warning | yes: add the 2 links the note obviously needs (its project, its MOC, its company) |
| notes without tags, malformed tags, over 4 tags | warning | yes when `_tags.md` gives one obvious replacement; max 20 files per run; never in read-only folders |
| unregistered tags | warning | no: propose registration or replacement to the brain owner |
| living documents stale, or missing owner or review_due | warning | no: route to the owner (`company-brain:governance`); a missing owner is proposed to the brain owner |
| agent memory too long or unowned | warning | yes: trim to the cap by replacing, not deleting history (archive the old file) |
| memory inbox older than 7 days | warning | yes: run the consolidation procedure (`_system/automations/consolidation.md`) |
| closed loops still in open-loops | warning | yes: move to `.archive/_system/open-loops-closed.md` |
| decisions proposed over 14 days | warning | no: remind the decider |
| domains over the MOC threshold | warning | no: `company-brain:promote` |
| Input:Knowledge above the warn ratio | warning | no: promotion, not cleanup |
| template drift | warning | yes: copy `_system/templates/` over `Resources/Templates/` |
| placeholders left | warning | no: `company-brain:onboard` |

## 2. Fix what is safe

With `--fix` or when asked: apply the "yes" rows, one commit `brain: maintenance YYYY-MM-DD`. `brain index --write` always. Never touch note bodies beyond links and tags. Never in `readonly` folders, never in `.archive/`.

## 3. Report

Write `_system/reports/health/YYYY-Www.md` (or `YYYY-MM-DD.md` when run by hand): the summary table, what was fixed, what is counted, at most 3 example paths per finding, and the trend versus the previous report if one exists. One line in `_system/log.md` (`brain log health "..."`) and one under `## Agents` in today's daily note on a scheduled run.

## Other checks on request

- `brain links`, `brain orphans`, `brain tags`, `brain stale`, `brain ratio` for one dimension.
- "Who wrote this folder at the root?": `git log --diff-filter=A -- <path>`; the author and date decide whether it is an ungoverned agent or a person who did not know the rule.
- Reports older than 90 days in `_system/reports/`: archive.

## Scheduled run

`brain-librarian` runs this weekly in `act` mode with a narrow scope (indices, health report, its own memory). Widening the scope to tag fixes in note frontmatter is a decision.
