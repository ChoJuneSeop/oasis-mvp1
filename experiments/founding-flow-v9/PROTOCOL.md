# Founding Flow v9 — Relation State–Mutation Role Separation

## 목적

Founding Flow v9는 v8에서 확인된 C6 하나만 수정한다.

### C6 — Relation State–Mutation Conflation

English: **Relation State–Mutation Conflation**

한국어 설명: choice 직전 현재에 지속되고 있던 관계 상태와, actualized outcome에서 이번에 실제로 발생한 관계 형성/해제 사건을 같은 mutation relation으로 기록하여 completed process history에서 상태 유지와 변화 사건이 섞이는 문제.

## 선행 킬서치 결론

Event sourcing / temporal data management에서는 일반적으로:

- immutable event/change history
- materialized current state

를 구분한다. Current state는 event history를 적용한 projection이고, event는 “무엇이 바뀌었는가”를 나타낸다.

따라서 OASIS에서도:

`현재 contacted 관계가 존재함`

과

`이번 outcome에서 contacted 관계가 생성됨/삭제됨`

을 구분하는 것은 신규성 주장이 아니라 구현 정보보존의 문제다.

## 변경하지 않는 것

- OASIS reference core 파일 수정 없음
- v7 mutation polarity preservation 유지
- v5 process-evidence reactivation 유지
- C1-C3/C5 guards 유지
- possibility generation 수정 없음
- choice / dominance / responsibility 수정 없음
- comparator 수정 없음
- v3 world, seeds, rounds, exogenous flow 유지
- score/reward/winner/desired trajectory 없음

## v9 단일 변경

Completed experience의 relation에는 `processRole`을 명시한다.

### 1. current-state

Choice 직전 current field에 실제 존재하는 persistent relation.

- 관계가 현재 존재한다는 맥락
- 원래 relation object의 과거 `op`와 sourceEventId는 provenance로 보존 가능
- 그러나 이번 experience의 mutation으로 해석하지 않는다

Structural identity:

`state:<from>-><to>:<kind>:<context>`

### 2. outcome-mutation

Actualized outcome event가 실제로 assert/remove한 relation.

Structural identity:

`<op>:<from>-><to>:<kind>:<context>`

### 3. derived-observation

Geometry에서 도출된 `adjacent-to`처럼 mutation event가 아닌 관측관계.

Structural identity:

`observe:<from>-><to>:<kind>:<context>`

### 4. choice-relation

Choice step 자체에 relation template가 명시돼 있는 경우.

Structural identity:

`choice:<from>-><to>:<kind>:<context>`

현재 primitive world에서는 거의 사용되지 않지만 자료형 경계를 명확히 한다.

## Dedup 규칙

동일 relation id/from/to/kind여도:

- `current-state`
- `outcome-mutation:remove`

는 서로 다른 process record이므로 둘 다 보존한다.

즉 removal collision에서 state context와 actual remove event를 하나로 합치지 않는다.

## 절대 하지 않는 것

- current-state를 history에서 삭제하지 않는다.
- historical remove를 현재 negative edge로 주입하지 않는다.
- past outcome을 미래 outcome prediction으로 복사하지 않는다.
- role에 점수/가중치를 부여하지 않는다.
- outcome-mutation을 자동 선호근거로 만들지 않는다.

## 사전 Targeted Audits

### A. Persistent-state-only

formation event 이후 relation이 지속되고 later outcome에 relation mutation이 없을 때:
- completed experience relation은 `current-state`
- `outcome-mutation`은 없어야 한다.

### B. Removal collision

current-state relation이 존재하고 later outcome이 same relation을 remove할 때:
- `current-state` record 유지
- `outcome-mutation remove` record 유지
- 둘 다 processRelations에 존재
- live world relation은 삭제됨

### C. Structural role identity

같은 relation이라도:
- state
- upsert mutation
- remove mutation
- derived observation

의 structural key/token이 구분되어야 한다.

### D. C1-C3/C5 regression

- founder-only reactivation 금지
- co-presence-only reactivation 금지
- far located-relative-to bridge 금지

하나라도 FAIL이면 full-flow 실행 중단.

## Full-flow

Targeted audit 통과 후 v3 world에서 기존과 동일하게:
- 5 seeds
- 7 archetypes
- 12 decisions

실행한다.

사후 확인:
- relation이 실제 지속되는 experience는 current-state로 기록되는가
- 실제 create/remove outcome은 outcome-mutation으로 별도 기록되는가
- remove가 state와 충돌해 사라지지 않는가
- 기존 selective reactivation이 회귀하지 않는가

Tie/행동 다양성은 성공값이 아니다.

## 증거 경계

v9는 completed relational process representation의 구현 충실도 검증이다. OASIS 우월성·문화·세대 진화 증거가 아니다.
