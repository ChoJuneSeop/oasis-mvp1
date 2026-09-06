# Founding Flow v9 — Post-Run Audit

## 실행 provenance

- Original valid CI run: `34001718068`
- Original job: `101401646958`
- Re-run job: `101406640294`
- Frozen head: `7eb20deceb4dd0b9bd468bf7327077486fce51d9`
- Original artifact: `9979674335`
- Re-run artifact: `9980214826`
- Seeds: 101, 211, 307, 401, 503
- 12 decisions per seed / 7 archetypes

## 선행 킬서치 결론

Event sourcing / temporal-dynamic graph 계열에서는 일반적으로 immutable change/event history와 materialized current state를 구분한다. 따라서 OASIS에서 `현재 관계가 존재한다`와 `이번 outcome에서 그 관계가 생성/해제됐다`를 구분하는 것은 신규성 주장이 아니라 구현 정보보존의 문제다.

## 사전 감사

모두 PASS:

- Unified-system contamination boundary
- 성공값 감사
- 평가기준 감사
- 흐름 감사
- 구현 감사
- Persistent-state-only audit
- Removal-collision audit
- Structural role identity audit
- C5 co-presence regression guard
- far `located-relative-to` regression guard

## C6 교정 결과

### 1. Persistent-state-only — FIX CONFIRMED

과거 `formation-event`에서 `contacted` relation이 `upsert`된 뒤 current state로 지속되고, 후속 outcome에는 relation mutation이 없을 때:

- `current-state` record 1개가 유지됨
- `outcome-mutation` record는 0개
- structural key는 `state:founder->other-O:contacted:`

즉 지속 상태가 이번 경험의 mutation으로 오인되지 않는다.

### 2. Removal collision — FIX CONFIRMED

current state에 기존 `contacted/upsert`가 존재하고 후속 outcome이 같은 relation을 실제 `remove`할 때:

- 기존 관계 맥락은 `current-state`로 유지
- 실제 해제 사건은 `outcome-mutation/remove`로 별도 유지
- live world에서는 relation이 실제 삭제됨
- structural identity도 state와 remove가 서로 다름

따라서 v8에서 확인된 실제 remove 소실 경로는 제거됐다.

### 3. Structural role identity — FIX CONFIRMED

같은 relation이라도 다음이 모두 별도 구조 토큰으로 구분된다.

- `state:` — 현재 지속 상태
- `upsert:` — 실제 형성 mutation
- `remove:` — 실제 해제 mutation
- `observe:` — 도출 관측
- `choice:` — choice relation

점수나 가중치는 추가되지 않았다.

## Full-flow 확인

v3 world / 동일 5 seeds / 동일 12 rounds에서 full flow가 정상 실행됐다.

모든 실제 outcome relation에 대해 runner는 다음을 강제했다.

1. 동일 id/op의 `outcome-mutation` record가 반드시 processRelations에 존재해야 함.
2. 실제 outcome에 없는 `outcome-mutation` record가 생성되면 실패해야 함.

Valid run과 re-run 모두 이 조건을 전부 통과했다.

실제 full-flow removal collision 사례도 확인됐다.

### Seed 401 — experience:8

- current-state: `holds:founder:resource-C`, 기존 `upsert`
- outcome-mutation: 동일 relation `remove`
- outcome-mutation: `holds:founder:resource-D`, `upsert`

### Seed 401 — experience:9

- current-state: `contact:founder:other-O`, 기존 `upsert`
- outcome-mutation: 동일 relation `remove`

### Seed 503 — experience:8

- current-state: `holds:founder:resource-C`, 기존 `upsert`
- outcome-mutation: 동일 relation `remove`

즉 current-state와 실제 remove event가 같은 completed experience 안에서 동시에 보존된다.

## Role counts — 성능점수 아님

5 seed의 OASIS process relation role 집계:

- seed 101: outcome-mutation 1
- seed 211: derived-observation 2, outcome-mutation 3
- seed 307: derived-observation 6, outcome-mutation 2, current-state 4
- seed 401: derived-observation 10, outcome-mutation 5, current-state 8
- seed 503: derived-observation 9, outcome-mutation 3, current-state 3

이 수치는 우열·성능·성공값이 아니라 자료형 역할이 실제 flow에서 사용됐는지 확인하는 진단 기록이다.

## 흐름 경계 추가 감사

`structuralExpansion`은 deliberation 시점에 계산된다. 따라서 아직 발생하지 않은 actual outcome mutation은 현재 판단의 structural key에 미리 들어가지 않는다.

actual outcome은 완결경험에 저장된 뒤, 이후 현재 흐름에서 해당 경험이 재활성화될 때 historical evidence로만 재참여한다.

따라서 v9 role separation은 미래 결과를 현재 판단에 누출시키지 않는다.

## 재현성

Original과 re-run의 내부 산출물은 byte-for-byte identical이다.

- `founding-flow-v9.json` SHA-256: `10469ad23d980007da51adf2119c0baa54bc36ee96e835d57b9c31eed135af6f`
- `founding-flow-v9.log` SHA-256: `6471694bbcb7647bf138754ae8349588137cedbeed07b913a07ba18aabc355c6`

## v9 최종 판정

**Execution-valid / C6 fix-valid / C1-C3-C5-C4N regression-free within audited scope / reproducible / not paper superiority evidence.**

v9는 completed relational process representation에서 current relation state와 actual relation mutation을 역할 수준에서 분리했고, 실제 remove가 과거 current-state upsert와 충돌해 소실되는 문제를 제거했다.

## 다음 문턱

개별 구현결함을 계속 결과 후 추적하는 방식은 여기서 중단하고, 본 시조 실험으로 돌아가기 전에 **전체 구현감사**를 한 번 수행한다.

감사 목적은 새 기능 추가가 아니라 다음 전체 경계가 동시에 유지되는지 확인하는 것이다.

- reality ↔ possibility 분리
- current-state ↔ mutation event 분리
- completed experience ↔ raw co-presence 분리
- founder-only hub 방지
- far-spatial overconnection 방지
- outcome provenance 보존
- 선택 전 미래 outcome 비누출
- comparator 독립성
- action menu / reward / target 미주입

새 문제가 나오면 그 문제만 별도 수정한다. 전체 감사가 PASS해야 시조 고정 원형 본실험으로 복귀한다.
