# OASIS Master Gate v2.0 / OASIS 최상위 통합 게이트 v2.0

Status: Highest-level research and experiment governance / OASIS 연구·실험 최상위 거버넌스
Date: 2026-09-14
Baseline lineage: `experiment/g3-rpfo-organic-carla-01-a2` @ `5ff6102b1239e4f9a350686476f2779c437ff37c`

## Governing precedence / 최상위 효력

본 문서를 OASIS 연구·실험의 최상위 게이트로 둔다. 이미 첫 empirical tick(실증 tick)이 시작된 사전등록 실험의 frozen source, seed, scene, runtime, horizon, attempt 조건은 소급 변경하지 않는다.

본 게이트는 다음 기준을 하나의 거버넌스로 통합한다.
- `OASIS_RESEARCH_PROTOCOL.md`
- `docs/OASIS_EXPERIMENT_DERIVATION_GATE_v1.0.md`
- 현재 CARLA/RPFO preregistration 및 source manifest
- 실행 조건 고정 원칙과 pre-first-tick/release/failure/right-censor 원칙
- Flow Preservation Principle(흐름보존 원칙)
- RPFO 비검색 원칙, 시간인과·비예견, provenance 보존
- Participation/Reconstruction 분리, 동적 role, 비고정 인연
- Choice/Responsibility, 단일 현실화, selection/execution 분리
- 관찰 사실과 해석 분리, 실험 필요성 kill-search(킬서치), 부정결과 보존
- 장기 인연 축적 효과의 `미실증/구현범위 밖` 분리
- 적대적 검증 후보군 및 Present-Flow Myopia(현재 흐름 근시)

충돌 시 우선순위는 `본 게이트 → 사전등록된 개별 실험 프로토콜/manifest → 분야별 기준본 → Legacy`다.

## Pre-update audit corrections / 업데이트 전 오류검사 보정

1. 결과상태는 `VALIDATED_WITHIN_SCOPE / FALSIFIED_WITHIN_SCOPE / INCONCLUSIVE / NOT_REPRESENTED_OR_OUT_OF_SCOPE` 네 범주로 둔다.
2. 인연 축적의 장기 이점은 현재 확정사실이 아니라 검증가설 또는 미실증 가능성으로 둔다.
3. 현재 평가 가능한 비가역성만 사용하고 실제 미래결과를 현재 원인으로 사용하지 않는다.
4. 과거 `83cdf...`, portable ZIP, Git 비사용, A1 예시는 현재 RPFO A2의 보편 규칙으로 승격하지 않는다.
5. CARLA 버전·맵·30,000 tick·NPC 수·seed·OF-01~06은 현재 실험 통제값이지 OASIS 의미상수가 아니다.
6. `same_step_recursive_frontier_expansion=false` 등 현재 RPFO 제약은 별도 검증 없이 영구 공리로 일반화하지 않는다.
7. direct historical lineage와 disconnected structural transfer의 경계는 미해결로 보존하며 similarity/top-k로 봉합하지 않는다.
8. 약 2200 tick의 pending→일시 지연→회복은 `OBSERVED_NOT_CAUSALLY_ATTRIBUTED / 관찰됨·원인 미확정`으로 유지한다.

## Mandatory top-level rules / 최상위 필수 규칙

최우선 관찰대상은 어느 좌표값의 OASIS가 아니라 `현재 현실 → 관계과정·순서이력 → 과거 완결경험의 현재 참여 → 참여상태 → 가능성 조합 → 선택·책임 → 단일 현실화 → 실제 실행·결과관측 → 경험편입 → 이후 현실과의 재관계`의 전체 trajectory다.

현재 흐름은 현재 snapshot만을 뜻하지 않는다. 과거를 보존하되 전체 과거를 검색하지 않는다. RPFO는 similarity retrieval, top-k, global history scan, fixed semantic threshold로 대체하지 않는다. 미래 실제정보를 현재 판단 원인으로 사용하지 않는다. unknown/unresolved를 safe나 0으로 세탁하지 않는다. 고정 실험통제와 고정 의미값을 구분한다.

새 실험은 `관찰 사실 → 구현범위 → 원인 후보 → 기존 로그 재분석 가능성 → 내부 선행연구 → 필요성 킬서치 → 검증대상 선언 → 반증조건 사전기록 → 흐름보존 → 정보경계·시간인과 → Git/source/prereg 고정 → 부정·중단·부분실증 보존 → 결과 후 retuning 금지`를 통과해야 한다. 하나라도 불명확하면 `GATE_HOLD`다.

현재 실행 중인 OF-01 A2에는 본 게이트를 이유로 어떠한 코드·조건 변경도 하지 않는다.
