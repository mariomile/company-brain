# Running the plugin on different hosts

The portable bundle is `skills/`, `references/` and `scripts/`. `agents/`, `hooks/` and `.claude-plugin/` are Claude Code adapters: deleting them costs the slash entry points, the guard hook and delegated contexts, nothing else.

## Claude Code

```
/plugin marketplace add mariomile/company-brain
/plugin install company-brain@company-brain
```

or, for development: `claude --plugin-dir /path/to/company-brain` from the brain folder, then `/reload-plugins` after edits.

Components are namespaced: `/company-brain:ask`, `/company-brain:capture`, `/company-brain:meeting`, `/company-brain:decide`, `/company-brain:project`, `/company-brain:people`, `/company-brain:promote`, `/company-brain:maintain`, `/company-brain:review`, `/company-brain:brief`, `/company-brain:governance`, `/company-brain:onboard`. Agents: `company-brain:brain-triager`, `brain-scribe`, `brain-librarian`, `brain-curator`, `brain-analyst`, `brain-onboarder`.

Hooks: `SessionStart` injects `using-company-brain` and the briefing when the working directory is a brain (it detects `_system/brain.config.json`); outside a brain it stays silent. `PreToolUse` on `Write|Edit|MultiEdit|NotebookEdit` runs `brain guard` (deny root files and folders, archive edits, read-only sources, secrets; ask on contract files). `PostToolUse` runs `brain lint-file` (advice on frontmatter, links, project, source; never blocks).

Team distribution: in the brain's `.claude/settings.json` set `extraKnownMarketplaces` and `enabledPlugins` so every clone gets the plugin after the trust dialog. Pin the marketplace source by `sha` for supply-chain safety.

## Exo (Obsidian)

Exo reads `_system/agents/<slug>/` bundles and `_system/automations/*.md` natively. The plugin's skills are available when Exo runs on Claude Code with the plugin installed; the hooks apply there too.

## Codex and other skill-aware hosts

Keep a complete checkout and point the host's skill path at `company-brain/skills`. The script runs with `node /path/company-brain/scripts/brain.mjs <cmd>` from the brain root. Without hooks, invoke `using-company-brain` first and run `brain guard`-equivalent checks by hand with `brain health` before committing.

## Any scheduler

`brain run <automation>` prints the full prompt of `_system/automations/<name>.md` with its mode and scope. Pipe it into the runtime of your choice:

```bash
cd /path/to/brain && node /path/company-brain/scripts/brain.mjs run weekly-review | claude -p --permission-mode acceptEdits
```

Claude Code routines, cron, a CI job, or Exo's own scheduler all work; the automation file is the single definition.
