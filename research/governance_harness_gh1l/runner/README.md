# Runner

The runner accepts `pilot` and `confirmatory` stages. Confirmatory is hard-locked until
`design/CONFIRMATORY_COUNT_FREEZE.json` is produced after pilot power analysis. That
file is deliberately absent at `EXPERIMENT_READY`, so an accidental confirmatory run
fails before world execution.

No runner imports or accepts evaluator truth. `IndependentEvaluator` joins truth only
after decisions exist. Raw future pilot/confirmatory outputs belong in `results/`.
