---
name: review
description: "Use for the weekly review of the brain: 'weekly review', 'what did the brain learn', Friday. Produces the numbers, what changed, what is stale and whose it is, and at most five proposals ready to apply. Proposes, never applies."
argument-hint: "[week, e.g. 2026-W43]"
---

# Weekly review

The review is how the brain improves on purpose instead of by accident. It reads the week, compares with the canonical notes, and proposes few things, each executable without further context.

## 1. Gather

- `brain metrics`: notes updated (this week and last), decisions recorded, meetings with minutes over meetings synced, living documents stale, `Input:Knowledge`, agent commits and reverts, health.
- `_system/log.md`, last 7 days (`grep "^## \[" _system/log.md | tail -40`).
- `Journal/Daily/` of the week: `## Notes` and `## Agents`.
- The latest `_system/reports/health/`.
- `_system/memory/open-loops.md`: loops due, resurfacing, or untouched for 14 days.
- `brain stale`: living documents past `review_due`, by owner; past twice the cadence flagged.
- `Decisions/` with `status: proposed` older than 14 days.
- Minutes of the week: decisions and actions that never reached a record or a project note.
- `Input/Feedback/` of the week: themes with three or more notes and no concept.

## 2. Write the note

`brain new weekly`, then `_system/templates/Weekly Review.md`:

- **The numbers**: the table from `brain metrics`, with last week's column from the previous review.
- **What the brain learned**: 3 to 7 lines, each with wikilinks to the notes that changed. Content, not activity ("Northwind's second workspace never activated; onboarding redesign now has a baseline", not "3 notes updated").
- **What is stale or missing**: living documents past due with owner and days; projects with recent minutes but a Now older than 14 days; feedback themes without a concept; meetings without minutes (with "ask: minutes of X"); questions asked twice.
- **Proposals**: at most 5. Each: target note as wikilink, what to add or change, source, a prompt ready to run. Only targeted updates to living documents, `NOW.md`, project notes, the Glossary, or promotions. Never new registers, never rewrites of what a person wrote.
- **Next week**: what the proposals imply, who is late on verification.

Living documents past twice their cadence: one proposal each, addressed to the owner, offering verify or `status: paused`.

## 3. Deliver

- `📄 **Created:**` the weekly note. Proposals also to `_system/reports/proposals/YYYY-Www review.md` as blocks a person accepts one by one.
- `brain log review "YYYY-Www"`.
- If reverts of agent writes exceed 10% of agent commits for two weeks: propose lowering that automation's `mode` one step (`company-brain:governance`).

## Scheduled run

`brain-curator` runs this Friday in `propose` mode: the only writes are the weekly note and the proposals file.
