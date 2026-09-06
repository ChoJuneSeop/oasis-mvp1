# Founding Flow v7 — Post-Run Audit

## 실행 provenance

- Valid CI run: `34001450787`
- Job: `101400937721`
- Head: `998b0b47aa77940aec28fd4ed6bdcdbce32c3f32`
- Artifact: `9979600884`
- Artifact digest: `sha256:38c00ddd88c4bef5e794df43634e112cbf3add65ff056e2dffdfde9cdbaa001c`
- Seeds: 101, 211, 307, 401, 503
- 12 decisions per seed / 7 archetypes

## 사전 감사

모두 PASS:

- Unified contamination boundary
- 성공값 감사
- 평가기준 감사
- 흐름 감사
- 구현 감사
- upsert/remove polarity twin
- relation-kind positive control
- observation-vs-mutation token control
- C5 co-presence regression guard
- far spatial regression guard

## C4-N 교정 결과

v6에서는 동일 relation id/from/to/kind의:

- `upsert`
- `remove`

가 모두

`founder->other-O:contacted:`

로 접혔다.

v7에서는:

- `upsert:founder->other-O:contacted:`
- `remove:founder->other-O:contacted:`

로 structural signature가 갈라졌다.

그 결과 `structuralExpansion.structureKey`도 서로 달라졌다.

Relation kind positive control `contacted` vs `signaled` 역시 계속 구분됐다.

따라서:

### C4-N — Relation Mutation Polarity Collapse

은 **targeted implementation level에서 FIX CONFIRMED**다.

중요: choice/tie 차이는 요구하지 않았고 실제로도 성공판정에 사용하지 않았다.

## Full-flow regression

v3 world, 동일 seeds, 동일 12 rounds에서 full flow가 정상 실행됐다.

- OASIS completed experiences: 모든 seed 12개
- `experience:0` co-presence-only regression 없음
- far `located-relative-to` bridge regression 없음
- non-OASIS comparator 원리 변경 없음

Tie counts는 성능평가에 사용하지 않는다.

## 실제 full-flow에서 관찰된 remove event

예: seed 211 `experience:8`

- `holds:founder:resource-C`, `op=remove`
- `holds:founder:resource-A`, `op=upsert`

가 실제 process relation에 존재했다.

다만 그 `experience:8`은 이후 동일 target current flow에서 재활성화되지 않았으므로, full-flow 자체는 polarity twin과 같은 직접 대조를 제공하지 않았다. 따라서 v7 polarity fix의 직접 증거는 사전 twin audit이고 full flow는 regression/compatibility 확인으로만 취급한다.

## 새로 발견된 문제 — C6 후보

### Relation State–Mutation Conflation

English: **Relation State–Mutation Conflation**

한국어 설명: 과거에 한 번 형성되어 현재까지 지속 중인 관계 상태와, 이번 경험에서 관계가 새로 형성된 변화 사건을 동일한 `op=upsert` 관계로 기록해 역사적 과정에서 “상태 유지”와 “새 변화”를 구분하지 못할 가능성.

### 실제 trace 증거

Seed 401:

#### experience:1
- choice: `touch:other-O`
- outcome relation: `contacted`, `op=upsert`
- 실제 관계 형성 사건

#### experience:2
- choice: `step:-1:0`
- outcome relations: 없음
- 그러나 processRelations에 다시:
  - `contacted`, `op=upsert`

가 들어갔다.

즉 experience:2에서 contact 관계는 새로 형성된 것이 아니라 **이미 존재하는 current relational state**였는데, relation object의 `op=upsert`가 그대로 유지되어 있다.

### 구현 원인 후보

`observe()`는 relation upsert를 `world.relations`에 materialized current state로 보존한다.

그 relation object는 원래 mutation event의 `op=upsert`와 `sourceEventId`를 유지한다.

후속 deliberation의 `currentRelations`는 이 materialized relation object를 다시 사용한다.

그리고 `actualize()`는:

- `d.field.currentRelations`
- choice step relations
- outcome event relations

을 `processRelations`로 합친다.

따라서 현재 상태로 지속되는 관계가 후속 completed experience 안에서 다시 `upsert` mutation처럼 보일 수 있다.

## 왜 바로 고치지 않는가

v7이 polarity를 추가한 직후 이 문제를 발견했으므로, 바로 `op` 의미를 다시 바꾸면 결과에 맞춘 후행 수정이 된다.

먼저 별도 필요성 감사에서:

1. 단순 persistent relation state만 존재하고 이번 outcome mutation이 없을 때 processRelations가 무엇을 기록하는지
2. 기존 relation이 실제로 remove되는 outcome에서 current-state upsert와 outcome-remove가 충돌할 때 어느 쪽이 보존되는지

를 twin/minimal case로 검증한다.

## v7 최종 상태

**Execution-valid / C4-N polarity fix-valid / C1-C3-C5 regression-free / new C6 candidate discovered / not paper superiority evidence.**

다음 단계는 C6 필요성 감사다.
