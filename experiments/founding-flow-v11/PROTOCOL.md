# Founding Flow v11 — Concurrent Relation Canonicalization

## 목적

Founding Flow v11은 v10에서 확인된 C7 하나만 수정한다.

### C7 — Simultaneous Relation Serialization-Order Leakage

English: **Simultaneous Relation Serialization-Order Leakage**

한국어 설명: 동일 시점·동일 관계집합에서 관계 배열의 삽입/직렬화 순서만 달라졌는데 OASIS의 구조 정체성이 달라지는 구현 누출.

v11의 목적은 **실제로 순서가 명시되지 않은 동시 관계집합만 canonicalize**하고, 서로 다른 사건/경험의 시간순서는 그대로 보존하는 것이다.

## 선행 킬서치 결론

일반 graph representation은 저장 배열의 순서를 graph 의미로 보지 않으며, 동일 graph 표현에 대해 permutation invariance 또는 canonicalization을 사용한다.

반대로 ordered graph / temporal graph에서는 순서가 의미일 경우 그 order 자체를 별도 구조로 명시한다.

따라서 v11은 모든 history를 정렬하는 수정이 아니다.

> **무순서 동시집합의 serialization만 정규화하고, explicit temporal flow order는 정규화하지 않는다.**

이것은 신규성 주장이 아니라 implementation fidelity correction이다.

## 변경하지 않는 것

- `src/oasis-core.mjs` 수정 없음
- `src/oasis-integrated-core.mjs` 수정 없음
- `src/oasis-reference-core.mjs` 수정 없음
- v9 C6 role separation 유지
- v7 mutation polarity 유지
- v5 process-evidence reactivation 유지
- C1-C3/C5 guards 유지
- possibility generation 수정 없음
- choice / responsibility / contingent realization 규칙 수정 없음
- comparator 수정 없음
- v3 world, seeds, 12 rounds, exogenous flow 유지
- reward/score/winner/desired trajectory 없음

## v11 단일 수정

Validation subclass에서 structural relation representation을 정규화한다.

### A. Current simultaneous relation set

현재 deliberation에서 동시에 존재하는 `currentRelations`는 `roleAwareRelationKey + id + source provenance`의 deterministic canonical order로 정렬한다.

이 정렬은 **구조 표현을 안정화하기 위한 것**이지 행동 선호순서가 아니다.

### B. Reactivated completed experience

재활성화된 경험의 **경험 sequence 자체는 그대로 유지**한다.

한 completed experience 내부에서는:

1. current-state / derived-observation context — canonical set
2. choice-relation — 기존 choice process order 보존
3. outcome-mutation — 같은 actual outcome event의 mutation set만 canonicalize

한다.

따라서 경험 A→경험 B의 시간계보를 전역 sort하지 않는다.

### C. Stored processRelations

actualization 후 completed experience에 저장되는 relation도 같은 규칙으로 canonicalize한다.

내용을 추가/삭제하지 않고 배열 표현만 정규화한다.

## Targeted audits

### 1. Same-frame permutation twin

`[rA,rB]`와 `[rB,rA]`:

- semantic relation set 동일
- proposal 동일
- relationSignature 동일
- structureKey 동일

이어야 한다.

### 2. Historical within-experience permutation twin

같은 completed experience 안에서 동시 current-state/outcome relation 배열 순서만 뒤집었을 때:

- reactivation lineage 동일
- relationSignature 동일
- structureKey 동일

이어야 한다.

### 3. Temporal-order positive control

서로 다른 경험/flow의:

`A → B`

과

`B → A`

는 서로 다른 history로 유지되어야 한다.

### 4. Directionality positive control

`A→B`와 `B→A` 관계 방향은 계속 구분되어야 한다.

### 5. C1-C6 regression guards

- founder-only reactivation 금지
- co-presence-only reactivation 금지
- far spatial overconnection 금지
- common-actor-only support 금지
- upsert/remove polarity 보존
- current-state/outcome-mutation role separation 보존
- 실제 remove 소실 금지

하나라도 FAIL이면 full flow 실행 중단.

## Full-flow

Targeted audit 통과 후 기존 진단 world에서 동일하게:

- seeds 101, 211, 307, 401, 503
- 7 archetypes
- 12 decisions

을 실행한다.

특정 행동·tie·다양성은 성공값이 아니다.

## OASIS 4축 감사

1. 성공값 감사 — 특정 행동이나 OASIS 결과를 목표로 하지 않는다.
2. 평가기준 감사 — 성능점수/승패 없음.
3. 흐름 감사 — 서로 다른 frame/experience sequence는 그대로 유지한다.
4. 구현 감사 — 동시 relation representation canonicalization 이외의 OASIS/비교군 원리를 변경하지 않는다.

## 증거 경계

v11은 C7 implementation correction 검증이다.

OASIS 우월성·고유성·문화·세대 진화 증거가 아니다.
