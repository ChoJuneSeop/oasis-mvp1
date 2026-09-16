# Runner

The GH-1L experiment entry point is `python -m research.governance_harness_gh1l.runner.run_experiment --stage <pilot|confirmatory>`.

Every G1-G5 arm is spawned as a new Python worker process. All arms in one block receive the same environment seed and frozen horizon. A worker refuses a second arm if process-local arm state is already populated. Evaluator truth joins only after the worker has emitted all decisions for that arm.

Pilot is three frozen paired blocks. Raw pilot output should be written to `results/PILOT_RESULT.json`. The frozen primary paired metric is `history_sensitive_resolution_rate_G1_minus_G3`.

After pilot, derive the confirmatory block count exactly once with:

`python -m research.governance_harness_gh1l.runner.freeze_confirmatory_count --pilot research/governance_harness_gh1l/results/PILOT_RESULT.json`

This creates `design/CONFIRMATORY_COUNT_FREEZE.json`. Overwrite is forbidden. Confirmatory remains hard-locked until that file exists and matches the current spec version.

No runner imports evaluator truth into `LongHorizonRunner`. `IndependentEvaluator` joins truth only after decisions exist. Pilot data is excluded from confirmatory data.
