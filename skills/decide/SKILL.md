---
name: decide
description: "Use when a decision is taken or reported: 'we decided', 'let's go with X', 'record the decision', or when minutes contain one. Writes a decision record with context, options, consequences, revisit conditions and dissent, links it from its project, and supersedes older records instead of editing them."
argument-hint: "[\"we chose X over Y because Z\"]"
---

# Decide

A decision changes what people do. Record it the day it is taken, with the why. A decision without a record did not happen for the brain.

Load `company-brain:conventions`. The brain's playbook, if present: `Resources/Playbooks/Record a decision.md`.

## 1. Is it a decision?

- Changes what we do: a decision.
- Defines a term: a Glossary row or a concept, not a decision.
- An opinion, a preference, an open question: the project note's Open questions.
- Replaces or reverses an older record: a new record, and the supersede flow in step 5.

## 2. Gather

From the conversation, the minutes, the project note: the context (facts with sources), the options actually considered (including doing nothing), who decided, what it costs, what we give up, who disagreed. Ask only for what is missing and cannot be found: usually the decider, and the dissent if a meeting had one.

## 3. Write

```
brain new decision "Short title" --owner "Decider" --project "Project" --source "[[Note]]" [--date YYYY-MM-DD] [--domain <domain>]
```

`--owner` fills `decider`. No `--project` means `project: none`. `--date` sets both the file name and `decided`: use it when the decision was taken on another day. `--source` is the minutes, the conversation, or `"chat YYYY-MM-DD"`. Then fill the sections of `_system/templates/Decision.md`:

- **Context:** what is true and what forces the choice, with sources.
- **Options:** A, B, C (do nothing). One line each.
- **Decision:** one paragraph.
- **Consequences:** gained, lost or risked, cost.
- **Revisit when:** conditions rather than dates where possible.
- **Dissent:** in the dissenter's words. Empty is a fact, not a default.

**Status:** the template writes `proposed`. Set `accepted` only if the decider said so in this conversation. Reported second-hand, from minutes or by someone else: it stays `proposed` and the decider accepts it. `review_due` only when a date makes sense.

## 4. Link

- The project note's `## Decisions`: one line with the link.
- The living document it changes: a dated fact line with the decision as source, or a proposal to its owner.
- The decider's CRM note: a Timeline line, if they have one.

## 5. Supersede, never edit

When a new record replaces an older one:

1. The new record: `supersedes: "[[Old record]]"`, and Context says what changed since.
2. The old record: `status: superseded` and `superseded_by: "[[New record]]"` in frontmatter. Its body stays as written.
3. A reversal without a replacement: the old record gets `status: reversed` and a dated line saying why.

## Output

1. `📄 **Created:**` the record first.
2. If `proposed`: who must accept it and how (they say "accepted", or set `status: accepted`).
3. `brain log decision "<title>"`, then `brain sync "decision: <title>"`.

`brain health` flags decisions proposed for more than 14 days; the brief lists them as waiting for a person.
