# Blind Historical Flow Replay v2 — Result Record

## Valid run
- Workflow: Blind Historical Flow Replay v2
- Run ID: 33997689850
- Head commit: `f68d1a8d32024eaf0739391b9ea3f5e45f04c8cb`
- Artifact: `blind-historical-flow-v2-report` (artifact id `9978544971`)
- Realization seeds: 101, 211, 307, 401, 503
- Authoritative core audit: PASS
- Protocol lock: PASS
- Common completed-experience identity audit: PASS
- Hypothetical test choices are discarded before the next exogenous historical reveal: PASS
- No test-window hypothetical choice is actualized into a completed experience: PASS

Earlier runs are not evidence:
1. run 33997445838: artifact-directory execution failure; additionally exposed invalid warmup/action-precondition design.
2. subsequent pre-final runs before commit `f68d1a8...`: not accepted because the realization seeds were strings that collapsed to the same numeric seed and unrealized hypothetical choices could remain in the next current-field seed.

## Descriptive result first
Across all five valid realization seeds and all five test reveals:

### 1. Completed-experience reactivation differed
- OASIS reactivated both common completed experiences (`experience:0`, `experience:1`) at every T0–T4 reveal.
- Ordered Episodic reactivated only the most recent matching completed experience (`experience:1`).
- Current Event and Temporal Graph reactivated no completed experiences by comparator definition.

This establishes only that the implemented memory/field mechanisms are different. It is not evidence of OASIS superiority or uniqueness.

### 2. Possibility structure did NOT differ
For every seed, each system generated exactly the same number of possibilities at each reveal:
- T0: 6
- T1: 6
- T2: 9
- T3: 3
- T4: 1

More importantly, the actual possibility step-sequence sets were identical across OASIS, Current Event, Temporal Graph, and Ordered Episodic at every reveal.

Therefore the extra OASIS completed-experience reactivation did not generate a different executable possibility structure in this historical stream.

### 3. Participation structure did NOT differ
Current participation remained the same across all systems. Historical participation was empty in all systems for this case because the warmup participants were already present as current participants.

Therefore no OASIS-specific participation restructuring was observed.

### 4. Choice differences are NOT semantic evidence
T0–T3 had multiple responsibility-equivalent/current-flow-equivalent possibilities and `tieBreakUsed=true` (contingent realization). Different systems sometimes realized different candidates because their support sets alter the contingent realization fingerprint.

Since the authoritative implementation explicitly defines this tie resolution as non-semantic, these choice differences MUST NOT be interpreted as OASIS making a better/different substantive decision.

At T4 there was only one possibility and all systems chose the same action.

### 5. Responsibility did not create a system-level distinction
The chosen valid candidates had no remaining unresolved responsibility. Responsibility-created composite possibilities existed (for example hold → supply/withdraw), but the same composite possibility structure appeared across all systems.

## What this experiment does and does not show

### Supported observation
The OASIS implementation reconstructs a broader completed-experience relational field than the one-episode comparator under the same historical current.

### Not supported
This run does NOT show that the broader reconstructed field changes:
- participation structure;
- executable possibility structure;
- semantic choice formation.

Therefore it does not establish the stronger OASIS-specific chain:
`current flow -> relational reconstitution -> different participation/possibility structure -> substantively different single choice`.

## Falsification / diagnostic status
For the stronger paper claim, this first valid historical case is a NEGATIVE / NON-DISCRIMINATING result.

The reason is not that OASIS failed to retrieve history. It retrieved more relational history. The reason is that this historical adapter supplied the same executable atomic affordances to all systems, while the two warmup actions were no longer executable in the test window. Consequently the additional reactivated history changed support provenance but not the possible action structure.

This distinction is essential: it would be confirmation bias to count the different relation signatures or contingent choices as proof once the possibility and participation structures remain identical.

## Newly exposed implementation/experiment boundary
The current reference core can alter possibility structure through:
1. currently supplied executable affordances;
2. currently executable action templates reactivated from completed experiences;
3. structural composition when explicit process bridges exist (requires/provides, responsibility resolution, created-entity requirements).

This case did not contain a historically justified situation in which a reactivated completed experience supplies an executable action/process bridge that is absent from current-event-only and temporal-graph representations.

The next experiment must test that condition without inventing an OASIS-favoring hidden affordance.

## Required next redesign
Before another run:
1. fresh kill-search against multi-hop temporal KG, multi-episode retrieval, case-based/action memory and planning;
2. choose a real historical stream where earlier completed relational processes can legitimately reopen an executable action or process bridge in a later current;
3. add a stronger multi-episodic comparator that retrieves all currently relevant past episodes without OASIS relational-chain reconstruction;
4. ensure any history-derived action remains physically/organizationally executable in the later current through independently documented conditions, not experimenter preference;
5. keep the same no-success-score, exogenous-history and four-axis audit constraints.

## Evidence-use rule
The valid v2 raw traces may be cited as:
- a negative/diagnostic historical-flow result;
- evidence that mere extra relational-history reactivation is insufficient to establish OASIS-specific decision restructuring.

They must not be cited as evidence that OASIS outperformed the comparators.
