---
name: capture
description: "Use when something must enter the brain: a document, a link, a pasted thread, a transcript, a file dropped in _inbox/, or 'save this'. Routes by what the subject is, extracts facts with ADD / UPDATE / NOOP against existing notes, links the graph, and never edits synced sources."
argument-hint: "[path, URL, or 'inbox']"
---

# Capture

Everything enters raw; the brain gets richer by compiling it, not by storing it. One source at a time, with the person in the loop when the destination is unclear.

Load `company-brain:conventions` for the writing rules. Read `_system/_tags.md`, `_system/object-schema.md` and `_system/indices/project-index.md` before routing.

## 1. Identify the subject

Route by what the subject **is**, never by the shape of what was dropped. A URL is a link to a thing; the thing decides the folder.

| The subject is | Folder | Template | Then |
|---|---|---|---|
| a meeting (transcript, notes, recording summary) | `Input/Meetings/` | Meeting | hand to `company-brain:meeting` |
| an email, chat or ticket thread with decisions or commitments | `Input/Conversations/` | Conversation | extract decisions and actions |
| an external document (contract, brief, spec received, PDF) | `Input/Documents/` | Document frontmatter | summary note; original in `Resources/_attachments/` or linked |
| an article, report, competitor page, user interview | `Input/Research/` | Research frontmatter | key points, numbers with page, what it means for us |
| customer feedback, a review, a support theme | `Input/Feedback/` | Feedback | verbatim (anonymized if no consent), what it tells us, theme link |
| a person | `CRM/People/` | Person | hand to `company-brain:people` |
| an organization | `CRM/Companies/` | Company | hand to `company-brain:people` |
| a decision already taken | `Decisions/` | Decision | hand to `company-brain:decide` |
| a deliverable we produced | `Output/` or its project | `#type/output` | title, link to project |
| a how-to the team follows | `Resources/Playbooks/` | Playbook | owner and review date required |
| a permanent concept distilled from several sources | `Knowledge/<Domain>/` | Concept | only via `company-brain:promote` |
| a task | the project note's Tasks, or `open-loops.md` if cross-session | | one line with owner and due |
| unclear | stays in `_inbox/` | | name it in the report and ask once, at the end |

Empty or title-only files: skip silently. A few lines with no clear topic: leave, name once.

## 2. Extract, then reconcile (ADD / UPDATE / NOOP)

For every fact worth keeping, find its canonical home with the routing table in `AGENTS.md` and compare:

- **NOOP**: already there, same meaning. Do nothing, do not duplicate.
- **UPDATE**: there, but changed. Replace the line with the dated trace: `<new> (since YYYY-MM-DD; before: <old>)`.
- **ADD**: absent. Append a dated fact line with its source.
- **Living document**: ADD and UPDATE become proposals (`rule-living-documents.md`), unless the person asked for exactly that edit in this conversation.
- **No obvious home**: `_system/memory/inbox/YYYY-MM-DD.md`, one line, source and date.

A source can touch many notes: the input note, the project note's Now and Timeline, a person, a company, a concept. Touch them all; that is the compile step.

## 3. Link and title

- Title so the note is understood without opening it. Date-first for dated inputs.
- `project:` set; `source:` set; 1 to 4 tags; wikilinks on first mentions; `up:` to the project or MOC.
- Add the back-link where the source was first mentioned (a daily note, a project note).

## 4. Synced and raw sources

Folders in `readonly` (`_system/brain.config.json`) are never edited. Read, link, produce a new note. The guard hook refuses writes there; so do you.

## 5. Close

- In chat: `📄 **Created:**` links first, then one line per fact routed (note → what), then the items left in `_inbox/` with the one question each needs.
- `brain log capture "<title>"`.
- Proposals for living documents listed with the target note and the line to add.

## Inbox mode

"Triage the inbox": run steps 1 to 5 for every file in `_inbox/`, skipping any file modified in the last 10 minutes (someone may be writing it). Interactive: present the plan, then apply on OK. Unattended (`brain-triager` automation): apply what is certain in `act` mode, propose in `propose` mode, leave the rest.
