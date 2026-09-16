# GH-2 v1.0 Pilot Diagnostic Provenance

Status: **DIAGNOSTIC ONLY — EXCLUDED FROM v1.1 CONFIRMATORY CLAIMS**

The GH-2 v1.0 pilot was executed from the frozen pre-execution snapshot `981482067f3fca458879bf94b3c4d12e77ed8e95` through a separate pilot lineage.

Recorded successful pilot workflow run: `35071304728`.

The pilot demonstrated that the execution path could run the four arms in fresh processes and preserve core structural invariants. It must not be used as confirmatory evidence because subsequent audit identified:

1. `build_world(seed)` discarded the seed, so 8201/8202/8203 did not represent independent experimental variation;
2. the confirmatory repetition-count method was not preregistered before pilot;
3. v1.0 admission/dry-run code evaluated the same scenario effect intended for later confirmatory interpretation;
4. R4 stale responsibility was not explicitly reset at matched-pair boundaries.

The first v1.0 pilot attempt also stopped because the execution wrapper referenced `selected_action` instead of the actual `ArmDecision.enacted_selected` field. The wrapper field mapping was corrected without modifying the frozen v1.0 responsibility design, and the successful diagnostic run was then obtained.

No v1.0 pilot metric may be used to choose v1.1 scenario composition, confirmatory size, thresholds, or responsibility rules. v1.1 uses a pre-frozen finite confirmatory matrix and treats seeds as non-experimental metadata.
