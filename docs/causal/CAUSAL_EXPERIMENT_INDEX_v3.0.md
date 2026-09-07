# OASIS Causal Research Experiment Index v3.0

상태 / Status: current experiment sequence
기준일 / Date: 2026-09-07
상위 기준 / Governing protocol: `../../OASIS_RESEARCH_PROTOCOL.md`
정의 기준 / Canonical semantics: `../OASIS_CAUSAL_RESEARCH_SYSTEM_v3.0_ko.md`
구현 기준 / Implementation specification: `CAUSAL_RESEARCH_SYSTEM_SPEC_v3.0.md`
증거 기준 / Evidence ledger: `CAUSAL_EVIDENCE_LEDGER_v3.0.md`
Predecessor sequence: `CAUSAL_EXPERIMENT_INDEX_v2.0.md`
Legacy comparator sequence: `CAUSAL_EXPERIMENT_INDEX_v1.2.md`

## EX-00 — 내부 선행연구 확인 / Internal Prior-Work Gate
Status: REQUIRED BEFORE NEW RUNS

목적:
- 이미 검증·반증·폐기된 문제를 반복하지 않는다.
- 기존 OASIS 내부 증거를 외부 선행연구보다 먼저 확인한다.
- 새 실험이 H1~H4 또는 v3 보조 연구질문 중 무엇을 검증하는지 명시한다.

통과조건:
- 기존 연구와의 차이 명시
- 중복 여부 확인
- 새 미해결 질문 정의

## 공통 필수조건 — 실험자 비개입 / Mandatory No-Experimenter-Intervention Condition

초기조건과 환경 설정 후 실험자는 OASIS의 판단, 개성, 관계, 가능성 조합, 선택, 책임, 현실화, 과거 관계구조를 중간에 변경하지 않는다.

사전에 고정한 환경규칙·외생조건·관측절차는 허용한다.

결과를 보고 특정 방향으로 유도하는 조정은 금지한다.

`experimenterInterventionCount > 0`인 run은 자율적 장기 변화 증거에서 제외한다.

## EX-01 — 현실화와 과거 관계구조 편입 / Realization and Past-Structure Incorporation
Status: NEXT CORE TEST
Hypothesis: H1

질문:
원인 개입에 의해 현실화된 경험이 기존 과거 관계구조의 실제 구성요소로 편입되어 새로운 과거 관계구조 형성에 참여하는가?

설계:
- 가능한 한 동일한 초기 과거 관계구조와 현재 현실
- 하나의 정의된 원인 개입만 다르게 설정
- 실제 현실화 기록
- 구현 필드 증가와 구조적 편입 구별

필수 관찰:
1. realized event
2. incorporation candidate signal
3. realized experience와 기존 과거 관계 사이의 후속 관계
4. 이후 구조적 참여

금지:
- 단순 저장량 증가만으로 H1 SUPPORTED 판정

## EX-02 — 새로운 과거 관계구조와 이후 현실관계 / New Past Structure and Subsequent Reality Relation
Status: AFTER EX-01
Hypothesis: H2

질문:
현실화된 경험의 편입으로 형성된 새로운 과거 관계구조 전체가 이후 현실과 관계하면서 새로운 관계구조와 가능성 조합의 형성에 참여하는가?

설계:
- EX-01 이후 각 조건의 현실흐름을 계속 진행
- 가능한 외생조건 통제
- 이미 달라진 현실을 강제로 동일상태로 복원하지 않음
- 과거 구조 변화와 이후 현실관계를 하나의 연속과정으로 추적

필수 관찰:
- 전체 과거 관계구조의 구성 차이
- 이후 현실과의 관계과정
- 가능성 조합
- 참여상태
- 새로운 관계 형성
- 후속 현실화

## EX-03 — 인연의 자연적 재출현 / Natural Relational Reappearance
Status: AFTER EX-02
Hypothesis: H3

질문:
과거 관계가 한동안 현재 판단이나 관계형성에 직접 참여하지 않은 뒤 변화한 현실조건에서 다시 현재 현실과 관계할 수 있는가?

설계:
- 실제 형성된 과거 관계 추적
- 비참여 상태를 자연스럽게 허용
- 재출현 tick 사전 지정 금지
- 미래정보 사용 금지

필수 관찰:
- non-participating interval
- subsequent reactivation
- reactivation reason/context
- renewed participation
- repeated reappearance if observed

## EX-04 — 인연 지속 제한 장기탐색 / Long-Horizon Relational Persistence-Limit Inquiry
Status: AFTER EX-03
Hypothesis: H4

질문:
과거 관계가 이후 현실과 다시 관계할 가능성에 관찰 가능한 시간적 또는 구조적 제한이 존재하는가?

설계:
- 충분히 긴 현실흐름
- 시간경과와 구조변화 조건을 가능한 한 구분
- 재출현 간격과 반복 재출현 기록

필수 관찰:
- reappearance gaps
- repeated reappearance counts
- long non-participating intervals
- context/structure at reappearance
- not-reobserved-within-horizon cases

금지:
- 미재출현 = 소멸
- 미재출현 = 영구적 재관계 불가능

기본 판정:
- `OPEN_INQUIRY`

## EX-04P — 조건부 개성 재실험 / Conditional Disposition Rerun
Status: CONDITIONAL ONLY

진입조건:
- EX-01~04의 1차 조건에서 충분한 구조적 성과가 관측되지 않음, 또는
- 가능성 탐색과 선택이 사실상 정지하여 핵심구조를 충분히 시험하기 어려움

설계:
- H1~H4는 변경하지 않음
- 개성 / Individual Disposition을 `Minimum Permitted AI Prior`로만 추가
- 특정 결과나 행동을 강제하지 않음
- 가능한 한 동일한 환경·관측조건 유지
- 초기 개성값 명시
- 실험 시작 이후 초기 개성값 변경 금지

필수 추가 기록:
1. `initialDispositionPrior`
2. `possibilityCompositionTrace`
3. `selfInterventionTrace`
4. `choiceResponsibilityTrace`
5. `realizationTrace`
6. `pastRelationalStructureChangeTrace`
7. `observedDispositionPatternTrace`
8. `experimenterInterventionCount`

판정원칙:
- 1차와 2차 결과 분리 보고
- 2차 성공을 1차 성공으로 소급하지 않음
- 초기값과 이후 행동경향 차이를 내부 개성 파라미터 학습으로 자동 해석하지 않음

연구해석:
- 개성 조건에서만 구조가 활성화된다면, 개성이 최소 초기조건일 가능성을 후속 연구문제로 제시할 수 있음
- 사전에 필요조건으로 확정하지 않음

## EX-04M — 다중 OASIS 비교 장기실험 / Multi-OASIS Comparative Longitudinal Study
Status: AFTER EX-04; EX-04P가 사용되면 그 이후

목적:
- 여러 OASIS를 같은 또는 엄격히 대응되는 외생조건 아래 장기 관찰
- 서로 다른 과거 관계구조, 가능성 조합, 자기개입, 선택·책임, 현실화, 인연 재출현, 장기 행동경향 형성 비교

비교조건:

### A. 동일 초기조건 비교 / Same Initial Conditions
- 두 개 이상의 OASIS에 가능한 한 동일한 초기 과거 관계구조·현재 현실·환경규칙 제공
- 1차 연구에서는 별도 개성값을 주지 않음
- 동일 또는 다른 장기 현실흐름을 그대로 관찰

### B. 동일 최소 개성조건 비교 / Same Minimum Disposition Prior
- EX-04P를 사용한 경우
- 여러 OASIS에 동일한 `initialDispositionPrior` 부여
- 경험과 과거 관계구조가 달라질 때 장기 행동경향의 유사성·차이 관찰

### C. 서로 다른 최소 개성조건 비교 / Different Minimum Disposition Priors
- EX-04P를 사용한 경우
- OASIS 코어와 외생조건은 대응시키고 `initialDispositionPrior`만 다르게 설정
- 초기 개성이 가능성 탐색과 선택의 방향 차이와 함께 나타나는지 장기 관찰

공통 필수조건:
- 초기 설정 이후 실험자 개입 금지
- 각 OASIS의 `experimenterInterventionCount = 0`
- 결과를 보고 초기조건·개성·환경규칙·관계·가능성·선택조건 수정 금지
- 이미 달라진 현실흐름을 강제로 동일상태로 되돌리지 않음

필수 비교기록:
1. `oasisId`
2. `multiOasisGroupId`
3. `initialDispositionPrior` 또는 `NONE`
4. 초기 과거 관계구조
5. 외생조건 식별정보
6. `possibilityCompositionTrace`
7. `selfInterventionTrace`
8. `choiceResponsibilityTrace`
9. `realizationTrace`
10. `pastRelationalStructureChangeTrace`
11. `relationalReappearanceTrace`
12. `observedDispositionPatternTrace`
13. `experimenterInterventionCount`

비교질문:
- 동일 초기조건의 OASIS들이 장기적으로 같은 또는 다른 관계과정을 형성하는가?
- 동일 최소 개성값에서도 경험 차이에 따라 장기 행동경향이 달라지는가?
- 서로 다른 최소 개성값이 가능성 탐색과 선택의 방향 차이와 함께 나타나는가?
- 최종 현실화가 같더라도 과거 관계구조와 참여 관계과정은 다른가?

해석 제한:
- OASIS 간 차이 = 개성의 단독 인과효과 아님
- OASIS 간 유사성 = 동일한 인과과정 아님
- 더 좋은 결과 = 특정 개성의 우월성 아님

## EX-05 — 반복·반증 / Replication and Falsification
Status: AFTER CORE AND MULTI-OASIS TESTS

목적:
- alternative seeds/worlds
- longer horizons
- stronger controls
- falsification conditions
- implementation artifact removal
- v3 보조요소가 결과를 과도하게 설명하지 않는지 확인
- 다중 OASIS 결과의 재현성 확인
- 모든 자율적 장기 run의 실험자 비개입 확인

결과 등급:
- OBSERVED
- SUPPORTED_WITHIN_HARNESS
- REFUTED_WITHIN_HARNESS
- UNVALIDATED
- OPEN_INQUIRY

## EX-06 — Legacy v1 관측기 비교 / Legacy v1 Observer Comparison
Status: AFTER CORE v3 EVIDENCE

동일 자료에 v1 분절형 축을 별도로 적용한다.

비교질문:
- v1이 포착하는 결과·구간 정보는 무엇인가?
- v3가 포착하는 과거 관계구조 편입·전체 구조와 현실의 관계·인연 재출현 정보는 무엇인가?
- v1 관측틀에서 누락되거나 다른 의미로 해석되는 관계정보가 있는가?

이 비교는 `v3의 우월성`을 자동 증명하지 않는다.

## EX-07 — 인과율 존재형태 및 수학화 검토 / Causal-Form and Mathematical Formalization Review
Status: LAST

진입조건:
- H1~H3 반복 가능한 구조적 증거
- H4 충분한 장기 관찰
- 필요한 경우 개성 조건 결과
- 다중 OASIS 비교 결과
- Legacy observer와 v3 정보차이 확인
- 변수·기호 검수

검토 후보:
- scalar
- function
- distribution
- multiple components
- single-scalar unsuitability

단일 인과율 값을 사전에 가정하지 않는다.

상수화 실패도 연구결과로 보존한다.

## 현장 적용 / Deployment Position

개성이 실제 구현에서 필요하다고 판단되면 `Minimum Permitted AI Prior`로 정의한다.

제품·서비스 단계에서는 이 초기 개성을 사용자 또는 고객이 커스터마이징할 수 있는 고객 맞춤형 구성으로 제공할 수 있다.

이는 OASIS 핵심 인과축을 변경하지 않는다.

## Current Order

`EX-00 -> EX-01 H1 -> EX-02 H2 -> EX-03 H3 -> EX-04 H4 -> [if needed EX-04P] -> EX-04M -> EX-05 -> EX-06 -> EX-07`
