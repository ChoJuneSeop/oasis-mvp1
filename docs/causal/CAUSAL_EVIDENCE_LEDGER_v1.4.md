# OASIS Causal Evidence Ledger v1.4

Date: 2026-09-07
Supersedes for current research status: `CAUSAL_EVIDENCE_LEDGER_v1.3.md`
Baseline: OASIS Integrated Core v2.0 (unchanged)
Policy: prior ledgers, failed validity runs, negative results, and killed experiments remain preserved.

## Inherited evidence through CR-03R

- Relation/process and sequence history can matter: SUPPORTED within canonical scope.
- Full production O1 noncommutativity: UNVALIDATED; production `pairKey` remains order-insensitive.
- O2 non-currentness: OBSERVED/IMPLEMENTATION.
- O3 contextual reactivation with persistent process identity: OBSERVED/IMPLEMENTATION.
- CR-01 identity trace: 9,752 to participation, 9,705 to linked outcome, 0 to `field-spiral` future rewrite.
- O4 non-anticipation: hard design constraint; distinct behavioral effect UNVALIDATED.
- Unrealized possibility direct causal force: UNVALIDATED.
- `longer memory -> more OASIS spiral`: REFUTED.
- danger-rise as O3 scope / verification controller: REFUTED for tested formulations.
- `danger == responsibility`: UNVALIDATED.
- CR-02 corrected same-current effects: 297 decision-signature changes, 204 resolved-target changes; identity-level support is heavily redundant/overdetermined.
- Original CR-03 irreducible support test: NOT RUN because eligible interaction-only cases = 0.
- CR-03R: cross-key overdetermination in 165/297 decision effects and 77/204 resolved-target effects; duplicate episode identity alone does not explain redundancy.

## CR-03C — Decision-channel equivalence
Status: SUPPORTED within 120k same-current implementation scope.
Run: `34079126784`
Artifact: `10003136256`

### Validity
- production replay mismatch: 0
- full-shadow resolved-target mismatch: 0
- joint decision effects reproduced: 297
- joint target effects reproduced: 204
- cross-key decision moments reproduced: 165
- cross-key target moments reproduced: 77
- canonical guard: PASS

### Cross-key decision-signature cases, n=165
- CHANNEL_EQUIVALENT: 15 (9.09%)
- CHANNEL_EQUIFINAL: 150 (90.91%)
- max distinct measured decision channels at one moment: 4

### Cross-key resolved-target cases, n=77
- CHANNEL_EQUIVALENT: 14 (18.18%)
- CHANNEL_EQUIFINAL: 63 (81.82%)
- max distinct measured decision channels at one moment: 4

### Decision-consumed component variation
Decision-level equifinal moments, n=150:
- participant roles: 2
- actionable places: 0
- relation-aware place relevance: 146
- hidden readiness: 81
- hidden candidates after refresh: 0
- member-rank matrix: 146

Target-level equifinal moments, n=63:
- participant roles: 4
- actionable places: 0
- relation-aware place relevance: 59
- hidden readiness: 42
- hidden candidates after refresh: 0
- member-rank matrix: 59

Raw relation-key identity and raw NPC-touch identity were not used to declare channel difference.

## What CR-03C supports

In the current OASIS implementation, distinct relation structures can pass through measurably different decision-consumed channels while converging on the same current decision/actual target.

`equifinality` = 서로 다른 경로나 조건 조합이 동일한 현재 결과에 도달하는 현상.

This weakens the explanation that CR-03R cross-key effects are merely naming differences or one identical boolean channel.

## Critical boundary

Current convergence is not future equivalence.

Bisimulation/state-abstraction work requires future transition/reward equivalence before states can safely be treated as functionally interchangeable, and predictive-state approaches use history-conditioned future predictions in partially observable systems.

Therefore the histories behind currently convergent relation keys must remain preserved until longitudinal equivalence is tested.

## Next sequential test — CR-03L

Test whether currently equifinal relation channels remain equivalent after the shared immediate action under identical future exogenous flow.

The test must allow:
- no divergence
- delayed divergence
- divergence then natural return
- divergence, return, and reappearance

No monotonic-growth assumption is permitted.

## Evidence rules now fixed

1. `same current target` does not imply `same causal process`.
2. `different relation key` does not imply `different decision channel`; CR-03C must establish the channel difference.
3. `different current channel + same target` still does not imply future path dependence; CR-03L must test it.
4. Histories may be compressed for current computation only if compression does not erase future-relevant distinctions; permanent history merging is not justified by same-current equivalence.
5. Branch comparisons must share the same pre-intervention state and future exogenous tape.
6. Longitudinal divergence may appear, disappear, naturally return, or reappear.
7. Horizon non-divergence is right-censored, not permanent equivalence.
8. Production/canonical conditions remain unchanged; longitudinal branches are auxiliary causal mechanism experiments.
9. Time-varying feedback is explicitly tracked. Observational longitudinal claims cannot use naive regression where past decisions change later confounders.
10. Generalization remains last.

## Remaining sequence

1. CR-03L: longitudinal fate of currently equifinal channels.
2. Counterfactual effect of realized outcome on next relation/decision state.
3. Long-horizon outcome propagation under feedback/time-varying state.
4. Production O1 order distinction.
5. O4 behavioral distinctiveness.
6. Responsibility-axis identification independent of danger shortcut.
7. Generalization.
