# OASIS Causal Evidence Ledger v1.2

Date: 2026-09-07
Supersedes for current research status: `CAUSAL_EVIDENCE_LEDGER_v1.1.md`
Baseline: OASIS Integrated Core v2.0 (unchanged)
Policy: v1.0, v1.1, failed CR-02 v1, and all negative results remain preserved.

## Evidence labels
- OBSERVED: directly observed.
- SUPPORTED: survived a relevant control/falsification within scope.
- REFUTED: tested formulation failed its declared control.
- UNVALIDATED: not directly established.
- IMPLEMENTATION: mechanism/code evidence only.
- GENERALIZATION-UNVALIDATED: not established outside current harness/world.

## Inherited fixed findings

1. Relation/process and sequence history can matter: SUPPORTED within canonical scope.
   Boundary: production `pairKey(a,b)` remains order-insensitive; full production O1 noncommutativity is UNVALIDATED.
2. Synthetic O1 long-horizon: IMPLEMENTATION/feasibility only.
3. O2 non-currentness is not deletion: OBSERVED/IMPLEMENTATION.
4. O3 contextual reactivation exists in the opt-in latent-store mechanism: OBSERVED/IMPLEMENTATION.
5. O4 non-anticipation is a hard design constraint; distinct behavioral O4 effect remains UNVALIDATED.
6. Direct causal force of unrealized possibilities: UNVALIDATED.
7. `longer memory -> more OASIS spiral`: REFUTED.
8. `danger-rise -> O3 scope` and `danger-rise -> post-reactivation verification`: REFUTED for tested formulations.
9. `current danger == responsibility axis`: UNVALIDATED.
10. Current danger retains observational residual association with O3 contribution under prior balancing, but this is not intervention proof.

## CR-01 — Process identity trace integrity
Status: SUPPORTED as implementation/process-trace evidence in the 120k broad latent-store harness.
Run: `34077392032`
Artifact: `10002630131`

Observed:
- formed process identities: 10,045
- latentized: 9,805
- reactivated: 9,781
- same identity observed through participation: 9,752
- same identity observed through linked outcome: 9,705
- same identity observed through `field-spiral` rewrite: 0
- multiple reactivate/noncurrent cycles: 9,587
- hard invariant anomalies: 0
- soft audit gaps: 0

Boundary:
- outcome -> future relation rewrite was not observed in this broad-store audit.
- outcome counterfactual effect remains UNVALIDATED.

## CR-02 — Joint vs individual same-current causal attribution
Status: SUPPORTED within current implementation/same-current scope after validity correction.
Corrected run: `34078199598`
Artifact: `10002846695`

### Validity
- production replay mismatch: 0
- full shadow actual-target mismatch: 0
- duplicate footprint equivalence violations: 0

CR-02 v1 remains preserved as a validity failure because its shadow omitted production `refreshHidden()` semantics and compared internal `hidden:*` choice tokens directly with resolved production targets.

### Effects
- latent-available decision moments: 1,967
- joint latent-set decision-signature differences: 297
- joint latent-set resolved actual-target differences: 204
- mean active process identities at joint-effect moments: ~692.623

### Decision-signature attribution
- moments with >=1 necessary individual process: 1
- moments with >=1 sufficient individual process: 297
- no-necessary + sufficient / redundant-overdetermined moments: 296
- interaction-only moments with no individually sufficient process: 0

### Resolved actual-target attribution
- moments with >=1 necessary individual process: 0
- moments with >=1 sufficient individual process: 204
- no-necessary + sufficient / redundant-overdetermined moments: 204
- interaction-only moments: 0

### Interpretation

The current broad latent mechanism is dominated by substitutable causal support at the episode-identity level.

`overdetermination` = multiple available causes independently support the same effect, so removing one cause can leave the effect unchanged.

This does NOT mean individual process identities are irrelevant. Many are individually sufficient in the same current state, but almost none are individually necessary because alternatives remain.

### CR-03 original preregistration
Status: NOT RUN — NECESSITY KILLED.

The preregistered CR-03 required a joint effect with no individually sufficient process. CR-02 v2 found zero eligible moments. The tool may remain dormant as an implementation artifact, but no CR-03 scientific result exists.

## Same-flow 120k latent gate comparison
Status: OBSERVED mechanism comparison; no gate promoted as final O3.

- broad: mean active ~1247.13, decision diffs 297, choice diffs 204
- rawBridge: mean active ~679.03, decision diffs 102, choice diffs 77
- completedProcess: mean active ~774.82, decision diffs 197, choice diffs 164
- exactProvenance: mean active ~229.49, decision diffs 49, choice diffs 34

Interpretation unchanged: narrower retrieval/currentization does not monotonically increase useful contribution. Candidate retrieval and current-relation admission remain separate research stages.

## Current causal research rules
1. Unit: process trace in current flow, not a fixed coordinate.
2. `stored != retrieved != currentized != participated != changed decision signature != changed resolved target != changed outcome != rewrote future relation structure`.
3. Internal `hidden:*` tokens are not actual choices; actual-target claims use production-resolved target semantics.
4. Shadow evaluation must reproduce production pre-evaluation current-state transitions such as `refreshHidden`, then fully restore side effects.
5. Immediate divergence is not required.
6. Horizon nonoccurrence is right-censored.
7. Joint contribution must not be falsely decomposed into unique individual causation.
8. Redundant sufficiency and necessity are reported separately.
9. Every experiment requires necessity/prior-art kill-search before execution.
10. If a preregistered experiment has zero eligible cases, it is not forced to run.
11. Canonical and auxiliary mechanism experiments remain separated.
12. Implementation, same-current causal contribution, longitudinal causal effect, and generalization remain separate evidence grades.

## Sequential unresolved questions after CR-02
1. Redundancy-source decomposition: duplicate episode identities vs distinct sufficient relation-process footprints/keys.
2. If distinct relation structures are independently sufficient, trace why they converge on the same current participation/target and whether their future consequences later diverge.
3. Counterfactual effect of realized outcome on the next decision/relation state.
4. Long-horizon outcome propagation with time-varying confounding / treatment-confounder feedback controls.
5. Production O1 order distinction.
6. O4 distinct behavioral effect.
7. Responsibility-axis identification independent of `danger = responsibility`.
8. Generalization last.
