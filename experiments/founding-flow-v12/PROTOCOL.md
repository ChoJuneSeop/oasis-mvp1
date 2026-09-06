# Founding Flow v12 — Contingent Flow Fingerprint Canonicalization

## 목적

Founding Flow v12는 v11 후속감사에서 확인된 C7 residual 하나만 수정한다.

### C7-F — Contingent Flow Fingerprint Serialization Leakage

English: **Contingent Flow Fingerprint Serialization Leakage**

한국어 설명: relationSignature는 동일하게 정규화되었더라도, contingent realization이 사용하는 전체 flow fingerprint 안에 같은-frame relation 배열의 삽입순서가 남아 동일 현실에서 단일 현실화가 달라질 수 있는 구현 누출.

v11 후속감사에서 고정 seeds `[1,2,3,5,8,13,21,34]` 전부에서 fingerprint가 달랐고, seeds `3,34`에서는 실제 choice와 structureKey도 달라졌다.

## 선행 킬서치 결론

Permutation invariance — 순열 불변성은 graph의 저장 순서가 구조 의미가 아닐 때 요구된다. Temporal/event order — 시간·사건 순서가 의미라면 그 순서는 별도 sequence로 보존해야 한다.

따라서 v12는 flow 전체를 정렬하지 않는다.

- flow entry 순서: 보존
- event time/sequence: 보존
- relation direction: 보존
- relation op upsert/remove: 보존
- sourceEventId/provenance: 보존
- explicit relation sub-order가 meta에 존재하면 보존
- 같은 frame 안에서 explicit sub-order가 없는 relation set의 serialization만 canonicalize
- relation 삽입순서에서 파생될 수 있는 `changedEntities`는 fingerprint 안에서 set semantics로 canonicalize

## 변경하지 않는 것

- `src/oasis-core.mjs` 수정 없음
- `src/oasis-integrated-core.mjs` 수정 없음
- `src/oasis-reference-core.mjs` 수정 없음
- v11 relationSignature/processRelations canonicalization 유지
- v9 C6 role separation 유지
- v7 polarity 유지
- v5 process-evidence reactivation 유지
- possibility generation 수정 없음
- responsibility 수정 없음
- contingent realization 알고리즘 자체 수정 없음
- comparator 수정 없음
- v3 world / seeds / 12 rounds 유지
- reward/score/winner/desired trajectory 없음

## v12 단일 수정

Validation subclass에서 `_flowFingerprint()`의 representation만 canonicalize한다.

각 flow entry의 chronological 위치는 그대로 둔다.

각 entry 내부:

1. `changedEntities`는 정렬된 set으로 표현한다.
2. `event.relations`는 explicit sub-order가 없으면 deterministic semantic serialization으로 정렬한다.
3. explicit `meta.order` 또는 `meta.sequence`가 존재하는 relation batch는 그 명시 순서를 우선 보존한다.
4. facts/participants/affordances 및 frame ordering은 이번 수정범위에서 변경하지 않는다.

## OASIS 실험 선행 4축 감사

1. 성공값 감사 — 특정 action, seed 결과, tie 감소를 목표로 하지 않는다.
2. 평가기준 감사 — cross-system score/ranking/winner 없음.
3. 흐름 감사 — frame chronology를 유지하고 same-frame unordered serialization만 정규화한다.
4. 구현 감사 — fingerprint representation 외 OASIS/비교군 원리를 변경하지 않는다.

## Targeted audits

### A. Multi-action same-frame permutation twin

같은 frame, 같은 relation set, 같은 두 legal possibilities를 제공하고 relation 배열만 `[rA,rB]` / `[rB,rA]`로 바꾼다.

고정 seeds: `1,2,3,5,8,13,21,34`.

필수:
- relationSignature 동일
- flow fingerprint 동일
- contingent choice 동일
- structureKey 동일

### B. Temporal-order positive control

`Frame A → Frame B`와 `Frame B → Frame A`는:
- exported flow chronology가 달라야 함
- flow fingerprint가 달라야 함

### C. Direction/op/role positive controls

v11/v9 감사에서:
- A→B ≠ B→A
- upsert ≠ remove
- current-state ≠ outcome-mutation ≠ derived-observation ≠ choice-relation
을 계속 보존해야 한다.

### D. C1-C7 representation regression

v11 four-axis/C7 representation audit와 v9 role-separation audit가 재통과해야 한다.

## Full-flow

Targeted audit 통과 후:
- seeds `101,211,307,401,503`
- 7 archetypes
- 12 decisions
- v3 world
을 동일하게 실행한다.

특정 행동, tie count, action diversity는 성공값이 아니다.

## 실패조건

- same semantic frame의 fingerprint가 relation 배열순서 때문에 달라짐
- same semantic frame에서 contingent choice가 달라짐
- frame chronology가 정규화로 소실됨
- C1-C7 representation regression
- outcome mutation 소실/위조
- comparator 독립성 훼손

## 증거 경계

v12 PASS는 C7-F 구현교정의 충실도만 의미한다.

OASIS 우월성·고유성·문화·세대 진화의 증거가 아니다.
