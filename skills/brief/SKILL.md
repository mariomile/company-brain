---
name: brief
description: "Use for 'brief', 'what is on today', 'what is open', Monday morning, or before a meeting: today's meetings with context, loops due, stale living documents, proposals and proposed decisions waiting for a person, what needs processing, the top priorities from NOW.md. Reads only; writes a report."
argument-hint: "[today|tomorrow|week] [person]"
---

# Brief

Short, readable on a phone, true. At most 40 lines, in the brain's language. The brief writes nothing in the brain except its own report.

## 1. Gather, in order

1. `brain brief`: health, stale living documents, loops due, inbox count, proposed decisions, open proposals, last review, NOW staleness.
2. `_system/agent/NOW.md`: the priorities. Order everything else by them. If it still has `{{placeholders}}`, say so and point to `setup`.
3. Calendar and mail of the last 24 hours, if this session has a calendar or mail connector. None: one line saying so.
4. Today's and yesterday's `Journal/Daily/` notes, including `## Agents`.
5. Each meeting today: the project note's `## Now` and the last minutes of that project.
6. `_system/memory/open-loops.md`: `resurface` today or past, `due` within 3 days, by owner.
7. `brain stale`: living documents past due, with owner.
8. Waiting for a person: proposals in `_system/reports/proposals/` with `status: open` (owner, age), decisions with `status: proposed` (decider, age), files in `_inbox/`, meetings synced yesterday without minutes.

Ignore `sample: true` notes: they are the template's fictional company.

## 2. Shape

```
# Brief YYYY-MM-DD
## Today
- 10:00 Weekly product sync · [[Project]]: one line of context
## Open
- [[Person]]: the loop (due DD Mon)
## Stale
- [[Product]]: 12 days past review, owner [[Person]]: "verify Product"
## Waiting for a person
- Proposal [[2026-W42 review]]: 9 days, owner [[Person]]
- Decision [[2026-10-20 Short title]]: proposed 2 days ago, decider [[Person]]
- 2 meetings without minutes · 3 files in _inbox/
## Priorities (NOW.md)
1. ...
```

For a person: filter loops, stale documents, proposals and meetings to what they own, decide or attend.

## 3. Deliver

1. Write `_system/reports/briefs/YYYY-MM-DD.md` and show it.
2. Scheduled run (`morning-brief` automation, `report` mode): also one line under `## Agents` in today's daily note (create it with `brain new daily` if missing). Nothing else.

## Output

The brief itself. If a source was unavailable, one line saying which. Never invent a meeting, a deadline or a number. `brain log brief "YYYY-MM-DD"`.
