# Founding Flow v5 — Process-Evidence Reactivation

## 목적

Founding Flow v5는 v4 사후감사에서 발견된 C5 하나만 수정한다.

C5:

> 같은 스냅샷에서 함께 `changedEntities`로 관측된 사실이 실제 완결 관계과정 참여근거처럼 사용되는 문제.

English: **Process-Evidence Reactivation**
한국어 설명: 과거 완결경험을 현재에 다시 참여시킬 때, 단순히 같은 장면에 함께 존재했다는 사실이 아니라 실제 관계·선택·결과에 참여했다는 기록을 재활성화 근거로 사용하는 원칙.

## 선행 킬서치 결론

2026년 장기 에이전트 메모리 연구는 flat retrieval이나 단순 표면 유사성만으로 장기 기억을 찾으면 잡음과 구조손실이 커질 수 있음을 반복적으로 지적한다.

- ES-Mem은 의미적으로 응집된 event boundary를 분리한다.
- CompassMem은 event를 명시적 logical relation으로 연결한다.
- SEEM은 relational fact graph와 episodic event frame을 구분한다.

반대로 entity-resolution 계열에서는 co-occurrence가 유용한 신호가 될 수도 있다. 따라서 본 실험은 “동시등장은 언제나 무의미하다”를 주장하지 않는다.

본 실험의 범위는 OASIS의 고정 정의에 한정한다.

> OASIS의 재참여 단위가 **완결 관계과정**이라면, raw snapshot co-presence만으로 그 경험을 관계경험이라고 선언해서는 안 된다.

## 변경하지 않는 것

- Founding Flow v3 world 그대로 사용
- v4에서 확인된 C1~C3 교정 유지
- far `located-relative-to` 자동 bridge 금지 유지
- founder-only reactivation 금지 유지
- common-founder affordance support 금지 유지
- Temporal-Relational v4 parity correction 유지
- Reactive / State-Memory / Episodic / Predictive World Model / Goal-Utility 구현 변경 없음
- OASIS reference core 파일 자체는 수정하지 않음
- 동일 seeds: 101, 211, 307, 401, 503
- 동일 12 decisions / 동일 11 exogenous frames
- reward, score, winner, desired trajectory 없음

## v5에서 허용되는 단일 수정

completed experience의 **reactivation eligibility entity**를 만들 때 다음은 근거로 사용하지 않는다.

- `before.changedEntities`
- `after.changedEntities`

대신 다음 실제 process evidence만 사용한다.

1. `processRelations`의 endpoint
2. actual `choice.entities`
3. actual `outcome.affectedEntities`
4. actual `outcome.relations`의 endpoint

그리고 generic actor `founder` 단독은 v4와 동일하게 충분조건에서 제외한다.

이것은 새로운 score나 threshold가 아니다. 어떤 기록을 “관계과정 참여증거”로 볼 것인지의 자료형 경계를 수정하는 것이다.

## 중요: C4는 이번 버전에서 수정하지 않는다

v3/v4에서 남아 있는 C4:

> completed experience의 실제 outcome process를 reactivated affordance에 얼마나 복원해야 하는가

는 v5에서도 그대로 둔다.

즉 v5가 과거 경험을 더 정확히 골라도, 재활성화된 경험의 행동 후보는 여전히 reference core가 제공하는 기존 choice-step 방식이다.

C4를 동시에 고치면 selection eligibility와 outcome reconstruction 효과를 분리할 수 없으므로 금지한다.

## 사전 4축 감사

1. 성공값 감사 — 원하는 reactivation 개수나 OASIS 행동을 성공값으로 두지 않는다.
2. 평가기준 감사 — tie 감소, 행동 다양성, 특정 행동을 성능으로 계산하지 않는다.
3. 흐름 감사 — 동일 현실을 branch별 독립적으로 경험한다.
4. 구현 감사 — C5 이외의 OASIS/비교 시조 원리가 바뀌지 않았는지 확인한다.

## Targeted C5 audits

실제 실행 전에 다음을 합성 경험으로 검증한다.

### A. Co-presence-only exclusion

과거 경험의:
- `before.changedEntities = [founder, other-O]`
- choice = founder-only movement
- outcome = founder-only movement
- process relation = none

인 상황에서 현재 `other-O`가 다시 나타나도 그 경험은 재활성화되면 안 된다.

### B. Process-relation inclusion

과거 경험에 `founder -> other-O : contacted`가 실제 process relation으로 있으면 현재 `other-O`에서 재활성화 가능해야 한다.

### C. Choice-entity inclusion

과거 actual choice가 `touch:resource-A`이고 choice entity에 `resource-A`가 포함돼 있으면 현재 `resource-A`에서 재활성화 가능해야 한다.

### D. Outcome-entity inclusion

actual outcome affected entity에 `resource-B`가 실제로 포함된 경험은 현재 `resource-B`에서 재활성화 가능해야 한다.

### E. v4 regression guards

- founder-only commonality는 여전히 불충분해야 한다.
- far spatial bridge는 다시 생기면 안 된다.
- unrelated idle은 founder만 공유한다고 experience support를 얻으면 안 된다.

하나라도 FAIL이면 본 실행을 중단한다.

## 관찰 단위

`current reality → process-evidence frontier → reactivated completed experience → participation → possibilities → choice/tie → actual outcome → next reality`

사후에는 특히:

- v4의 `experience:0` 같은 co-presence-only 경험이 다른 객체의 등장만으로 호출되는지
- 같은 current entity라도 실제 관계과정이 있었던 history와 없었던 history에서 reactivation lineage가 갈리는지
- 0개 reactivation round가 자연스럽게 존재하는지

를 관찰한다.

특정 개수는 성공값이 아니다.

## 반증 조건

- co-presence-only 합성 경험이 current other-O에서 재활성화됨
- 실제 relation/choice/outcome evidence가 있는 경험도 전부 막혀버림
- C4 수정이 v5 코드에 섞임
- v4 C1~C3 regression 발생
- 결과를 보고 reactivation 개수 목표를 추가함

## 증거 경계

v5가 통과해도 OASIS 우월성·고유성·문화·세대 진화를 입증하지 않는다.

v5는 오직 **completed relational experience의 재참여 eligibility가 raw scene co-occurrence와 분리되는지** 검증한다.
