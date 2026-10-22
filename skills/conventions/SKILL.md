---
name: conventions
description: "Use whenever you write or edit a note in a company brain: frontmatter per type, tags, wikilinks, dated fact lines with sources, naming, the current-truth-above-timeline-below shape, and the reply format when you create files."
---

# Writing conventions

The brain's own rule is `_system/memory/rules/rule-writing-notes.md`; this skill is the portable version with the reasons. If the two differ, the brain's rule wins.

## Frontmatter

- `tags`: 1 to 4 from `_system/_tags.md`, always one `type/*`, usually one `domain/*`, optionally one Tier 2 (`crm/*`, `customer/*`, `product/*`). Nothing else as a tag: state, stage and entity names are properties or links.
- The properties of the type, from `_system/object-schema.md`. A property that no view, query or governance check needs goes in the body.
- Living documents (`type/living`, `playbook`, `policy`, `project`, `goal`): `owner`, `review_due`, `last_verified`.
- `project:` on meetings, conversations, decisions, feedback: `"[[Project]]"`, `none`, or `to verify`.
- `source:` on anything derived: `"[[note]]"`, a URL, `"ticket #N"`, `"chat YYYY-MM-DD"`.
- `confidentiality:` only when not `internal`.
- Wikilinks in frontmatter are quoted. `up:` for the parent or MOC, `related:` for peers.
- Agent-managed fields (`created_by`, `last_edited_by`, `last_updated`) only on `_system/**`, project notes and living documents.
- Normalize on touch; never bulk-rewrite frontmatter with a YAML parser (unquoted wikilinks break).

## Body

- **Wikilink on the first mention** of a person, company, project, decision, concept. Inline, in the sentence, never a trailer list. `[[Note|text]]` when the words differ.
- **One fact per line, with provenance:** `- <fact> [source: <note, URL or "chat YYYY-MM-DD">; since: YYYY-MM-DD]`.
- **A changed fact** stays on its line: `<new> (since YYYY-MM-DD; before: <old>)`.
- **A status that updates** is one line you replace, never one line per check.
- **Entity notes** (people, companies, projects, living documents): current truth in the top sections, `## Timeline` with dated events newest first.
- Never rewrite or remove what a person wrote. Add, or update with a dated trace.
- Short sentences. Bullets over paragraphs. No em-dashes: full stop, comma or colon.
- Language: match the note; for new notes, `language` in `_system/brain.config.json`.

## Naming

- Spaces, not hyphens: `Onboarding Redesign.md`. Hyphens only inside proper names.
- Dated notes start with the date: `2026-10-14 Weekly product sync.md`. Daily `YYYY-MM-DD.md`, weekly `YYYY-Www.md`.
- A project folder and its note share the name: `Active/Projects/<Name>/<Name>.md`.

## Creating a note

Prefer `brain new <type> "Title" [--owner --project --domain]`: it fills the template, the dates and the log line. Then open the reply with the link before any analysis:

```
📄 **Created:** [[path/file]]: what it contains
```

## Links and the graph

- At least 2 outgoing wikilinks per note, or it is an orphan.
- When a note names an entity that has a note and does not link it, add the link.
- Typed edges on CRM notes are properties (`works_at`, `reports_to`, `customer_of`...), one per relation, reciprocal when the other note exists.

## What never goes in

Secrets. Private personal data. Chat transcripts. The same fact in two files. A fact without a source.
