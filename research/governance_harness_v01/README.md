# Governance Harness v0.2

This module is a governance sidecar around CanonicalHarnessV11. It preserves the
canonical probe and one-realization rules and adds these boundaries:

1. Gap detection receives only an episode-local current-flow trace. Integrity
   fingerprints are held separately and are never semantic detector input.
2. NO grants the Core an empty historical capability before evaluation. YES validates every reengagement
   ID/provenance and exposes only participate=True experiences. Negative decisions
   remain in the governance audit only.
3. The Core creates the actual possibility distribution before responsibility is
   assessed. Responsibility is tied to candidate selection/nonselection and dynamic
   uncertainty, impact, vulnerability, and temporality evidence; no permanent score
   is stored.
4. Every branch starts the canonical IndependentEvaluatorV1 lifecycle. The epoch
   stays pending until a post-realization observation establishes relation closure.
5. Only then is realization reference/tau/fingerprint consistency checked and typed
   result-based revalidation performed for gap, every participation/nonparticipation
   decision, choice, and responsibility.
6. Governance provenance is attached by HistoryEntry ID in GovernanceHistorySidecar;
   typed feedback is available to later governance judgments. Per-epoch access,
   exposure, candidate, and operation counts are kept in GovernanceMetrics.

Governance context is bound only during the current canonical epoch and is cleared
in finally, including failures. This remains a synthetic contract implementation;
the repository's CARLA compatibility audit still controls real experimental use.

The implementation is `GovernanceHarnessV02`. `GovernanceHarnessV01` remains as a
compatibility alias for existing callers; it has the v0.2 semantics.
