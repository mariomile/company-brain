---
name: ask
description: "Use for any question about the company, its product, customers, decisions, people or history: 'what do we know about', 'what did we decide', 'where were we with', 'who owns'. Answers from the brain first with citations, names the gaps, logs the question with its result, and files answers worth keeping."
argument-hint: "[question]"
---

# Ask

Answer first, sources always, gaps named. Never fill a gap with something plausible. The order of sources, how to cite and how to resolve conflicts are in the brain's `_system/memory/rules/rule-research.md`: follow it. This skill adds where to look and what to do after.

## 1. Look in the brain

1. `brain search "<terms>"`, then follow wikilinks from the top hits.
2. "Why": `Decisions/`, through `_system/indices/decisions-index.md`. Skip `superseded` records unless the history is the question.
3. "Where were we": the project note's `## Now` and `## Timeline`, then the last minutes.
4. A person or a company: its CRM note, `## Now` first.
5. A term: `Knowledge/Company/Glossary.md`.

For every note you use, note `confidentiality` and `review_due`. A stale note is still a source: say it is stale and whose it is.

**Sample notes are not facts.** A note with `sample: true` belongs to the template's fictional company. Never cite it as this company's knowledge; if it is the only hit, the answer is a gap.

## 2. Beyond the brain

Only if the brain does not answer: the connected sources this session exposes, then the web, as `rule-research.md` orders them. Never suggest installing a product; name the missing capability instead.

## 3. Answer

- One to three lines, then the details as bullets, every claim with its source.
- Conflicts: both sources, which wins and why, and the conflict written as a dated line in the more canonical note.
- `confidential`: summarize, never quote, if the output leaves the brain. `restricted`: only to its `audience:` (`rule-confidentiality.md`).
- **Gaps:** what the brain does not know, what is stale and whose, what came from outside only.

## 4. Log the question

`brain log ask "<question as asked>" --result <result>`:

| Result | When |
|---|---|
| `answered` | the brain answered, with sources, nothing stale |
| `partial` | part of it from the brain, the rest from outside or missing |
| `gap` | the brain had nothing usable |
| `stale` | the answer rests on a note past `review_due` |

The log is how `brain metrics` counts the answer rate and the questions asked twice.

## 5. File what is worth keeping

- Needed outside sources and will come back: the material to `Input/Research/`; a distilled concept proposed through `company-brain:promote`.
- A decision or commitment surfaced and is not recorded: offer `company-brain:decide` or an open loop.
- A gap that matters: an open loop with an owner.
- Asked before (it shows in `brain metrics`): propose the section of a living document or the Glossary row where the answer should live.

## Output

The answer, its sources, **Gaps**, then any `📄 **Created:**` links and proposals. If you wrote anything: `brain sync "ask: <topic>"`. In a delegated run, create no files unless asked: return the proposals.
