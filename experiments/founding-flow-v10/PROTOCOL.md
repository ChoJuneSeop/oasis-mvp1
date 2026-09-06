# Founding Flow v10 — Simultaneous Relation Serialization-Order Audit

## 성격

v10은 OASIS를 수정하지 않는다.

Pre-Main Overall Implementation Audit에서 발견된 C7 후보의 필요성만 검증하는 read-only mechanism audit다.

### C7 후보 — Simultaneous Relation Serialization-Order Leakage

English: **Simultaneous Relation Serialization-Order Leakage**

한국어 설명: 동일한 시점, 동일한 출처, 동일한 관계 집합인데 단지 배열에 들어간 순서만 다를 때 OASIS의 구조 정체성이 달라지는 구현 누출. 명시된 시간적 순서가 아니라 직렬화·삽입순서가 숨은 의미조건이 되는 문제다.

## 선행 킬서치 결론

일반적인 graph representation에서는 노드/엣지의 단순 저장 순서는 의미로 간주하지 않으며, 동일 graph의 표현은 permutation-invariant 또는 canonical representation으로 다루는 것이 기본적이다.

반대로 순서가 실제 의미를 가질 때는 temporal sequence, edge order, event sequence 등을 명시적으로 표현해야 한다.

따라서 이번 감사는 다음 둘을 엄격히 구분한다.

1. 같은 frame 안의 동시 relation 배열 순서 — 의미가 명시되지 않았다면 구조 의미가 달라지면 안 됨.
2. 서로 다른 frame/event의 시간 순서 — 실제 flow history이므로 반드시 보존해야 함.

이것은 OASIS 신규성 주장이 아니라 구현 충실도 문제다.

## 변경하지 않는 것

- `OASISRelationRoleCore` v9를 읽기 전용으로 사용한다.
- relation signature 구현을 수정하지 않는다.
- possibility generation을 수정하지 않는다.
- choice / responsibility / reactivation을 수정하지 않는다.
- comparator를 사용하지 않는다.
- reward, score, winner, desired trajectory 없음.

## Audit A — Same-frame permutation twin

Twin A와 B에 동일한 것을 준다.

- same event id
- same event time
- same participants
- same entities
- same two directed relations
- same primitive affordance
- same realization seed

오직 relation array serialization만 다르게 한다.

A: `[rA, rB]`

B: `[rB, rA]`

관찰:

- normalized semantic relation set
- relationSignature
- proposal/choice id
- `structuralExpansion.structureKey`

가능한 결론은 둘 다 허용한다.

### C7 반증

relation set이 같고 structureKey도 같다.

→ serialization order leakage 없음. 수정하지 않는다.

### C7 확인

relation set은 같지만 structureKey가 다르다.

→ 단순 배열순서가 structural identity에 들어간다. 다음 버전에서 canonicalization 범위를 설계해야 한다.

## Audit B — Temporal-order positive control

두 history를 만든다.

History 1:
`Frame A → Frame B`

History 2:
`Frame B → Frame A`

각 frame은 서로 다른 sequence와 event id를 가진다.

필수:
- exported flow sequence가 서로 달라야 한다.
- chronological event order가 보존되어야 한다.

이 positive control은 향후 C7 수정이 실제 역사순서까지 지워버리는 것을 막기 위한 기준이다.

## Audit C — Directionality positive control

동일 시점이라도:

`A → B`

과

`B → A`

는 서로 다른 관계이므로 structural identity가 달라야 한다.

## OASIS 4축 감사

1. 성공값 감사 — C7 확인/반증 어느 쪽도 허용한다.
2. 평가기준 감사 — 성능점수·우열 없음.
3. 흐름 감사 — temporal positive control에서 실제 frame sequence를 보존한다.
4. 구현 감사 — v10은 v9 core를 수정하지 않는다.

## 증거 경계

v10은 구현 필요성 감사다.

OASIS 우월성·고유성·문화·세대 진화와 무관하다.

C7이 확인되더라도 곧바로 모든 relationSignature를 전역 sort하지 않는다. 실제 시간순서를 지울 위험이 있기 때문이다. 별도 수정 버전은 **동시 relation set만 canonicalize하고 explicit temporal flow order는 보존**해야 한다.
