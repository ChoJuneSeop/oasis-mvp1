# OASIS Causal Evidence Ledger v1.1

Date: 2026-09-07
Supersedes for current research status: `CAUSAL_EVIDENCE_LEDGER_v1.0.md`
Baseline: OASIS Integrated Core v2.0 (unchanged)
Policy: prior ledgers and failed experiments remain preserved.

## Evidence labels
- OBSERVED: directly observed.
- SUPPORTED: survived a relevant control/falsification within scope.
- REFUTED: tested formulation failed its declared control.
- UNVALIDATED: not directly established.
- IMPLEMENTATION: mechanism/code evidence only.
- GENERALIZATION-UNVALIDATED: not established outside current harness/world.

## Fixed findings inherited from v1.0

1. Relation/process and sequence history can matter: SUPPORTED within canonical scope.
   Boundary: production `pairKey(a,b)` remains order-insensitive; full production O1 noncommutativity is UNVALIDATED.
2. Synthetic O1 long-horizon: IMPLEMENTATION/feasibility only, not production proof.
3. O2 non-currentness is not deletion: OBSERVED/IMPLEMENTATION.
4. O3 contextual reactivation exists in the opt-in latent-store mechanism: OBSERVED/IMPLEMENTATION.
5. O4 non-anticipation is a hard design constraint; distinct behavioral O4 effect remains UNVALIDATED.
6. Direct causal force of unrealized possibilities: UNVALIDATED (Stage 30 did not establish it).
7. `longer memory -> more OASIS spiral`: REFUTED.
8. `danger-rise -> O3 scope` and `danger-rise -> post-reactivation verification`: REFUTED for tested formulations.
9. `current danger == responsibility axis`: UNVALIDATED.
10. Current danger has a durable observational residual association with O3 choice-contribution after strong balancing; this is not an intervention proof.
11. A 257-solution danger-blind balanced matching multiverse kept the danger residual positive in all sampled feasible designs, weakening the single-control-selection artifact explanation. Adversarial worst-case balance remains unresolved.

## CR-01 — Process identity trace integrity
Status: SUPPORTED as implementation/process-trace evidence in the 120k broad latent-store harness.
Run: GitHub Actions `34077392032`
Artifact: `10002630131`

### Observed trace counts
- total formed process identities: 10,045
- latentized identities: 9,805
- reactivated identities: 9,781
- identities observed through current participation: 9,752
- identities observed through linked outcome: 9,705
- identities observed through `field-spiral` future rewrite: 0
- identities appearing in a whole-latent-layer changed-decision counterfactual context: 9,191
- latent identities with no reactivation observed by horizon: 24 (right-censored, not permanent failure)
- identities current at 120k horizon: 7,321 (right-censored for next transition)
- identities with multiple reactivate/noncurrent cycles: 9,587
- hard temporal/state invariant anomalies: 0
- soft audit gaps: 0

### What CR-01 supports
- O2 non-currentness is directly auditable with persistent process identity.
- O3 contextual reactivation is directly auditable with the same identity after latentization.
- The same `episodeId` can be followed through formation -> latentization -> reactivation -> participation -> linked outcome for 9,705 identities in this harness.
- Non-current/current cycling is not a one-shot event; 9,587 identities cycled multiple times.
- Right-censoring is necessary: 24 latent identities had no observed reactivation by 120k and 7,321 were current at horizon.

### What CR-01 does NOT support
- No `field-spiral` was observed in this 120k broad latent-store audit. Therefore the full chain `outcome -> future relation rewrite` is NOT OBSERVED here.
- Membership in a changed whole-latent-layer counterfactual set does not prove that each member identity is individually necessary or sufficient.
- Outcome linkage is observational in this stage; counterfactual outcome effect is UNVALIDATED.
- Generalization is UNVALIDATED.

## Same-flow 120k latent gate comparison
Status: OBSERVED mechanism comparison; no single gate promoted as final O3.
Run: `34047978468`

At 120k under the same production reality:
- broad: mean active ~1247.13, decision diffs 297, choice diffs 204
- rawBridge: mean active ~679.03, decision diffs 102, choice diffs 77
- completedProcess: mean active ~774.82, decision diffs 197, choice diffs 164
- exactProvenance: mean active ~229.49, decision diffs 49, choice diffs 34

Interpretation:
- narrower retrieval/currentization does not monotonically produce more behavioral contribution.
- `exactProvenance` is precise/narrow but behaviorally sparse and saturates late.
- `completedProcess` retains much more of broad behavioral effect with substantially lower active volume.
- broad reactivation is not treated as final O3 architecture, especially because the 120k broad latent-store audit produced zero field spirals.
- research architecture must separate candidate retrieval from current-relation admission; retrieval itself is not currentization.

## Current causal research rules
1. Unit of analysis: process trace in current flow, not a fixed coordinate.
2. `stored != retrieved != currentized != participated != changed decision structure != changed actual choice != changed outcome != rewrote future relation structure`.
3. Immediate divergence is not required.
4. Difference may emerge, contract, disappear, naturally return, or reappear.
5. Horizon nonoccurrence is right-censored.
6. Joint relational contribution must not be falsely decomposed into individual claims.
7. Shadow counterfactuals never feed back into production.
8. Every experiment requires kill-search + frozen scope before execution.
9. Implementation, same-current causal contribution, longitudinal causal effect, and generalization are graded separately.
10. Broad candidate retrieval and admission/currentization are separate research stages.

## Sequential unresolved questions
1. CR-02: individual episode necessity/sufficiency vs joint/redundant contribution at changed-decision moments.
2. CR-03: irreducible/minimal joint relation-support sets where no individual account suffices.
3. CR-04: counterfactual effect of realized outcome on the next decision/relation state.
4. CR-05: long-horizon propagation under time-varying confounding / treatment-confounder feedback.
5. CR-06: production O1 order distinction.
6. CR-07: O4 distinct behavioral effect.
7. CR-08: responsibility-axis identification independent of the shortcut `danger = responsibility`.
8. CR-09: generalization last.
