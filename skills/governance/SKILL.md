---
name: governance
description: "Use for how the brain is governed: verifying a living document ('verify Product', 'is this still true'), owners and review dates, a teammate leaving, confidentiality and audience, pull requests for knowledge changes, the autonomy ladder of automations, and any change to structure, tags, properties or rules (which is a decision)."
argument-hint: "[verify <note> | owner <note> <person> | autonomy <automation> | structure]"
---

# Governance

A personal brain has one author. A company brain has many, and the risk is drift between the documents and reality. Governance here is four mechanisms, all checked by the script, none optional: owners and review dates, confidentiality, proposals and pull requests, the autonomy ladder.

## Verify a living document

The owner confirms the content is true today; the agent does the bookkeeping. Only the owner verifies.

1. Open the document. Read `## Now` to the owner line by line (or show the diff since `last_verified`: `git log -p --since=<last_verified> -- "<path>"`).
2. For each line: still true, changed (update with the dated trace), or no longer true (remove the line to the Timeline with "no longer true since YYYY-MM-DD").
3. `brain verify "<note>" --by "[[Owner]]"`: sets `last_verified` today and `review_due` to today plus the cadence for its type (`_system/object-schema.md`, `review_cadence_days` in `brain.config.json`). Logs it.
4. If the owner cannot be reached and the document is past twice its cadence: propose `status: paused` in the weekly review. Never verify on their behalf.

## Owners and review dates

- Every living document (`type/living`, `playbook`, `policy`, `project`, `goal`, `index`) has `owner: "[[Person]]"` and `review_due`. `brain stale` lists what is missing or past due.
- Change an owner: edit the frontmatter, add a Timeline line "owner [[Old]] → [[New]] on YYYY-MM-DD", and update `CODEOWNERS` if the folder is listed there. Owners are people; `CODEOWNERS` may map to a team.
- A teammate leaves: `brain stale` with their name shows every document to reassign; reassign before the person's note changes to `crm/other`.
- `NOW.md` has a 14-day cadence and its own owner.

## Confidentiality

Levels: `public · internal (default) · confidential · restricted` with `audience:`. The rule agents apply is `rule-confidentiality.md`. The repository is the access boundary: content a group must not see goes into a second brain. Before an external output, list the notes it drew from and their levels.

## Proposals and pull requests

- Agents **propose** on living documents: in a session, show the diff and ask; unattended, write to `_system/reports/proposals/` with a ready-to-apply prompt. Small dated additions are allowed directly (`rule-living-documents.md`).
- Changes to policies, to `Knowledge/Company/` sections, and to contracts go through a pull request. The PR template asks for what changes, why it is true, blast radius, checks. `CODEOWNERS` routes it to the owner; CI runs `brain health --strict`.
- An agent working on a branch: name it `brain/<topic>`, commit per logical change, open the PR with the template, never merge.

## The autonomy ladder

Each automation declares `mode` and `scope` in `_system/automations/<name>.md`.

| Mode | Writes |
|---|---|
| `report` | only its report in `_system/reports/` |
| `propose` | proposals in `_system/reports/proposals/` |
| `act` | within `scope:` globs, one commit per run, never living-document bodies |

Climb one step per automation after two weeks of accepted output. Descend when the weekly review shows reverts above 10% of agent commits for two weeks. Changing `mode` or `scope` is a one-line decision record in `Decisions/` (`domain/knowledge`). Two automations never run in `act` on overlapping scopes at the same time.

## Structure, tags, properties, rules

All decisions (`rule-structure-stability.md`): a record in `Decisions/` first, then the change, with a dry-run of every path, link, view filter and script the change touches. The guard hook asks before edits to the contract files (`AGENTS.md`, `CLAUDE.md`, `_tags.md`, `object-schema.md`, `Brain Blueprint.md`, `brain.config.json`) and refuses new root files and folders.

Rules: cap of 8. A new rule names a concrete error that happened in this brain and is not covered elsewhere; beyond 8, one is replaced.

## Audit trail

`_system/log.md` (one line per operation), git history (every change, who, when), `_system/reports/` (what automations did). Git is the minimum trail, not a compliance system: for regulated content, keep the brain inside the organization's existing controls.
