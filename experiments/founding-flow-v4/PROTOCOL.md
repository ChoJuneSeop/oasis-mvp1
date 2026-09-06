# Founding Flow v4 — Selective Relational Reactivation

## 목적

Founding Flow v4는 v3 실행 후 발견된 세 가지 관계표현 오염만 분리 교정한다.

1. generic founder 하나만 공유해도 과거 경험이 재활성화되는 문제
2. 원거리 `located-relative-to`가 모든 객체를 current affinity bridge로 연결하는 문제
3. common actor `founder` 하나만으로 모든 affordance가 같은 경험 support를 받는 문제

English: **Selective Relational Reactivation**
한국어 설명: 과거 경험이 현재와 단순히 같은 주체를 포함한다는 이유가 아니라, 현재 흐름에서 실제로 다시 연결된 비공통 관계대상이나 관계과정이 있을 때만 재참여하도록 제한하는 검증 원칙.

## 킬서치 결론

2026년 agent memory / graph retrieval 연구에서도 고차수 hub가 relevance를 과도하게 확산시키는 문제가 보고된다. HAGE는 query-conditioned relation traversal을 사용하고, GAAMA와 MemGraphRAG 계열은 generic/high-degree hub가 검색 신호를 희석시키는 문제를 별도 처리한다.

본 실험은 이들의 점수·학습가중치·hub penalty를 가져오지 않는다. OASIS에는 고정점수·영구가중치를 넣지 않는다.

이번 실험에서 가져오는 최소 구조원리는 하나뿐이다.

> **generic self node 단독 공통성은 관계적 관련성의 충분조건이 아니다.**

이는 OASIS의 기존 고정이론인 “현재 흐름에서 유의미한 완결 관계과정만 재참여”를 구현에 맞추기 위한 것이다.

## 변경하지 않는 것

- Founding Flow v3 world 그대로 사용
- 5x5 grid
- 동일 외생 11 frames
- 동일 seeds: 101, 211, 307, 401, 503
- 동일 12 decisions
- primitive actions: `step`, `touch`, `emit`, `idle`
- Reactive / State-Memory / Episodic / Predictive World Model / Goal-Utility의 v2 구현 유지
- OASIS Reference Core 파일 자체는 수정하지 않음
- RealityLedger / interactive actualization 유지
- reward, score, winner, stability target 없음

## v4에서 허용되는 수정

### A. OASIS selective experience bridge

completed experience가 재활성화되려면 current frontier와 겹치는 entity 중 `founder`가 아닌 entity가 적어도 하나 있어야 한다.

`founder` 자체는 삭제하지 않는다. 실제 현재 주체이며 참여자다. 단지 **founder 하나만 공유한다는 사실을 과거경험 재활성화의 충분조건으로 사용하지 않는다.**

새로운 score, threshold, top-k는 사용하지 않는다.

### B. Current spatial bridge

validation adapter가 current affinity relation으로 자동 삽입하는 공간관계는 실제 `adjacent-to`만 허용한다.

원거리 `located-relative-to`는 좌표 사실로는 존재하지만, 자동 affinity bridge로 사용하지 않는다.

### C. Affordance support

affordance와 과거 관계/경험 support를 연결할 때 `founder` 단독 overlap을 support로 인정하지 않는다.

예:
- 과거 경험: founder ↔ resource-A
- 현재 후보: touch resource-A
  - non-founder `resource-A`가 겹치므로 support 가능
- 현재 후보: idle 또는 unrelated touch resource-B
  - founder만 공통이라면 그 경험을 support로 사용하지 않음

### D. Temporal-Relational parity correction

Temporal-Relational comparator도 원거리 `located-relative-to`를 temporal relation history의 bridge로 자동 사용하지 않는다.

이는 OASIS만 관계를 좁혀 유리하게 만드는 것을 방지하기 위한 공통 관계표현 교정이다.

## 이번 버전에서 의도적으로 수정하지 않는 것

v3 사후감사의 C4:

> completed experience의 실제 observed outcome을 reactivated affordance에 얼마나 포함해야 하는가

는 v4에서 수정하지 않는다.

C1~C3와 동시에 수정하면 selective reactivation 효과와 outcome-process 복원 효과를 분리할 수 없기 때문이다.

## 사전 감사

### OASIS 4축 감사

1. 성공값 감사 — 정답/선호 궤적 없음
2. 평가기준 감사 — cross-system 성능점수 없음
3. 흐름 감사 — 동일 exogenous reality, 독립 branch
4. 구현 감사 — v4 수정범위가 C1~C3에 한정되는지 확인

### Targeted selective-relation audits

실제 실행 전에 다음을 독립검증한다.

1. **Founder-only non-reactivation**
   - 과거경험과 현재가 founder 하나만 공유할 때 과거경험이 재활성화되지 않아야 한다.
2. **Non-founder reactivation**
   - 현재 delta가 과거경험의 실제 non-founder entity와 다시 연결되면 그 경험은 재활성화 가능해야 한다.
3. **Far spatial exclusion**
   - v3 초기 모서리 객체들이 OASIS current affinity 또는 Temporal-Relational history에 `located-relative-to` bridge로 자동 들어가지 않아야 한다.
4. **Common-actor support exclusion**
   - founder만 공통인 unrelated affordance가 과거경험 support를 받지 않아야 한다.
   - 실제 target entity가 겹치는 affordance는 support 가능해야 한다.

하나라도 FAIL이면 본 실행을 중단한다.

## 관찰

결과는 다음 genealogy로 기록한다.

`current reality → current relational frontier → reactivated completed experiences → participation → possibilities → choice/contingent realization → actual outcome → next current reality`

특히 v3와 비교해:
- 전체 과거경험이 자동 누적 재활성화되는지 여부
- 현재 delta와 무관한 경험이 제거되는지
- 서로 다른 current flows에서 reactivation lineage가 달라지는지

를 본다.

이것은 성능지표가 아니다.

## 반증 조건

- founder-only 경험이 다시 자동 재활성화됨
- far `located-relative-to`가 current relational frontier를 완전연결함
- unrelated action이 founder 공통성만으로 모든 과거경험 support를 얻음
- OASIS에만 관계정보를 줄이고 Temporal comparator에는 숨김
- 결과를 본 뒤 C4까지 추가 수정하여 v4에 섞음

## 증거 경계

v4가 성공해도 OASIS 우월성·고유성·문화·세대 진화를 입증하지 않는다.

v4의 목적은 **OASIS의 선택적 관계 재활성화 구현이 최소한 자신의 이론과 모순되지 않는지 검증하는 것**이다.
