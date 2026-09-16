# Stage 3 — Internal error checks

## Check 1: definition consistency — PASS
- Responsibility is separated from outcome evaluation and from historical participation.
- U/I/V/T remains vector/set structured and is not collapsed into one scalar.
- The production arm recomputes responsibility at every epoch.
- Selected and nonselected candidates both retain obligations.

## Check 2: causal consistency — PASS
- Possibilities are created before responsibility.
- All arms receive the same current observation, Core, candidate set and distribution.
- The primary intervention is whether the current responsibility profile is causally bound to selection.
- Record-only, permuted, and stale arms are explicit ablations and may not be described as production Governance OASIS.
- Outcome feedback, new CE reuse, and post-result retuning are disabled.

## Check 3: execution consistency — PASS subject to Core Admission/CI
- Production selection must be passed through `CurrentRelationalCoreV11.realize_selected`.
- `Core.realize()` compatibility choice is prohibited in evidence runs.
- One worker process is required per arm/block.
- Evaluator truth is joined only after worker decisions return.
- Pilot and confirmatory result paths must be absent before execution.

No code implementation was admitted until these three checks were written and frozen.
