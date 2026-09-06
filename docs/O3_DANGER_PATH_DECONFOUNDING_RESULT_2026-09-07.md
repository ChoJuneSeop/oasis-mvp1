# O3 Danger Path Deconfounding — 2026-09-07

## Scope
This is an auxiliary implementation/mechanism test. It does not modify canonical production behavior and does not prove an independent responsibility operator.

## Why this test was required
The prior 30k/120k signal-discovery runs found that current `S.danger` discriminated completed-process O3 choice-difference events (30k AUC 0.6500821; 120k AUC 0.6536399). Code audit showed that danger is structurally reused in multiple paths: latent relation retrieval/relevance, participant selection, and member ranking. Therefore the observed association could be model-internal coupling rather than an independent responsibility state.

## Design
- Production world trajectory remains canonical.
- Interventions occur only in same-current shadow evaluations.
- Canonical adapter equivalence was required before interpreting any ablation.
- The same canonical danger flow was circularly phase-shifted by 25%, 50%, and 75% only inside selected shadow paths.
- Conditions:
  1. canonical
  2. decision/ranking danger path shifted
  3. latent O3 retrieval danger path shifted
  4. both shifted
- Each condition was also compared to 127 per-party circular shifts of the choice-difference label sequence.
- Phase-shifted future values are used only in offline shadow controls, never by the production policy.

## Canonical equivalence guard
Exact match to the established 30k signal-discovery result:
- records: 463
- O3 choice differences: 28
- O3 decision differences: 33
- danger AUC: 0.6500821018062397

## Results
### Canonical
- AUC: 0.6500821018062397
- empirical temporal-null p: 0.015625

### Decision/ranking danger path shifted
- 25%: AUC 0.6828018223234624; choice differences 24; p 0.0234375
- 50%: AUC 0.6257975638051044; choice differences 32; p 0.015625
- 75%: AUC 0.5471232876712329; choice differences 25; p 0.234375
- median AUC: 0.6257975638051044

### Latent O3 retrieval danger path shifted
All three phases were numerically identical to canonical:
- AUC: 0.6500821018062397
- choice differences: 28
- decision differences: 33
- empirical p: 0.015625

### Both paths shifted
All three phase results were exactly identical to the decision/ranking-only shifted condition.

## Interpretation
1. In this 30k implementation, the danger-sensitive latent O3 risk-clue retrieval path did not explain the observed danger/O3 choice-difference association under these phase interventions.
2. The danger-sensitive participant/ranking path does affect the association and the number of O3 choice-difference events.
3. The association is not fully eliminated by three coarse phase shifts: two phases retain temporal-null significance and one does not.
4. Therefore `current danger = responsibility axis` remains unsupported. A stronger targeted randomization of only the decision/ranking danger path is required.
5. The next test should use many (e.g. 127) distribution-preserving phase shifts of the decision/ranking danger path and compare canonical AUC with the resulting path-randomized AUC distribution.

## Evidence grade
Mechanism/deconfounding evidence only. No theory superiority claim. No independent responsibility-axis implementation claim.

## Reproducibility
- tool: `tools/o3-danger-path-deconfounding-test.mjs`
- workflow: `.github/workflows/o3-danger-path-deconfounding.yml`
- run: `34064419582`
- artifact: `9998489602`
- artifact SHA-256: `695f54262d1d822b05c2b9e8be12b5ce9e184dce2741aa5fafa82d3a415e90ac`
