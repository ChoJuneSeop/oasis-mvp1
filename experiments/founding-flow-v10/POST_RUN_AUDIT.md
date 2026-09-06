# Founding Flow v10 — Post-Run Audit

## 실행 provenance

- Workflow run: `34003981662`
- Frozen head: `9efb271ddea82abf5d0395b188c8b09c88462a9e`
- Original artifact: `9980348561`
- Rerun artifact: `9980448890`

## 목적

v10은 v9 OASIS 구현을 수정하지 않은 read-only necessity audit다.

검증 대상:

### C7 — Simultaneous Relation Serialization-Order Leakage

English: **Simultaneous Relation Serialization-Order Leakage**

한국어 설명: 같은 시점·같은 출처·같은 의미의 관계 집합인데 단순 배열 삽입순서만 달라졌을 때 OASIS의 구조 정체성이 달라지는 구현 누출.

## 4축 감사

모두 PASS.

- 성공값 감사: C7 확인/반증 모두 허용
- 평가기준 감사: 성능·승패·랭킹 없음
- 흐름 감사: 실제 frame 시간순서는 positive control로 보존
- 구현 감사: v9 core read-only

## Audit A — Same-frame permutation twin

Twin A:

`[founder→A, founder→B]`

Twin B:

`[founder→B, founder→A]`

두 twin은 다음이 동일했다.

- event id
- time
- participants
- semantic relation set
- realization seed
- primitive affordance

결과:

- semanticSetEqual = `true`
- proposalEqual = `true`
- signatureArrayEqual = `false`
- structureKeyEqual = `false`

즉 행동선택은 같았지만, 단순 relation array 순서가 `field.relationSignature` 배열과 `structuralExpansion.structureKey`에 그대로 들어가 서로 다른 구조로 기록됐다.

**C7 CONFIRMED.**

## Audit B — Temporal-order positive control

`Frame A → Frame B`

과

`Frame B → Frame A`

는 exported flow history에서 서로 다르게 보존됐다.

따라서 문제는 시간적 순서를 보존하는 것 자체가 아니다.

문제는 **동일 frame 내부에서 명시적 순서 의미가 없는 relation set의 serialization order가 structural identity에 들어가는 것**이다.

## Audit C — Directionality positive control

`founder → A`

과

`A → founder`

는 서로 다른 relationSignature와 structureKey로 보존됐다.

따라서 향후 수정은 방향성을 제거하면 안 된다.

## 최종 판정

**C7 CONFIRMED / REPRODUCED.**

수정 범위는 매우 좁아야 한다.

- 동일 frame 내부의 simultaneous relation set만 canonical representation으로 만든다.
- directed relation orientation은 보존한다.
- relation kind/context/process role/mutation polarity는 보존한다.
- 서로 다른 frame/event의 chronological order는 절대 정렬·삭제하지 않는다.

전역 `sort()`로 모든 역사적 relation을 평탄화하면 안 된다.

## 증거 경계

v10은 구현결함 확인용 감사다.

OASIS 우월성·고유성·문화·세대 진화의 증거가 아니다.

Pre-Main Overall Implementation Audit는 C7 때문에 현재 **FAIL** 상태를 유지한다.
