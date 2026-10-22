---
name: ingest
description: "Use when new material should come in from the company's connected sources: 'ingest', 'pull from Slack / Drive / Notion / the recorder', 'import this export', or the scheduled ingest run. Pulls only the active sources and scopes listed in _system/sources.md, lands raw material verbatim and read-only, then hands each item to meeting or capture."
argument-hint: "[source name | import <folder>]"
---

# Ingest

The brain pulls from outside only what `_system/sources.md` lists. Raw material lands verbatim and is never edited again; the knowledge comes from the minutes and notes built on top of it.

Load `company-brain:conventions`. Read `_system/sources.md` and the `readonly` globs in `_system/brain.config.json`.

## 1. Pick the sources

- Only rows with Status `active`. A paused row the person asks for: say it is paused and who owns it; turning it on is the brain owner's edit.
- Only the scope listed for that source under "Scope per source" (channels, folders, pages). Never direct messages. A source not in the table is never pulled.
- Only what changed since the row's Last sync.

## 2. Use the connector this session has

MCP tools for Slack, Google Drive, Notion, Granola or a helpdesk; or files the person dropped. A source whose connector is not available: skip it and name it. Never suggest installing something; name the missing connector.

## 3. Check the audience before anything lands

The row's Audience and each item's own marking at the source decide. Material from a private or restricted channel, or marked confidential at the source, never lands in a brain whose audience is wider: skip it and name the item, not its content. Secrets are never copied: skip the item and tell the source owner.

## 4. Land the raw material

1. One file per item: `YYYY-MM-DD <Title>.md`, the content verbatim, with minimal frontmatter:
   ```yaml
   tags: [type/transcript]   # or type/document, type/conversation
   source: <URL or source id>
   date: YYYY-MM-DD          # when it happened at the source
   ingested: YYYY-MM-DD
   ```
2. The destination is read-only, so the guard refuses direct writes there: write the file in `_inbox/`, then `git mv` it to the row's Destination. A move is not an edit. From then on nobody edits it, not even to add a tag or a link.
3. Same item already present (same `source:`): skip it.

## 5. Hand each item on

- Kind `meetings`: `company-brain:meeting` writes the minutes, citing the transcript in `source:`.
- Every other kind: `company-brain:capture` writes the summary note, decisions and facts, citing the raw file in `source:`.

## 6. Record how far you read

After a successful pull, set that row's Last sync to `YYYY-MM-DD HH:MM`. Change nothing else in `sources.md`.

## Import mode (one time)

"Import this export": the export is unzipped under `_inbox/import-YYYY-MM-DD/`.

1. Process it in batches of about 20 files, in a stable order (path, alphabetical).
2. Each file: material that must stay verbatim gets the frontmatter of step 4 and `git mv` to `Input/<kind>/Raw/`; the rest goes through `company-brain:capture` to its folder.
3. After each batch: `brain log ingest "import-YYYY-MM-DD batch N: <first> to <last>, M files left"`, then `brain sync "import-YYYY-MM-DD batch N"`.
4. Resuming: read the last `import-YYYY-MM-DD` line in `_system/log.md` and start after it. An export is never re-imported.

## Scheduled run

The `ingest` automation runs steps 1 to 6 and follows its `mode`. `propose`: write only `_system/reports/proposals/YYYY-MM-DD ingest.md` (`status: open`, `owner:` the source owner, `date:`) listing each item, its source and where it would land, ready to apply. `act`: land the raw files, update Last sync, and list what needs minutes or triage.

## Output

1. Per source: pulled, skipped (and why), new Last sync.
2. `📄 **Created:**` the raw files, then the minutes and notes made from them.
3. Items skipped for audience or secrets, by name only.
4. `brain log ingest "<sources>"`, then `brain sync "ingest: <sources>"`.
