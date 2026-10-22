---
name: onboard
description: "Use on the first session in a brain still carrying template placeholders, when the team wants to fill or refresh ORG, NOW and the living documents, or to onboard a new teammate with a reading path. Interviews one question at a time, writes the instance, archives the sample notes."
argument-hint: "[--teammate \"Name\"] [--refresh]"
---

# Onboard

Two jobs: fill the instance (the brain's identity and living documents) and onboard a person (a reading path through what exists).

Load `company-brain:conventions`. Read what exists first; ask only to confirm or correct.

## A. Fill the instance

Goal: after 30 to 45 minutes an agent knows what the company is, who the people are, what matters now, and how the team wants to work. The sample company (Lumen Analytics) is replaced and archived.

### How to interview

- One question at a time; wait for the answer.
- Read `_system/agent/ORG.md`, `NOW.md`, `Knowledge/Company/*.md` first: ask "is this right?" for what is filled, ask fresh for `{{placeholders}}`.
- Accept long, disordered, dictated answers; distill them.
- Every 4 or 5 answers, show what you understood in 3 lines and check.

### Blocks

1. **Company**: what it does, for whom, stage, size, founded, where; the one number the company watches; what it deliberately does not do. → `Company.md`, `ORG.md`.
2. **Product**: what it does today, plans, what is being built, the areas (become `product/*` tags). → `Product.md`, `_tags.md` Tier 2.
3. **Customers**: who buys and why, segments (become `customer/*` tags), top churn reason, the three biggest accounts. → `Customers.md`, `CRM/Companies/`.
4. **People**: the team, roles, who reports to whom, who owns what in the brain (Company, Product, Customers, How We Work, Glossary, Decisions, the domains). → `CRM/People/` with `crm/team`, `ORG.md`, `CODEOWNERS` placeholders listed for the person to fill.
5. **Now**: the two or three outcomes of the quarter, the active projects with owners, recurring rituals, risks. → `NOW.md`, `Active/Projects/` (one note each via `brain new project`), `Active/Goals/`.
6. **Decisions already taken**: the three to five decisions that explain why things are the way they are. → `Decisions/` via `company-brain:decide`, dated when they were taken.
7. **How we work**: rituals, tools, where meetings, mail and chat live (which become synced or connected sources), language of the brain. → `How We Work.md`, `_system/brain.config.json` (`company`, `language`, `readonly`).
8. **Terms**: five to ten words with a specific meaning here. → `Glossary.md`.
9. **What agents must never get wrong**: names, numbers, claims. → `ORG.md`, last section.

### Write

- Replace every `{{placeholder}}` in `AGENTS.md`, `CLAUDE.md`, `_system/**`, `CODEOWNERS` (owners as `@handle` placeholders remain for the person: say so).
- Set `owner`, `review_due` (today plus cadence), `last_verified` today on the living documents, since the owner just confirmed them.
- Archive the sample notes to `.archive/samples/` (Ada Rossi, Ben Okafor, Jane Doe, Lumen Analytics, Northwind Logistics, Onboarding Redesign, the two sample decisions, the sample meeting, feedback, concept, MOC, daily, goal) unless the team wants to keep one as an example; fix the links that pointed to them.
- `brain index --write`, `brain health`: it should be green except for `CODEOWNERS` handles.
- Close the `fill-the-instance` loop in `open-loops.md`. `brain log init "instance filled"`.

### Close

Show the person: the five living documents (links), the team, the projects, the decisions, what is still `to verify`, and the three things to do next: fill `CODEOWNERS` and enable Code Owner review on main; enable the morning brief automation; run `verify` on one document in two weeks to learn the flow.

## B. Onboard a teammate

`--teammate "Name"`:

1. Create or update their person note (`company-brain:people`, `crm/team`, `reports_to`).
2. Read their role and the projects they join. Produce `Output/Onboarding <Name>.md` (`#type/output`): a reading path in order: `Company`, `How We Work`, `Glossary`; then `Product` and `Customers` if relevant; the project notes they join with their last three Timeline entries; the decisions that explain their area (from the decisions index, by domain); the people they will work with; the playbooks of their role.
3. Open loops: "Name reads the path by <date>", "Name's manager verifies NOW with them", owner the manager.
4. Add them to `ORG.md`'s people table and, if they own anything, to `CODEOWNERS` (placeholder for the handle).
