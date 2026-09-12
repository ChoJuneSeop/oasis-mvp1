# G3.2 Pre-registration — Participation / Reconstruction / Provenance in Continuous CARLA Flow

Date: 2026-09-12
Status: SCIENTIFIC CRITERIA FROZEN; EXECUTION BLOCKED UNTIL DOMAIN POLICY BUNDLE IS SOURCE-FROZEN
Protocol: OASIS-CARLA Paper Validation Protocol v2.2
Harness: OASIS-CARLA Paper Validation Harness v1.1

## 1. Purpose / 목적

G3.2 does **not** test whether OASIS drives better than another controller, proves autonomous-driving safety, or proves Full-OASIS.

G3.2 tests whether, inside one continuous reality flow:

1. completed past relation elements participate again only when they can re-relate to the present;
2. participation is observable as multiple traces/effects rather than a selected/rejected memory label;
3. an individual relation may have zero direct distribution effect while a relation set has a non-zero joint effect;
4. Participation and Reconstruction remain independent observables;
5. a realized result is incorporated into history only after post-realization observation and relation-process Closure;
6. the newly completed relation may later re-participate in a changed present flow;
7. age/order of a past relation is not itself a relevance command.

## 2. Necessity kill-search / 필요성 킬서치

Prior work was found for long-term agent memory, provenance/genealogy, counterfactual attribution(반사실 기여도), and CARLA-based decision evaluation separately.

Within the searched scope, we did not identify a prior experiment that jointly measures, in one continuous CARLA flow, relation-element-level present participation, individual and joint counterfactual effects, relational reconstruction, single real realization, Closure-gated historical incorporation, and later re-participation.

Therefore the experiment remains necessary as a mechanism-level validation. This is **not** a claim of universal or world-first novelty.

## 3. Fixed scientific scope / 고정 연구범위

- CARLA map: `Town10HD_Opt`
- simulator fixed delta: `0.05 s`
- host-only deterministic flow seeds: `9701, 9702, 9703, 9704, 9705, 9706`
- each seed is one independent continuous reality flow;
- no reset inside a flow;
- historical relation memory starts empty in every flow;
- no researcher-preselected suitable/unsuitable past experiences;
- all historical relation elements must arise from actually realized and closed relations within that flow;
- planned horizon: `30,000 simulator ticks per flow`;
- the 30,000-tick horizon is an experimental observation horizon, **not** an OASIS semantic threshold or Closure rule;
- if a flow cannot reach the frozen horizon for infrastructure reasons, it is reported as incomplete and is not silently replaced by a shorter successful run;
- no extension of a failed/negative run after inspecting results unless a new experiment version is declared.

## 4. Core blindness / Core 비가시성

The Core must not receive:

- future state or future trajectory;
- scenario label;
- trigger identity;
- seed;
- raw CARLA actor ID;
- full map topology;
- post-outcome information before choice.

The Core receives only the approved present-observation schema through the canonical Harness v1.1.

## 5. Observation policy / 관측정책

At each Decision Epoch(의사결정 시점), the actual real flow is held unchanged while sidecar probes are computed.

For every historical relation element visible to the current Core history:

- full current possibility distribution is recorded;
- relation-element ablated distribution is recorded;
- `distribution_effect` is recorded as a local counterfactual observation, not a permanent importance score;
- dynamic `role_trace` is recorded;
- generated possibility contribution is recorded.

For every multi-source Reconstruction(다중 출처 재구성):

- the exact source set must have a matching joint/group ablation probe;
- Reconstruction remains the 3-axis observation `(recombination, role transformation, structural transformation)`;
- no aggregate reconstruction score or universal high/low threshold is allowed.

After all probes, the real flow must still have the same fingerprint. Exactly one real actuation may then be applied.

## 6. Participation interpretation / 참여 해석

No universal numerical thresholds such as `weak < x` or `strong > y` are pre-registered.

`distribution_effect = 0` does **not** mean non-participation if structural role/generation/provenance traces exist.

Participation labels, if used in figures, are evaluator descriptions only and must not feed back into Core behavior.

Elapsed age `tau - completed_at_tau` may be reported descriptively after the decision, but must never enter the relation-participation operator.

## 7. Participation and Reconstruction independence / 참여와 재구성의 독립성

Independence means architectural non-collapse, not statistical decorrelation.

The experiment does not require low correlation between Participation and Reconstruction. It requires that neither is directly computed as a fixed function/threshold of the other and that both retain separate provenance and operator traces.

## 8. Completed Experience / 완결경험

A new historical experience can be admitted only after:

`selection -> one real realization -> post-realization observation -> relation-process Closure`.

A no-change, persistence, failure, or unexpected result can be a Completed Experience if it was actually realized, observed, and the relevant relation process closed.

Unrealized possibilities are not stored as parallel historical experiences.

Historical semantic context must not preserve raw actor IDs, absolute coordinates, raw present geometry, recency scores, permanent memory weights, or importance scores as reusable relation meaning.

## 9. Pre-registered invalidation conditions / 사전등록 무효조건

A run is protocol-invalid if any of the following occurs:

- future/hindsight information reaches the decision Core;
- a counterfactual probe changes/advances the real flow;
- more than one actual realization occurs in one Decision Epoch;
- a multi-source reconstruction lacks its matching joint probe;
- a post-decision relation is written into decision provenance;
- an unrealized possibility is admitted as historical experience;
- a relation enters history before evidenced Closure;
- source hashes do not match the frozen run manifest;
- policy/threshold/weight is retuned after seeing the result without declaring a new version.

Protocol-invalid runs are not counted as support or falsification of OASIS.

## 10. Pre-registered theory-negative outcomes / 사전등록 이론상 부정적 결과

The following are preserved as negative evidence and are not tuned away:

- no old relation ever re-participates despite re-formed present relational conditions;
- past relations participate when no present relation anchor exists;
- age/order swaps change decision distributions under otherwise identical semantic relations;
- no relation-element or joint participation effects are observed across all completed flows;
- no relational reconstruction occurs across all completed flows;
- realized/closed relations are admitted but never re-participate under later matching current relations;
- observed behavior can be explained entirely by present-only candidate structure with no measurable historical relation contribution.

Absence of a joint-only effect or reconstruction in this bounded environment is reported as `not supported in tested conditions`, not as a universal impossibility claim.

## 11. Metrics and reporting / 지표와 보고

Primary outputs are trajectory/process traces, not one scalar score:

- count and provenance of Completed Experiences;
- current relation anchors per Decision Epoch;
- participation role traces per relation element;
- individual distribution effects;
- joint/group distribution effects;
- reconstruction 3-axis traces and source sets;
- U/I/V/T responsibility vectors;
- selected possibility and exactly one applied actuation;
- Closure evidence;
- later re-participation genealogy;
- descriptive elapsed age of re-participating relations.

Driving metrics may be reported as context but are not the PASS criterion for G3.2.

## 12. No-confirmation-bias rule / 확증편향 방지

- no post-hoc threshold creation;
- no deletion of negative flows;
- no replacement of failed seeds;
- no relabeling `distribution_effect=0` as non-participation when structural traces exist;
- no promotion of synthetic dry-runs to CARLA evidence;
- no promotion of legacy v1.0 results to G3.2 evidence;
- no claim beyond this mechanism-level scope.

## 13. Execution gate / 실행 게이트

`REAL_CARLA_G32_EXECUTION = BLOCKED`

The only remaining scientific-code gate before execution is a source-frozen CARLA domain policy bundle covering:

- current feasible candidate generation;
- reconstruction operator;
- U/I/V/T responsibility operator;
- choice operator;
- candidate-to-VehicleControl actuation mapping;
- relation-process Closure evaluator.

These must be frozen before the first real G3.2 CARLA result is observed.
