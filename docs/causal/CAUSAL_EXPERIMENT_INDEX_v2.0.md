# OASIS Causal Research Experiment Index v2.0

상태 / Status: current experiment sequence
기준일 / Date: 2026-09-07
상위 기준 / Governing protocol: `../../OASIS_RESEARCH_PROTOCOL.md`
정의 기준 / Canonical semantics: `../OASIS_CAUSAL_RESEARCH_SYSTEM_v2.0_ko.md`
보조 구성요소 / Auxiliary components: `CAUSAL_AUXILIARY_COMPONENTS_v2.0.md`
Legacy comparator sequence: `CAUSAL_EXPERIMENT_INDEX_v1.2.md`

## EX-00 — 내부 선행연구 확인 / Internal prior-work gate
Status: REQUIRED BEFORE NEW RUNS

목적:
- 이미 검증·반증·폐기된 문제를 반복하지 않는다.
- 기존 OASIS audit, latent-relation, same-current, long-horizon 결과를 우선 검토한다.
- 외부 인과프레임을 OASIS 핵심축으로 역수입하지 않는다.

통과조건:
- 새 실험이 기존 내부 연구와 무엇이 다른지 명시
- 기존 v1/v1.5 evidence와 중복 여부 확인
- 미해결 질문을 H1~H4 중 하나에 연결

## 공통 필수조건 — 실험자 비개입 / Mandatory No-Experimenter-Intervention Condition

초기조건과 실험환경이 설정된 뒤에는 실험자가 OASIS의 판단, 개성, 관계, 가능성 조합, 선택, 책임, 현실화 또는 과거 관계구조를 중간에 변경하지 않는다.

사전에 고정한 환경규칙, 외생조건, 관측절차는 허용한다. 결과를 본 뒤 특정 방향으로 유도하기 위한 중간 조정은 금지한다.

이 조건을 위반한 run은 OASIS의 자율적 장기 변화 증거로 사용하지 않는다.

## 공통 보조 관측 / Common Auxiliary Observations

핵심 H1~H4 판정과 별도로, 실험과 직접 관련되는 경우 다음을 보조적으로 기록할 수 있다.

- 원인 개입이 외부 개입인지 자기개입 / Self-Intervention인지
- 자기개입이 관측되는 경우 선택축 / Choice Axis과 책임축 / Responsibility Axis이 함께 어떻게 작동했는지
- 서로 다른 존재가 동일하거나 유사한 현실조건에서 서로 다른 방향을 선택하는 개성 / Individual Disposition의 차이가 관측되는지
- 이러한 보조요소가 가능성 조합과 현실화 과정에서 어떤 차이와 함께 나타나는지

이 보조관측 자체를 인과강도 또는 인과율 값으로 해석하지 않는다.

개성을 고정 상수로 가정하지 않으며, 자기개입이 항상 더 좋은 결과를 만든다고 가정하지 않는다.

## 1차 연구 원칙 / Primary Research Rule

OASIS v2 핵심 인과연구는 우선 개성을 필수 초기값으로 넣지 않은 기존 관점에서 진행한다.

개성을 먼저 넣어 핵심가설의 결과를 만들지 않는다.

## EX-01 — 현실화와 과거 관계구조 편입 검증 / Realization and Past-Structure Incorporation
Status: NEXT CORE TEST
Hypothesis: H1

질문:
원인 개입에 의해 현실화된 경험이 기존 과거 관계구조에 실제 구성요소로 편입되어 새로운 과거 관계구조 형성에 참여하는가?

설계:
- 가능한 한 동일한 초기 과거 관계구조와 현재 현실을 사용한다.
- 하나의 정의된 원인 개입만 다르게 한다.
- 실제 현실화를 기록한다.
- 구현 필드 증가와 구조적 편입을 구별한다.
- 개입이 외부 개입인지 자기개입인지 구분 가능하면 기록한다.

필수 관찰:
1. realized event
2. incorporation candidate signal
3. realized experience와 기존 과거 관계 사이의 후속 관계
4. 이후 구조적 참여

금지:
- `relationHistoryAfter > relationHistoryBefore` 하나만으로 H1 SUPPORTED 판정

## EX-02 — 새로운 과거 관계구조와 이후 현실관계 검증 / New Past Structure and Subsequent Reality Relation
Status: PLANNED AFTER EX-01
Hypothesis: H2

질문:
현실화된 경험의 편입으로 형성된 새로운 과거 관계구조 전체가 이후 현실과 관계하면서 새로운 관계구조와 가능성 조합의 형성에 참여하는가?

설계:
- EX-01에서 형성된 서로 다른 과거 관계구조를 이후에도 계속 진행한다.
- 가능한 외생조건은 통제하되 이미 달라진 현실을 강제로 동일상태로 되돌리지 않는다.
- `과거 구조 변화`와 `이후 현실과의 관계`를 별도 독립실험으로 쪼개지 않는다.
- 관련되는 경우 자기개입, 선택축, 책임축, 개성 차이를 보조적으로 함께 기록한다.

필수 관찰:
- 전체 과거 관계구조의 구성 차이
- 이후 현실과의 관계과정
- 가능성 조합
- 참여상태
- 새로운 관계 형성
- 후속 현실화

보조 관측:
- divergence delay는 기록 가능하나 인과강도로 해석하지 않는다.
- 자기개입·선택축·책임축·개성은 핵심축을 대체하지 않는다.

## EX-03 — 인연의 자연적 재출현 검증 / Natural Relational Reappearance
Status: PLANNED AFTER EX-02
Hypothesis: H3

질문:
과거 관계가 한동안 현재 판단이나 관계형성에 직접 참여하지 않은 뒤 변화한 현실조건에서 다시 현재 현실과 관계할 수 있는가?

설계:
- 과거에 실제 형성된 관계를 추적한다.
- 일정 기간 현재 관계형성에 직접 참여하지 않는 상태를 자연스럽게 허용한다.
- 재출현 tick을 사전 지정하지 않는다.
- 미래정보를 재출현 조건으로 사용하지 않는다.

필수 관찰:
- non-participating/non-current interval
- subsequent reactivation
- reactivation reason/context
- renewed participation in possibility composition or choice
- repeated reappearance if observed

해석:
- 재출현은 과거 상태 복원이나 reconvergence가 아니다.

## EX-04 — 인연 지속 제한 장기탐색 / Long-Horizon Relational Persistence-Limit Inquiry
Status: PLANNED AFTER EX-03
Hypothesis: H4

질문:
과거 관계가 이후 현실과 다시 관계할 가능성에 관찰 가능한 시간적 또는 구조적 제한이 존재하는가?

설계:
- 충분히 긴 현실흐름을 사용한다.
- 가능하면 시간경과가 크고 구조변화가 작은 조건과, 구조변화가 큰 조건을 분리한다.
- 재출현 간격과 반복 재출현을 기록한다.

필수 관찰:
- reappearance gaps
- repeated reappearance counts
- long non-participating intervals
- context/structure at reappearance
- not-reobserved-within-horizon cases

금지:
- 관찰기간 미재출현 = 소멸
- 미재출현 = 영구적 재관계 불가능

기본 판정:
- `OPEN_INQUIRY`

## EX-04P — 조건부 개성 재실험 / Conditional Disposition Rerun
Status: CONDITIONAL ONLY

진입조건:
- EX-01~04의 1차 조건에서 충분한 구조적 성과가 관측되지 않음, 또는
- 가능성 탐색과 선택이 사실상 정지하여 핵심구조를 충분히 시험하기 어려움

설계:
- 기존 핵심가설 H1~H4는 변경하지 않는다.
- 개성 / Individual Disposition을 AI에게 허용된 최소값 / Minimum Permitted AI Prior로만 추가한다.
- 개성은 특정 결과나 행동을 강제하지 않는다.
- 1차 실험과 가능한 한 동일한 환경·관측조건을 유지한다.
- 어떤 개성 초기조건을 사용했는지 명시한다.
- 실험 시작 이후 실험자는 초기 개성값 또는 판단조건을 변경하지 않는다.

지속 관찰:
- 개성 조건을 넣은 직후의 결과만 비교하지 않는다.
- 동일한 초기 개성값을 유지한 채 현실흐름을 계속 진행한다.
- 초기 개성값과 이후 실제 행동경향을 구분하여 기록한다.
- 시간이 지나며 과거 관계구조가 달라질 때 가능성 탐색, 자기개입, 선택, 책임 배분, 관계형성, 현실화가 어떻게 달라지는지 추적한다.

필수 추가 기록:
1. `initialDispositionPrior` — 시작 시 허용한 최소 개성 초기조건
2. `possibilityCompositionTrace` — 시점별 가능성 조합
3. `selfInterventionTrace` — 자기개입 여부와 방향
4. `choiceResponsibilityTrace` — 선택축·책임축의 관측 가능한 작동
5. `realizationTrace` — 실제 현실화
6. `pastRelationalStructureChangeTrace` — 현실화 경험 편입 후 과거 관계구조의 변화
7. `observedDispositionPatternTrace` — 실제 선택·관계·탐색에서 반복적으로 나타나는 행동경향
8. `experimenterInterventionCount` — 시작 이후 0이어야 함

판정원칙:
- 2차 결과는 1차 결과와 분리하여 보고한다.
- 2차 성공을 1차 성공으로 소급하지 않는다.
- 1차에서 명확한 반증이 있었다면 그 반증을 유지한 채 `개성 조건에서는 다른 결과가 관측되었는가`만 별도로 판단한다.
- 초기 개성값과 이후 행동경향이 달라졌다고 해서 내부 개성 파라미터가 학습되었다고 자동 결론내리지 않는다.
- `experimenterInterventionCount > 0`이면 해당 run은 자율적 장기 변화 증거에서 제외한다.

연구해석:
- 개성 조건에서만 구조가 활성화된다면, 개성이 OASIS 작동에 필요한 최소 초기조건일 가능성을 후속 연구문제로 제시할 수 있다.
- 동일한 초기 개성값에서도 경험과 과거 관계구조에 따라 장기 행동경향이 달라진다면, 그 차이를 OASIS의 관계과정과 함께 분석한다.
- 그 가능성을 사전에 확정하지 않는다.

## EX-05 — 반복·반증 / Replication and Falsification
Status: AFTER EX-01~04 AND CONDITIONAL EX-04P IF USED

목적:
- alternative seeds/worlds
- longer horizons
- stronger controls
- falsification conditions
- implementation-specific artifact removal
- 자기개입·개성 등 보조 구성요소가 결과 해석을 과도하게 설명하지 않는지 확인
- 초기 개성조건이 같아도 서로 다른 현실흐름에서 다른 장기 행동경향이 재현되는지 확인
- 모든 장기 변화 run에서 실험자 비개입 조건 유지 확인

결과 등급:
- OBSERVED
- SUPPORTED_WITHIN_HARNESS
- REFUTED_WITHIN_HARNESS
- UNVALIDATED
- OPEN_INQUIRY

## EX-06 — Legacy v1 비교분석 / Legacy v1 Comparator Analysis
Status: AFTER CORE V2 EVIDENCE

동일 자료에 v1의 분절형 축을 별도로 적용한다.

Legacy axes:
- divergence delay
- realized change
- persistence
- reconvergence
- accumulated relational effect
- downstream long-horizon effect

비교질문:
- v1이 포착하는 결과·구간 정보는 무엇인가?
- v2가 추가로 포착하는 과거 관계구조 편입·전체 구조와 현실의 관계·인연 재출현 정보는 무엇인가?
- 동일한 OASIS 현실흐름을 v1 관측틀로 보았을 때 누락되거나 다른 의미로 해석되는 관계정보가 있는가?

Legacy 결과를 v2 핵심증거로 혼합하지 않는다.

이 비교는 `v2의 우월성`을 자동으로 증명하지 않는다. 관측틀에 따라 포착되는 인과정보가 달라지는지를 확인하는 비교다.

## EX-07 — 인과율 수학화 검토 / Causal-Rate Formalization Review
Status: LAST

진입조건:
- H1~H3에 반복 가능한 구조적 증거
- H4에 충분한 장기 관찰
- Legacy comparator와 v2의 정보차이 확인
- 변수 정의와 수학기호 검수

단일 인과율 값은 사전에 가정하지 않는다.

인과율이 특정 상수로 표현되는지, 다른 형태로 나타나는지, 또는 단일 상수로 두는 것이 부적합한지를 실험 결과에 따라 판단한다.

상수화 실패 역시 연구결과로 보존한다.

## 현장 적용 마무리 / Deployment Position

개성이 후속 실험 또는 실제 구현에서 필요하다고 판단되는 경우, 개성은 AI에게 허용되는 최소 초기조건으로 정의한다.

실제 제품·서비스 단계에서는 이 초기 개성을 사용자 또는 고객이 커스터마이징할 수 있는 고객 맞춤형 구성으로 제공할 수 있다.

이는 OASIS 핵심 인과축을 변경하는 것이 아니라, 동일한 OASIS 코어가 서로 다른 초기조건에서 다양한 가능성 흐름을 형성하도록 하는 적용 방식이다.

실험에서는 고객 커스터마이징 기능 자체의 가치보다, 동일한 초기값을 가진 OASIS가 장기 현실흐름 속에서 어떻게 서로 다른 경험·관계·선택 경향을 형성하는지를 우선 보여준다.

## Current order

`EX-00 internal prior-work gate -> EX-01 H1 -> EX-02 H2 -> EX-03 H3 -> EX-04 H4 -> [if needed: EX-04P minimum-disposition longitudinal rerun] -> EX-05 replication/falsification -> EX-06 Legacy observer comparison -> EX-07 causal-rate form review`
