---
name: meeting
description: "Use when a meeting must enter the brain: 'minutes', 'recap the call', a transcript pasted or synced, or a meeting note without minutes. Produces one minutes note, decision records, actions in the project note and open loops, and a project update, all linked to the source."
argument-hint: "[meeting title, date, or 'today']"
---

# Meeting

One meeting, one minutes note. Decisions and actions live in their homes; the minutes link them. The transcript stays where it is.

Load `company-brain:conventions`. Read the project note and the last minutes of the same project before writing: minutes say what **changed**.

## 1. Find the meeting

- Named: that one. Pasted: the pasted text is the source (`source: "chat YYYY-MM-DD"`).
- "Today" or nothing: notes in the synced meetings folder (the `readonly` entry under `Input/Meetings/` in `_system/brain.config.json`) created in the last 2 days that no `Input/Meetings/*.md` cites in `source:`. More than 10: do the 10 oldest and say so.
- The same meeting from two sources: one note, the second source linked as backup.

## 2. Project

From title, attendees and content. Read `Active/Projects/<Name>/<Name>.md`. Unclear: `project: to verify`, continue, ask once at the end. No project (company-wide, 1:1): `project: none`.

## 3. Write the minutes

`brain new meeting "Title" --date YYYY-MM-DD --project "[[Project]]"`, then fill from `_system/templates/Meeting.md`:

- **In short**: 3 to 5 lines, what changed versus before.
- **Decisions**: one line each, linked to the record in `Decisions/`. A decision changes what people do; an opinion or a definition is not one (definitions go to the Glossary or a concept).
- **Actions**: `what · owner · due`. Owner and due only if said; otherwise `?`.
- **Open questions**: what stayed unanswered.
- **Notes**: only what the summary does not capture. Never a transcript copy.
- `attendees:` as wikilinks; create a person note only for someone who will recur (`company-brain:people`).

## 4. Decisions and actions to their homes

- Each decision: `company-brain:decide` with `status: proposed`, `source:` the minutes, `decider` named. The person accepts it.
- Each action: a checkbox in the project note's Tasks. Cross-session or owned by someone outside the project: a loop in `_system/memory/open-loops.md`.
- Facts about people, companies, the product: ADD / UPDATE in their notes (`company-brain:capture`, step 2).

## 5. Update the project note

`## Now`: replace the state lines. `## Timeline`: one dated line with the minutes link. `## Open questions`: add or close. `last_updated` today. Living-document rules apply: these are small dated additions, allowed.

## 6. Close

`📄 **Created:**` the minutes link first, then decisions and actions created, then `to verify` items. `brain log meeting "<title>"`. In an unattended run (`brain-scribe`), `propose` mode writes everything to `_system/reports/proposals/` instead.

## Measured by

Meetings with minutes within 24 hours of the synced note. Target 80%; the weekly review reports it.
