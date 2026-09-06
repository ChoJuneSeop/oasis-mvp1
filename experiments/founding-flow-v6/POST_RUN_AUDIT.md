# Founding Flow v6 — Post-Run Audit

## 실행 provenance

- Valid CI run: `34001328132`
- Job: `101400610209`
- Head: `973e2e126fd21a494c292030752ce6272bf99aae`
- Artifact: `9979567198`
- Artifact digest: `sha256:2b234bd26d2bbfba108bace07bdebeac84ecf08166b27faa2ff661c134d7ee91`

## 감사 성격

v6는 OASIS 수정 실험이 아니라 v5 이후 남아 있다고 의심한 C4의 필요성 자체를 공격한 read-only mechanism audit다.

동일한:
- actor
- target
- historical choice
- relation id/from/to/kind
- current flow
- current affordance

를 사용하고 오직 과거 observed outcome relation의 `op`만 달리했다.

A: `upsert` — 관계 형성
B: `remove` — 관계 해제

Positive control은 relation kind만 `contacted` ↔ `signaled`로 바꿨다.

## 4축 감사

모두 PASS:

- 성공값 감사: 형성/해제 구분 여부 어느 쪽도 선호하지 않음
- 평가기준 감사: 성능점수/랭킹 없음
- 흐름 감사: twin current flow 동일, historical outcome op만 다름
- 구현 감사: `OASISProcessEvidenceCore`를 읽기 전용으로 사용하고 선택/책임/재활성화 로직 수정 없음

## 결과

### raw historical evidence

- `upsert`와 `remove`는 raw `historicalRelations[].op`에서 구분됨
- possibility support의 raw relation object에서도 `op`가 구분됨

즉 넓은 의미의 “과거 outcome이 사라진다”는 C4 가설은 반증됐다.

### structural representation

그러나:

- `relationSignatureDistinguishesOp = false`
- `structureKeyDistinguishesOp = false`
- `choiceDiffers = false`
- `tieDiffers = false`

두 twin 모두 relation signature가 동일했다.

`founder->other-O:contacted:`

그 결과 `structuralExpansion.structureKey`도 동일했다.

### positive control

`contacted`와 `signaled`는:

- relationSignature에서 구분됨
- structureKey에서 구분됨

따라서 감사 자체가 구조차이를 전혀 감지하지 못하는 것은 아니다. 현재 collapse는 relation kind가 아니라 **mutation polarity `op`가 relation signature에서 빠지는 것**에 국소화된다.

## C4 재정의

기존 넓은 C4:

> completed experience의 실제 outcome process가 현재에 충분히 복원되지 않는다.

는 너무 넓었다.

다음과 같이 좁힌다.

### C4-N — Relation Mutation Polarity Collapse

English: **Relation Mutation Polarity Collapse**

한국어 설명: 관계가 실제로 형성됐는지(`upsert`) 또는 해제됐는지(`remove`)라는 변화 방향은 raw historical outcome에는 남아 있지만, 관계 signature와 structural identity를 만들 때 그 방향이 빠져 서로 반대인 완결 관계과정이 같은 구조로 접히는 문제.

## 왜 OASIS 이론상 중요할 수 있는가

OASIS는 actualized result가 다음 current reality를 재작성한다고 본다.

따라서:

`관계가 생김`

과

`관계가 사라짐`

은 같은 관계 이름과 같은 두 참여자를 가진다고 해도 동일한 역사적 관계과정이라고 자동 간주할 수 없다.

다만 이것이 구현상 반드시 structural signature에 `op`를 포함해야 한다는 결론은 아직 아니다. v7 전에 graph/event/temporal relation representation 선행기술을 킬서치한다.

## v6 최종 판정

**Execution-valid / broad C4 falsified / C4 narrowed to Relation Mutation Polarity Collapse / no OASIS modification performed.**

## 다음 단계

1. 관계형성/삭제/상태변경을 temporal/event graph가 어떻게 구분하는지 킬서치한다.
2. 단순히 `op` 문자열을 붙이는 것이 올바른지, event identity와 state identity를 분리해야 하는지 검토한다.
3. 필요성이 확인되면 v7은 오직 historical relation mutation polarity의 structural identity만 수정한다.
4. v5의 C1-C3/C5 guard는 모두 유지한다.
5. tie 감소나 행동차이를 성공값으로 사용하지 않는다.
