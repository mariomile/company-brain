# Capability map

Skills never name a tool. They name a capability and resolve it against what the session exposes. A hardcoded tool name breaks on another host, another connector instance, another company's stack.

| Capability | What it does | Typical providers |
|---|---|---|
| `files.read` / `files.write` | read and write notes in the brain | any file access; the only capabilities assumed present |
| `shell.exec` | run `scripts/brain.mjs` and git | any shell access |
| `brain.search` | index-first search over the brain | `brain search`, `rg`, Obsidian search tools, an embedded search index |
| `meetings.read` | read transcripts and meeting notes | a synced folder in `Input/Meetings/`, Granola, Gong, Fireflies, a calendar tool |
| `mail.read` / `chat.read` / `tickets.read` | read threads to summarize into `Input/Conversations/` | mail, chat and ticket connectors |
| `calendar.read` | today's meetings for the brief | calendar connectors |
| `docs.read` | fetch an external document to ingest | drive connectors, `web.fetch` |
| `web.search` / `web.fetch` | external facts for `ask` and `capture` | any web tool |
| `analytics.query` | a number with a source for a living document or a goal | analytics and database connectors |
| `subagent.dispatch` | delegate to a `company-brain:*` agent | Claude Code and hosts that expose agents; otherwise run inline |
| `scheduler.run` | run an automation unattended | Exo automations, Claude Code routines, cron plus `claude -p`, CI |

## Resolution

1. Enumerate the tools the session exposes.
2. Match by shape, not by name: a tool that returns calendar events provides `calendar.read`.
3. Record what resolved where it matters (a number's source tag names the provider).
4. Degrade explicitly: say what could not be reached and what it would have answered. Never tell the user to install a named product.

## Degradation ladder

| Capability | 1st | 2nd | Floor |
|---|---|---|---|
| `brain.search` | `brain search` | `rg` on content | read the indices and follow links |
| `meetings.read` | synced folder | connector | the user pastes the transcript |
| `calendar.read` | connector | the daily note's Notes | say "no calendar connected" |
| `analytics.query` | live query | a number already in the brain, dated | ask, tag `[source: chat YYYY-MM-DD]` |
| `web.search` | live | — | skip, name the gap |
| `subagent.dispatch` | delegate | run the same skill inline | — |
| `scheduler.run` | Exo or routines | `brain run <automation>` piped into `claude -p` | run by hand on request |
