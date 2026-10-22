---
name: conventions
description: "Use whenever you write or edit a note in a company brain: frontmatter per type, statuses, link fields, tags, wikilinks, dated fact lines with sources, sample notes, naming, the current-truth-above-timeline-below shape, and the reply format when you create files."
---

# Writing conventions

The brain's own rule is `_system/memory/rules/rule-writing-notes.md`; the schema is `_system/object-schema.md`. If this skill and the brain differ, the brain wins.

## 1. Frontmatter

- `tags`: 1 to 4 from `_system/_tags.md`: one `type/*` always, usually one `domain/*`, optionally one of `crm/*`, `customer/*`, `product/*`. State, stage and entity names are never tags.
- Only the properties of the type in `object-schema.md`. A property no view, query or governance check needs goes in the body.
- `status` is a property, only on these types: project `active · backlog · paused · done`; goal `active · done · dropped`; decision `proposed · accepted · superseded · reversed`; concept, research `active · disproven`; living, playbook, policy `active · paused`; note, output `draft · done`; proposals `open · applied · rejected`.
- Governance block on living documents (`type/living`, `playbook`, `policy`, `project`, `goal`): `owner`, `review_due`, `last_verified`. `last_verified` is set once at creation, then only by the owner through `brain verify`.
- Link fields, quoted wikilinks: `up`, `related`, `source`, `project` (`"[[Project]]"`, `none` or `to verify`), `owner`, `decider`, `supersedes`, `superseded_by`, typed CRM edges (`works_at`, `reports_to`, `manages`, `customer_of`, `partner_of`, `competitor_of`, `backed_by`).
- `source:` on anything derived: `"[[note]]"`, a URL, `"ticket #N"`, `"chat YYYY-MM-DD"`.
- `confidentiality:` only when not `internal`; `audience:` on `restricted`.
- `sample: true` marks the template's fictional company (Lumen Analytics). Never add it; never cite those notes as facts.
- `created_by`, `last_edited_by`, `last_updated` only on `_system/**`, project notes and living documents.
- Normalize on touch. Never bulk-rewrite frontmatter with a YAML parser: unquoted wikilinks break.

## 2. Body

- **Wikilink on the first mention** of a person, company, project, decision, concept. Inline, never a trailer list. `[[Note|text]]` when the words differ.
- **Fact lines:** one fact per line, provenance at the end: `- <fact> [source: <note, URL or "chat YYYY-MM-DD">; since: YYYY-MM-DD]`.
- **A changed fact** stays on its line: `<new> (since YYYY-MM-DD; before: <old>)`.
- **A status that updates** is one line you replace, never one line per check.
- **Entity notes** (people, companies, projects, living documents): current truth on top, `## Timeline` below, newest first.
- Never rewrite or remove what a person wrote. Add, or update with a dated trace.
- Short sentences, bullets over paragraphs. **No em-dashes:** full stop, comma or colon.
- Language: match the note; new notes use `language` in `_system/brain.config.json`.

## 3. Naming

- Spaces, not hyphens: `Onboarding Redesign.md`. Dated notes start with the date: `2026-10-14 Weekly product sync.md`.
- Daily `Journal/Daily/YYYY-MM-DD.md`, weekly `Journal/Weekly/YYYY-Www.md`. A project folder and its note share the name.

## 4. Where you never write

Folders in `readonly` (`Input/Meetings/Granola/**`, `Input/**/Raw/**`): not even a tag or a link. `.archive/`: move into it with `git mv`, never edit inside. The root: only the contract files.

## 5. Links and the graph

- At least 2 outgoing wikilinks per note, or it is an orphan.
- A note that names an entity with a note and does not link it: add the link.
- Typed edges reciprocal when the other note exists (`reports_to` ↔ `manages`).

## 6. Creating a note

Prefer `brain new <type> "Title" [--owner --project --domain --date --source --company]`. It fills the template with real values or blanks: no `--project` means `project: none`; `--date` sets both the file name and `decided`.

## Output

Open the reply with the links before any analysis:

```
📄 **Created:** [[path/file]]: what it contains
```

Never in a note: secrets, private personal data, chat transcripts, the same fact in two files, a fact without a source.
