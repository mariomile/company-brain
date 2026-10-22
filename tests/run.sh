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
cp -R "$SRC/." "$TMP/brain"; cd "$TMP/brain"; git init -q . && git add -A >/dev/null && git -c user.email=t@t -c user.name=t commit -qm init
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
B stale | expect_contains "stale empty on fresh template" "No stale"
B links | expect_contains "no broken links" "No broken"
B orphans | expect_contains "no orphans" "No orphans"
B ratio | expect_contains "ratio prints" "Input"

echo "# guard hook"
hook Write "{\"file_path\":\"$PWD/notes.md\",\"content\":\"x\"}" | B guard | expect_contains "root file denied" '"deny"'
hook Write "{\"file_path\":\"$PWD/docs/x.md\",\"content\":\"x\"}" | B guard | expect_contains "new top folder denied" '"deny"'
hook Write "{\"file_path\":\"$PWD/Input/Meetings/Granola/2026-10-14 x.md\",\"content\":\"x\"}" | B guard | expect_contains "read-only source denied" '"deny"'
hook Write "{\"file_path\":\"$PWD/Knowledge/Product/x.md\",\"content\":\"api_key = \\\"sk-abcdefghijklmnopqrstuvwxyz1234\\\"\"}" | B guard | expect_contains "secret denied" '"deny"'
hook Edit "{\"file_path\":\"$PWD/AGENTS.md\",\"new_string\":\"x\"}" | B guard | expect_contains "contract asks" '"ask"'
mkdir -p .archive/Old && echo x > .archive/Old/a.md
hook Edit "{\"file_path\":\"$PWD/.archive/Old/a.md\",\"new_string\":\"y\"}" | B guard | expect_contains "archive edit denied" '"deny"'
out="$(hook Write "{\"file_path\":\"$PWD/Knowledge/Product/Retention.md\",\"content\":\"ok\"}" | B guard)"; [ -z "$out" ] && ok "normal write silent" || ko "normal write should be silent" "$out"
out="$(printf '{"tool_name":"Write","tool_input":{"file_path":"/tmp/elsewhere-%s.md","content":"x"},"cwd":"/tmp"}' $$ | B guard)"; [ -z "$out" ] && ok "outside a brain silent" || ko "outside brain should be silent" "$out"
hook Write "{\"file_path\":\"$PWD/README.md\",\"content\":\"x\"}" | B guard | expect_not_contains "allowlisted root file passes" '"deny"'

echo "# lint hook"
printf -- '---\ntags:\n  - domain/product\n---\n# T\n\nno links here\n' > "Knowledge/Product/Lint test.md"
hook Write "{\"file_path\":\"$PWD/Knowledge/Product/Lint test.md\"}" | B lint-file | expect_contains "lint flags missing type tag" "no type/"
hook Write "{\"file_path\":\"$PWD/Knowledge/Product/Lint test.md\"}" | B lint-file | expect_contains "lint flags few links" "wikilink"
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
B run inbox-triage | expect_contains "run resolves agent bundle" "Brain Triager"
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

echo "DONE"
