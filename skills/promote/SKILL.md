---
name: promote
description: "Use when knowledge should move up: an input cited more than once, a theme recurring in feedback, a term used across notes, a domain over 50 notes without a MOC, or 'this keeps coming up'. Creates concept notes, glossary entries and MOCs; the original stays where it is, linked."
argument-hint: "[note, theme or domain]"
---

# Promote

The brain is healthy when inputs become knowledge. `Input : Knowledge` above 2:1 means capture is fine and promotion is the bottleneck. Promotion creates a **new** note at the next stage and leaves the original in place with a link both ways.

Load `company-brain:conventions`.

## What to promote

- An input (research, feedback, conversation) **cited by two or more notes**, or answering a question asked twice: its distilled idea becomes a concept in `Knowledge/<Domain>/`.
- A theme that **recurs in feedback** (three or more feedback notes with the same `product_area` and sentiment): a concept in `Knowledge/Customers/` naming the theme, with the feedback notes as evidence.
- A **term** used consistently across three or more notes with a specific meaning: a Glossary entry, linked to its concept if one exists.
- A **domain over the MOC threshold** (`brain health` lists them, default 50 notes): a `_MOC <Domain>.md` with `#type/index`, organized by theme.
- A **playbook** hiding in minutes: a procedure the team described and repeated becomes `Resources/Playbooks/` with an owner.
- A **fact about the company** that lives only in minutes or chat: a dated line in the living document, proposed to its owner.

## How

1. Concept: `brain new concept "Title" --domain <domain> --source "[[Input note]]"`. One-sentence definition, what it is, why it matters here, evidence from this company with sources, `up:` the MOC. The input note gets a line "Promoted to [[Concept]] on YYYY-MM-DD", unless it is read-only (`readonly` in `_system/brain.config.json`): then the concept's `source:` is the only link.
2. Glossary: one row in `Knowledge/Company/Glossary.md` (term, meaning here, note). The Glossary is a living document: a new row is a small addition; a changed meaning is a proposal to the owner.
3. MOC: `Knowledge/<Domain>/_MOC <Domain>.md`, sections by theme, two to five links each with a half-line of why. Add `up:` to the MOC on the notes it indexes. Never alphabetical.
4. Playbook: it changes how the team works, so it goes to its owner. Draft it (`brain new playbook "Title" --owner "Person" --domain <domain> --source "[[minutes]]"`: steps, done-when, failure modes) on a branch with a pull request, or as a proposal in `_system/reports/proposals/` (`status: open`, `owner:`, `date:`).

## Do not

- Move the original. Promotion duplicates meaning, not files.
- Promote one-off inputs. Two citations or two questions is the bar.
- Promote from `sample: true` notes: they are the template's fictional company, not evidence.
- Create a concept without evidence from this company; otherwise it is a reference, and it stays in `Input/Research/`.

## Output

1. `📄 **Created:**` links first, then proposals with their owner.
2. The ratio before and after (`brain ratio`).
3. `brain log promote "<what>"`, then `brain sync "promote: <what>"`.

The weekly review reports promotion candidates; this skill executes them.
