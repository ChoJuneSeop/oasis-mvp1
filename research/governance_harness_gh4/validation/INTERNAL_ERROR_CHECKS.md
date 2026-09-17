# GH-4 Internal Error Checks

Status: STAGE_3_ERROR_CHECKS_PASS

## Pass 1 — definition consistency

PASS.

- GH-4 tests integrated long-horizon causal continuity, not generic agent intelligence.
- Newly completed experiences are permitted only after Closure and only at later decision times.
- Retrieval, participation, responsibility, realization, revalidation and commit remain distinct operations.
- REVISED remains a contextual non-participation signal, not deletion or permanent exclusion.
- U/I/V/T remain candidate-specific burden structure, not a scalar score.
- Confirmatory claims are bounded to the finite synthetic world.

## Pass 2 — causal consistency

PASS.

Potential reverse-causal paths were checked and prohibited:

- post-observation cannot enter pre-realization operators,
- evaluator truth cannot enter worker runtime operators,
- a just-created CE cannot be searched before its own Closure,
- feedback is committed only after revalidation,
- no later outcome may rewrite an earlier realized action,
- no arm may use confirmatory labels to decide participation or responsibility.

The required direction is strictly:

present → Gap → optional history access → participation → possibilities → responsibility → one realization → post-observation → Closure → revalidation → atomic commit → later eligibility.

## Pass 3 — execution consistency

PASS subject to implementation admission tests.

Implementation must prove:

1. one persistent Core/Harness/HistoryPort instance per arm over the full horizon,
2. fresh OS process isolation between arms,
3. no reset of archive or feedback inside an arm,
4. exactly one realization per epoch,
5. selected possibility equals realized possibility,
6. every epoch reaches Closure before the next epoch begins,
7. every searched CE has completed_tau < current decision_tau,
8. no-gap epochs perform zero archive searches,
9. scientific evaluator runs only after all arm workers return,
10. Pilot computes no scientific contrast and cannot change confirmatory size,
11. no prior GH-1/GH-1L/GH-2/GH-3/Core files are modified.

No unresolved definition, causal-order, or execution-design contradiction remains at Stage 3.
