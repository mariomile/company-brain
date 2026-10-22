---
name: ask
description: "Use for any question about the company, its product, customers, decisions, people or history: 'what do we know about', 'what did we decide', 'where were we with', 'who owns'. Answers from the brain first with citations, names the gaps, and files answers worth keeping."
argument-hint: "[question]"
---

# Ask

Answer first, sources always, gaps named. The brain outranks the web; a living document outranks minutes; newer verified beats older. Never fill a gap with something plausible.

Apply `_system/memory/rules/rule-research.md` if present; this skill is its portable form.

## 1. Look in the brain, in this order

1. `brain search "<terms>"`: titles, aliases, tags, then content, weighted toward living documents and decisions. Then follow wikilinks from the top hits.
2. For "why": `Decisions/` (the index `_system/indices/decisions-index.md` first).
3. For "where were we": the project note's `## Now` and `## Timeline`, then the last minutes.
4. For a person or company: its CRM note, `## Now` first.
5. For a term: `Knowledge/Company/Glossary.md`.

Note the `confidentiality` and the `review_due` of every note you use. A stale note is still a source: say it is stale.

## 2. Then connected sources, then the web

Only if the brain does not answer, only the sources this session exposes (mail, chat, tickets, meeting tools, analytics). For external facts: the web, recent and authoritative. Never a product the user should install; name the capability gap instead.

## 3. Resolve conflicts

Two sources disagree: show both. The one that wins is the more specific, the more recently verified, or the more authoritative (a decision record beats a chat; the owner's living document beats a teammate's note). Write the conflict as a dated line into the more canonical note.

## 4. Answer

- The answer in one to three lines. Then the details, as bullets.
- Every claim with its source: `[[note]]`, "email from X on DD/MM", "ticket #N", URL.
- `confidential` material: summarize, never quote, if the output leaves the brain (`rule-confidentiality.md`). `restricted`: only to its `audience:`.
- **Gaps**: what the brain does not know on this question, what is stale and whose it is, what came from the web only.

## 5. File what is worth keeping

- The question needed external sources and will come back: save the material in `Input/Research/` and, if it is a distilled concept, propose a note in `Knowledge/<Domain>/` (`company-brain:promote`).
- A decision or commitment surfaced that is not recorded: offer to record it.
- A gap that matters: an open loop with an owner.
- Count the question: if the same question returns three times, the answer belongs in a living document or the Glossary; propose it.

Never create files in a delegated run (`brain-analyst`) unless asked; return the proposals.
