---
name: onboard
description: "Use on the first session in a brain still carrying template placeholders, when the team wants to fill or refresh ORG, NOW and the living documents, or to onboard a new teammate with a reading path. Starts from the company's own material, drafts everything with sources, then asks about ten confirm-or-fix questions."
argument-hint: "[--teammate \"Name\"] [--refresh]"
---

# Onboard

Two jobs: fill the instance from the company's own material, and onboard a person. With good material the first takes about twenty minutes; from scratch, longer.

Load `company-brain:conventions`. Notes with `sample: true` (Lumen Analytics) are the template's example: never a source.

## A. Fill the instance

### 1. Ask for material, then read it

One message: "Give me whatever exists: the website URL, a pitch deck, a docs folder, a Notion or Drive export, the team list." Take what comes; do not interview yet.

Read all of it: web fetch for URLs, file tools for folders and decks, the connectors this session has (Notion, Drive, Slack) for what lives there. An export goes under `_inbox/import-YYYY-MM-DD/` and through `company-brain:ingest` in import mode afterwards; for now read it, do not file it.

### 2. Draft, every fact with a source

Write directly: filling `{{placeholders}}` is not a rewrite, and the owners confirm in step 3. Every fact line ends with `[source: <URL, file or "chat YYYY-MM-DD">; since: YYYY-MM-DD]`. What the material does not say stays `to verify`.

- `_system/agent/ORG.md`: what the company does, for whom, stage, size, the people who own something, how decisions are made, what agents must never get wrong.
- `_system/agent/NOW.md`: the quarter's outcomes, active projects in priority order, risks.
- The five living documents in `Knowledge/Company/`: `Company`, `Product`, `Customers`, `How We Work`, `Glossary`, with `owner`, `review_due` (today plus cadence) and `last_verified` today.
- The team in `CRM/People/` (`brain new person "Name" --company "Company"`, tag `crm/team`, `reports_to`), the main customers and partners in `CRM/Companies/`.
- Current projects: `brain new project "Name" --owner "Person"`.
- Decisions already taken: `brain new decision "Title" --owner "Decider" --date YYYY-MM-DD --source "<where it is written>"`, `status: proposed` until step 3 confirms them.
- Product areas and segments as `product/*` and `customer/*` rows in `_system/_tags.md`.

### 3. Confirm or fix: about ten questions, one at a time

Each question shows what you drafted and asks "right, or what is different?". Wait for the answer, apply it, then the next. Cover, in order: what the company does and for whom; stage, size, the one number it watches; the product today; who buys and why; the team and who owns which document; the quarter's priorities; the active projects and their owners; the decisions you found (accept, fix or drop each); how the team works and where meetings, chat and docs live; what agents must never get wrong. Skip any question the material already answered unambiguously.

### 4. Finish

1. Fill the remaining placeholders: `AGENTS.md`, `CLAUDE.md`, `company` and `language` in `_system/brain.config.json`, the `CODEOWNERS` handles (ask for the GitHub handles; leave `@{{...}}` and say so if unknown), and the `_system/sources.md` rows for the sources they use (connector, destination, owner, `paused` until they turn ingest on), plus the scope per source (channels, folders, pages).
2. Once the real notes exist: `brain samples --archive`, then `brain links` and fix real notes that still point at a sample.
3. `brain index --write`, `brain health`: no errors; name each remaining warning and whose it is.
4. Close the `fill-the-instance` loop in `_system/memory/open-loops.md`. `brain log onboard "instance filled"`, then `brain sync "onboarding"`.

## B. Onboard a teammate

`--teammate "Name"`:

1. Their person note (`company-brain:people`, `crm/team`, `reports_to`).
2. `Output/Onboarding <Name>.md` (`#type/output`): a reading path in order: `Company`, `How We Work`, `Glossary`; `Product` and `Customers` if relevant; the project notes they join with their last three Timeline entries; the decisions of their area (decisions index, by domain); the people they will work with; the playbooks of their role.
3. Open loops: "Name reads the path by <date>", "Name's manager walks NOW.md with them", owner the manager.
4. If they own anything: propose them for `ORG.md`'s people table and `CODEOWNERS` to the brain owner. `brain sync "onboard <Name>"`.

## Output

1. `📄 **Created:**` links first: living documents, people, projects, decisions.
2. What is still `to verify`, and whose it is.
3. Next three steps: fill the `CODEOWNERS` handles (owners then review pull requests on living documents and contracts; day-to-day notes keep going straight to main); turn on the `morning-brief` automation; in two weeks, `verify` one living document with its owner to learn the flow.
