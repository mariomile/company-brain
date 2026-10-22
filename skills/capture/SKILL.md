---
name: capture
description: "Use when something must enter the brain: a document, a link, a pasted thread, a file dropped in _inbox/, an item handed over by ingest, or 'save this' and 'triage the inbox'. Routes by what the subject is, keeps raw material verbatim when it must stay so, extracts facts with ADD / UPDATE / NOOP, and links the graph."
argument-hint: "[path, URL, or 'inbox']"
---

# Capture

Everything enters raw; the brain gets richer by compiling it, not by storing it. One item at a time, the person in the loop when the destination is unclear.

Load `company-brain:conventions`. Read `_system/_tags.md`, `_system/object-schema.md`, `_system/indices/project-index.md` before routing.

## 1. Route by what the subject is

Never by the shape of what was dropped: a URL is a link to a thing, and the thing decides the folder.

| The subject is | Goes to | Then |
|---|---|---|
| a meeting transcript or meeting notes | | hand to `company-brain:meeting` |
| an email, chat or ticket thread with decisions or commitments | `Input/Conversations/` (`brain new conversation`) | extract decisions and actions |
| an external document (contract, brief, spec, PDF) | `Input/Documents/` | summary note; original in `Resources/_attachments/` or linked |
| an article, report, competitor page, user interview | `Input/Research/` | key points, numbers with page, what it means for us |
| customer feedback, a review, a support theme | `Input/Feedback/` (`brain new feedback`) | verbatim, anonymized without consent |
| a person or an organization | `CRM/` | hand to `company-brain:people` |
| a decision already taken | `Decisions/` | hand to `company-brain:decide` |
| a deliverable we produced | `Output/` or its project, `#type/output` | link to the project |
| a how-to the team follows | `Resources/Playbooks/` | owner and review date required |
| a task | the project note's Tasks, or `open-loops.md` if cross-session | owner and due |
| unclear | stays in `_inbox/` | one question, at the end |

**Raw or summary.** An import, an export or a raw document that must stay verbatim (a contract, a thread export, a data dump) goes to `Input/<kind>/Raw/`: add minimal frontmatter (`tags`, `source`, `date`) while it is still in `_inbox/`, then `git mv` it. From then on it is read-only (the guard refuses writes there; a move is not an edit). The summary note in `Input/<kind>/` cites it in `source:`. Everything else goes straight to its folder as a note. Empty or title-only files: skip silently.

## 2. Extract, then reconcile (ADD / UPDATE / NOOP)

For every fact worth keeping, find its canonical home (`AGENTS.md`, "Memory: where things go") and compare:

- **NOOP:** already there, same meaning. Do not duplicate.
- **UPDATE:** changed. Replace the line: `<new> (since YYYY-MM-DD; before: <old>)`.
- **ADD:** absent. Append a fact line with source and date.
- **Living document, policy, playbook:** ADD of a dated line is allowed; anything larger is a proposal to the owner (`rule-living-documents.md`), unless the person asked for that exact edit now.
- **No obvious home:** leave it in `_inbox/` as a short note with source and date; triage routes it.

One source can touch many notes: the input, the project's Now and Timeline, a person, a company. Touch them all; that is the compile step.

## 3. Link and title

Title understood without opening. `project:` and `source:` set, 1 to 4 tags, wikilinks on first mentions, `up:` to the project or MOC. Never add tags or links to a read-only source: link to it from the new note.

## 4. Inbox mode

"Triage the inbox": steps 1 to 3 for every file in `_inbox/` except `README.md`, skipping files modified in the last 10 minutes. Interactive: show the plan, apply on OK. Scheduled (`inbox-triage` automation): `propose` writes `_system/reports/proposals/YYYY-MM-DD triage.md` (`status: open`, `owner:`, `date:`), one ready-to-apply block per item; `act` applies what is certain and leaves the rest.

## Output

1. `📄 **Created:**` links first.
2. One line per fact routed: note → what.
3. Proposals for living documents: target note and the line to add.
4. Items left in `_inbox/`, with the one question each needs.
5. `brain log capture "<title>"`, then `brain sync "capture: <title>"`.
