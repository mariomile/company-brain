# Evals

Each case scaffolds the sample brain by cloning the public template into the run's workspace (`fixture.sh`, needs network), so run with `--scaffold`. The cases write and run the script, so grant the gated tools too:

```bash
claude plugin eval . --scaffold --allow-tools Bash Write Edit --ablation none --trust-plugin
```

Both cases pass as of 2026-10-22 (score 1.0). Cases: `decide` (a reported decision becomes a record linked from its project), `health` (a health request runs the script and reports, no content edits). Add one per skill as it stabilizes. Results land in `results/` (ignored by git).
