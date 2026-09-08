# OASIS Γ Causal Probe v2 — Contamination-Resistant Design Lock

Date: 2026-09-08
Base branch before this design lock: `storage/oasis-integrated-research-system-v1.0`
Base experiment commit inspected: `e23aa0724ffa4863ae2b2908f6d184f906ce690b`

## 0. Why v2 exists — kill-search on necessity

Gamma causal probe v1 produced a bounded null under its implementation: 39 eligible/valid paired interventions and 0/39 external trajectory divergences. A code audit then showed that the v1 intervention-validity gate only proved that `activeRelations` was numerically removed; it did not prove that the removed historical relation could change the admissible possibility set or the eventual decision. In the prehistoric v1.1 capability grammar, the 11 primitive capabilities do not consume `activeRelations` or `participation.historical`, and the neutral Choice Axis does not prefer active-relation use. The canonical relation predicate also reactivates a historical relation only when the same relation is already present in the current observation, making historical re-entry informationally redundant in this environment.

Therefore:
- rerunning v1 unchanged is NOT necessary and would only reproduce the same no-op causal channel;
- a new experiment is justified only after an implementation-conformance repair that restores the already-defined OASIS meaning: realized relational process from the past can re-enter a later current and alter the construction of currently executable possibilities;
- v2 must not be tuned to make a positive result more likely.

This is an implementation-conformance repair followed by a new confirmatory causal probe, not a reinterpretation of the v1 null.

## 1. Contamination firewall

The following v1 outcomes are known and may NOT be used to choose a favorable v2 direction, seed, effect size, threshold, or success criterion:
- v1 Gamma 0/39 divergence;
- Main v1/v2 civilization timing;
- Main A5 events/realization or any previous A5-vs-reference descriptive result.

Allowed use of v1 outcome information is restricted to the diagnosed implementation defect:
1. `activeRelations` removal did not alter the downstream admissible possibility set;
2. current exact-relation recurrence was redundant with current observation relations;
3. no downstream consumer existed in the prehistoric v1.1 neutral pipeline.

No v2 parameter may be selected because it gives a larger, earlier, more cooperative, more civilized, or otherwise favorable OASIS result.

## 2. Scope

Primary question:

> When a completed historical relational process becomes structurally relevant to the present, does allowing that process to re-enter current possibility construction change the later external world trajectory, compared with an otherwise identical OASIS in which only that historical re-entry is blocked?

Out of scope:
- OASIS superiority over other AI;
- faster civilization as a target;
- reward, utility, success score, target action, future stream;
- similarity-score retrieval;
- personality-specific preference;
- adding new primitive abilities.

## 3. Frozen world and primitive grammar

Keep unchanged across all v2 branches:
- prehistoric-clean-world-v1.1 physics;
- 6 neutral founders;
- the same 11 primitive abilities: observe, move, contact, grasp, carry, release, consume, transfer, strike, combine, rest;
- observation schema;
- world verifier;
- exogenous flow;
- life constraint;
- responsibility/resource policy;
- neutral Choice Axis policy;
- no reward/Q/target/future stream/civilization feedback.

No new primitive action is introduced by v2.

## 4. Conformance repair — separate from the experiment

The repaired baseline must be built and audited BEFORE confirmatory seeds are ever run.

### 4.1 Preserve realized relational-process provenance in causal history

`W` already incorporates only realized experience. v2 may add immutable provenance to each causally-live `historyRelations` occurrence so that the stored relation retains the process in which it was realized.

Allowed provenance fields only:
- `sourceExperienceId`;
- ordered `sourceSigmaActions` from the realized choice;
- source relation occurrence/order identifiers;
- source participant/entity identifiers needed to determine whether the same relational participants are present again.

Forbidden provenance:
- reward;
- success/failure score;
- civilization evidence;
- future result;
- hand-written importance weight;
- similarity score;
- preference label.

This is storage of already-realized process/order information, not a new prediction signal.

### 4.2 Gamma v2 recurrence predicate

A historical relation occurrence with `e=1` may re-enter the current only through one of two deterministic routes.

Route C — continuity:
- the same relation is already current.
- it may remain valid for semantic continuity, but is marked `continuityDuplicate=true`.
- continuity-only recurrence is NOT sufficient for confirmatory intervention eligibility because it can be informationally redundant.

Route R — nonduplicate relational recurrence:
- both endpoints/participants of the historical relation are currently observable/available in the present participation set;
- the exact historical relation is NOT already present as the same current relation;
- no generic similarity score is used;
- shared single endpoint alone is insufficient;
- relation-kind-only match alone is insufficient.

Interpretation: the same relational participants have returned to the same current reality while the old completed relation itself is no longer simply a duplicate of the present. The past relation can therefore be considered for current possibility composition without being asserted as a currently existing world fact.

### 4.3 Downstream consumption without preference

Gamma v2 output must have exactly one designated downstream role: it may provide historical PROCESS BRIDGES to Omega composition.

A historical process bridge is an ordered adjacent primitive-action pair that actually occurred in the realized source experience, e.g. `move>contact`, `grasp>carry`, `carry>transfer`, if such adjacency exists in the source `sigma`.

A historical process bridge may allow composition of current primitive steps only if:
1. both current primitive steps are independently generated from the unchanged current capability grammar;
2. all physical/token/entity prerequisites of the sequential composition remain valid;
3. the current candidate involves the same currently present relational participants required by the reactivated historical occurrence;
4. the ordered action pair exactly matches an adjacent pair stored in that realized source process;
5. no candidate receives a higher score, reward, probability, morality, or preference merely because it used history.

Gamma therefore changes only which structurally valid current compositions can exist. It does not rank them.

### 4.4 What v2 must NOT do

Forbidden repairs:
- inventing actions toward an absent historical participant;
- allowing physically impossible steps;
- increasing Psi for historical candidates;
- changing neutral Choice to prefer historical relations;
- assigning importance weights to memories;
- using Main/v1 outcomes to choose which action sequences to preserve;
- making contact/transfer/cooperation intrinsically preferred;
- adding civilization-specific rules.

## 5. Mandatory conformance audits before confirmatory execution

No confirmatory workflow may start unless every item below passes.

### Audit A — negative no-history equivalence
With empty history, repaired baseline must be trajectory-identical to the pre-repair canonical baseline for deterministic audit fixtures.

### Audit B — continuity redundancy audit
If Gamma recurrence is continuity-only and introduces no unique process bridge, Gamma ON/OFF must produce the same admissible possibility set. Such a state is explicitly NOT eligible for causal probing.

### Audit C — synthetic positive reachability
Use hand-constructed synthetic fixtures only, never confirmatory seeds. Construct one minimal state in which:
- a realized historical process is stored;
- the same historical participants are present again;
- the exact historical relation is not currently duplicated;
- a stored adjacent action pair is physically composable now.

Gamma ON must create at least one additional admissible possibility before Choice; Gamma OFF must remove exactly that historical-process-derived route. No world execution is performed in this audit.

### Audit D — synthetic negative controls
At least these states must yield no Gamma-derived candidate:
- only one historical endpoint is present;
- relation kind matches but historical participants do not;
- participants match but stored action order does not;
- action order matches but physical prerequisites fail;
- exact current relation duplicate with no unique historical process bridge.

### Audit E — no preference injection
For candidates shared between Gamma ON/OFF, Psi, responsibility, life admissibility and neutral Choice inputs must remain identical. The only allowed difference before Choice is presence/absence of candidates whose existence specifically depends on a valid historical process bridge.

### Audit F — branch-label leakage
Branch labels/intervention flags may not enter observation, capability instantiation, Psi, responsibility, life constraint, Choice, world, or observer.

## 6. Confirmatory seed family

Use a completely new deterministic namespace:
`oasis-gamma-causal-v2:000` ... `oasis-gamma-causal-v2:039`.

Rules:
- exactly 40 seed families;
- deterministic hash ordering fixed before any confirmatory run;
- do not reuse v1 seed selection;
- do not add seeds after results are seen;
- an ineligible seed remains in the denominator and is reported as `INTERVENTION_NOT_REACHED`;
- if fewer than 20/40 seeds reach valid decision-relevant recurrence, classify the confirmatory probe as low-reach/underpowered and do NOT add seeds within v2.

## 7. Intervention onset — decision relevance gate

The v1 gate is retired.

For each intact seed, search forward and stop at the FIRST present state satisfying all conditions below. The search may inspect only current state and pre-Choice computations; it may not execute or inspect future outcome under either condition.

G2-eligibility:
1. at least one Route R nonduplicate historical recurrence exists;
2. same-state Gamma ON and Gamma OFF dry-runs begin from identical world + causally-live actor state SHA;
3. primitive capability instantiation before historical process bridging is identical;
4. Gamma ON and OFF produce different Omega possibility sets;
5. at least one difference is explicitly traceable to a stored historical process bridge;
6. the difference survives physical verification and life constraint, so the admissible possibility sets differ BEFORE Choice;
7. no choice is sampled and no world action is executed during eligibility testing.

The first state satisfying 1-7 is the onset. Do not skip an eligible onset to search for a larger effect.

Maximum search horizon: 300 cycles.

## 8. Four branch fork

At the identical onset checkpoint:

### G0 — INTACT V2
Gamma recurrence and historical process bridges operate normally.

### G1 — GAMMA OFF
- history remains stored;
- W remains active;
- provenance remains stored;
- current observation/current relations remain unchanged;
- only Route R/C Gamma output is blocked from providing historical process bridges after onset;
- all other baseline code is unchanged.

Primary contrast G0 vs G1 = total causal effect of Gamma re-entry in the repaired pipeline.

### G2 — ORDER-SCRAMBLED HISTORY CONTROL
- same historical relation records;
- same participants/endpoints;
- same action multiset;
- same number of stored actions;
- source action order is deterministically permuted using a seed-independent record hash;
- no outcome information influences the permutation.

Purpose: distinguish true realized process ORDER from generic access to the same historical content.

### G3 — CANDIDATE-COUNT MATCHED SHAM
At onset, match the number and sigma-depth distribution of Gamma-derived admissible candidates in G0, but construct the sham additions only from currently physically valid primitive compositions that do NOT match any reactivated source process adjacency. Selection is deterministic by hash and does not use outcomes.

Purpose: distinguish historical-process recurrence from generic enlargement of the current choice set.

If a valid G3 match cannot be constructed without violating physical constraints, that seed is marked `SHAM_MATCH_NOT_AVAILABLE` for the G0-vs-G3 specificity contrast but remains valid for G0-vs-G1.

## 9. Blindness and execution

- branch identity is attached only after agent/world computation;
- observer and metric extraction remain branch-blind;
- each branch starts from identical checkpoint SHA;
- same world code and exogenous process are used;
- no branch outcome feeds another branch;
- no human inspection of individual confirmatory outcomes before all 40 artifacts are complete and the blind aggregate is generated.

## 10. Primary external outcomes

Do not use civilization success as the main discriminator because it was saturated in the previous environment.

Prespecified primary family:
1. first external transition divergence index;
2. event-sequence divergence at +10 and +30 cycles;
3. observable relation-graph symmetric difference at +10 and +30 cycles;
4. surviving structure genealogy/root-set difference at +30 cycles;
5. cross-agent artifact reuse difference at +30 cycles.

Long-horizon secondary external outcomes:
- +100 cycle versions where both branches remain under observation;
- participation breadth;
- structure count/survival;
- civilization evidence path and timing as descriptive endpoint only.

Internal mediator diagnostics are not primary proof:
- Gamma active occurrence count;
- historical process bridge count;
- extra admissible candidate count;
- chosen sigma depth;
- whether the realized possibility used a Gamma-derived bridge.

## 11. Fixed interpretation rules

### Gamma causal support
Supported within this environment only if:
- G0 vs G1 shows reproducible downstream external trajectory divergence after a valid decision-relevant intervention;
- and the observed pattern is not equally reproduced by both G2 order-scramble and G3 candidate-count sham.

### Order-specific support
If G2 moves toward G1 while G3 remains closer to G0, the realized historical process ORDER has evidence of specific contribution.

### Generic choice-set explanation
If G3 reproduces G0/G1 differences, the result is better explained by candidate-set enlargement than historical relational process recurrence.

### Generic history explanation
If G2 behaves like G0 despite scrambled order, ordered relational process is not supported as necessary.

### Bounded null
If G0 and G1 remain externally identical after valid decision-relevant eligibility, report a bounded null for Gamma v2 in this environment. Do not redesign within v2 after seeing the outcome.

### Decomposition-induced failure
If G1 collapses the whole current-only possibility system rather than only removing Gamma-derived routes, classify as implementation failure/decomposition-induced failure, not evidence for Gamma necessity.

## 12. Statistical plan

Paired by seed and checkpoint.

Report:
- eligible/reach rate;
- divergence incidence;
- first-divergence latency distribution;
- paired metric differences;
- median paired difference;
- bootstrap 95% CI;
- paired permutation test where meaningful;
- Holm correction within the prespecified primary metric family.

Direction is not preregistered. Faster/more/larger is not automatically better.

## 13. Version boundary

v1 remains immutable historical evidence.
v2 is a new implementation-conformance baseline and confirmatory causal probe.

Any material change to:
- Gamma recurrence rule;
- process-bridge rule;
- onset eligibility;
- branches/controls;
- seed family;
- primary metrics;
- observer;
requires v2.1+ and may not be silently folded into v2.0.

## 14. Current status at design lock

DESIGN ONLY.
No v2 confirmatory seed has been executed.
No v2 outcome has been inspected.
Implementation must be written against this lock, then pass Audits A-F, then a separate preregistration commit must freeze the exact code hashes before execution.
