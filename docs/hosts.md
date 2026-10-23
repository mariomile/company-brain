# Running the plugin on different hosts

The portable bundle is `skills/`, `references/` and `scripts/`. `agents/`, `hooks/` and `.claude-plugin/` are Claude Code adapters: deleting them costs the slash entry points, the guard hook and delegated contexts, nothing else.

## Claude Code

```
/plugin marketplace add mariomile/company-brain
/plugin install company-brain@company-brain
```

or, for development: `claude --plugin-dir /path/to/company-brain` from the brain folder, then `/reload-plugins` after edits.

Components are namespaced: `/company-brain:setup`, `/company-brain:ask`, `/company-brain:capture`, `/company-brain:meeting`, `/company-brain:decide`, `/company-brain:project`, `/company-brain:people`, `/company-brain:promote`, `/company-brain:maintain`, `/company-brain:review`, `/company-brain:brief`, `/company-brain:governance`, `/company-brain:onboard`, `/company-brain:ingest`. Agents: `company-brain:brain-triager`, `brain-scribe`, `brain-librarian`, `brain-curator`, `brain-analyst`, `brain-onboarder`.

Hooks: `SessionStart` injects `using-company-brain` and the briefing when the working directory is inside a brain (it walks up to `_system/brain.config.json`); outside a brain it stays silent. `PreToolUse` on `Write|Edit|MultiEdit|NotebookEdit` runs `brain guard`: deny root files and unknown folders, any write in `.archive/` or `.git/`, read-only sources, secrets; ask on contract files once they are filled and on agent configuration (`.claude/`). If Node is missing or the guard fails inside a brain, the write is blocked with the reason. The guard sees file tools only, not shell commands. `PostToolUse` runs `brain lint-file` (advice on frontmatter, links, project, source; never blocks). Requires Node 18 or newer.

Team distribution: in the brain's `.claude/settings.json` set `extraKnownMarketplaces` and `enabledPlugins` so every clone gets the plugin after the trust dialog. Pin the marketplace source by `sha` for supply-chain safety.

## Exo (Obsidian)

Exo reads `_system/automations/*.md` natively. The plugin's skills are available when Exo runs on Claude Code with the plugin installed; the hooks apply there too.

## Codex and other skill-aware hosts

Keep a complete checkout and point the host's skill path at `company-brain/skills`. The script runs with `node /path/company-brain/scripts/brain.mjs <cmd>` from the brain root. Without hooks, invoke `using-company-brain` first and run `brain guard`-equivalent checks by hand with `brain health` before committing.

## On this machine (a brain with `"sharing": "local"`)

`brain routine <automation>` runs one automation with `claude -p` from the brain root (the plugin loads from the brain's `.claude/settings.json`), with the same tools as the GitHub workflow and 40 turns at most. It checks git has a name and email, commits what was already uncommitted first, so the scope check sees only the run; then `brain scope`; then a local commit `brain: <automation> <date>`. Nothing is pushed; with `"sharing": "local"`, `brain sync` never pushes either. A run that fails or leaves the scope commits nothing and holds every routine (a marker in `.git/`, shown by the briefing) until a person reviews the changes and runs `brain sync`.

`brain routine <automation> --cron` prints one crontab line per `when` entry, and `--install` adds them to the user's crontab, replacing earlier lines for the same brain and routine and keeping the rest. The line calls `brain routine <automation> --scheduled`, which skips an automation whose file says `enabled: false`. One line per `when` entry: (`daily HH:MM`, `weekdays HH:MM`, `weekly Mon HH:MM`), in local time, with absolute paths for node, claude and the script. The script path is the marketplace clone (`~/.claude/plugins/marketplaces/company-brain/`) when it exists, so plugin updates do not break the line. Output goes to `~/.company-brain/logs/<brain folder>.log`. The machine must be on and awake at that time; a missed run is simply skipped.

`BRAIN_CLAUDE_BIN` and `BRAIN_CRONTAB_BIN` override which `claude` and `crontab` run (the tests use stubs).

## GitHub Actions (a brain with `"sharing": "github"`)

The template ships `.github/workflows/brain-routines.yml`. It runs each automation whose file says `enabled: true` on its cron, with `anthropics/claude-code-action@v1` and this plugin installed from its marketplace (`plugin_marketplaces`, `plugins`). After the run, `brain scope <automation>` must pass; then report-mode output is committed to main and posted on a rolling issue, and propose or act output goes to a branch and a pull request, which `CODEOWNERS` routes to the owners. It needs the `ANTHROPIC_API_KEY` (or `CLAUDE_CODE_OAUTH_TOKEN`) secret and "Allow GitHub Actions to create pull requests". Run each automation once by hand (workflow_dispatch) before trusting its schedule.

## Any other scheduler

`brain run <automation>` prints the full prompt of `_system/automations/<name>.md` with its mode and scope. Pipe it into the runtime of your choice, check the scope, then share:

```bash
cd /path/to/brain
B="node /path/company-brain/scripts/brain.mjs"
$B run weekly-review | claude -p --permission-mode acceptEdits && $B scope weekly-review && $B sync "weekly review"
```

Claude Code routines, cron, a CI job, or Exo's own scheduler all work; the automation file is the single definition.
