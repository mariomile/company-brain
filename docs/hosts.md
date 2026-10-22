# Running the plugin on different hosts

The portable bundle is `skills/`, `references/` and `scripts/`. `agents/`, `hooks/` and `.claude-plugin/` are Claude Code adapters: deleting them costs the slash entry points, the guard hook and delegated contexts, nothing else.

## Claude Code

```
/plugin marketplace add mariomile/company-brain
/plugin install company-brain@company-brain
```

or, for development: `claude --plugin-dir /path/to/company-brain` from the brain folder, then `/reload-plugins` after edits.

Components are namespaced: `/company-brain:ask`, `/company-brain:capture`, `/company-brain:meeting`, `/company-brain:decide`, `/company-brain:project`, `/company-brain:people`, `/company-brain:promote`, `/company-brain:maintain`, `/company-brain:review`, `/company-brain:brief`, `/company-brain:governance`, `/company-brain:onboard`, `/company-brain:ingest`. Agents: `company-brain:brain-triager`, `brain-scribe`, `brain-librarian`, `brain-curator`, `brain-analyst`, `brain-onboarder`.

Hooks: `SessionStart` injects `using-company-brain` and the briefing when the working directory is inside a brain (it walks up to `_system/brain.config.json`); outside a brain it stays silent. `PreToolUse` on `Write|Edit|MultiEdit|NotebookEdit` runs `brain guard`: deny root files and unknown folders, any write in `.archive/` or `.git/`, read-only sources, secrets; ask on contract files once they are filled and on agent configuration (`.claude/`). If Node is missing or the guard fails inside a brain, the write is blocked with the reason. The guard sees file tools only, not shell commands. `PostToolUse` runs `brain lint-file` (advice on frontmatter, links, project, source; never blocks). Requires Node 18 or newer.

Team distribution: in the brain's `.claude/settings.json` set `extraKnownMarketplaces` and `enabledPlugins` so every clone gets the plugin after the trust dialog. Pin the marketplace source by `sha` for supply-chain safety.

## Exo (Obsidian)

Exo reads `_system/automations/*.md` natively. The plugin's skills are available when Exo runs on Claude Code with the plugin installed; the hooks apply there too.

## Codex and other skill-aware hosts

Keep a complete checkout and point the host's skill path at `company-brain/skills`. The script runs with `node /path/company-brain/scripts/brain.mjs <cmd>` from the brain root. Without hooks, invoke `using-company-brain` first and run `brain guard`-equivalent checks by hand with `brain health` before committing.

## GitHub Actions (the default scheduler)

The template ships `.github/workflows/brain-routines.yml`. It runs each automation whose file says `enabled: true` on its cron, with `anthropics/claude-code-action@v1` and this plugin installed from its marketplace (`plugin_marketplaces`, `plugins`). After the run, `brain scope <automation>` must pass; then report-mode output is committed to main and posted on a rolling issue, and propose or act output goes to a branch and a pull request, which `CODEOWNERS` routes to the owners. It needs the `ANTHROPIC_API_KEY` (or `CLAUDE_CODE_OAUTH_TOKEN`) secret and "Allow GitHub Actions to create pull requests". Run each automation once by hand (workflow_dispatch) before trusting its schedule.

## Any other scheduler

`brain run <automation>` prints the full prompt of `_system/automations/<name>.md` with its mode and scope. Pipe it into the runtime of your choice, check the scope, then share:

```bash
cd /path/to/brain
B="node /path/company-brain/scripts/brain.mjs"
$B run weekly-review | claude -p --permission-mode acceptEdits && $B scope weekly-review && $B sync "weekly review"
```

Claude Code routines, cron, a CI job, or Exo's own scheduler all work; the automation file is the single definition.
