# Governance Harness v0.4 final verification

Local verification date: 2026-09-16 (Codex bundled Python runtime).
Baseline: `aef84faecb2e01b31838caf9a95f9de2111596ff`.

| Gate | Tests | Result |
|---|---:|---|
| ATK-01..16 + prior Governance | 45 | PASS |
| Canonical Harness discovery | 17 | PASS |
| Current relational Core + history admission | 16 | PASS |
| **Local total** | **78** | **PASS** |

`python -m compileall -q research/governance_harness_v01` and `git diff
--check` also passed (Git reported only its Windows LF-to-CRLF checkout notice).

Independent code review initially failed the implementation for history reuse,
sidecar rollback, incomplete candidate decisions, post-actuation recovery, and
trace poisoning. Those findings were fixed and the final independent re-review
returned **PASS**, with no remaining semantic, atomicity, or recovery blocker.

GitHub Actions run: `35004302952`, workflow run `#1`, commit
`cf98494733b77df493372e678abe3e077a760752`. Conclusion: **success** in 11s.
The run independently executed the same 78-test gate on Ubuntu/Python 3.11.

Actual Core admission: `REAL_EXPERIMENT = BLOCKED`. The repository has no frozen
live Core/runtime proof for exclusive HistoryAccessPort use and the other v0.4
admission claims. The admitted in-repository Core is only a synthetic contract
exerciser and is not experimental evidence.
