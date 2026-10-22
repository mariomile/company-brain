---
name: using-company-brain
description: "Use at the start of any work inside a company brain: it says what to load, how to route a request to the right brain skill, and what to watch for while working (stale documents, missing decisions, confidentiality)."
---

# Using the Company Brain

A company brain is a Markdown repository built from the company-brain template: ten folders, living documents with owners and review dates, a decision log, a CRM, and an agent layer in `_system/`. The contract every agent follows is the brain's own `AGENTS.md`. This skill routes; the brain's files decide.

## Boot (cold, nothing injected)

1. `AGENTS.md` at the brain root (the contract and the memory routing table).
2. `_system/agent/SOUL.md`, `ORG.md`, `NOW.md`.
3. `_system/memory/rules/_index.md`: the index only. Open a rule body when its trigger matches.
4. The project note of the project you work on: `Active/Projects/<Name>/<Name>.md`.
5. `_system/memory/open-loops.md`: the loops that touch your topic.

With the session-start hook, items 1 to 3 are summarized in the briefing: do not re-read them. `brain brief` prints the same briefing on demand.

## Route by what is asked

| Request | Skill |
|---|---|
| "what do we know / what did we decide / where were we with X" | `company-brain:ask` |
| a document, link, thread, transcript, file in `_inbox/`, "save this", "triage" | `company-brain:capture` |
| "minutes", "recap the call", a meeting transcript | `company-brain:meeting` |
| "we decided", "record the decision", "let's go with" | `company-brain:decide` |
| a project's state, next step, "update the project", a new project | `company-brain:project` |
| a person, a customer, a partner, "who is", "add to the CRM" | `company-brain:people` |
| "promote", "this keeps coming up", a domain over 50 notes, a term used everywhere | `company-brain:promote` |
| "health", "broken links", "orphans", "what is stale", "clean up" | `company-brain:maintain` |
| "weekly review", "what did the brain learn", Friday | `company-brain:review` |
| "brief", "what is on today", Monday morning | `company-brain:brief` |
| "verify", a living document is due, "is this still true" | `company-brain:governance` (verify flow) |
| owners, review dates, confidentiality, PR, autonomy of an automation, a structure change | `company-brain:governance` |
| first session, placeholders in the brain, a new teammate, "onboard" | `company-brain:onboard` |
| any writing in the brain | `company-brain:conventions` alongside the skill above |

A plain question that the brain answers in one lookup needs no skill ceremony: look it up, cite, answer.

## Watch while working

Check every request against the brain before doing the work, say what you find in at most two lines, then continue. Never block on these; never repeat one the person already answered in this session.

- **Stale ground.** The answer rests on a living document past `review_due` or a `NOW.md` past its review. Say so and name the owner.
- **Missing why.** The request changes what the company does and no decision record exists. Offer to record one (`decide`) after the work, not instead of it.
- **Contradiction.** Two notes disagree. Show both, say which wins (specificity, verification date, authority), write the conflict into the more canonical note as a dated line.
- **Confidentiality.** The output leaves the brain and draws on `confidential` or `restricted` notes. Apply `rule-confidentiality.md` before producing it.
- **Placeholders.** The brain still has `{{placeholders}}`: the instance was never filled. Point to `onboard`.

## Writing back

Every useful piece of work leaves the brain richer, in the same turn, in the canonical note (the routing table in `AGENTS.md` says where). Small, dated, sourced additions need no permission. Living documents get proposals, not rewrites (`rule-living-documents.md`). Then one line in `_system/log.md` (`brain log <op> "title"`).

## Precedence

Current request > canonical notes (living documents, decisions, CRM, project notes) > specialist contract > runtime memory. Newer `last_verified` beats older. The conversation beats recalled memory.
