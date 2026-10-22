---
name: meeting
description: "Use when a meeting must enter the brain: 'minutes', 'recap the call', a transcript pasted, dropped in _inbox/ or synced, or a synced meeting without minutes. Produces one minutes note citing its transcript, decision records, actions, dated facts on people and companies, and a project update."
argument-hint: "[meeting title, date, or 'today']"
---

# Meeting

One meeting, one minutes note. Decisions, actions and facts live in their homes; the minutes link them. The transcript is kept verbatim and never edited.

Load `company-brain:conventions`. Read the project note and the last minutes of the same project first: minutes say what **changed**.

## 1. Find the meeting and its transcript

- **Synced:** files in the read-only meeting folders (`readonly` in `_system/brain.config.json`, for example `Input/Meetings/Granola/`) from the last 2 days that no `Input/Meetings/*.md` cites in `source:`. More than 10: the 10 oldest, say how many remain.
- **Dropped in `_inbox/`:** add minimal frontmatter there (`tags: [type/transcript]`, `date:`, `source:` where it came from), then `git mv` it to `Input/Meetings/Raw/YYYY-MM-DD <Title>.md`. Read-only from then on.
- **Pasted in chat:** no file; the minutes cite `source: "chat YYYY-MM-DD"`.
- The same meeting from two sources: one note, the second linked as backup.

## 2. Project

From title, attendees and content; read `Active/Projects/<Name>/<Name>.md`. Company-wide or a 1:1: `project: none`. Unclear: `project: to verify`, continue, ask once at the end.

## 3. Write the minutes

`brain new meeting "Title" --date YYYY-MM-DD --project "Project" --source "[[<transcript path>]]"`, then fill the sections of `_system/templates/Meeting.md`:

- **In short:** 3 to 5 lines, what changed versus before.
- **Decisions:** one line each, linked to its record. A decision changes what people do; an opinion or a definition is not one (definitions go to the Glossary).
- **Actions:** `what · owner · due`, owner and due only if said, otherwise `?`.
- **Open questions:** what stayed unanswered.
- **Notes:** only what the summary misses. Never a transcript copy.
- `attendees:` as wikilinks. Write what was said, attributed; never fill a silence with what would have made sense.

## 4. Send everything to its home

1. Each decision: `company-brain:decide`, `status: proposed`, `source:` the minutes, the decider named.
2. Each action: a checkbox in the project note's Tasks; cross-session or owned outside the project: a loop in `_system/memory/open-loops.md`.
3. Facts about people and companies (a new role, a renewal date, what a customer asked for): a dated fact line in their CRM note, `[source: [[minutes]]; since: YYYY-MM-DD]`, plus a Timeline line; `last_contact` on external people. A person who will recur and has no note: `company-brain:people`.
4. Facts about the product or the company: ADD / UPDATE as in `company-brain:capture`, step 2. Living documents get a dated line or a proposal.

## 5. Update the project note

`## Now`: replace the state lines. `## Timeline`: one dated line with the minutes link. `## Open questions`: add or close. `last_updated` today.

## 6. Scheduled run

The `meeting-minutes` automation runs this procedure. `propose`: minutes, decisions and action lines go to `_system/reports/proposals/YYYY-MM-DD minutes.md` (`status: open`, `owner:` the project owner, `date:`), ready to apply. `act`: written in place, inside the automation's `scope`; whatever falls outside it (CRM lines, a raw transcript move) goes to the proposal instead.

## Output

1. `📄 **Created:**` the minutes link first, then decisions, actions and CRM lines written.
2. `to verify` items and the one question each needs.
3. `brain log meeting "<title>"`, then `brain sync "minutes: <title>"`.

Measured by meetings with minutes within 24 hours of the transcript: target 80%, reported by `brain metrics`.
