---
name: onboard
description: "Use when a brain still carries template placeholders (usually called by company-brain:setup), when the team wants to fill or refresh ORG, NOW and the living documents, or to onboard a new teammate with a reading path. Starts from the company's own material, from a website and a deck up to a whole vault, repo and meeting archive, drafts everything with sources, then asks about ten confirm-or-fix questions."
argument-hint: "[--teammate \"Name\"] [--refresh]"
---

# Onboard

Two jobs: fill the instance from the company's own material, and onboard a person. With good material the first takes about twenty minutes; from scratch, longer.

Load `company-brain:conventions`. Notes with `sample: true` (Lumen Analytics) are the template's example: never a source.

## A. Fill the instance

### 0. Clear the samples

`brain samples --archive` before writing anything. Real notes then never collide with a sample's name (the sample `Active/Goals/2026-Q4.md`, for example), and nothing real ever links a fictional note. The links the move breaks are in the template's own files: `brain links` at the end shows what is left.

### 1. Ask for material, then read it

One message: "Give me whatever exists: the website URL, a pitch deck, a docs folder, a Notion or Drive export, the team list." Take what comes; do not interview yet.

Read all of it: web fetch for URLs, file tools for folders and decks, the connectors this session has (Notion, Drive, Slack, the meeting recorder) for what lives there. An export goes under `_inbox/import-YYYY-MM-DD/` and through `company-brain:ingest` in import mode afterwards; for now read it, do not file it.

**More than a site and a deck** (a personal vault, a product repository, months of meetings): do not write as you read. Build the brain in three passes.

1. **Dossier.** One file outside the brain (your scratch space), one section per destination: Company, Product, Customers, Team, How we work, Projects, Decisions, Metrics, Glossary, Contradictions. One fact per line with its origin and date. Flag each fact that must not travel as written: `[CONFIDENTIAL]` (money, revenue, customers' commercial terms), `[HR]` (morale, health, leave, performance), `[PERSONAL]` (one person's contract, pay, career), `[SECURITY]` (open vulnerabilities, incidents). Contradictions get both sides with their dates and which is newer. Delegate the reading by source to subagents when it is large; you merge.
2. **Writers.** One rules file every writer reads (language, source origins, confidentiality, exact note names to link, what never to write), then writers in parallel on disjoint folders: `CRM/`; `Decisions/`; `Active/` plus the key minutes in `Input/Meetings/`. Writers whose folders must overlap work each in its own git worktree, and you merge their branches back, resolving conflicts like a teammate's. Tell each to load `company-brain:conventions` and to finish with `brain links` and `brain tags`. You write ORG, NOW, the five living documents, tags, sources and open loops yourself: they are the synthesis.
3. **Integration.** Read each writer's report; fix what they flagged; reconcile names (one person or customer, one note); then step 4.

**What never travels.** `[CONFIDENTIAL]` facts go only in notes with `confidentiality: confidential`. `[HR]`, `[PERSONAL]` and `[SECURITY]` facts are not written at all; a security item becomes at most "security hardening in progress" on its project. ORG, NOW and the open loops are read at every boot by every agent: they carry no confidential figures, only a pointer to the note that does.

### 2. Draft, every fact with a source

Write directly: filling `{{placeholders}}` is not a rewrite, and the owners confirm in step 3. Every fact line ends with `[source: <origin>; since: YYYY-MM-DD]`, with an origin a teammate can find (`company-brain:conventions`, section 2): never a path on one person's machine. What the material does not say stays `to verify`. Owners you can only guess are drafted as guesses and confirmed in step 3.

- `_system/agent/ORG.md`: what the company does, for whom, stage, size, the people who own something, how decisions are made, what agents must never get wrong.
- `_system/agent/NOW.md`: the quarter's outcomes, active projects in priority order, risks.
- The five living documents in `Knowledge/Company/`: `Company`, `Product`, `Customers`, `How We Work`, `Glossary`, with `owner`, `review_due` (today plus cadence) and `last_verified` today.
- The team in `CRM/People/` (`brain new person "Name" --company "Company"`, tag `crm/team`, `reports_to`), the main customers and partners in `CRM/Companies/`.
- Current projects: `brain new project "Name" --owner "Person"`.
- Decisions already taken: `brain new decision "Title" --owner "Decider" --date YYYY-MM-DD --source "<where it is written>"`, `status: proposed` until step 3 confirms them. A record already written down as accepted (an ADR in the repository) stays accepted, with its author as decider.
- Each contradiction the material leaves open: a loop in `_system/memory/open-loops.md`, owner the person who can settle it.
- Product areas and segments as `product/*` and `customer/*` rows in `_system/_tags.md`.

### 3. Confirm or fix: about ten questions, one at a time

Each question shows what you drafted and asks "right, or what is different?". Wait for the answer, apply it, then the next. Cover, in order: what the company does and for whom; stage, size, the one number it watches; the product today; who buys and why; the team and who owns which document; the quarter's priorities; the active projects and their owners; the decisions you found (accept, fix or drop each); how the team works and where meetings, chat and docs live; what agents must never get wrong. Skip any question the material already answered unambiguously.

### 4. Finish

1. Fill the remaining placeholders: `AGENTS.md`, `CLAUDE.md`, `company` and `language` in `_system/brain.config.json`, the `CODEOWNERS` handles when the brain is shared on GitHub (ask for them; leave `@{{...}}` and say so if unknown), and the `_system/sources.md` rows for the sources they use (`paused`: `company-brain:setup` turns them on), plus the scope per source (channels, folders, pages). Every row gets its owner, used or not; the scope lines of sources nobody uses are deleted.
2. `brain links`: fix real notes that point at a sample or at a note nobody wrote.
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
3. Next: back to `company-brain:setup` for the input sources and the routines, the two things that keep the brain true after today. In two weeks, `verify` one living document with its owner to learn the flow.
