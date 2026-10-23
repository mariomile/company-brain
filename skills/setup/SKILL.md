---
name: setup
description: "Use first in a brain that is not set up: a new brain from the template, a session whose briefing says 'Setup: N step(s) left', or 'set up the brain', 'configure the brain', 'connect Granola', 'turn on the routines', 'share the brain on GitHub'. Walks every step in order: where the brain lives, identity, onboarding, input sources, routines, owners, health. Safe to re-run: it skips what is done."
argument-hint: "[step: sharing | identity | onboard | sources | routines | owners | health]"
---

# Setup

One skill takes a brain from the template to working, and keeps working: a brain fed only by hand goes stale within weeks, and one no routine checks drifts. `brain setup` is the checklist. Run it first, work the steps it marks ✗ in the order below, and run it again at the end.

Load `company-brain:conventions`. Speak the person's language. Recommend, then ask, one question at a time, and only where the answer is theirs to give. A step already ✓ is skipped without comment.

## 0. A brain to set up

Inside a brain (`_system/brain.config.json` up the tree): `brain setup`, then go on.

Not inside one: offer to create it. Ask the folder (recommend `~/<Company> Brain`), then:

```bash
git clone --depth 1 https://github.com/mariomile/company-brain-template "<folder>"
cd "<folder>" && rm -rf .git && git init -q -b main && git add -A && git commit -qm "brain: start from company-brain-template"
```

The plugin is enabled for that folder by its `.claude/settings.json`: tell the person to open the folder in Claude Code and accept the plugin when asked, then run setup again from there.

## 1. Where the brain lives

Ask: "Does the brain stay on this machine for now, or does the team share it on GitHub?" Recommend local while one person writes, GitHub as soon as two do.

- **local:** `"sharing": "local"` in `_system/brain.config.json`. `brain sync` commits on this machine and never pulls or pushes, even if a remote exists; routines run here (step 5); `CODEOWNERS` and `.github/` stay unused.
- **github:** `"sharing": "github"`. No remote yet: with the person's explicit go, because it creates a repository, `gh repo create <owner>/<name> --private --source . --push`. Always private: everyone with the repository sees everything in it, so one brain per trust boundary. Then step 6.

Moving from local to GitHub later is this step again.

## 2. Identity

`company` and `language` in `_system/brain.config.json` (the language the team writes in), and `{{company}}` in `AGENTS.md` and `CLAUDE.md`.

## 3. Onboard

Placeholders or sample notes left: run `company-brain:onboard`. It archives the samples, drafts ORG, NOW, the living documents, people, projects and decisions from the company's own material, then asks about ten confirm-or-fix questions.

## 4. Input sources

Recommend them one at a time, in this order, and say why each matters:

1. **Meeting recorder** (Granola, or the one the team uses): the richest source. Every meeting becomes minutes, decisions and open loops.
2. **Team chat** (Slack): named channels only, never direct messages.
3. **Tickets** (Linear, Jira, GitHub issues): the real state of projects.
4. **Shared documents** (Drive, Notion).
5. **Support** (Intercom, a helpdesk): what customers say.

For each one the person wants:

1. Look for the connector among this session's tools. Available: list what it reaches (folders, channels, teams) and propose a scope. Needs authorization: tell the person to authorize it with `/mcp`, then continue. Missing: name it and move to the next source; never install anything for them.
2. Fill its row in `_system/sources.md` (connector, destination, audience, owner) and its line under "Scope per source". Status `active` only with the person's yes.
3. First pull now, so they see it work: `company-brain:ingest <source>`, limited to the last two weeks. The minutes and notes appear; Last sync is set.

## 5. Routines

Recommend `morning-brief` first (report mode: it only writes its report), then one more a week in the order of `_system/automations/README.md`. Turning one on is `enabled: true` in its file, with the person's yes.

**local:**

1. `brain routine <name> --dry-run` shows what will run. Then once for real: `brain routine <name>`. It runs Claude Code headless with the automation's prompt, checks the scope and commits on this machine. Show the person the report it wrote.
2. Schedule it: `brain routine <name> --cron` prints the crontab line, in local time. With the person's yes, `brain routine <name> --cron --install` adds it, keeping every other line and replacing an earlier one for the same routine. Tell them: the machine must be on and awake at that time; the log is in `~/.company-brain/logs/`; setting `enabled: false` in the file stops it without touching cron.
3. If a run fails or writes outside its scope, it commits nothing and holds the routines: the briefing says `Routine held`. A person reviews the changes with `git status`, keeps what is right, and `brain sync` releases the hold.

**github:** the template's `.github/workflows/brain-routines.yml`.

1. The person adds the secret (never type it for them): `ANTHROPIC_API_KEY`, or `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`, in the repository's Actions secrets. And in Settings, Actions, General: allow GitHub Actions to create pull requests.
2. Run it once by hand: `gh workflow run brain-routines -f automation=<name>`, then `gh run watch`. Cron times in the workflow are UTC.

Check: the first report is in `_system/reports/`.

## 6. Owners (GitHub only)

`CODEOWNERS`: the brain owner, the owner of the company documents, the owner of the playbooks. Ask for the GitHub handles; an unknown one stays `@{{...}}` and you say so.

## 7. Health

`brain index --write`, then `brain health`: no errors. Name each remaining warning and whose it is. `brain log setup "<steps done>"`, then `brain sync "setup"`.

## Never

Create a remote repository, push, add a crontab line, set a source active or turn a routine on without the person's yes. Type a secret. Install a connector.

## Output

1. `brain setup` before and after.
2. What now runs on its own, and when: sources pulled, routines scheduled.
3. What is left, and whose it is.
