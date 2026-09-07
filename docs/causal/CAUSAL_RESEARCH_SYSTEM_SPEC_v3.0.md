# OASIS Causal Research System Specification v3.0

상태 / Status: current implementation specification
기준일 / Date: 2026-09-07
상위 기준 / Governing protocol: `../../OASIS_RESEARCH_PROTOCOL.md`
정의 기준 / Canonical semantics: `../OASIS_CAUSAL_RESEARCH_SYSTEM_v3.0_ko.md`
Predecessor: `CAUSAL_RESEARCH_SYSTEM_SPEC_v2.0.md`
Legacy comparator: `CAUSAL_RESEARCH_SYSTEM_SPEC_v1.0.md`

## 1. 구현 목적 / Implementation Purpose

v3 구현은 v2의 연속관계 인과과정을 유지한다.

`Past Relational Structure + Current Reality -> Possibility Composition -> Single Realization -> Realized Experience -> Incorporation into Existing Past Relational Structure -> New Past Relational Structure -> Relation with Subsequent Reality -> New Relational Structure / Possibility Composition`

v3는 여기에 실험자 비개입, 공식 개성 초기조건, 행동 결정 관계 후보군, 초기값과 장기 행동경향의 분리, 다중 OASIS 비교, 인과율 존재형태 개방성을 구현·보고 수준에서 추가한다.

행동결정 관점의 구현 흐름은 다음과 같다.

`Past Relational Structure + Current Reality + Individual Disposition (Initial Condition) -> Behavioral Decision Relational Candidate Set -> Possibility Composition -> Participation / Choice / Responsibility / Reality Constraints -> Single Behavioral Realization`

개성 또는 행동 결정 관계 후보군 어느 하나도 행동 현실화의 충분조건으로 구현하지 않는다.

## 2. 핵심 구현 모듈 / Core Implementation Modules

1. Reality Flow Observer / 현실흐름 관측기
2. Past Relational Structure Observer / 과거 관계구조 관측기
3. Possibility Composition Trace / 가능성 조합 추적
4. Single Realization Trace / 단일 현실화 추적
5. Incorporation Evidence Trace / 과거 관계구조 편입 증거 추적
6. New Past Structure Formation Trace / 새로운 과거 관계구조 형성 추적
7. Subsequent Reality Relation Trace / 이후 현실과의 관계 추적
8. Relational Reappearance Trace / 인연 재출현 추적
9. Long-Horizon Persistence-Limit Inquiry / 인연 지속 제한 장기탐색
10. Shadow Counterfactual Comparator / 분석 전용 반사실 비교기
11. Non-Anticipation Guard / 비예견 검증기
12. Falsification and Evidence Grader / 반증·증거등급기
13. Experimenter Intervention Guard / 실험자 개입 검증기
14. Disposition Prior Recorder / 초기 개성값 기록기
15. Behavioral Decision Relational Candidate Set Trace / 행동 결정 관계 후보군 추적기
16. Observed Disposition Pattern Trace / 관찰 행동경향 추적기
17. Self-Intervention Trace / 자기개입 추적기
18. Choice-Responsibility Trace / 선택·책임 추적기
19. Multi-OASIS Comparator / 다중 OASIS 비교기
20. Causal-Form Inquiry Report / 인과율 존재형태 탐색 보고기

`episodeId`, `tick`, `event ID`는 감사와 추적을 위한 표식일 뿐 현실 자체의 존재론적 분절단위가 아니다.

## 3. 핵심 H1~H4 증거규칙 / Core H1-H4 Evidence Rules

### H1
필요 증거:
- 실제 현실화 관측
- 현실화된 경험의 과거 관계구조 편입 후보신호
- 기존 과거 관계들과의 후속 관계 또는 구조적 참여

`relationHistoryAfter > relationHistoryBefore`만으로 SUPPORTED 판정 금지.

### H2
필요 증거:
- H1 이후 새로운 과거 관계구조 구성 차이
- 그 전체 구조와 이후 현실의 관계과정 추적
- 이후 관계구조, 가능성 조합, 참여상태 또는 현실화에서 구조적 차이 관측

### H3
필요 증거:
- 과거에 실제 형성된 관계
- 일정 기간 현재 판단/관계형성에 직접 참여하지 않음
- 사전 예약 없이 이후 현실조건에서 다시 관계함

### H4
필요 증거:
- 장기 현실흐름 추적
- 재출현 간격, 반복 재출현, 미재출현 상태 기록
- 시간경과와 구조변화 조건의 구분 가능한 비교

미재출현은 `NOT_REOBSERVED_WITHIN_HORIZON`으로만 기록한다.

## 4. v3 보조 보고축 / v3 Auxiliary Report Axes

핵심 H1~H4와 별도로 다음을 기록할 수 있다.

- `interventionOrigin`: external / self / unknown
- `initialDispositionPrior`: 시작 시 허용한 최소 개성 초기조건 또는 `NONE`
- `behavioralDecisionRelationalCandidateSetTrace`: 현재 행동결정에 참여할 수 있는 관계 후보군의 변화
- `observedDispositionPatternTrace`: 실제 선택·관계·탐색에서 반복적으로 나타난 경향
- `selfInterventionTrace`: 자기개입 여부와 방향
- `choiceResponsibilityTrace`: 선택축·책임축의 관측 가능한 작동
- `experimenterInterventionCount`: 시작 이후 실험자 중간개입 횟수
- `multiOasisGroupId`: 다중 OASIS 비교군 식별자
- `causalFormStatus`: OPEN_INQUIRY / SCALAR_CANDIDATE / FUNCTIONAL_CANDIDATE / DISTRIBUTIONAL_CANDIDATE / MULTICOMPONENT_CANDIDATE / SINGLE_SCALAR_UNSUITABLE_CANDIDATE

이 보조값 자체가 인과강도 또는 H1~H4의 증거를 자동으로 의미하지 않는다.

## 5. 개성 조건 / Disposition Condition

개성 / Individual Disposition은 v3 행동결정 구조의 공식 초기조건으로 취급한다.

그러나 개성이 행동결정의 필요조건인지 여부는 사전에 확정하지 않는다.

따라서 1차 대조실험에서는 `initialDispositionPrior = NONE` 조건을 사용할 수 있다.

이는 개성의 공식 위치를 폐기하는 것이 아니라 개성의 필요성과 효과를 분리 검증하기 위한 ablation/control 조건이다.

최소 개성 조건을 사용할 경우:
- `initialDispositionPrior`는 실험 시작 전에 기록한다.
- 실험 시작 후 실험자가 이를 변경하지 않는다.
- 특정 결과를 강제하는 정책값으로 사용하지 않는다.
- 행동 결정 관계 후보군과 가능성 탐색 방향에 어떤 차이와 함께 나타나는지 기록한다.
- 이후 행동경향은 `observedDispositionPatternTrace`로 별도 기록한다.
- 초기값과 관찰된 행동경향의 차이를 곧바로 내부 개성 파라미터 학습으로 해석하지 않는다.

## 6. 행동 결정 관계 후보군 / Behavioral Decision Relational Candidate Set

행동 결정 관계 후보군은 현재 행동결정에 참여할 수 있는 관계들의 후보집합으로 기록한다.

후보군 형성 자체는 특정 행동 현실화의 충분조건이 아니다.

후보군 이후에도 가능성 조합, 참여상태, 선택, 책임, 현재 현실의 제약조건이 함께 작동해야 한다.

개성이 후보군 형성 또는 탐색 방향과 어떤 차이를 함께 보이는지는 관찰대상이며, 개성의 단독 인과효과로 자동 귀속하지 않는다.

## 7. 실험자 비개입 불변조건 / No-Experimenter-Intervention Invariant

초기조건과 실험환경 설정 후 다음에 대한 실험자의 중간변경을 금지한다.

- 판단
- 개성
- 관계
- 행동 결정 관계 후보군
- 가능성 조합
- 선택
- 책임
- 현실화
- 과거 관계구조

사전에 고정한 환경규칙·외생조건·관측절차는 허용한다.

`experimenterInterventionCount > 0`인 run은 자율적 장기 변화 증거에서 제외한다.

## 8. 다중 OASIS 비교규칙 / Multi-OASIS Comparison Rules

가능한 비교조건:

A. 동일 초기조건의 여러 OASIS
B. 동일한 최소 개성 초기값의 여러 OASIS
C. 서로 다른 최소 개성 초기값의 여러 OASIS

가능한 한 동일한 외생조건을 공유한다.

각 OASIS별로 다음을 독립 추적한다.
- behavioral decision relational candidate set
- possibility composition
- self-intervention
- choice and responsibility
- realization
- past relational structure
- relational reappearance
- observed disposition pattern

차이가 발생해도 개성의 단독 원인으로 자동 귀속하지 않는다.

차이가 없어도 동일한 인과과정을 거쳤다고 자동 판정하지 않는다.

## 9. Legacy v1 관측기 비교 / Legacy v1 Observer Comparison

v1 축은 동일 자료에 별도로 적용할 수 있다.

- divergence delay
- realized change
- persistence
- reconvergence
- accumulated relational effect
- downstream long-horizon effect

목적은 v3 우월성의 자동 입증이 아니라, 분절형 관측틀과 연속관계 관측틀이 동일 OASIS 흐름에서 포착하는 정보의 차이를 확인하는 것이다.

## 10. 비예견·검증 불변조건 / Hard Validation Invariants

다음은 hard invalidation 조건이다.

1. 미래정보가 현재 관계계산에 사용됨
2. 재출현 시점이 사전 예약됨
3. shadow/counterfactual 결과가 production 과거 관계구조에 편입됨
4. 현재와 직접 관계하지 않는 상태를 삭제와 동일시함
5. 단순 저장 증가를 구조적 편입 입증으로 선언함
6. 관찰기간 미재출현을 소멸로 선언함
7. episodeId/tick을 독립 현실의 존재론적 단위로 해석함
8. whole-structure rewrite를 현실화의 기본규칙으로 복원함
9. 미실현 가능성을 실제 평행 미래경로로 처리함
10. 실험 시작 후 실험자가 개성·판단·관계·행동 결정 관계 후보군·가능성·선택·책임·현실화·과거 관계구조를 중간조정하고 해당 run을 자율적 장기 변화 증거로 사용함
11. 개성 조건 2차 실험 성공을 `NONE` 대조조건의 성공으로 소급함
12. 다중 OASIS 간 차이를 개성의 단독 인과효과로 자동 귀속함
13. 개성을 필요조건 또는 충분조건으로 실험 전에 확정함
14. 행동 결정 관계 후보군 자체를 특정 행동 현실화의 충분조건으로 처리함

## 11. 증거 등급 / Evidence Grading

- `IMPLEMENTATION_SIGNAL`
- `OBSERVED`
- `SUPPORTED_WITHIN_HARNESS`
- `REFUTED_WITHIN_HARNESS`
- `UNVALIDATED`
- `OPEN_INQUIRY`

개성, 행동 결정 관계 후보군, 자기개입, 장기 행동경향, 다중 OASIS 비교는 별도 증거축으로 보고하고 H1~H4와 혼합하지 않는다.

## 12. 인과율 존재형태 검토 / Causal-Form Inquiry

단일 causal-rate scalar는 사전에 도입하지 않는다.

구조적·장기적·반복 증거가 충분히 쌓인 뒤 다음 후보를 비교한다.

- scalar
- function
- distribution
- multiple components / vector-like representation
- single-scalar unsuitability

어느 형태도 사전에 정답으로 고정하지 않는다.

## 13. 실험 순서 / Experiment Order

내부 선행연구 확인
→ H1
→ H2
→ H3
→ H4
→ 개성 `NONE` 대조조건과 최소 개성 조건의 필요성·효과 비교
→ 필요 시 최소 개성 조건 재실험
→ 다중 OASIS 장기 비교
→ 반복·반증
→ Legacy v1 관측기 비교
→ 인과율 존재형태 및 수학화 검토