# OASIS G3 Implementation Delta Draft

상태: DRAFT / NOT FROZEN
목적: 현재 G3 설계와 현재 구현 사이의 차이를 기록한다. 이 문서는 구현 명령서가 아니라 설계 완성을 위한 gap register다.

## 1. 현재 구현에서 이미 확보된 것

- 현재 reality view 보존
- relation element provenance 보존
- participation 및 joint participation 측정
- reconstruction trace 보존
- counterfactual probe의 real-flow 불변성 확인
- 미래 경험 유입 금지
- 한 decision epoch당 정확히 하나의 realization
- 과거 relation이 현재 candidate에 없는 행동을 직접 부활시키는 것 금지
- reconstruction candidate에도 current evidence 요구
- ResponsibilityVector를 scalar score로 축약하지 않는 구조

## 2. 현재 구현에서 빠진 핵심

### 2.1 Candidate Evidence Anchor의 외부 기록

현재 PossibilityCandidate에는 current_evidence가 존재하지만 CoreEpochView와 G32EpochRecorder에는 candidate별 current evidence anchor가 노출되지 않는다.

따라서 현재 recorder만으로는 다음을 완전히 재구성할 수 없다.

- 왜 이 가능성이 현재 후보가 되었는가.
- 어떤 현재 현실 근거가 과거 contribution보다 선행했는가.
- reconstructed candidate가 실제로 어떤 현재 근거를 가졌는가.

필요 설계:

A_tau(c)를 epoch trace에 보존한다.

### 2.2 Responsibility provenance 부재

CurrentRelationalCoreV11 내부에는 candidate별 ResponsibilityVector가 존재하지만 open_epoch의 CoreEpochView에 노출되지 않는다.

따라서 harness/recorder/history에서 U/I/V/T와 그 evidence를 보존하지 못한다.

이 상태에서는 책임이 실제 선택 이전 판단에 존재했더라도 완결경험 provenance로 남지 않는다.

필요 설계:

Q_tau(c)를 candidate별 trace로 외부화한다.

### 2.3 Deliberation trace 부재

현재 구현에는 다음 구조가 없다.

- D_req_tau(c): 책임상 필요한 숙고
- D_exec_tau(c): 실제 수행된 숙고
- Omega_tau(c): 수행하지 못한 책임 요구

따라서 '책임이 판단과정을 바꾸었다'는 것을 코드 수준에서 관측할 수 없다.

필요 설계:

책임 결과를 최종 choice 입력으로만 소비하지 말고 pre-realization trace로 보존한다.

### 2.4 Choice genealogy 부재

현재 HistoryEntry는 selected_possibility_id와 realization_ref는 보존하지만,
선택 직전 다음 구조는 직접 보존하지 않는다.

- candidate set
- candidate별 current evidence
- candidate별 responsibility trace
- candidate별 executed/unresolved deliberation
- 선택 시점의 hard constraint 근거

따라서 같은 최종 행동을 만든 서로 다른 판단과정을 HistoryEntry만으로 분리하기 어렵다.

필요 설계:

Choice 결과뿐 아니라 choice genealogy를 Completed Experience provenance에 연결한다.

## 3. 권장 데이터 경로

현재 구현의 큰 구조는 유지한다.

CurrentRelationalCoreV11
→ CoreEpochView
→ CanonicalHarnessV11
→ G32EpochRecorder
→ HistoryEntry

다만 다음 trace를 같은 경로에 추가해야 한다.

1. candidate_current_evidence
2. responsibilities_by_candidate
3. required_deliberation_by_candidate
4. executed_deliberation_by_candidate
5. unresolved_responsibility_by_candidate
6. hard_constraint_trace
7. choice_trace

중요: 이 항목은 영구 score를 추가하는 것이 아니라, 현재 epoch에서 실제로 형성된 판단경로를 보존하기 위한 것이다.

## 4. 구현 순서 제안

설계가 아직 동결되지 않았으므로 canonical branch를 즉시 변경하지 않는다.

우선 experiment branch에서 다음 인터페이스만 설계한다.

A. CandidateGroundingTrace
- possibility_id
- current_evidence anchors
- evidence derivation trace

B. ResponsibilityObservationTrace
- possibility_id
- U/I/V/T
- additional dynamic variables
- evidence for each observation

C. DeliberationTrace
- required traces
- executed traces
- unresolved traces
- no global score

D. ChoiceGenealogy
- candidate references
- possibility distribution reference
- participation/reconstruction references
- responsibility/deliberation references
- selected possibility
- hard constraint evidence

E. CompletedExperience extension
- 위 네 trace를 provenance로 연결

## 5. 금지사항

- unresolved responsibility를 하나의 debt score로 합산하지 않는다.
- candidate grounding을 yes/no 영구 속성으로 저장하지 않는다. 각 epoch의 현재 근거를 저장한다.
- ResponsibilityVector를 choice utility에 단순 가중합하지 않는다.
- D_req/D_exec 차이를 실패/성공 이분법으로 판정하지 않는다.
- 최종 행동이 같다고 동일 판단과정으로 간주하지 않는다.
- 이 설계가 완성되기 전에 confirmatory G3 evidence로 사용하지 않는다.

## 6. 현재 판단

현재 구현은 G3.2의 Participation/Reconstruction/Provenance 측정 뼈대는 상당 부분 갖췄다.

하지만 Responsibility가 실제 decision formation에 어떻게 개입했는지를 재현 가능한 provenance로 남기는 구조는 아직 부족하다.

따라서 다음 설계 우선순위는 Responsibility 자체의 숫자 정의가 아니라,

'책임 관측 → 필요한 숙고 → 실제 숙고 → 미해결 책임 → 선택'

이라는 pre-realization genealogy를 보존하는 인터페이스를 확정하는 것이다.

# English explanation

The current implementation already preserves current reality, relational participation, reconstruction provenance, counterfactual purity, temporal causality, and single realization. The main missing layer is responsibility provenance.

Responsibility vectors currently exist inside the Core but are not exposed through the epoch view, recorder, or completed-experience history. As a result, the system cannot yet reconstruct how responsibility changed deliberation before realization.

The next design step should therefore preserve candidate grounding, responsibility observations, required deliberation, executed deliberation, unresolved responsibility, and choice genealogy without converting them into a single score or fixed classifier.
