---
name: decide
description: "Use when a decision is taken or reported: 'we decided', 'let's go with X', 'record the decision', or when minutes contain one. Writes a decision record with context, options, consequences, revisit conditions and dissent, links it from its project, and supersedes older records instead of deleting."
argument-hint: "[\"we chose X over Y because Z\"]"
---

# Decide

A decision changes what people do. Record it the day it is taken, from whoever took it, with the why. A decision without a record did not happen for the brain.

Load `company-brain:conventions`. The brain's playbook, if present: `Resources/Playbooks/Record a decision.md`.

## 1. Is it a decision?

- Changes what we do → decision.
- Defines a term → Glossary entry or concept note, not a decision.
- An opinion, a preference, an open question → the project note's Open questions, or `Input/`.
- Reverses or replaces an older decision → a new record that `supersedes:` the old one; the old one gets `status: superseded` and a line pointing forward. Never edit the old record's content.

## 2. Gather

From the conversation, the minutes, the project note: the context (facts with sources), the options actually considered (including "do nothing"), who decided, what it costs, what we give up, who disagreed and why. Ask only for what is missing and cannot be found: the decider, and the dissent if a meeting had one.

## 3. Write

`brain new decision "Short title" --owner "[[Decider]]" --project "[[Project]]" --domain <domain> --source "[[minutes or chat YYYY-MM-DD]]"`, then fill `_system/templates/Decision.md`:

- **Context**: what is true and what forces the choice. Facts with sources.
- **Options**: A, B, C (do nothing). One line each.
- **Decision**: one paragraph.
- **Consequences**: gained, lost or risked, cost.
- **Revisit when**: conditions, not dates where possible ("if Team MRR falls below 90% of pre-change after two quarters").
- **Dissent**: in the dissenter's words. Empty is a fact.
- `status: accepted` if the decider said so in this conversation; otherwise `proposed`, and the decider accepts it. `decided`, `decider`, `project`, `source`, `review_due` (optional, when a date makes sense).

File name `YYYY-MM-DD Short title.md` in `Decisions/`. Sequential IDs are not used: the date and title are the ID, and the index keeps the order.

## 4. Link

- The project note's `## Decisions`: one line with the link.
- The living document it changes (pricing → `Product.md`): a dated fact line with the decision as source, proposed if the document is not yours to edit.
- People involved: a Timeline line in the decider's note if they are in the CRM.

## 5. Close

`📄 **Created:**` the record first. `brain log decision "<title>"`. If the record is `proposed`, say who must accept it and how (set `status: accepted`, or reply "accepted" in chat).

## Health

`brain health` flags decisions proposed for more than 14 days. The weekly review counts decisions per week: a company that decides and records nothing has a brain that does not know why things are the way they are.
