# CARLA Domain Policy Bundle Contract — G3.2

Status: REQUIRED BEFORE REAL CARLA EXECUTION

This contract keeps the G3.2 relation-memory hypothesis separate from low-level driving-policy invention.

## Frozen components required

### 1. Current feasible candidate generator / 현재 실행가능 후보 생성기

- Input: approved present observation + current relations only.
- Output: currently feasible possibility candidates with explicit current-evidence provenance.
- Past experience may not create an action that has no current feasibility evidence.
- No scenario label, trigger, seed, future trajectory, raw actor ID, or full map topology.

### 2. Reconstruction operator / 재구성 연산자

- May recombine or transform participating relation elements.
- A newly reconstructed possibility must still carry current evidence.
- Must emit source relation-element provenance and separate recombination / role-transformation / structural-transformation traces.
- Must not compute a universal reconstruction class from fixed numerical thresholds.

### 3. Responsibility operator / 책임 연산자

- Must expose U/I/V/T separately: uncertainty(불확실성), impact(영향도), irreversibility(비가역성), time constraint(시간제약).
- Additional domain variables are permitted only with named current evidence.
- No permanent memory score or scalar responsibility total may become the sole decision gate.
- Formula/logic must be source-frozen before execution.

### 4. Choice operator / 선택 연산자

- Input may include current candidates, current possibility distribution, responsibility vectors, and current participation/reconstruction provenance.
- Exactly one current possibility is selected.
- No post-outcome or future information.
- Deterministic tie handling, if needed, must be documented as a reproducibility rule rather than semantic preference.
- The operator is frozen before results and is not retuned to rescue a negative run.

### 5. Actuation mapping / 현실 제어 매핑

- Maps the selected current possibility and approved present observation to one `VehicleControl`-equivalent actuation.
- The mapping must not directly read historical memory. This separates historical relation effects on possibility/choice from low-level control implementation.
- Exactly one real actuation per Decision Epoch.
- Mapping source hash is frozen before the run.

### 6. Closure evaluator / 관계과정 완결 평가기

- Operates on realized post-action relational observations.
- Closure is a relation-process judgment, not one universal time/distance/frame threshold.
- It may emit evaluator-certified symbolic `closed_relations` for historical admission.
- Raw coordinates, actor IDs, present numeric geometry, recency/importance scores are not reusable historical semantics.

## Source-freeze requirement

The runnable policy bundle must have a manifest containing:

- source file paths;
- SHA-256 for every component;
- parent Core/Harness/G3.2 sidecar hashes;
- CARLA version/map/runtime configuration;
- host-only seeds;
- observation schema hash;
- explicit `NO_POST_RESULT_RETUNING=true` declaration.

## Admission tests

Before real execution the bundle must pass:

- future-information denial;
- raw actor/map denial;
- no-recency-access test;
- current-evidence requirement for every candidate;
- relation-element provenance coverage;
- individual + joint probe purity;
- U/I/V/T non-collapse test;
- exactly-one-realization test;
- Closure-before-history test;
- candidate-to-actuation history-isolation test;
- source-hash verification.

Until a concrete bundle passes these tests:

`REAL_CARLA_G32_EXECUTION = BLOCKED`.
