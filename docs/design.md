# Design notes

Why the plugin and the template look the way they do. Sources in the research report that informed them are listed at the end.

## Starting point

The Object-OS kernel of marioverse.ai (`Vault Blueprint`, Object-OS v2): the folder says what a file is, the tag says what it is about, status is a property, wikilinks make the graph, `_system/` holds the agent memory, `AGENTS.md` is the universal contract and every runtime gets a thin adapter. Exo's memory decisions (capture after work, ADD/UPDATE/NOOP against existing notes, dated traces, nightly consolidation, no parallel registers, rule cap of 8). The second brain built for a coaching client (activity-based inputs, `project:` mandatory, one place for tasks, "one meeting one note").

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

- **No database, no embeddings.** Index-first plus `rg` carries a brain to a few hundred pages; beyond that, add a local BM25 index (qmd, Sonar) as a cache, never as a second source of truth. The retrieval ceiling is documented in the Blueprint, not hidden.
- **Dates and titles as decision IDs**, not sequential numbers: the index keeps the order, and renames do not break wikilinks.
- **One brain per trust boundary** instead of per-note ACLs: git cannot hide a folder; a second repository can.
- **The script measures, the model judges, nobody deletes.** Every check lists what is safe to fix mechanically; everything else is routed to a person with a name.
- **Skills over commands.** The entry points are user-invocable skills, which the docs recommend for new plugins and which Codex discovers as well.
- **Agents are adapters.** Procedure lives in the skill; the brain's `_system/agents/` bundle holds identity and scheduled-run specifics; the plugin's `agents/` files only add the Iron Law and the context contract.

## Open questions for v0.2

- A `brain diff` that renders what changed in living documents since `last_verified`, for the verify flow.
- A `brain consolidate` script path for the memory inbox, so the nightly run needs fewer model tokens.
- Evals (`claude plugin eval`) for the five most common flows, with a fixture brain and graders on file existence and frontmatter.
- A Codex plugin manifest once a Codex session is available to verify discovery.
