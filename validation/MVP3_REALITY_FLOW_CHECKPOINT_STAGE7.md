# MVP3 Reality Flow Validation Checkpoint — through STAGE 7

Checkpoint date: 2026-09-06
Branch: `mvp3-reality-flow-kill`
Canonical restart point: STAGE 8

## Completed validation flow

### STAGE 1 — Reality Flow Engine Kill Search
Decision: GO only as an OASIS internal-validity correction, not as a novelty claim for generic stream/history processing.

Killed as generic novelty claims:
- continuous event-stream / reality-stream processing
- history-dependent decision making
- temporal or relational memory by itself
- continually revised world models

Surviving OASIS validation target:
- whether stored relational experience gains or loses present decision authority according to the ongoing relational flow, rather than according to one current coordinate or a fixed anomaly label.

### STAGE 2 — MVP2 same-coordinate / different-flow falsification
Control:
- identical endpoint (`danger=0.40`)
- same target/current place/stored relation episode
- opposite incoming trajectories: rising versus falling

Observed in MVP2:
- same relation-field activation
- same participant set
- same candidates
- same decision signature

Result: `MVP2_FALSIFIED_FOR_PATH_SENSITIVITY`.

### STAGE 3 — Minimal Reality Flow Layer
Added a thin post-MVP2 layer rather than replacing the engine.

Key design constraints retained:
- no semantic rule such as rising=bad or falling=recovery
- no legacy `0.18` relation threshold
- no legacy `0.38` participation threshold
- no legacy `1200`-tick age cutoff
- flow representation informs relation authority/participation; it does not directly command an action

Initial proxy: temporal orientation (`+1 / -1 / 0`) and episode orientation annotation.

### STAGE 4 — MVP3 same-coordinate validation
Original endpoint 0.40:
- same endpoint preserved
- opposite flow preserved
- relation authority differed
- ranking differed
- participant set was saturated at this endpoint, so participation itself did not differ

A second unsaturated endpoint (`danger=0.20`) was added only as an observational condition, not as an engine threshold:
- same endpoint preserved
- opposite flow preserved
- relation authority differed
- participant structure differed
- ranking/choice differed

Result: `MVP3_PATH_SENSITIVITY_SURVIVES_REDESIGNED_MINIMAL_TEST`.

Important limitation: this establishes only minimal path sensitivity for the tested representation.

### STAGE 5 — Compatibility regression
Checks:
- Reality Flow layer does not reuse the legacy 0.18 / 0.38 / 1200 constants
- Rule / Utility / Q-like / Retrieval external comparison traces remain unchanged
- OASIS still acts and forms relation episodes
- live relation episodes acquire temporal orientation

Result: `MVP3_LAYER_COMPATIBILITY_SURVIVES`.

### STAGE 6 — Live MVP3 loader integration
The live `mvp3.html` loader was tested against the actual browser app.

Observed:
- Reality Flow loaded successfully
- no page errors
- tested flow ticks were observed
- OASIS continued acting
- relation episodes continued forming and received flow orientation
- external comparison traces stayed unchanged versus MVP2

Result: `MVP3_LIVE_LOADER_SURVIVES`.

### STAGE 7 — Trajectory aliasing falsification
New kill condition:
- two trajectories end at the same endpoint
- both have the same final non-zero direction
- but their temporal run structures differ
  - direct path: `[+1]`
  - reversal path: `[-1,+1]`

Observed under the current last-direction proxy:
- same flow authority
- same participants
- same ranking/decision signature

Result: `MVP3_LAST_DIRECTION_PROXY_FALSIFIED_FOR_TRAJECTORY_ALIASING`.

Interpretation:
The direction proxy solved the MVP2 same-coordinate aliasing problem but is still too lossy. It collapses different completed flow structures whenever they share the same final direction. Therefore STAGE 3-6 are not invalidated; they are scoped evidence that temporal orientation matters. STAGE 7 establishes that last orientation alone is insufficient to represent the OASIS Reality Flow required by the current theory.

## Frozen conclusions

1. A single current scalar coordinate is insufficient.
2. A single last-direction value is also insufficient.
3. The next representation must preserve more temporal relation structure without assigning predefined semantic meaning to that structure.
4. The representation must remain observational: it may condition relation authority, but must not encode the desired action.
5. Any richer representation must first undergo a kill search because run-length encoding, change-point detection, trajectory signatures, sequence models, and temporal abstractions are established prior art.

## Restart point — STAGE 8

### STAGE 8 — Trajectory-Structure Representation Kill Search
Question:
What is the minimum temporal relational structure needed to distinguish the STAGE 7 direct and reversal flows without merely reinventing standard sequence/history representations or scripting OASIS semantics?

Required sequence:
1. Kill-search candidate representations.
2. Choose the minimum non-semantic representation only if needed.
3. Design a falsification before modifying the engine.
4. Preserve the existing MVP3 layer and GitHub validation chain as much as possible.
5. Do not claim superiority or novelty from representation mechanics alone.

This file is the canonical checkpoint for restarting the Reality Flow validation sequence.
