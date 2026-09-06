# Founding Flow v8 — Relation State–Mutation Separation Audit

## 성격

v8은 OASIS를 수정하지 않는다.

v7 사후감사에서 발견된 C6 후보의 필요성만 검증하는 read-only mechanism audit다.

### C6 후보 — Relation State–Mutation Conflation

English: **Relation State–Mutation Conflation**

한국어 설명: 과거에 형성되어 현재까지 지속 중인 관계 상태와, 이번 경험에서 그 관계가 새로 형성되거나 해제된 변화 사건을 같은 mutation 관계로 기록하여 역사적 과정에서 상태 유지와 변화 사건을 구분하지 못하는 문제.

## 선행 킬서치 결론

Dynamic graph와 event-sourcing 분야는 일반적으로 다음을 구분한다.

- event/change log: 무엇이 언제 바뀌었는가
- materialized/current state: 그 변화들을 적용한 뒤 현재 무엇이 존재하는가

Event sourcing에서는 각 state change를 immutable event로 기록하고, current state는 event stream을 replay/fold한 projection으로 본다.

따라서 OASIS의 completed relational process에서도:

`관계가 현재 존재한다`

과

`이번 outcome에서 관계가 새로 형성됐다`

를 같은 historical mutation event로 취급한다면 정보손실 가능성이 있다.

이것은 OASIS 신규성 주장이 아니라 구현 충실도 문제다.

## 변경하지 않는 것

- v7 `OASISMutationPolarityCore`를 읽기 전용으로 사용한다.
- relation signature 수정 없음.
- reactivation/possibility/choice/responsibility 수정 없음.
- comparator 없음.
- 성능점수 없음.

## Audit A — Persistent-state-only case

역사:
1. `contacted` relation이 `upsert` event로 형성된다.
2. 다음 current flow에서 그 relation은 여전히 존재한다.
3. 이번 choice는 단순 `idle` 또는 이동이다.
4. 이번 outcome에는 relation mutation이 전혀 없다.

검사:
- closed experience의 `processRelations`에 `contacted, op=upsert`가 들어가는가?
- 들어간다면 그 relation의 `sourceEventId`는 이번 outcome이 아니라 과거 형성 event인가?

그렇다면 current state relation이 new mutation처럼 historical process에 재사용되는 현상이 확인된다.

## Audit B — Removal collision case

역사:
1. `contacted, upsert` relation이 이미 current state에 존재한다.
2. 현재 choice 이후 actual outcome이 동일 relation id/from/to/kind를 `remove`한다.

검사:
- closed experience processRelations에 outcome `remove`가 남는가?
- 아니면 current-state `upsert`가 먼저 들어가 동일 occurrence로 dedup되어 `remove`가 소실되는가?

## 판정

두 결과 모두 사전 허용한다.

### C6 반증
현재-state와 mutation이 이미 구분되고 remove collision도 보존된다.
→ 수정하지 않는다.

### C6 확인
persistent-state-only experience가 과거 upsert를 이번 mutation처럼 보존하거나, 실제 remove가 current-state upsert와 충돌해 소실된다.
→ 다음 버전에서 **state context와 outcome mutation event의 자료형/role 분리**가 필요하다.

## 4축 감사

1. 성공값 감사 — C6 확인/반증 어느 쪽도 선호하지 않는다.
2. 평가기준 감사 — 성능평가 없음.
3. 흐름 감사 — 사건 순서를 실제로 유지한다: formation → persistent state → later outcome.
4. 구현 감사 — v8은 v7 core를 수정하지 않는다.

## 증거 경계

v8은 구현 필요성 감사이며 OASIS 우월성·문화·세대 진화와 무관하다.
