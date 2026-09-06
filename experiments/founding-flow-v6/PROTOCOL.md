# Founding Flow v6 — Outcome Polarity Preservation Audit

## 성격

v6는 OASIS를 수정하는 실험이 아니다.

v5 이후 남아 있다고 의심한 C4의 **필요성 자체를 반증하기 위한 구현 감사**다.

English: **Outcome Polarity Preservation Audit**
한국어 설명: 완결경험의 실제 결과가 현재에 재참여할 때, 관계가 생겼다는 결과와 관계가 해제됐다는 결과처럼 방향이 반대인 역사적 결과가 OASIS 내부 구조에서 서로 다르게 보존되는지 검사하는 감사.

## 왜 먼저 감사하는가

코드 재검토에서 다음이 확인됐다.

- `actualize()`는 outcome event relation을 `processRelations`와 `outcome.relations`에 저장한다.
- reactivation field는 `processRelations`를 `historicalRelations`로 다시 가져온다.

따라서 “과거 outcome이 완전히 사라진다”는 넓은 C4 주장은 이미 의심스럽다.

코드를 고치기 전에 다음을 분리해야 한다.

1. outcome relation 자체가 raw historical evidence로 살아 있는가?
2. 그 outcome의 **변화 방향(op)**까지 structural representation이 구분하는가?

## 선행 킬서치 결론

2026년 episodic-memory 연구와 제품은 이미 action과 outcome을 하나의 episode로 묶는 방식을 사용한다. 인간 episodic-memory 연구도 action-outcome binding을 보고한다.

따라서 “행동과 결과를 함께 기억한다”는 것은 OASIS의 신규성 근거가 아니다.

본 감사가 필요한 이유는 OASIS 내부 정의 때문이다.

OASIS는 선택의 actualized result가 다음 현실을 재작성한다고 본다. 그렇다면 과거 관계의 **형성**과 **해제**가 나중에 같은 역사적 결과로 붕괴한다면 관계 재작성 계보를 보존했다고 할 수 없다.

## 실험 변경 없음

- OASISProcessEvidenceCore(v5)를 그대로 사용한다.
- reference core 파일을 수정하지 않는다.
- comparator는 사용하지 않는다.
- world 성능이나 행동결과를 측정하지 않는다.

## Twin audit

두 OASIS 상태를 만든다.

공통조건:
- same actor: founder
- same target: other-O
- same historical choice: `touch:other-O`
- same relation id/from/to/kind: `contact:founder:other-O`, founder → other-O, `contacted`
- same current flow: other-O가 다시 current delta에 등장
- same current primitive affordance

오직 과거 observed outcome relation의 op만 다르다.

A: `op=upsert` — 관계 형성
B: `op=remove` — 관계 해제

## 관찰

다음을 비교한다.

- raw `historicalRelations[].op`
- `field.relationSignature`
- `structuralExpansion.structureKey`
- reactivated experience id
- possibility support에 포함된 historical relation의 op
- final choice / tie 여부

## Positive control

관계 kind 자체를 `contacted`와 `signaled`로 다르게 한 twin도 만든다.

현재 구현이 relation kind 차이는 구분할 수 있는지 확인한다.

## 판정

이 감사에는 OASIS 우월성 성공값이 없다.

가능한 두 결론 모두 허용한다.

### 결과 A
upsert/remove가 structural representation에서도 다르게 유지됨.

→ C4의 relation-polarity 결손 가설은 반증. 수정하지 않는다.

### 결과 B
raw object에는 op가 남지만 relationSignature/structureKey가 동일함.

→ outcome 자체는 저장되지만 **관계변화 방향이 structural key에서 붕괴**하는 더 좁은 구현문제로 C4를 재정의한다.

그 경우에도 v6에서 코드를 고치지 않는다. 별도 버전이 필요하다.

## OASIS 4축 감사

1. 성공값 감사 — A/B 어느 결과도 선호하지 않는다.
2. 평가기준 감사 — 성능점수 없음.
3. 흐름 감사 — 두 twin의 current flow는 동일하며 historical outcome op만 다르다.
4. 구현 감사 — v5 core를 읽기 전용으로 사용하고 v6에서 선택규칙을 수정하지 않는다.

## 증거 경계

v6는 논문 우월성 증거가 아니다.

오직 C4가 실제 결함인지, 결함이라면 정확히 어느 representation layer에 있는지 판별한다.
