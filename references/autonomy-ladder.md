# The autonomy ladder

Every automation declares a `mode` in its file in `_system/automations/`, and that is the only autonomy setting. The ladder is climbed one step per automation, by decision of the brain owner, after two weeks of output accepted as it was; it is descended when reverts exceed 10% of that automation's commits for two weeks.

| Mode | Writes in the brain | Typical first use |
|---|---|---|
| `report` | its report in `_system/reports/`, one line in the daily note | the morning brief, any new automation |
| `propose` | proposals in `_system/reports/proposals/` (`status: open`, `owner:`, `date:`), plus the files its `scope` names | triage, minutes, ingest, weekly review |
| `act` | within the declared `scope` globs only, never a living document's body | indices and the health report first; triage and minutes once trusted |

Rules that hold at every step:

- A living document changes by proposal or by a small dated addition, never by rewrite.
- Two automations never run in `act` on overlapping scopes at the same time.
- Every run leaves one line under `## Agents` in the daily note; `act` runs also one line in `_system/log.md`.
- After every unattended run, `brain scope <automation>` lists changed files outside the scope (deletions always count). The scheduled workflow fails the run and lands nothing if there is one.
- Proposals stay in the daily brief until a person sets them `applied` or `rejected`.
- Changing `mode` or `scope` is a one-line decision record (`Decisions/`, `domain/knowledge`).
- The guard hook enforces root, archive, read-only and secrets regardless of mode.

Suggested order in a fresh brain: morning brief (report) → inbox triage (propose) → meeting minutes (propose) → weekly review (propose) → librarian (act, narrow) → ingest (propose, once sources are connected).
