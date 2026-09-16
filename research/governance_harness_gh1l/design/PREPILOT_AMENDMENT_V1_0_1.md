# GH-1L Pre-pilot Amendment v1.0.1

## Reason

An independent pre-pilot audit found that the original admission gate demonstrated fresh Python processes with a probe, while the actual `runner/run_experiment.py` executed G1-G5 sequentially inside one interpreter process. No pilot or confirmatory data had been generated when this discrepancy was found.

A second pre-pilot ambiguity was also found: the original runner aggregated evaluator counts across all arms and did not expose a frozen arm-level paired metric path for pilot variance and confirmatory-count derivation.

## Amendment scope

This amendment changes only `research/governance_harness_gh1l/**` and the GH-1L CI workflow. It does not modify frozen GH-1 files, Core files, archive semantics, scenario classes, evaluator labels, or the research claim boundary.

The corrected execution contract is:

1. every experimental arm is executed by a newly spawned Python worker process;
2. all arms within one block receive the same environment seed and horizon;
3. the worker rejects reuse if process-local arm state is already non-empty;
4. evaluator truth is joined only after all decisions for that arm have been emitted;
5. the primary pilot paired metric is frozen before pilot as `history_sensitive_resolution_rate_G1_minus_G3`;
6. history-sensitive classes are frozen as `history-critical`, `relational-mismatch`, `context-reversal`, `conflicting-history`, and `long-re-entry`;
7. pilot uses three frozen paired blocks and is excluded from confirmatory data;
8. confirmatory block count is derived only by the frozen paired-variance formula and written to `design/CONFIRMATORY_COUNT_FREEZE.json` after pilot;
9. confirmatory execution remains impossible while that count-freeze file is absent.

## Provenance

- Frozen GH-1 base: `ea9261b15663a95d819aa9c9c9e5b9e76e9d5352`
- Original GH-1L implementation: `e36ae30f5cf0b1cd9e007642ea050dd71b503bff`
- Pilot before amendment: **NOT EXECUTED**
- Confirmatory before amendment: **NOT EXECUTED**

The original readiness record is preserved as `validation/EXPERIMENT_READY_E36AE30.json`. The amended lineage must obtain a new `EXPERIMENT_READY` verdict before pilot.
