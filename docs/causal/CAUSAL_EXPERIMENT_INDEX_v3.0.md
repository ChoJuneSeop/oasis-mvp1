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
- 새 실험이 H0, H1~H4 또는 v3 보조 연구질문 중 무엇을 검증하는지 명시한다.

통과조건:
- 기존 연구와의 차이 명시
- 중복 여부 확인
- 새 미해결 질문 정의

## 공통 필수조건 — 실험자 비개입 / Mandatory No-Experimenter-Intervention Condition

초기조건과 환경 설정 후 실험자는 OASIS의 판단, 개성, 관계, 행동 결정 관계 후보군, 가능성 조합, 선택, 책임, 현실화 또는 과거 관계구조를 중간에 변경하지 않는다.

사전에 고정한 환경규칙·외생조건·관측절차는 허용한다.

결과를 보고 특정 방향으로 유도하는 조정은 금지한다.

`experimenterInterventionCount > 0`인 run은 자율적 장기 변화 증거에서 제외한다.

## 공통 용어 경계 / Common Terminology Boundary

- 인연필드 / Relational Field = 열린 가능성 조합의 장 / Open Field of Possibility Combinations
- `열린`은 사전 고정목록으로 가능성을 폐쇄하지 않는다는 뜻이며 수학적 무한을 의미하지 않는다.
- 인연 / Re-relatable Past Relation = 과거에 실제 형성되어 과거 관계구조에 편입되었고 이후 변화한 현실에서 다시 관계할 수 있는 과거 관계
- 행동 결정 관계 후보군 / Behavioral Decision Relational Candidate Set = 현재 행동결정에 참여할 수 있는 관계 후보들의 현재적 집합
- 후보군은 인연필드 전체가 아니며 특정 행동의 충분조건도 아니다.

## EX-00H — H0 행동결정 참여 검증 / H0 Behavioral Decision Participation Test
Status: FIRST BEHAVIORAL GATE
Hypothesis: H0

질문:
과거 관계구조와 현재 현실의 관계 및 개성이라는 초기조건을 통해 형성되는 행동 결정 관계 후보군은 AI의 행동결정 과정에 참여할 수 있는가?

설계:
- 현재 현실과 과거 관계구조를 명시한다.
- `initialDispositionPrior = NONE` 또는 사전에 고정된 최소 개성값을 명시한다.
- 현재 관계조건에서 행동 결정 관계 후보군이 어떻게 형성되는지 추적한다.
- 후보군의 구성원과 실제 참여관계를 구분한다.
- 후보군 이후 가능성 조합, 참여상태, 자기개입, 선택, 책임, 현실제약, 현실화까지 추적한다.
- 후보군을 실험자가 중간에 수정하지 않는다.

필수 관찰:
1. `behavioralDecisionRelationalCandidateSetTrace`
2. 후보군 진입 이유 또는 현재 관계근거
3. candidate membership과 actual participation의 구분
4. `possibilityCompositionTrace`
5. `choiceResponsibilityTrace`
6. `realizationTrace`
7. `experimenterInterventionCount = 0`

판정 제한:
- 후보군 형성 = 행동결정 완료 아님
- 후보군 형성 = 특정 행동 충분조건 아님
- 개성 존재 = 후보군 또는 행동의 단독 원인 아님
- H0 관측 = H1~H4 자동 지지 아님

## 개성 초기조건 연구규칙 / Disposition Initial-Condition Research Rule

개성 / Individual Disposition은 v3 행동결정 구조의 공식 초기조건으로 둔다.

그러나 개성이 행동결정의 필요조건인지 여부는 사전에 확정하지 않는다.

따라서 `initialDispositionPrior = NONE` 조건은 개성의 공식 위치를 부정하는 것이 아니라 필요성·효과를 검증하기 위한 대조조건으로 사용한다.

최소 개성 조건에서는 개성이 행동 결정 관계 후보군과 가능성 탐색 방향에 어떤 차이와 함께 나타나는지를 추적한다.

개성 또는 행동 결정 관계 후보군 어느 하나도 특정 행동 현실화의 충분조건으로 판정하지 않는다.

## EX-01 — 현실화와 과거 관계구조 편입 / Realization and Past-Structure Incorporation
Status: AFTER EX-00H
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
과거에 실제 형성되어 과거 관계구조에 편입된 관계가 한동안 현재 판단이나 관계형성에 직접 참여하지 않은 뒤 변화한 현실조건에서 다시 현재 현실과 관계할 수 있는가?

설계:
- 실제 형성된 과거 관계 추적
- 비참여 상태를 자연스럽게 허용
- 재출현 tick 사전 지정 금지
- 미래정보 사용 금지
- 미실현 가능성을 인연으로 취급하지 않음

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

## EX-04P — 개성 초기조건 비교 / Disposition Initial-Condition Comparison
Status: CONTROL + FOLLOW-UP

목적:
- 개성이 공식 초기조건이라는 구조와 별개로, 실제 행동결정의 필요조건인지 여부를 검증한다.
- `NONE` 대조조건과 최소 개성 초기값 조건을 분리 비교한다.

조건 A — NONE 대조조건:
- `initialDispositionPrior = NONE`
- H0 및 H1~H4 관련 구조가 개성값 없이도 작동하는지 관찰
- 행동 결정 관계 후보군, 가능성 탐색과 선택이 정지하는지 여부 기록

조건 B — 최소 개성 초기값 조건:
- 개성 / Individual Disposition을 `Minimum Permitted AI Prior`로 부여
- 특정 결과나 행동을 강제하지 않음
- 가능한 한 조건 A와 동일한 환경·관측조건 유지
- 초기 개성값 명시
- 실험 시작 이후 초기 개성값 변경 금지

필수 추가 기록:
1. `initialDispositionPrior`
2. `behavioralDecisionRelationalCandidateSetTrace`
3. `possibilityCompositionTrace`
4. `selfInterventionTrace`
5. `choiceResponsibilityTrace`
6. `realizationTrace`
7. `pastRelationalStructureChangeTrace`
8. `observedDispositionPatternTrace`
9. `experimenterInterventionCount`

판정원칙:
- NONE 조건과 최소 개성 조건 결과를 분리 보고
- 최소 개성 조건의 성공을 NONE 조건의 성공으로 소급하지 않음
- 개성 조건에서만 구조가 활성화되더라도 즉시 보편적 필요조건으로 일반화하지 않음
- 초기값과 이후 행동경향 차이를 내부 개성 파라미터 학습으로 자동 해석하지 않음
- 개성이 행동 결정 관계 후보군 또는 가능성 탐색과 차이를 보이더라도 특정 행동의 단독 원인으로 자동 판정하지 않음

연구해석:
- 개성 조건에서만 구조가 반복적으로 활성화된다면 개성이 OASIS 행동결정에 필요한 최소 초기조건일 가능성을 후속 검증한다.
- NONE 조건에서도 구조가 충분히 작동한다면 개성은 필요조건이 아니라 행동결정의 방향과 다양성에 영향을 줄 수 있는 초기조건으로 해석할 가능성을 검토한다.
- 어느 결론도 사전에 확정하지 않는다.

## EX-04M — 다중 OASIS 비교 장기실험 / Multi-OASIS Comparative Longitudinal Study
Status: AFTER EX-04P INITIAL-CONDITION COMPARISON

목적:
- 여러 OASIS를 같은 또는 엄격히 대응되는 외생조건 아래 장기 관찰
- 서로 다른 과거 관계구조, 행동 결정 관계 후보군, 가능성 조합, 자기개입, 선택·책임, 현실화, 인연 재출현, 장기 행동경향 형성 비교

비교조건:

### A. 동일 NONE 대조조건 / Same NONE Control
- 두 개 이상의 OASIS에 가능한 한 동일한 초기 과거 관계구조·현재 현실·환경규칙 제공
- `initialDispositionPrior = NONE`
- 동일 또는 다른 장기 현실흐름을 그대로 관찰

### B. 동일 최소 개성조건 비교 / Same Minimum Disposition Prior
- 여러 OASIS에 동일한 `initialDispositionPrior` 부여
- 경험과 과거 관계구조가 달라질 때 장기 행동경향과 행동 결정 관계 후보군의 유사성·차이 관찰

### C. 서로 다른 최소 개성조건 비교 / Different Minimum Disposition Priors
- OASIS 코어와 외생조건은 대응시키고 `initialDispositionPrior`만 다르게 설정
- 초기 개성이 행동 결정 관계 후보군, 가능성 탐색과 선택 방향의 차이와 함께 나타나는지 장기 관찰

공통 필수조건:
- 초기 설정 이후 실험자 개입 금지
- 각 OASIS의 `experimenterInterventionCount = 0`
- 결과를 보고 초기조건·개성·환경규칙·관계·행동 결정 관계 후보군·가능성·선택조건 수정 금지
- 이미 달라진 현실흐름을 강제로 동일상태로 되돌리지 않음

필수 비교기록:
1. `oasisId`
2. `multiOasisGroupId`
3. `initialDispositionPrior` 또는 `NONE`
4. 초기 과거 관계구조
5. 외생조건 식별정보
6. `behavioralDecisionRelationalCandidateSetTrace`
7. `possibilityCompositionTrace`
8. `selfInterventionTrace`
9. `choiceResponsibilityTrace`
10. `realizationTrace`
11. `pastRelationalStructureChangeTrace`
12. `relationalReappearanceTrace`
13. `observedDispositionPatternTrace`
14. `experimenterInterventionCount`

비교질문:
- 동일 초기조건의 OASIS들이 장기적으로 같은 또는 다른 관계과정을 형성하는가?
- 동일 최소 개성값에서도 경험 차이에 따라 행동 결정 관계 후보군과 장기 행동경향이 달라지는가?
- 서로 다른 최소 개성값이 행동 결정 관계 후보군, 가능성 탐색과 선택의 방향 차이와 함께 나타나는가?
- 최종 현실화가 같더라도 과거 관계구조와 참여 관계과정은 다른가?

해석 제한:
- OASIS 간 차이 = 개성의 단독 인과효과 아님
- OASIS 간 유사성 = 동일한 인과과정 아님
- 더 좋은 결과 = 특정 개성의 우월성 아님
- 개성 또는 행동 결정 관계 후보군 = 특정 행동 현실화의 충분조건 아님

## EX-05 — 반복·반증 / Replication and Falsification
Status: AFTER CORE AND MULTI-OASIS TESTS

목적:
- alternative seeds/worlds
- longer horizons
- stronger controls
- falsification conditions
- implementation artifact removal
- H0 및 H1~H4의 재현성 확인
- 개성 NONE/최소값 비교 결과의 재현성 확인
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
- v3가 포착하는 과거 관계구조 편입·전체 구조와 현실의 관계·인연 재출현·행동 결정 관계 후보군 정보는 무엇인가?
- v1 관측틀에서 누락되거나 다른 의미로 해석되는 관계정보가 있는가?

이 비교는 `v3의 우월성`을 자동 증명하지 않는다.

## EX-07 — 인과율 존재형태 및 수학화 검토 / Causal-Form and Mathematical Formalization Review
Status: LAST

진입조건:
- H0에 반복 가능한 행동결정 참여 증거
- H1~H3에 반복 가능한 구조적 증거
- H4 충분한 장기 관찰
- 개성 조건 비교 결과
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

개성은 OASIS 행동결정 구조에서 사용할 수 있는 `Minimum Permitted AI Prior`로 정의한다.

제품·서비스 단계에서는 이 초기 개성을 사용자 또는 고객이 커스터마이징할 수 있는 고객 맞춤형 구성으로 제공할 수 있다.

이는 OASIS 핵심 인과축을 변경하지 않는다.

## Current Order

`EX-00 -> EX-00H H0 -> EX-01 H1 -> EX-02 H2 -> EX-03 H3 -> EX-04 H4 -> EX-04P disposition comparison -> EX-04M multi-OASIS -> EX-05 -> EX-06 -> EX-07`
