---
name: using-company-brain
description: "Use at the start of any work inside a company brain: what to load, which brain skill a request goes to, what to watch for while working, and how to write back."
---

# Using the Company Brain

The brain's own `AGENTS.md` is the contract. This skill routes; the brain's files decide.

**Boot (cold, nothing injected):** `AGENTS.md`; `_system/agent/SOUL.md`, `ORG.md`, `NOW.md`; `_system/memory/rules/_index.md` (open a rule only when its trigger matches); on a scheduled run, your file in `_system/automations/`; the project note you work on. With the session-start briefing, skip what it already gave you.

**Not set up yet:** when the briefing says `Setup: N step(s) left`, offer `setup` once before other work. It is the person's call; if they decline, do the request.

## Route

| People say | Skill |
|---|---|
| "what do we know", "what did we decide", "where were we with X" | `ask` |
| a document, link, thread, file in `_inbox/`, "save this", "triage the inbox" | `capture` |
| "pull from Slack / Drive / Notion / the recorder", "import this export" | `ingest` |
| "minutes", "recap the call", a transcript | `meeting` |
| "we decided", "record the decision", "let's go with" | `decide` |
| a project's state, next step, a new project | `project` |
| "who is", a customer, a partner, "add to the CRM" | `people` |
| "this keeps coming up", a term used everywhere | `promote` |
| "health", "check the brain", "broken links", "clean up" | `maintain` |
| "verify X", "is this still true", owners, autonomy, a structure change | `governance` |
| "brief", "what is on today" | `brief` |
| "weekly review", "what did the brain learn" | `review` |
| first session, "Setup: N step(s) left" in the briefing, "set up", "connect Granola / Slack", "turn on the routines", "share the brain" | `setup` |
| `{{placeholders}}` to fill, "onboard", a new teammate | `onboard` |
| any writing | `conventions`, alongside |

Skills are `company-brain:<name>`. A one-lookup question needs no ceremony: look up, cite, answer, log.

## Watch (two lines at most, never block)

- **Stale:** the answer rests on a living document past `review_due`: say so, name the owner.
- **Missing why:** the work changes what the company does and no decision exists: offer `decide` after.
- **Contradiction:** show both notes, say which wins, write the conflict as a dated line in the more canonical one.
- **Confidential:** an output leaves the brain and draws on `confidential` or `restricted` notes: apply `rule-confidentiality.md`.
- **Samples are not facts:** `sample: true` notes belong to the fictional Lumen Analytics. Never cite them as this company's.

## Writing back

1. Shared brain (git remote): `brain sync --pull` once, before the first write of the session.
2. Write in the same turn, in the canonical note (`AGENTS.md`, "Memory: where things go"). Small dated sourced additions: no permission. Living documents, policies, playbooks: a proposal or a pull request, never a rewrite.
3. Never edit read-only folders (`readonly` in `_system/brain.config.json`) or `.archive/`.
4. Answered a question from the brain: `brain log ask "<question>" --result answered|partial|gap|stale`.
5. After writing: `brain sync "<what changed>"`.

Precedence: current request > canonical notes > automation file > runtime memory.
