# OASIS Pre-Main Overall Implementation Audit

English: **OASIS Pre-Main Overall Implementation Audit**
한국어 설명: Founding Flow v1~v9에서 발견·교정한 개별 구현오염을 한꺼번에 다시 검증하고, 본 시조 비교실험으로 복귀해도 되는지 판정하는 최종 구현 경계 감사.

## 목적

이 감사는 새 기능을 추가하거나 OASIS를 더 유리하게 만드는 실험이 아니다.

질문은 하나다.

> 지금의 validation implementation이 OASIS의 고정 이론과 비교 시조의 독립성을 동시에 보존하면서, 현실·가능성·선택·결과·완결경험·다음 현재를 서로 오염시키지 않는가?

## 선행 킬서치 결론

과학 소프트웨어 검증, event sourcing, temporal/dynamic graph 표현 모두에서 공통적으로 중요한 것은 다음이다.

- 실행 harness가 모델보다 먼저 검증되어야 한다.
- 현재 state와 change/event history는 분리되어야 한다.
- 재현 가능한 실행은 코드/환경/입력 경계를 고정해야 한다.
- 동일한 의미 입력이 단순 serialization/insertion order 때문에 다른 의미로 바뀌면 구현 artifact가 될 수 있다.

따라서 v1~v9의 개별 PASS만으로 본 실험 준비 완료를 선언하지 않고, 누적 경계를 한 번에 감사한다.

## 변경 금지

- OASIS reference core 원리 변경 금지
- 시조 알고리즘 변경 금지
- v3 진단 world 변경 금지
- seed/round를 성공값에 맞게 변경 금지
- reward/score/winner/stability target 추가 금지
- action menu 주입 금지
- 비교군에 OASIS 개념 추가 금지
- 결과를 본 뒤 감사조건 변경 금지

## 필수 감사축

### A. Reality / possibility boundary

- RealityLedger는 action menu, reward, score, winner, preferred action을 거부해야 한다.
- provenance 없는 reality claim을 거부해야 한다.
- instant event는 persistent current state가 되면 안 된다.
- unrealized proposal은 reality ledger에 들어가면 안 된다.
- historical replay에서 proposal actualization은 금지된다.
- interactive branch는 서로의 outcome을 공유하면 안 된다.

### B. Current flow / future outcome boundary

- actual outcome이 발생하기 전에는 그 outcome relation/event가 current deliberation에 존재하면 안 된다.
- actualization 이후에만 outcome이 다음 current reality와 completed experience에 들어가야 한다.
- 동일 proposal을 두 번 actualize할 수 없어야 한다.

### C. Completed experience eligibility

- founder 하나만 공통인 경험은 재활성화 근거가 되면 안 된다.
- raw snapshot co-presence만으로 경험이 재활성화되면 안 된다.
- 실제 process relation / choice entity / outcome entity가 있는 경험은 matching current flow에서 재활성화 가능해야 한다.

### D. Relation representation

- 방향 `A→B`와 `B→A`는 구분되어야 한다.
- far `located-relative-to`는 자동 affinity bridge로 복귀하면 안 된다.
- common founder actor 하나만으로 unrelated affordance가 과거 경험 support를 받으면 안 된다.
- mutation polarity `upsert/remove`는 구분되어야 한다.
- `current-state`, `outcome-mutation`, `derived-observation`, `choice-relation`은 구조 역할이 구분되어야 한다.
- 실제 outcome remove는 current-state upsert와 충돌해 소실되면 안 된다.

### E. Simultaneous claim permutation audit

English: **Simultaneous Claim Permutation Audit**
한국어 설명: 같은 시점·같은 출처·같은 관계 집합인데 단지 배열 삽입순서만 다른 두 입력이 서로 다른 의미 구조로 해석되는지 검사하는 감사.

동일 frame 안에서 명시적 시간순서가 없는 relation A/B의 배열 순서만 뒤집는다.

필수:
- relation set 의미는 같아야 한다.
- OASIS structural identity와 proposal은 배열 삽입순서만으로 달라지면 안 된다.

중요:
- 서로 다른 frame의 시간순서는 정규화하지 않는다.
- 역사적 `R1→R2`와 `R2→R1`은 서로 다른 flow history로 보존되어야 한다.

즉 **시간적 순서 보존**과 **동시 입력 배열순서 artifact 제거**를 구분한다.

### F. Comparator independence

- 7개 시조는 동일 외부 reality contract를 받아야 한다.
- non-OASIS comparator가 OASIS core를 포함하거나 상속하면 안 된다.
- comparator의 고유 state update를 제거하지 않는다.

### G. Baseline intervention boundary

- OASIS core가 가능성이 없을 때 스스로 baseline action을 주입하면 안 된다.
- continuation required 상태를 그대로 반환해야 한다.

### H. Forbidden regression scan

OASIS validation path에 다음 회귀가 없어야 한다.

- reward/score 기반 선택
- argmax/top-k 선택
- `possibilities[0]` 고정선택
- danger/risk 숫자 threshold
- 구 v2 contaminated historical harness import

## 판정

하나라도 FAIL이면 본 시조 실험으로 넘어가지 않는다.

PASS 조건은 OASIS가 좋은 행동을 하는 것이 아니다.

> **실험기가 시조의 차이를 대신 만들어내지 않는다고 현재 감사범위 안에서 말할 수 있는가**

만 판정한다.

## 증거 경계

이 감사 PASS는 OASIS 우월성·고유성·문화·세대 진화를 증명하지 않는다.

PASS 이후에야 별도의 킬서치와 4축 감사를 거쳐 고정 시조 본실험을 설계·실행한다.
