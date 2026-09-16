# GH-2 pre-execution correction log

This record preserves the only implementation correction observed before `EXPERIMENT_READY`.

## Initial implementation
Commit `ac5f3bc275b245ab5ec43e9bc4e4f76fb5107ee3` introduced the frozen GH-2 design and runner. Its first CI run failed before any pilot or confirmatory execution because worker JSON serialization attempted to emit Python `frozenset` values from the responsibility burden-set representation.

## Correction
Commit `a295db380e9595ee42567def37d3db0ce8f30c2a` added a deterministic JSON-safe conversion for dataclasses, tuples/lists, sets and frozensets. It did **not** change:
- the scientific question;
- responsibility definitions;
- U/I/V/T burden rules;
- arm definitions;
- scenario definitions or evaluator truth;
- primary metric;
- pilot seeds or confirmatory seed base;
- frozen GH-1/GH-1L/Core code.

No experimental result existed when this correction was made. It is therefore a pre-execution implementation defect correction, not post-result tuning.

## Revalidation
Workflow run `35064368972` completed successfully at corrected implementation SHA `a295db380e9595ee42567def37d3db0ce8f30c2a`:
- GH-2 admission 19/19 PASS;
- Governance Harness regression 45/45 PASS;
- Core regression 17/17 PASS;
- Canonical Harness regression 17/17 PASS;
- preflight `EXPERIMENT_READY`;
- pilot and confirmatory outputs absent;
- compile PASS.
