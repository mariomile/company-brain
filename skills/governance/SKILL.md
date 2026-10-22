---
name: governance
description: "Use for how the brain is governed: 'verify X', 'is this still true', owners and review dates, a teammate leaving, confidentiality and audience, proposals and pull requests for living documents, the mode of an automation, checking an unattended run, and any change to structure, tags, properties or rules (which is a decision)."
argument-hint: "[verify <note> | owner <note> <person> | mode <automation> | structure]"
---

# Governance

A company brain has many authors; the risk is drift between the documents and reality. Four mechanisms keep it true: owners and review dates, confidentiality, proposals and pull requests, and each automation's `mode`.

## 1. Verify a living document

Only the owner verifies. The agent does the bookkeeping.

1. Open the document. Walk the owner through the current-truth sections line by line, or show what changed since: `git log -p --since=<last_verified> -- "<path>"`.
2. Each line: still true; changed (update with the dated trace); no longer true (move it to the Timeline as "no longer true since YYYY-MM-DD").
3. The owner confirms in this conversation. Then `brain verify "<note>" --by "[[Owner]]"`: it sets `last_verified` to today, `review_due` to today plus the cadence for the type, and logs it. Never edit `last_verified` by hand; never verify for someone who did not confirm.
4. Owner unreachable and the document past twice its cadence: the weekly review proposes `status: paused`, addressed to the owner.

## 2. Owners and review dates

- Every living document (`type/living`, `playbook`, `policy`, `project`, `goal`) has `owner`, `review_due`, `last_verified`. `brain stale` lists what is past due or missing.
- Change an owner: a proposal or pull request to the current owner or the brain owner; once accepted, the frontmatter, a Timeline line "owner [[Old]] → [[New]] on YYYY-MM-DD", and `CODEOWNERS` if the path is listed there.
- A teammate leaves: reassign every document they own before their note becomes `crm/other`.

## 3. Confidentiality

`public · internal (default) · confidential · restricted` with `audience:`. Agents apply `rule-confidentiality.md`. The repository is the access boundary: content a group must not see goes into a second brain.

## 4. Proposals and pull requests

Day-to-day knowledge (inputs, minutes, proposed decisions, CRM, projects, journal) goes straight to main with `brain sync "<what changed>"`. Living documents, policies, playbooks and contracts change only through their owner, in one of two forms:

- **A proposal file:** `_system/reports/proposals/YYYY-MM-DD <title>.md`, frontmatter `status: open`, `owner:`, `date:`; one block per change: target note, the change, the source, a prompt that applies it. The owner sets `applied` or `rejected`. The brief counts the open ones.
- **A pull request**, when `gh` is available and the brain has a GitHub remote: branch `brain/<topic>`, the change, `gh pr create`. `CODEOWNERS` routes it to the owner; CI runs the health check. Never merge it yourself.

In a session, a small change can be shown as a diff and applied on the owner's yes. Agents never rewrite a living document.

## 5. Autonomy: the automation's `mode`

`mode` in `_system/automations/<name>.md` is the only autonomy setting: `report` writes its report; `propose` writes proposals plus what its `scope` names; `act` writes inside `scope`, never a living document's body.

- Climbing a step (`report` → `propose` → `act`) is a decision of the brain owner, after two weeks of output accepted as it was: a record in `Decisions/` (`domain/knowledge`), then the one-line edit.
- Descend one step when reverts of agent writes exceed 10% of its commits for two weeks.
- Two automations never run in `act` on overlapping scopes at the same time.
- After every unattended run: `brain scope <automation>` lists changes outside the scope and exits 1 if there are any. Do not sync a run that fails it.

## 6. Structure, tags, properties, rules

All decisions (`rule-structure-stability.md`): a record in `Decisions/` first, then the change, with a dry run of every path, link, view filter and script it touches. The guard asks before edits to contract files (`AGENTS.md`, `CLAUDE.md`, `CODEOWNERS`, `_tags.md`, `object-schema.md`, `Brain Blueprint.md`, `brain.config.json`, the rules), except while they still hold `{{placeholders}}`. Rules: cap of 8; beyond it, one is replaced.

## Output

1. What changed: the note, the fields, the new `review_due`, or the proposal or PR link with its owner.
2. `brain log <verify|owner|mode|structure> "<what>"` (`brain verify` logs itself).
3. `brain sync "<what changed>"`, or the PR URL when the change went through a branch.
