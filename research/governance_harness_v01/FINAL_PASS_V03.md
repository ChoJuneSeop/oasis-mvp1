# Governance Harness v0.3 final verification

All commands used the Codex bundled Python runtime on 2026-09-16.

| Suite | Tests | Result |
|---|---:|---|
| Governance adversarial + existing Governance | 29 | PASS |
| `carla_v22_harness_v11` full test discovery | 17 | PASS |
| Current relational Core + history admission regression | 16 | PASS |
| **Total** | **62** | **PASS** |

The three new failing baseline behaviors are recorded in `BASELINE_FAIL_V03.md`.
The existing v0.2 evidence documents remain unchanged. The branch also contains a
minimal Governance v0.3 GitHub Actions workflow that independently runs the same
62-test gate on pushes and pull requests affecting these components.
