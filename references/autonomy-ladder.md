# The autonomy ladder

Every automation and every unattended agent run declares a `mode`. The ladder is climbed one step per automation, after two weeks of accepted output, and descended when reverts exceed 10% of agent commits for two weeks.

| Mode | Writes in the brain | Typical first use |
|---|---|---|
| `report` | nothing; a report in `_system/reports/` | the morning brief, any new automation |
| `propose` | proposals in `_system/reports/proposals/` with ready-to-apply prompts | triage, minutes, weekly review |
| `act` | within the declared `scope:` globs only, one commit per run, never a living document's body | triage, minutes, indices, consolidation |

Rules that hold at every step:

- A living document changes by proposal or by a small dated addition, never by rewrite.
- Two automations never run in `act` on overlapping scopes at the same time.
- Every `act` run leaves one line in `_system/log.md` and one under `## Agents` in the daily note.
- Changing `mode` or `scope` is a one-line decision record (`Decisions/`, `domain/knowledge`).
- The guard hook enforces root, archive, read-only and secrets regardless of mode.

Suggested order to enable automations in a fresh brain: morning brief (report) → inbox triage (propose → act) → meeting minutes (propose → act) → weekly review (propose) → librarian (act, narrow) → consolidation (act).
