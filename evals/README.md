# Evals

Each case scaffolds the sample brain by cloning the public template into the run's workspace (`fixture.sh`, needs network), so run with `--scaffold`. The cases write and run the script, so grant the gated tools too:

```bash
claude plugin eval . --scaffold --allow-tools Bash Write Edit --ablation none --trust-plugin
```

Cases: `setup` (a setup request runs the checklist and asks where the brain lives before any outward or scheduling action), `decide` (a reported decision becomes a record linked from its project), `health` (a health request runs the script and reports, no content edits), `ask` (sample notes are not facts: a question only samples can answer is a gap, and it is logged). Add one per skill as it stabilizes. Results land in `results/` (ignored by git).
