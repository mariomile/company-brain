---
name: maintain
description: "Use for the brain's structural health: 'health', 'check the brain', 'broken links', 'orphans', 'stale', 'unregistered tags', 'clean up', the Monday librarian run, or after a batch of changes. Rebuilds the indices, moves closed loops, writes the health report, fixes only what is mechanical, counts the rest."
argument-hint: "[--fix]"
---

# Maintain

The librarian's procedure. The script measures; the model judges; nobody deletes. Content belongs to the owners and the review: this skill keeps the maps true and counts what it does not fix.

## 1. Rebuild the maps

1. `brain index --write`: regenerates `_system/indices/*.md`. Never edit them by hand.
2. Move every `status: closed` block from `_system/memory/open-loops.md` to the end of `_system/memory/open-loops-closed.md`, unchanged.

## 2. Measure

`brain health --json` (or plain `brain health` in a session). Use the script, never a hand-written grep: it separates frontmatter from body and does not hold read-only folders to tag or orphan checks.

| Finding | Fix mechanically? |
|---|---|
| root intrusion | no: `git log --diff-filter=A -- <path>` says who wrote it; move the content to its folder with the person |
| possible secrets | no: tell the brain owner; the secret is rotated, not just removed |
| rules over the cap of 8 | no: a decision retires or merges one |
| broken wikilinks | only when one target is obvious (a rename, a typo) |
| orphans, notes without tags, malformed tags, over 4 tags | only when the fix is obvious and `_tags.md` gives one replacement; at most 20 files |
| unregistered tags | no: propose registration or replacement to the brain owner |
| living documents stale, or missing owner or `review_due` | no: route to the owner (`company-brain:governance`) |
| closed loops still in open-loops | yes: step 1 |
| decisions proposed over 14 days | no: name the decider |
| domains over the MOC threshold, Input:Knowledge above the warn ratio | no: `company-brain:promote` |
| duplicate frontmatter keys (a merge kept both sides) | no: read both; the note's owner decides when unsure |
| placeholders left | no: `company-brain:setup` |
| sample notes still live | no: `brain samples --archive` once the real notes exist, with the person |

## 3. Fix only what is safe

With `--fix` or when asked: the "yes" rows and the obvious cases. Never note bodies beyond links and tags. Never a read-only folder (`readonly` in `_system/brain.config.json`): not a tag, not a link. Never inside `.archive/`. Archiving is `git mv <path> .archive/<same path>`, never a delete.

## 4. Report

Write `_system/reports/health/YYYY-Www.md` (or `YYYY-MM-DD.md` by hand): the summary table, what was fixed, what is counted with the owner of each note, at most three example paths per finding, the trend versus the previous report.

## Scheduled run

The `librarian` automation runs steps 1, 2 and 4 in `act` mode with a narrow scope (indices, health reports, the two loop files). It fixes nothing in notes: tag and link repairs need a wider scope, which is a decision of the brain owner. Count them in the report instead. After an unattended run, `brain scope librarian` lists any change outside that scope and exits 1 if there is one.

## Other checks on request

`brain links`, `brain orphans`, `brain tags`, `brain stale`, `brain ratio`: one dimension each.

## Output

1. `📄 **Created:**` the health report.
2. Errors, then warnings, each with its count and who acts on it.
3. What was fixed, in one list.
4. `brain log health "<status>"`; on a scheduled run, one line under `## Agents` in today's daily note. Then `brain sync "maintenance YYYY-MM-DD"`.
