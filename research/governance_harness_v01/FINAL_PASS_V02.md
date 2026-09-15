# Governance Harness v0.2 final verification

All commands used the Codex bundled Python runtime on 2026-09-16.

| Suite | Tests | Result |
|---|---:|---|
| Governance adversarial + existing Governance | 24 | PASS |
| `carla_v22_harness_v11` full test discovery | 17 | PASS |
| Current relational Core + history admission regression | 16 | PASS |
| **Total** | **57** | **PASS** |

The implementation gate was opened only after the baseline evidence in
`BASELINE_FAIL_V01.md` had been produced.  Commit and push are permitted only with
the totals above still passing.
