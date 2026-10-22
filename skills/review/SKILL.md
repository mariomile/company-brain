---
name: review
description: "Use for the weekly review of the brain: 'weekly review', 'what did the brain learn', Friday. Produces the numbers, the questions people asked and the ones asked twice, what is stale and whose, proposals waiting too long, and at most five new proposals ready to apply. Proposes, never applies."
argument-hint: "[week, e.g. 2026-W43]"
---

# Weekly review

The review is how the brain improves on purpose. It reads the week, compares it with the canonical notes, and proposes few things, each executable without further context.

## 1. Gather

1. `brain metrics`: notes updated, decisions recorded, meetings with minutes, questions asked and answer rate, gaps and stale answers, questions asked more than once in 30 days, living documents stale, open proposals, `Input:Knowledge`, agent commits and reverts, health.
2. `_system/log.md`, last 7 days, including the `ask` lines with their result.
3. `Journal/Daily/` of the week, `## Notes` and `## Agents`; the latest `_system/reports/health/`.
4. `_system/memory/open-loops.md`: loops due, resurfacing, or untouched for 14 days.
5. `brain stale`: living documents past `review_due`, by owner; past twice the cadence flagged.
6. `_system/reports/proposals/` with `status: open`: owner and age of each. `Decisions/` with `status: proposed`.
7. Minutes of the week: decisions and actions that never reached a record or a project note. `Input/Feedback/` of the week: themes with three or more notes and no concept.

## 2. Write the note

`brain new weekly`, then the sections of `_system/templates/Weekly Review.md`:

- **The numbers:** the `brain metrics` table, last week's column from the previous review.
- **What the brain learned:** 3 to 7 lines of content, not activity, each with wikilinks to the notes that changed.
- **Questions:** how many were asked and answered from the brain. Each gap and each question asked twice: where its answer should live (a living document section, a Glossary row, a concept, a project note) and who owns that note.
- **Stale or missing:** living documents past due with owner and days; projects with recent minutes but a Now older than 14 days; meetings without minutes.
- **Waiting for a person:** open proposals older than 7 days, each named with its owner and age; decisions `proposed` for more than 14 days, with the decider.
- **Proposals:** at most 5 new ones. Each: target note as wikilink, the change, the source, a prompt ready to run. Only targeted updates to living documents, `NOW.md`, project notes, the Glossary, or promotions. Never new registers, never rewrites of what a person wrote.
- **Next week:** what the proposals imply, who is late on verification.

Living documents past twice their cadence: one proposal each, addressed to the owner, offering `brain verify` or `status: paused`.

## 3. Deliver

1. The weekly note in `Journal/Weekly/YYYY-Www.md`.
2. The proposals in `_system/reports/proposals/YYYY-Www review.md`, frontmatter `status: open`, `owner:`, `date:`, one block each, accepted one by one.
3. Reverts of agent writes above 10% of agent commits for two weeks: propose lowering that automation's `mode` one step (a decision, `company-brain:governance`).

## Scheduled run

The `weekly-review` automation runs this in `propose` mode: its only writes are the weekly note and the proposals file. Updates to `NOW.md`, living documents and project notes are proposed, never applied.

## Output

1. `📄 **Created:**` the weekly note and the proposals file.
2. Three lines: the answer rate, the top unanswered question with where it should live, the oldest proposal and its owner.
3. `brain log review "YYYY-Www"`, then `brain sync "weekly review YYYY-Www"`.
