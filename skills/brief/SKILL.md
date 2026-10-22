---
name: brief
description: "Use for 'brief', 'what is on today', 'what is open', Monday morning, or before a meeting: today's meetings with context, loops due, stale living documents, what needs processing, the top priorities from NOW.md. Reads only; writes a report."
argument-hint: "[today|tomorrow|week] [person]"
---

# Brief

Short, readable on a phone, true. At most 40 lines. The brief writes nothing in the brain except its own report.

## Sources, in order

1. `brain brief`: health, stale living documents, loops due, inbox counts, last review, NOW staleness.
2. `_system/agent/NOW.md`: priorities. Order everything else by these.
3. Calendar and mail of the last 24 hours if a calendar or mail source is connected in this session. Not connected: one line saying so, move on.
4. Today's and yesterday's daily notes in `Journal/Daily/`, including `## Agents`.
5. For each meeting today: the project note's `## Now` and the last minutes of that project.
6. `_system/memory/open-loops.md`: `resurface` today or past, `due` within 3 days, by owner.
7. `brain stale`: living documents past due, with owner.
8. Synced meetings without minutes; files in `_inbox/`; `_system/memory/inbox/` not empty; decisions `proposed`.

## Shape

```
# Brief YYYY-MM-DD
## Today
- 10:00 Weekly product sync · [[Onboarding Redesign]]: guided funnel at 10% ships 24 Oct; open: share prompt before or after first funnel
## Open
- [[Ben Okafor]]: walk Jane Doe through the new flow (loop, due 24 Oct)
## Stale
- [[Product]]: 12 days past review, owner [[Ben Okafor]]: "verify Product"
## To process
- 2 meetings without minutes: "minutes of ..." · 3 files in _inbox/: "triage the inbox"
## Priorities (NOW.md)
1. ...
```

For a person: filter loops, stale documents and meetings to what they own or attend.

## Deliver

Write `_system/reports/briefs/YYYY-MM-DD.md` and show it. On a scheduled run, append one line under `## Agents` in today's daily note (create the daily from `_system/templates/Daily.md` if missing). If a source was unavailable, say so in one line. Never invent a meeting, a deadline or a number.
