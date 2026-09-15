# Governance Harness v0.4 baseline failure

Baseline: `aef84faecb2e01b31838caf9a95f9de2111596ff` (`feature/governance-harness-v1`).

The ATK-01..ATK-16 test module was added before any v0.4 production code, then
executed with Python 3. The run exited 1 during test-module import:

```text
ERROR: test_governance_attack_v04
ModuleNotFoundError: No module named
'research.governance_harness_v01.harness_v04'
Ran 1 test in 0.000s
FAILED (errors=1)
```

This is the expected red baseline: v0.3 has no v0.4 authoritative snapshot,
HistoryAccessPort, admission state, transactional closure, or recovery API, so
the v0.4 attack contract cannot even be collected. The failure was recorded
before `harness_v04.py` was created. Existing v0.3 tests were not changed to
manufacture the failure.
