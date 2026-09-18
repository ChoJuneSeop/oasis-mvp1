# CARLA Structural Pilot v1 — Execution Order

Status: FROZEN

The Pilot may execute only in this order:

1. freeze all four runtime source identities;
2. run runtime identity gate;
3. run canonical CARLA / Governance / CBRA / mapping regressions;
4. verify identical CARLA build, map, seed set, traffic, weather, and episode schedule across all arms;
5. start identical efficiency/energy measurement sidecars;
6. run GENERAL_HARNESS in an isolated process;
7. run GOVERNANCE_NO_CBRA in an isolated process;
8. run GOVERNANCE_PLUS_CBRA in an isolated process;
9. store raw functional and telemetry logs;
10. hash artifacts;
11. run structural evaluator;
12. record Pilot PASS/FAIL;
13. do not modify Confirmatory rules from Pilot outcome.

If a structural defect is found, the current Pilot becomes diagnostic-only and a new version must be frozen before rerun.
