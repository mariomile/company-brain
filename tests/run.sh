#!/usr/bin/env bash
if [ "${1:-}" != "--inner" ]; then
  out="$(bash "$0" --inner 2>&1)"; echo "$out" | sed -e "s/^OK /  ✓ /" -e "s/^KO /  ✗ /" | grep -v "^DONE$"
  p=$(grep -c "^OK " <<<"$out"); f=$(grep -c "^KO " <<<"$out"); echo; echo "$p passed, $f failed"; [ "$f" -eq 0 ]; exit $?
fi
# Test suite for the company-brain script. Runs against a copy of the template (tests/fixtures/brain or ../company-brain-template).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
PLUGIN="$(cd "$HERE/.." && pwd)"
SRC="${BRAIN_FIXTURE:-$HERE/fixtures/brain}"
[ -d "$SRC" ] || SRC="$PLUGIN/../company-brain-template"
[ -d "$SRC" ] || { echo "no fixture brain found (tests/fixtures/brain or ../company-brain-template)"; exit 2; }
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
cp -R "$SRC/." "$TMP/brain"; cd "$TMP/brain"
# Never carry the source repository: its remote is real and the sync tests push.
rm -rf "$TMP/brain/.git"; git init -q .
[ -z "$(git remote)" ] || { echo "fixture has a remote, refusing to run"; exit 2; } && git add -A >/dev/null && git -c user.email=t@t -c user.name=t commit -qm init
B() { node "$PLUGIN/scripts/brain.mjs" "$@"; }
pass=0; fail=0
ok() { echo "OK $1"; }
ko() { echo "KO $1 :: ${2:-}"; }
expect_contains() { local out; out="$(cat)"; if grep -q -- "$2" <<<"$out"; then echo "OK $1"; else echo "KO $1 :: got: $(head -c 300 <<<"$out" | tr '\n' ' ')"; fi; }
expect_not_contains() { local out; out="$(cat)"; if grep -q -- "$2" <<<"$out"; then echo "KO $1 :: unexpected: $2"; else echo "OK $1"; fi; }
hook() { printf '{"tool_name":"%s","tool_input":%s,"cwd":"%s"}' "$1" "$2" "$PWD"; }

echo "# health and briefing"
B health | expect_contains "health runs" "# Brain health"
B health --strict >/dev/null; [ $? -eq 0 ] && ok "strict passes on the template (warnings only)" || ko "strict should pass on the template"
B brief | expect_contains "brief names the company" "Brain:"
B stale | expect_contains "fresh template: review dates are placeholders to fill" "review_due is a placeholder"
B links | expect_contains "no broken links" "No broken"
B orphans | expect_contains "no orphans" "No orphans"
B ratio | expect_contains "ratio prints" "Input"

echo "# guard hook"
hook Write "{\"file_path\":\"$PWD/notes.md\",\"content\":\"x\"}" | B guard | expect_contains "root file denied" '"deny"'
hook Write "{\"file_path\":\"$PWD/docs/x.md\",\"content\":\"x\"}" | B guard | expect_contains "new top folder denied" '"deny"'
hook Write "{\"file_path\":\"$PWD/Input/Meetings/Granola/2026-10-14 x.md\",\"content\":\"x\"}" | B guard | expect_contains "read-only source denied" '"deny"'
hook Write "{\"file_path\":\"$PWD/Knowledge/Product/x.md\",\"content\":\"api_key = \\\"sk-abcdefghijklmnopqrstuvwxyz1234\\\"\"}" | B guard | expect_contains "secret denied" '"deny"'
out="$(hook Edit "{\"file_path\":\"$PWD/AGENTS.md\",\"new_string\":\"x\"}" | B guard)"; [ -z "$out" ] && ok "contract with placeholders: onboarding edits without prompts" || ko "contract with placeholders should be silent" "$out"
mkdir -p .archive/Old && echo x > .archive/Old/a.md
hook Edit "{\"file_path\":\"$PWD/.archive/Old/a.md\",\"new_string\":\"y\"}" | B guard | expect_contains "archive edit denied" '"deny"'
out="$(hook Write "{\"file_path\":\"$PWD/Knowledge/Product/Retention.md\",\"content\":\"ok\"}" | B guard)"; [ -z "$out" ] && ok "normal write silent" || ko "normal write should be silent" "$out"
out="$(printf '{"tool_name":"Write","tool_input":{"file_path":"/tmp/elsewhere-%s.md","content":"x"},"cwd":"/tmp"}' $$ | B guard)"; [ -z "$out" ] && ok "outside a brain silent" || ko "outside brain should be silent" "$out"
hook Write "{\"file_path\":\"$PWD/README.md\",\"content\":\"x\"}" | B guard | expect_not_contains "allowlisted root file passes" '"deny"'

echo "# lint hook"
printf -- '---\ntags:\n  - domain/product\n---\n# T\n\nno links here\n' > "Knowledge/Product/Lint test.md"
hook Write "{\"file_path\":\"$PWD/Knowledge/Product/Lint test.md\"}" | B lint-file | expect_contains "lint flags missing type tag" "no type/"
hook Write "{\"file_path\":\"$PWD/Knowledge/Product/Lint test.md\"}" | B lint-file | expect_contains "lint flags few links" "link(s)"
printf -- '---\ntags:\n  - type/living\nowner: "[[Ada Rossi]]"\nreview_due: 2099-01-01\n---\n# L\n\n[[A]] [[B]]\n' > "Knowledge/Company/Lint living.md"
out="$(hook Write "{\"file_path\":\"$PWD/Knowledge/Company/Lint living.md\"}" | B lint-file)"; [ -z "$out" ] && ok "well-formed living doc passes lint" || ko "well-formed living doc should pass" "$out"
rm "Knowledge/Product/Lint test.md" "Knowledge/Company/Lint living.md"

echo "# new, verify, index, log, run, search, metrics"
B new decision "Test decision" --owner "[[Ada Rossi]]" --project "[[Onboarding Redesign]]" --domain product | expect_contains "new decision created" "Created"
f="Decisions/$(date +%F) Test decision.md"; grep -q 'decider: "\[\[Ada Rossi\]\]"' "$f" && ok "decision frontmatter filled" || ko "decision frontmatter"
B new project "Test Project" --owner "[[Ben Okafor]]" >/dev/null; [ -f "Active/Projects/Test Project/Test Project.md" ] && ok "new project folder+note" || ko "new project"
B new person "Test Person" --company "[[Lumen Analytics]]" --relationship team >/dev/null; grep -q "crm/team" "CRM/People/Test Person.md" && ok "new person relationship" || ko "new person"
B verify Product --by "[[Ben Okafor]]" | expect_contains "verify bumps dates" "review_due"
grep -q "last_verified: $(date +%F)" Knowledge/Company/Product.md && ok "last_verified set" || ko "last_verified"
B index --write | expect_contains "index writes" "written"
grep -q "Test Project" _system/indices/project-index.md && ok "index includes new project" || ko "index content"
B log capture "unit test" --actor test >/dev/null; grep -q "capture | unit test | test" _system/log.md && ok "log appends" || ko "log"
B run morning-brief | expect_contains "run prints automation prompt" "Mode: report"
B run inbox-triage | expect_contains "run carries the skill" "company-brain:capture"
B run inbox-triage | expect_contains "run forbids pushing" "Do not commit or push"
B search "usage-based pricing" | expect_contains "search finds decision" "Usage-based pricing"
B metrics | expect_contains "metrics prints table" "Decisions recorded"

echo "# health detects problems"
mkdir -p notes && echo x > notes/a.md
B health | expect_contains "root intrusion is an error" "root intrusion"
B health --strict >/dev/null; [ $? -eq 1 ] && ok "strict fails on error" || ko "strict should fail on error"
rm -rf notes
echo "token = \"ghp_abcdefghijklmnopqrstuvwxyz0123456789\"" >> Knowledge/Product/Activation.md
B health | expect_contains "secret detected" "possible secrets"
git checkout -q -- Knowledge/Product/Activation.md
sed -i.bak 's/^review_due: .*/review_due: 2020-01-01/' Knowledge/Company/Company.md && rm -f Knowledge/Company/Company.md.bak
B stale | expect_contains "stale detected" "Company.md"
B health | expect_contains "stale past twice cadence" "past twice"
git checkout -q -- Knowledge/Company/Company.md
printf -- '---\ntags:\n  - type/concept\n  - domain/nope\n---\n# X\n\n[[A]] [[B]]\n' > Knowledge/Product/Bad.md
B tags | expect_contains "unregistered tag detected" "domain/nope"
B links | expect_contains "broken link detected" "Bad.md"
rm Knowledge/Product/Bad.md
for i in $(seq 1 9); do printf -- '---\ntags:\n  - type/memory\n---\n# r\n' > "_system/memory/rules/rule-x$i.md"; done
B health | expect_contains "rule cap enforced" "over the cap"
rm _system/memory/rules/rule-x*.md

echo "# guard: regressions from the code review"
sed -i.bak 's/{{company}}/Acme/g' AGENTS.md && rm -f AGENTS.md.bak
hook Edit "{\"file_path\":\"$PWD/AGENTS.md\",\"new_string\":\"x\"}" | B guard | expect_contains "filled contract asks" '"ask"'
hook Edit "{\"file_path\":\"$PWD/agents.md\",\"new_string\":\"x\"}" | B guard | expect_contains "contract check ignores case" '"ask"'
mkdir -p .archive/_system && echo '{}' > .archive/_system/brain.config.json
hook Edit "{\"file_path\":\"$PWD/.archive/Old/a.md\",\"new_string\":\"y\"}" | B guard | expect_contains "nested config cannot move the root" '"deny"'
rm -rf .archive/_system
hook Write "{\"file_path\":\"$PWD/Knowledge/_system/brain.config.json\",\"content\":\"{}\"}" | B guard | expect_contains "second brain config denied" '"deny"'
hook Edit "{\"file_path\":\"$PWD/.ARCHIVE/Old/a.md\",\"new_string\":\"y\"}" | B guard | expect_contains "archive check ignores case" '"deny"'
hook Write "{\"file_path\":\"$PWD/Input/Meetings/GRANOLA/z.md\",\"content\":\"x\"}" | B guard | expect_contains "read-only check ignores case" '"deny"'
hook Write "{\"file_path\":\"$PWD/.archive/Knowledge/new.md\",\"content\":\"x\"}" | B guard | expect_contains "new file in archive denied" '"deny"'
hook Write "{\"file_path\":\"$PWD/..n.md\",\"content\":\"x\"}" | B guard | expect_contains "dot-dot file name is a root file" '"deny"'
hook Write "{\"file_path\":\"$PWD/..docs/n.md\",\"content\":\"x\"}" | B guard | expect_contains "dot-dot folder name denied" '"deny"'
hook Write "{\"file_path\":\"$PWD/.env\",\"content\":\"x\"}" | B guard | expect_contains "root dotfile denied" '"deny"'
hook Write "{\"file_path\":\"$PWD/.git/hooks/pre-commit\",\"content\":\"x\"}" | B guard | expect_contains ".git denied" '"deny"'
hook Write "{\"file_path\":\"$PWD/.claude/settings.json\",\"content\":\"{}\"}" | B guard | expect_contains "agent config asks" '"ask"'
hook Write "{\"file_path\":\"$PWD/.hidden/x.md\",\"content\":\"x\"}" | B guard | expect_contains "unknown dot folder denied" '"deny"'
out="$(hook Write "{\"file_path\":\"$PWD/.github/workflows/x.yml\",\"content\":\"x\"}" | B guard)"; [ -z "$out" ] && ok ".github writable" || ko ".github should be writable" "$out"
out="$(hook Write "{\"file_path\":\"$PWD/.gitignore\",\"content\":\"x\"}" | B guard)"; [ -z "$out" ] && ok ".gitignore writable" || ko ".gitignore should be writable" "$out"
hook NotebookEdit "{\"notebook_path\":\"$PWD/Knowledge/Product/n.ipynb\",\"new_source\":\"api_key = 'sk-abcdefghijklmnopqrstuvwxyz1234'\"}" | B guard | expect_contains "notebook secret denied" '"deny"'
hook Write "{\"file_path\":\"$PWD/Input/Meetings/Granola/Sub/README.md\",\"content\":\"x\"}" | B guard | expect_contains "nested README in read-only denied" '"deny"'
out="$(hook Write "{\"file_path\":\"$PWD/Input/Meetings/Granola/README.md\",\"content\":\"x\"}" | B guard)"; [ -z "$out" ] && ok "read-only folder README writable" || ko "read-only README should be writable" "$out"
ln -s ../n2.md Knowledge/dl.md
hook Write "{\"file_path\":\"$PWD/Knowledge/dl.md\",\"content\":\"x\"}" | B guard | expect_contains "dangling symlink to root denied" '"deny"'
rm Knowledge/dl.md
deep="$PWD/Zed/a/b/c/d/e/f/g/h/i/j/k/l/m/n/h.md"
printf '{"tool_name":"Write","tool_input":{"file_path":"%s","content":"x"},"cwd":"/tmp"}' "$deep" | B guard | expect_contains "deep path from outside cwd denied" '"deny"'
printf '{"tool_name":"Write","tool_input":{"file_path":42},"cwd":"%s"}' "$PWD" | B guard | expect_contains "unreadable path fails closed" '"deny"'
out="$(hook Write "{\"file_path\":\"$PWD/Resources/Policies/Pw.md\",\"content\":\"Password: Rotate-credentials-every-quarter\"}" | B guard)"; [ -z "$out" ] && ok "policy prose is not a secret" || ko "policy prose should pass" "$out"
cp _system/brain.config.json /tmp/cfg.$$ && node -e 'const f=process.argv[1];const c=JSON.parse(require("fs").readFileSync(f));c.root_allowlist=null;c.secret_patterns=["(?i)ok","(unclosed"];c.review_cadence_days={"type/living":30};require("fs").writeFileSync(f,JSON.stringify(c))' _system/brain.config.json
out="$(hook Write "{\"file_path\":\"$PWD/Knowledge/Product/R.md\",\"content\":\"fine\"}" | B guard)"; [ -z "$out" ] && ok "bad config values do not crash the guard" || ko "guard with bad config" "$out"
B health | expect_contains "invalid secret pattern reported" "invalid secret_patterns"
B new project "Cadence Project" --owner "Ben Okafor" >/dev/null 2>&1 && ok "partial cadence config: new project works" || ko "new project with partial cadence"
cp /tmp/cfg.$$ _system/brain.config.json; rm -f /tmp/cfg.$$; rm -rf "Active/Projects/Cadence Project"

echo "# parser: regressions"
cat >> _system/memory/open-loops.md <<'LOOPS'

## loop-2026-01-01-a
- title: First loop
- owner: [[Ben Okafor]]
- due: 2020-01-01
- status: open

## loop-2026-01-02-b
- title: Last loop in Zürich
- owner: [[Ada Rossi]]
- status: open
- due: 2020-01-02
LOOPS
B health --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const l=JSON.parse(s).loops;console.log(l.due.some(x=>x.title==="Last loop in Zürich")?"OK last open loop parsed":"KO last open loop parsed :: "+JSON.stringify(l))})'
git checkout -q -- _system/memory/open-loops.md
printf -- '---\r\ntags:\r\n  - type/concept\r\n  - domain/product\r\n---\r\n# C\r\n\r\n[[Activation]] [[Product]]\r\n' > Knowledge/Product/Crlf.md
printf '\xef\xbb\xbf---\ntags:\n  - type/concept\n---\n# B\n\n[[Activation]] [[Product]]\n' > Knowledge/Product/Bom.md
printf -- '---\ntags:\n- type/concept\n- domain/product\n---\n# U\n\n[[Activation]] [[Product]]\n' > Knowledge/Product/Unindented.md
printf -- '---\ntags: [type/concept,\n  domain/product]\nup: [[Activation]]\nreview_due: 2099-01-01 # next\n---\n# M\n\n[[Product]]\n' > Knowledge/Product/Multiline.md
B tags --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const t=JSON.parse(s);const bad=[...t.missing,...t.malformed].map(x=>x.rel).filter(r=>/Crlf|Bom|Unindented|Multiline/.test(r));console.log(bad.length?"KO frontmatter variants parsed :: "+bad.join(", "):"OK frontmatter variants parsed (CRLF, BOM, unindented list, multi-line flow list)")})'
B orphans | expect_not_contains "unquoted wikilink in frontmatter counts" "Multiline"
B stale | expect_not_contains "trailing comment stripped from a date" "Multiline"
printf -- '---\ntags:\n  - type/concept\n---\n# T\n\n| a | [[Activation\\|alias]] |\n\n[[activation]] [[chart.webp]]\n\n~~~\n[[Nope2]]\n~~~\n\n`{{title}}`\n' > Knowledge/Product/Edge.md
B links | expect_not_contains "escaped pipe, case, attachment, tilde fence" "Edge.md"
B health --json | expect_not_contains "placeholder in code ignored" "Edge.md"
printf -- '---\nNot frontmatter, a rule above.\n\n[[Ghost link]]\n\n---\n' > Knowledge/Product/Rule.md
B links | expect_contains "horizontal rule is not frontmatter" "Ghost link"
printf -- '---\ntags:\n  - type/concept\nreview_due: 2099-01-01\nreview_due: 2099-02-01\nsource: "[[Missing source note]]"\n---\n# D\n\n[[Activation]] [[Product]]\n' > Knowledge/Product/Dup.md
B health | expect_contains "duplicate frontmatter keys detected" "duplicate frontmatter keys"
B links | expect_contains "frontmatter link checked" "Missing source note"
rm Knowledge/Product/{Crlf,Bom,Unindented,Multiline,Edge,Rule,Dup}.md

echo "# new and verify: regressions"
B new concept "../../pwned" >/dev/null 2>&1; [ ! -f pwned.md ] && ok "path traversal in title refused" || { ko "path traversal"; rm -f pwned.md; }
B new concept "A|B" >/dev/null 2>&1 && ko "pipe in title should be refused" || ok "unlinkable title refused"
B new concept --force "Foo Bar" >/dev/null 2>&1; [ -f "Knowledge/Product/Foo Bar.md" ] && ok "boolean flag before the title" || ko "boolean flag ate the title"
grep -q '^up: "\[\[_MOC Product\]\]"' "Knowledge/Product/Foo Bar.md" && ok "concept links an existing MOC" || ko "concept up"
B new decision "No project" --date 2026-03-04 --source "[[2026-10-14 Weekly product sync]]" >/dev/null
f="Decisions/2026-03-04 No project.md"
grep -q '^project: none$' "$f" && ok "no project means none" || ko "project none"
grep -q '^decided: 2026-03-04$' "$f" && ok "decided follows --date" || ko "decided date"
grep -q '^source: "\[\[2026-10-14 Weekly product sync\]\]"$' "$f" && ok "source link not doubled" || ko "source link" "$(grep source: "$f")"
B new person "No Company" >/dev/null; grep -q '^works_at: $' "CRM/People/No Company.md" && ok "person without company has no fake link" || ko "works_at default" "$(grep works_at "CRM/People/No Company.md")"
mkdir -p Knowledge/B && cp "Knowledge/Product/Foo Bar.md" "Knowledge/B/Foo Bar.md"
B verify "Foo Bar" >/dev/null 2>&1 && ko "ambiguous verify should fail" || ok "ambiguous verify refused"
rm -rf Knowledge/B
grep -q '^last_edited_by: "\[\[Ben Okafor\]\]"' Knowledge/Company/Product.md && ok "verify --by is quoted" || ko "verify --by" "$(grep last_edited_by Knowledge/Company/Product.md)"
printf '# No fm\n' > Knowledge/Product/Nofm.md; B verify Nofm >/dev/null 2>&1 && ko "verify without frontmatter should fail" || ok "verify without frontmatter refused"; rm Knowledge/Product/Nofm.md
printf -- '---\ntags:\n  - type/project\nowner: "[[Ben Okafor]]"\nreview_due: 2099-01-01\n---\n# P\n\n[[A]] [[B]]\n' > "Active/Projects/Test Project/Test Project.md"
hook Edit "{\"file_path\":\"$PWD/Active/Projects/Test Project/Test Project.md\",\"new_string\":\"last_verified: 2026-01-01\"}" | B lint-file | expect_contains "lint flags an agent changing last_verified" "only the owner verifies"
out="$(hook Write "{\"file_path\":\"$PWD/Active/Projects/Test Project/Test Project.md\",\"content\":\"last_verified: 2026-01-01\"}" | B lint-file)"; grep -q "only the owner" <<<"$out" && ko "creation may set last_verified" || ok "creation may set last_verified"

echo "# log, metrics, scope, samples, sync"
B log ask "what did we decide on pricing?" --result answered >/dev/null
B log ask "What did we decide on pricing" --result gap >/dev/null
B log ask "x" --result maybe >/dev/null 2>&1 && ko "bad --result should fail" || ok "bad --result refused"
B metrics | expect_contains "metrics counts questions" "Questions asked"
B metrics --json | expect_contains "repeated question found" "what did we decide on pricing"
git add -A >/dev/null && git -c user.email=t@t -c user.name=t commit -qm "tests so far"
mkdir -p Journal/Weekly && echo x > Journal/Weekly/2026-W01.md
B scope weekly-review | expect_contains "change inside scope passes" "all inside the scope"
echo x > Knowledge/Product/Out.md
B scope weekly-review >/dev/null; [ $? -eq 1 ] && ok "change outside scope fails" || ko "scope should fail"
B scope morning-brief | expect_contains "report mode allows only reports" "Journal/Weekly/2026-W01.md"
rm Knowledge/Product/Out.md Journal/Weekly/2026-W01.md
git rm -q --cached _system/log.md >/dev/null 2>&1; git checkout -q -- . 2>/dev/null; git reset -q
B samples | expect_contains "samples listed" "sample note(s)"
B samples --archive | expect_contains "samples archived" "Archived"
[ -f "CRM/People/Ada Rossi.md" ] && ko "sample still live" || ok "sample moved out"
[ -f ".archive/CRM/People/Ada Rossi.md" ] && ok "sample kept in .archive with same path" || ko "archive path"
B health | expect_not_contains "no sample warning after archive" "sample note(s)"
REMOTE="$(mktemp -d)/remote.git"; git init -q --bare "$REMOTE"; git remote add origin "$REMOTE"; git push -q origin HEAD:refs/heads/main 2>/dev/null; git branch -q --set-upstream-to=origin/main 2>/dev/null || git push -q -u origin HEAD:main
git -c user.email=t@t -c user.name=t config user.email t@t; git config user.name t
B sync "tests" | expect_contains "sync commits and pushes" "Pushed"
[ -z "$(git status --porcelain)" ] && ok "sync leaves a clean tree" || ko "sync left changes"
git --git-dir="$REMOTE" log --oneline -1 --all | expect_contains "remote has the brain commit" "brain: tests"

echo "# setup and routine"
B new decision "Un solo CLAUDE.md" >/dev/null 2>&1 && ko "title ending in .md should be refused" || ok "title ending in .md refused"
B new decision "Un solo CLAUDE.md" 2>&1 | expect_contains "refusal says why" "ends in .md"
B setup | expect_contains "setup prints the checklist" "steps done"
B setup | expect_contains "sharing not chosen yet" "✗ where the brain lives"
B brief | expect_contains "brief points to setup" "Setup: "
node -e 'const f="_system/brain.config.json";const fs=require("fs");const c=JSON.parse(fs.readFileSync(f));c.sharing="local";fs.writeFileSync(f,JSON.stringify(c,null,2))'
B setup | expect_contains "sharing local is done" "✓ where the brain lives"
B setup | expect_not_contains "local brain does not ask for CODEOWNERS" "CODEOWNERS"
B setup | expect_contains "sources all paused" "✗ at least one input source"
sed -i.bak '0,/| paused |/s//| active |/' _system/sources.md 2>/dev/null || true; rm -f _system/sources.md.bak
grep -q '| active |' _system/sources.md || { awk 'BEGIN{d=0} {if(!d && sub(/\| paused \|/,"| active |")) d=1; print}' _system/sources.md > /tmp/src.$$ && mv /tmp/src.$$ _system/sources.md; }
B setup | expect_contains "an active source is detected" "✓ at least one input source"
B setup --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(Array.isArray(j.steps)&&Array.isArray(j.left)?"json ok":"json bad")})' | expect_contains "setup --json parses" "json ok"
B routine morning-brief --cron | expect_contains "cron line at the automation's time" "^30 7 \* \* 1-5 "
B routine morning-brief --cron | expect_contains "cron line runs the routine" "routine morning-brief"
B routine weekly-review --cron | expect_contains "weekly maps to its weekday" "^0 16 \* \* 5 "
B routine morning-brief --dry-run | expect_contains "dry run says what would run" "Would run"
B routine --dry-run morning-brief | expect_contains "flag before the name keeps the name" "Would run"
B routine morning-brief --scheduled | expect_contains "scheduled run skips a disabled automation" "skipped"
B routine morning-brief --cron | expect_contains "cron line runs in scheduled mode" "routine morning-brief --scheduled"
CRONSTUB="$(mktemp -d)"; printf '#!/usr/bin/env bash\nif [ "$1" = "-l" ]; then cat "%s/tab" 2>/dev/null || { echo "no crontab" >&2; exit 1; }; else cat > "%s/tab"; fi\n' "$CRONSTUB" "$CRONSTUB" > "$CRONSTUB/crontab"; chmod +x "$CRONSTUB/crontab"
echo "0 1 * * * echo keep" > "$CRONSTUB/tab"
BRAIN_CRONTAB_BIN="$CRONSTUB/crontab" B routine morning-brief --cron --install | expect_contains "install schedules the routine" "Scheduled morning-brief"
BRAIN_CRONTAB_BIN="$CRONSTUB/crontab" B routine morning-brief --cron --install >/dev/null
[ "$(grep -c 'routine morning-brief' "$CRONSTUB/tab")" -eq 1 ] && ok "install twice keeps one line" || ko "install duplicated" "$(cat "$CRONSTUB/tab")"
grep -q "echo keep" "$CRONSTUB/tab" && ok "install keeps other crontab lines" || ko "install dropped a line"
rm -rf "$CRONSTUB"
printf -- '---\nname: Odd\nwhen:\n  - sometimes\nmode: report\nscope: []\nenabled: false\n---\nx\n' > _system/automations/odd.md
B routine odd --cron >/dev/null 2>&1 && ko "unparseable when should fail" || ok "unparseable when refused"
rm _system/automations/odd.md
git add -A >/dev/null && git commit -qm "setup tests"
STUB="$(mktemp -d)"
printf '#!/usr/bin/env bash\nmkdir -p _system/reports && echo "brief" > _system/reports/stub-brief.md\n' > "$STUB/ok"; chmod +x "$STUB/ok"
printf '#!/usr/bin/env bash\necho x > "Knowledge/Product/Stub out.md"\n' > "$STUB/out"; chmod +x "$STUB/out"
printf '#!/usr/bin/env bash\nexit 3\n' > "$STUB/fail"; chmod +x "$STUB/fail"
echo "draft" > "_inbox/left by a person.md"
BRAIN_CLAUDE_BIN="$STUB/ok" B routine morning-brief | expect_contains "routine commits its report" "committed"
git log --format=%s -2 | expect_contains "routine commit message" "brain: morning-brief"
git log --format=%s -2 | expect_contains "earlier changes committed first" "changes before the morning-brief routine"
[ -z "$(git status --porcelain)" ] && ok "routine leaves a clean tree" || ko "routine left changes" "$(git status --porcelain)"
[ "$(git rev-list --count origin/main..HEAD)" -ge 1 ] && ok "routine pushes nothing" || ko "routine pushed"
BRAIN_CLAUDE_BIN="$STUB/out" B routine morning-brief >/dev/null 2>&1; [ $? -eq 1 ] && ok "routine outside scope fails" || ko "routine outside scope should fail"
[ -f "Knowledge/Product/Stub out.md" ] && [ -n "$(git status --porcelain)" ] && ok "out-of-scope change left uncommitted" || ko "out-of-scope change"
B brief | expect_contains "brief shows the hold" "Routine held"
BRAIN_CLAUDE_BIN="$STUB/ok" B routine morning-brief 2>&1 | expect_contains "next run refuses while held" "held"
git log -1 --format=%s | expect_not_contains "held leftovers not committed by the next run" "changes before"
rm "Knowledge/Product/Stub out.md"
HEAD_REMOTE="$(git rev-parse origin/main)"
B sync "reviewed" | expect_contains "local sync pushes nothing" "nothing pushed"
[ "$(git rev-parse origin/main)" = "$HEAD_REMOTE" ] && ok "remote untouched by a local brain" || ko "local brain pushed"
B brief | expect_not_contains "sync releases the hold" "Routine held"
BRAIN_CLAUDE_BIN="$STUB/fail" B routine morning-brief 2>&1 | expect_contains "failed run is reported" "claude stopped"
NODE_BIN="$(command -v node)"; NOCLAUDE="$(mktemp -d)"; ln -s "$(command -v git)" "$NOCLAUDE/git"
env -u BRAIN_CLAUDE_BIN PATH="$NOCLAUDE" "$NODE_BIN" "$PLUGIN/scripts/brain.mjs" routine morning-brief 2>&1 | expect_contains "missing claude is named" "not on PATH"
rm -rf "$NOCLAUDE"
rm -rf "$STUB"

echo "# outside git"
NG="$(mktemp -d)"; cp -R "$SRC/." "$NG/"; rm -rf "$NG/.git"
err="$(node "$PLUGIN/scripts/brain.mjs" metrics --root "$NG" 2>&1 >/dev/null)"; [ -z "$err" ] && ok "metrics outside git is quiet" || ko "metrics stderr" "$err"
mv "$NG/Knowledge" "$NG/K2"; node "$PLUGIN/scripts/brain.mjs" index --root "$NG" >/dev/null 2>&1 && ok "index without Knowledge/" || ko "index crashed without Knowledge/"
rm -rf "$NG" "$(dirname "$REMOTE")"

echo "DONE"
