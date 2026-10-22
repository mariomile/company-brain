# Design notes

Why the plugin and the template look the way they do. Sources in the research report that informed them are listed at the end.

## Starting point

The Object-OS kernel of marioverse.ai (`Vault Blueprint`, Object-OS v2): the folder says what a file is, the tag says what it is about, status is a property, wikilinks make the graph, `_system/` holds the agent memory, `AGENTS.md` is the universal contract and every runtime gets a thin adapter. Exo's memory decisions (capture after work, ADD/UPDATE/NOOP against existing notes, dated traces, no parallel registers, rule cap of 8). The second brain built for a coaching client (activity-based inputs, `project:` mandatory, one place for tasks, "one meeting one note").

## What a company brain adds

The Blueprint already said it: same primitives, different governance, one structural requirement (owner and review date on living documents). The template makes that concrete:

- `Knowledge/Company/` with five living documents and a glossary.
- `Decisions/` promoted to a top-level folder: in a company the decision log is the heart, and `_system/memory/decisions/` would hide it from people.
- Governance properties (`owner`, `review_due`, `last_verified`, `confidentiality`, `audience`, `source`, `project`) and cadences per type.
- `CODEOWNERS`, a PR template, CI on `brain health --strict`.
- The autonomy ladder per automation with `scope` globs.
- `_system/log.md`, append-only and greppable.
- Entity notes shaped "current truth above, timeline below".

## Patterns adopted from prior art

- Karpathy's LLM wiki: ingest → compile → query → lint loop; index-first navigation; append-only log with greppable prefixes; the LLM maintains the wiki, humans own the schema.
- gbrain: compiled truth above the line, timeline below; brain-first lookup; schema changes behind a human gate; nightly maintenance that reports orphans instead of deleting.
- Inkeep OpenKnowledge: immutable sources with fetch date; lifecycle status with `supersedes`; promotion behind a stop gate.
- Nygard ADRs: context, decision, consequences, status; supersede, never delete.
- Notion verified pages and Google freshness dates: owner plus expiry, re-verification routed to the owner.
- GitLab handbook-first: the repo is the source of truth; changes announced by linking the diff; proposer and approver differ.
- Permit.io and Vectorize on shared agent memory: check access at read and write; the repo is the access boundary; never ingest what you cannot access-control; anonymize people data.
- Anthropic context engineering: smallest set of high-signal tokens; just-in-time loading by identifiers; hooks enforce what CLAUDE.md can only advise.

## Deliberate choices

- **No database, no embeddings.** Index-first plus `rg` carries a brain to a few hundred pages, and `brain search` stays under a second on 20,000 notes; beyond that, add a local BM25 index (qmd, Sonar) as a cache, never as a second source of truth.
- **Dates and titles as decision IDs**, not sequential numbers: the index keeps the order, and renames do not break wikilinks.
- **One brain per trust boundary** instead of per-note ACLs: git cannot hide a folder; a second repository can.
- **The script measures, the model judges, nobody deletes.** Every check lists what is safe to fix mechanically; everything else is routed to a person with a name.
- **Skills over commands.** The entry points are user-invocable skills, which the docs recommend for new plugins and which Codex discovers as well.
- **Agents are adapters.** Procedure lives in the skill; a scheduled role is one automation file in the brain (mode, scope, prompt, lessons); the plugin's `agents/` files only add the Iron Law and the context contract. v0.1 also shipped per-agent bundles, souls and memory files: six roles written in six places each. v0.2 folded them into the automation file.
- **Two lanes for sharing.** Day-to-day knowledge goes to main with `brain sync` (commit, rebase, push); living documents, policies and contracts go through pull requests reviewed by their owner. v0.1 merged every Markdown file with `union`, which silently kept both sides of a conflicting frontmatter; v0.2 keeps `union` only for the two append-only files and lets every other conflict stop.
- **Fail closed.** If the guard cannot run (Node missing, a crash, an unreadable tool call) inside a brain, the write is blocked with the reason, instead of silently allowed.
- **Measure use, not only structure.** `ask` logs each question with its result; `brain metrics` reports the answer rate, the gaps and the questions asked twice: the clearest signal of what to write next.

## Personal brain vs company brain

Same primitives, different governance. This came from the Blueprint of the reference personal vault and moved here in v0.2: a company does not need it to run its brain.

| | Personal brain | Company brain |
|---|---|---|
| Ownership | yours, follows you between jobs | the organization's |
| Heart | memory, decisions, point of view | living documents, customer knowledge, decision log |
| `CRM/` | personal network | accounts and stakeholders |
| `Knowledge/` | your concepts | shared domain, terminology |
| `Journal/` | personal daily | operational log, meetings |
| Governance | you are the only author | review: who writes, who approves |
| Main risk | accumulation without synthesis | drift between documents and reality |

The company brain adds one structural requirement: living documents have a declared owner and a review date. The rest of the kernel is identical.

## Open questions

- A `brain diff` that renders what changed in a living document since `last_verified`, for the verify flow.
- Evals for capture, meeting, ask and ingest, beyond the two flows covered today (decide, health).
- A first real run of `brain-routines.yml` on GitHub: whether the action's own branch handling and the plugin hooks behave as documented.
- A Codex plugin manifest once a Codex session is available to verify discovery.
