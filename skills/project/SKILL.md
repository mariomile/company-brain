---
name: project
description: "Use when working on a project's state: 'update the project', 'where are we', 'next step', a new project, closing or pausing one. The project note is the card and the working memory of agents: read before, update after, current truth above and timeline below."
argument-hint: "[project name] [new|update|status|close]"
---

# Project

Every project has one note, `Active/Projects/<Name>/<Name>.md`, that a person or an agent reads first and updates last. A project with a stale note is a project an agent will reason about badly, with confidence.

Load `company-brain:conventions`. Living-document rules apply (`rule-living-documents.md`): the project note has an owner and a 14-day review.

## New project

1. `brain new project "Name" --owner "[[Person]]" --domain <domain>`: creates the folder, the note from `_system/templates/Project.md`, the log line.
2. Fill: the one-sentence outcome, **why it matters**, **success looks like** with a measurable condition and its baseline (with source; `to verify` if none), owner, team, stakeholders, the first tasks.
3. Add the project to `_system/agent/NOW.md` only if it is a current priority: propose the line to the NOW owner.
4. `brain index --write`, or let the `librarian` automation do it Monday.

## Update

- `## Now`: replace the state, next step and blockers. Three to six lines. Replace, never append.
- `## Timeline`: one dated line per event, newest first, with the link to minutes, decision, document.
- `## Decisions`: one line per decision record.
- `## Open questions`: add; close by moving the answer to the Timeline with its source.
- `## Tasks`: checkboxes, `what · owner · due`. Done: `[x]` with the date. Never delete.
- `last_updated` today. `last_verified` only through the verify flow by the owner.

## Status

Answer from the note: `## Now`, open tasks, last Timeline entry, decisions, loops in `open-loops.md` that name the project. If `review_due` is past, say so and name the owner. If the Timeline's last entry is older than 14 days and there are recent minutes for the project, the note is behind: update it from the minutes first.

## Pause, close, archive

- Pause: `status: paused`, a Timeline line with the reason. Stays in `Active/`.
- Done: `status: done`, the outcome versus "success looks like" in `## Now` with the measured number and source, a Timeline line. The weekly review proposes archiving after 30 days.
- Archive: `git mv "Active/Projects/<Name>" ".archive/Active/Projects/<Name>"`. Never delete, never edit inside `.archive/`. Update `NOW.md` by proposal, `brain index --write`.

## Subfolders

Free inside the project folder: specs, research, drafts. They need no decision. Deliverables carry `#type/output`.

## Output

1. `📄 **Created:**` links first, then the lines changed in `## Now`, Timeline, Tasks.
2. Proposals (NOW.md, a living document) with their owner.
3. `brain log project "<name>: <what>"`, then `brain sync "project: <name>"`.
