# Governance Harness v0.3 adversarial baseline

- Baseline commit: `7d2a1b1`
- Command: bundled Python `-m unittest` with the four new v0.3 attack tests
- Result: **FAILED** — 5 tests, 4 failures.

Observed failures before the v0.3 implementation change:

1. Responsibility selected `proceed`, Core selected `yield`, and the mismatch was
   rejected only after the real flow had already been actuated (`apply_count == 1`).
2. A detector-owned archive canary was directly reachable and executed instead of
   being rejected at the gap boundary.
3. Closing `route-A` left its sample list in `self.samples`, so a later episode with
   the same logical route inherited closed evidence.
4. Nested future/seed/scenario/raw-actor/fingerprint fields in `current_reality`
   reached the detector as semantic evidence.

The fifth attack test passed at baseline: repeated captures in one still-open
episode already retained a continuous trace. This behavior is preserved.
