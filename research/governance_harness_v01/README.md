# Governance Harness v0.3

This module is a governance sidecar around CanonicalHarnessV11. It preserves the
canonical probe and one-realization rules and adds these boundaries:

1. Gap detection receives only an episode-local current-flow trace through a pure
   detector boundary. Detector-owned historical/integrity capabilities and nested
   future/seed/scenario/raw-actor/fingerprint semantics are rejected.
2. NO grants the Core an empty historical capability before evaluation. YES validates every reengagement
   ID/provenance and exposes only participate=True experiences. Negative decisions
   remain in the governance audit only.
3. The Core creates the actual possibility distribution before responsibility is
   assessed. Responsibility is tied to candidate selection/nonselection and dynamic
   uncertainty, impact, vulnerability, and temporality evidence; no permanent score
   is stored. Its selection binds an optional Core selection port, or a mismatch is
   rejected before the Canonical Harness can actuate the real flow.
4. Every branch starts the canonical IndependentEvaluatorV1 lifecycle. The epoch
   stays pending until a post-realization observation establishes relation closure.
5. Only then is realization reference/tau/fingerprint consistency checked and typed
   result-based revalidation performed for gap, every participation/nonparticipation
   decision, choice, and responsibility.
6. Governance provenance is attached by HistoryEntry ID in GovernanceHistorySidecar;
   typed feedback is available to later governance judgments. Per-epoch access,
   exposure, candidate, and operation counts are kept in GovernanceMetrics.
7. Relation closure rotates the active episode trace. A reused logical route starts
   fresh while provenance and feedback remain available.

Governance context is bound only during the current canonical epoch and is cleared
in finally, including failures. This remains a synthetic contract implementation;
the repository's CARLA compatibility audit still controls real experimental use.

The implementation remains `GovernanceHarnessV02` for compatibility and is also
exported as `GovernanceHarnessV03`. `GovernanceHarnessV01` remains an alias for
existing callers; all names have the v0.3 semantics.
