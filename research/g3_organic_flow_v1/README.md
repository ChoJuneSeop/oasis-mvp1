# OASIS G3 Organic Flow Integration v1

기준: `integration/oasis-g32-choice-responsibility-final @ 5ccccc1fe9e3b25305ab2f133fd8cb0e63d1c954`

이 패키지는 기존 frozen baseline 파일을 수정하지 않고, 여러 G3 설계창에서 확정된 경계와 이미 존재하는 G3.2 구현을 하나의 현재 현실 흐름에서 연결하는 **통합 후보**다. 실제 CARLA 실증 결과가 아니며, 이 패키지 자체로 G4를 개방하지 않는다.

통합 실행 순서는 다음과 같다.

`현재 관측/관계 → 과거 Completed Experience 재참여 → Participation → Reconstruction → 현재 가능성 구성 → U/I/V/T + 동적 추가 책임변수 → 현재 검증요구(Assessment) → 실제 가용자원 배정 → Verification + Omega → Choice → 실행 전 현실 재확인 → 원자적 단일 현실화 → Independent Evaluator → Closure/지속 → provenance-preserving Completed Experience → 이후 현재에서 재참여`

핵심 보완점:

- 자원계획을 Assessment 이전에 미리 주입하지 않는다. 현재 책임·검증 요구가 형성된 뒤 실제 가용자원을 배정한다.
- U/I/V/T는 합산 위험점수로 만들지 않는다. 현재 Pareto partial order(파레토 부분순서)는 검증깊이의 상대적 실행계획에만 사용한다.
- 추가 책임변수는 별도 변수로 동적 편입·변경·비활성화를 기록하며, 과거 기록을 삭제하지 않는다.
- Participation과 Reconstruction은 같은 관계흐름에서 연결되지만 서로 환원하지 않는다. 개별 probe와 joint probe를 보존한다.
- 계산 중 현실이 바뀔 수 있음을 전제로 Choice 이후 실제 dispatch 전에 현재 관측/revision을 재확인한다. 전제가 바뀌면 stale decision(낡은 전제의 결정)으로 폐기하고 실행하지 않는다.
- 실행 시도와 실제 적용을 분리한다. `apply_if_current` 원자적 계약과 idempotency key(중복실행 방지 키)를 사용하며 적용 여부가 불명확하면 자동 재실행하지 않는다.
- 30,000 tick 같은 관측 horizon은 Closure 규칙이 아니다. 열린 관계는 right-censored(관측종료 시 미완결)로 남고 강제 완결하지 않는다.
- 실제 적용된 realization이 Independent Evaluator에서 Closure된 경우만 reusable history로 편입한다. 미실현 후보는 경험으로 승격하지 않는다.
- ledger는 append-only 관측자이며 Core로 되먹임하지 않는다.

## 범위 제한

이 통합은 현재 CARLA `front-interaction` 도메인의 기존 Closure 의미론을 확장하지 않는다. 새로운 고정 timeout/거리/frame 임계값을 도입하지 않는다. 가능성 분포는 현재 구성된 후보집합에 대한 trace-incidence 관측값이며 현실 전체의 객관적 확률로 주장하지 않는다.
