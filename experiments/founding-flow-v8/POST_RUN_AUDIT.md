# Founding Flow v8 — Post-Run Audit

## 실행 provenance

- Valid CI run: `34001574155`
- Job: `101401263325`
- Head: `be06fafc5fe90ddfa7f2e55bde819c704c9b5b50`
- Artifact: `9979640870`
- Artifact digest: `sha256:a59c62064db4f0b26323b11d2da1cdc2ceead5812552200c12c106d2e747aafb`

## 성격

v8은 v7 core를 수정하지 않은 read-only necessity audit다.

C6 후보:

### Relation State–Mutation Conflation

English: **Relation State–Mutation Conflation**

한국어 설명: 이미 형성되어 현재까지 지속 중인 관계 상태와, 이번 경험에서 실제로 발생한 관계 형성/해제 사건을 같은 mutation relation으로 기록하여 역사적 과정에서 상태 유지와 변화 사건을 구분하지 못하는 문제.

## 4축 감사

모두 PASS.

- 성공값 감사: C6 확인/반증 어느 쪽도 허용
- 평가기준 감사: 성능/랭킹/tie 기준 없음
- 흐름 감사: formation → persistent state → later outcome 순서 보존
- 구현 감사: v7 core read-only

## Audit A — Persistent-state-only

역사:
1. `contacted` relation이 `formation-event`에서 upsert됨
2. 이후 relation은 current state에 지속
3. later choice = `idle`
4. later outcome relation mutation = 없음

실제 결과:

- outcomeRelations = `[]`
- processRelations에는:
  - id = `contact:founder:other-O`
  - kind = `contacted`
  - op = `upsert`
  - sourceEventId = `formation-event`

가 들어갔다.

즉 이번 experience에서 relation mutation이 발생하지 않았는데도, 과거 formation event의 `upsert` 객체가 current state relation으로 존재했다는 이유로 processRelations에 다시 mutation처럼 기록됐다.

**C6 첫 번째 메커니즘 확인.**

## Audit B — Removal collision

역사:
1. current state에 `contacted, upsert`가 존재
2. later outcome에서 동일 relation을 실제 `remove`

Raw outcome:

- `contacted`, `op=remove`
- sourceEventId = `later-outcome-remove`

Live world:

- relation은 정상적으로 삭제됨

그러나 completed experience의 processRelations:

- `contacted`, `op=upsert`
- sourceEventId = `formation-event`

만 남았다.

- processPreservesRemove = `false`
- processRetainsPriorUpsert = `true`

즉 current-state upsert와 outcome-remove가 동일 relation occurrence로 충돌하면서 **실제 remove mutation이 process history에서 소실됐다.**

**C6 두 번째 메커니즘 확인.**

## 최종 판정

**C6 CONFIRMED.**

현재 구현은 materialized relation state와 actual relation mutation event를 completed process representation에서 충분히 구분하지 못한다.

이 문제는 v7의 mutation polarity signature만으로 해결되지 않는다. polarity를 구조키에 넣어도, 먼저 processRelations가 어떤 relation을 “이번 변화 사건”으로 기록하는지 자체가 오염될 수 있기 때문이다.

## 다음 수정의 원칙

다음 버전은 relation을 최소한 다음 역할로 분리해야 한다.

1. `current-state` — choice 직전 현재에 존재하던 관계 상태
2. `outcome-mutation` — actualized outcome에서 실제 발생한 upsert/remove
3. `choice-relation` — choice step 자체에 명시된 관계 정보가 있다면 그 역할
4. `derived-observation` — adjacency 같은 도출 관측관계

중요:
- current-state relation이 과거 sourceEvent의 `op=upsert`를 갖고 있어도 이번 outcome mutation으로 해석하지 않는다.
- outcome remove는 current-state upsert와 dedup되어 사라지면 안 된다.
- historical replay 시 `remove`는 과거 mutation evidence이지 현재의 negative edge로 주입하지 않는다.

## 증거 경계

v8은 구현결함 확인용 감사다. OASIS 우월성·고유성·문화·세대 진화와 무관하다.
