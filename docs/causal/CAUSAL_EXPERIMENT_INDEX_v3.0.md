# OASIS Causal Research Experiment Index v3.0

상태 / Status: current experiment sequence  
기준일 / Date: 2026-09-07  
상위 기준 / Governing protocol: `../../OASIS_RESEARCH_PROTOCOL.md`  
정의 기준 / Canonical semantics: `../OASIS_CAUSAL_RESEARCH_SYSTEM_v3.0_ko.md`  
구현 기준 / Implementation specification: `CAUSAL_RESEARCH_SYSTEM_SPEC_v3.0.md`  
증거 기준 / Evidence ledger: `CAUSAL_EVIDENCE_LEDGER_v3.0.md`  
EX-04P 상세 증거 / Disposition evidence: `EX04P_DISPOSITION_EVIDENCE_v3.0.md`  
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
Status: DIRECT NATIVE RELATIONAL-CANDIDATE TRACE PARTIALLY SUPPORTED; OPEN COMPONENTS REMAIN
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
Status: SUPPORTED WITHIN CANONICAL HARNESS FOR EXACT STRUCTURAL LINEAGE
Hypothesis: H1

질문:
원인 개입에 의해 현실화된 경험이 기존 과거 관계구조의 실제 구성요소로 편입되어 새로운 과거 관계구조 형성에 참여하는가?

필수 관찰:
1. realized event
2. incorporation candidate signal
3. realized experience와 기존 과거 관계 사이의 후속 관계
4. 이후 구조적 참여

금지:
- 단순 저장량 증가만으로 H1 SUPPORTED 판정

## EX-02 — 새로운 과거 관계구조와 이후 현실관계 / New Past Structure and Subsequent Reality Relation
Status: PARTIALLY SUPPORTED; WHOLE-PAST-RELATIONAL-STRUCTURE CLAIM REMAINS OPEN
Hypothesis: H2

질문:
현실화된 경험의 편입으로 형성된 새로운 과거 관계구조 전체가 이후 현실과 관계하면서 새로운 관계구조와 가능성 조합의 형성에 참여하는가?

설계:
- EX-01 이후 각 조건의 현실흐름을 계속 진행
- 가능한 외생조건 통제
- 이미 달라진 현실을 강제로 동일상태로 복원하지 않음
- 과거 구조 변화와 이후 현실관계를 하나의 연속과정으로 추적

## EX-03 — 인연의 자연적 재출현 / Natural Relational Reappearance
Status: IMPLEMENTATION OBSERVED / CAUSAL GENERALIZATION OPEN
Hypothesis: H3

질문:
과거에 실제 형성되어 과거 관계구조에 편입된 관계가 한동안 현재 판단이나 관계형성에 직접 참여하지 않은 뒤 변화한 현실조건에서 다시 현재 현실과 관계할 수 있는가?

설계:
- 실제 형성된 과거 관계 추적
- 비참여 상태를 자연스럽게 허용
- 재출현 tick 사전 지정 금지
- 미래정보 사용 금지
- 미실현 가능성을 인연으로 취급하지 않음

## EX-04 — 인연 지속 제한 장기탐색 / Long-Horizon Relational Persistence-Limit Inquiry
Status: OPEN_INQUIRY
Hypothesis: H4

질문:
과거 관계가 이후 현실과 다시 관계할 가능성에 관찰 가능한 시간적 또는 구조적 제한이 존재하는가?

금지:
- 미재출현 = 소멸
- 미재출현 = 영구적 재관계 불가능

기본 판정:
- `OPEN_INQUIRY`
- 관찰기간 미재출현은 `NOT_REOBSERVED_WITHIN_HORIZON`

## EX-04P — 개성 초기조건 비교 / Disposition Initial-Condition Comparison
Status: INITIAL-CONDITION QUESTION MATERIALLY ANSWERED WITHIN CURRENT HARNESS; FULL DISPOSITION CONSTRUCT REMAINS OPEN

목적:
- 개성이 공식 초기조건이라는 구조와 별개로 실제 행동결정의 필요조건인지 검증한다.
- `NONE` 대조조건과 최소 개성 초기값 조건을 분리 비교한다.
- 최소 개성 초기조건의 효과가 관계 identity에 조건화된 것인지 일반 tie-breaker와 분리한다.
- 조건부 참여가 이후 현실화 경험 및 과거 관계구조의 장기 차이로 이어질 수 있는지 검증한다.

공통 판정원칙:
- NONE 조건과 최소 개성 조건을 분리 보고한다.
- 초기 개성값은 run 시작 후 변경하지 않는다.
- 특정 결과·보상·목표값을 개성 prior에 직접 넣지 않는다.
- 개성의 효과가 관찰되어도 특정 행동의 단독 원인 또는 충분조건으로 판정하지 않는다.
- 초기 prior와 장기 관찰된 행동경향을 동일시하지 않는다.
- 동일 현실화 = 동일한 인과과정으로 해석하지 않는다.

### EX-04P-A — Minimum Disposition Initial-Condition Comparison
Status: COMPLETED / EXPLORATORY POSITIVE EFFECT + NEGATIVE NECESSITY RESULT

Workflow run id: `34119083697`  
Head commit: `9813aa439647320c6bbc08e6bd9becb73d123b80`

설계:
- `NONE` vs fixed minimum relational-context attention prior
- 120,000 ticks
- top-vote tie + relational context에서만 prior 적용
- candidate membership 변경 금지
- deterministic twin per condition

핵심결과:
- NONE decisions/outcomes: **1,997 / 1,997**
- eligible relational-context top ties: **11**
- same-current shadow choice changes: **4**
- first longitudinal divergence: **tick 1,439**
- NONE vs PRIOR choice-distribution TV distance: **0.21125765955666664**
- twin mismatch: **0**
- `experimenterInterventionCount = 0`

판정:
- minimum prior는 현재 harness에서 행동/현실화의 필요조건이 아님.
- 일부 동일현재 선택효과는 관찰되었으나 relation-identity specificity와 일반 deterministic tie-breaking을 완전히 분리하지 못했으므로 탐색증거로 보존.

### EX-04P-B — Relational-Support Specificity Gate
Status: COMPLETED / INCONCLUSIVE DUE TO ZERO ELIGIBLE NATURAL MOMENTS

Workflow run id: `34120121323`  
Head commit: `79edf25800f5a5aa97bb751720219be23db5009d`

설계:
- canonical NONE 120,000-tick trajectory에 대한 shadow-only 분석
- relational-support prior vs candidate-only placebo vs support-identity permutation
- 모든 최상위 동률 가능성이 비어 있지 않고 서로 다른 direct relational support를 가져야 eligible

결과:
- decision evaluations: **1,997**
- top-vote ties: **11**
- eligible distinct-direct-support ties: **0**
- twin mismatch: **0**
- `experimenterInterventionCount = 0`

판정:
- `INCONCLUSIVE_NO_ELIGIBLE_DISTINCT_SUPPORT_TIES`
- 자연 canonical trajectory에서 해당 검증조건의 빈도는 미확정.

### EX-04P-C — Matched Initial-Condition Relational-Support Specificity Battery
Status: COMPLETED / OPERATIONAL SPECIFICITY SUPPORTED UNDER MATCHED ELIGIBLE CONDITIONS

Workflow run id: `34121040185`  
Head commit: `ac81c834264544811520ac42320fc33f9562b395`

사전 factorial axes:
- party
- current public place
- danger `0.00–0.70`, step `0.01`
- distinct target/support pair

Past Relational Structure는 각 scenario의 판단 시작 전에만 구성하고, 시작 후 개입하지 않는다.

결과:
- evaluated: **76,680 / 76,680**
- top-vote ties: **6,348**
- eligible distinct-support scenarios: **4,809**
- relational vs placebo choice disagreements: **2,455 / 4,809**
- support-identity permutation choice changes: **4,797 / 4,809**
- candidate membership changes: **0**
- `experimenterInterventionCount = 0`

판정:
- 관계 identity에 조건화된 최소 attention prior의 구현 가능성과 candidate-only placebo와의 특이성 분리를 지지한다.
- prior가 support identity를 입력으로 사용하도록 사전 정의되었으므로 이 결과 자체를 자연 개성의 발견 또는 장기 인과효과로 해석하지 않는다.

### EX-04P-D — Longitudinal Relational-Disposition Matched Branch Test
Status: COMPLETED / CONDITIONAL LONGITUDINAL CONTRIBUTION OBSERVED

Workflow run id: `34121565845`  
Head commit: `be0c7b8d019d7faa90a85c0bd6b6310929498ea7`

사전 선택규칙:
- EX-04P-C와 동일한 lexicographic factorial order에서 eligibility만으로 각 party의 첫 2개 eligible configuration 선택
- 총 6개 scenario
- outcome을 보고 scenario를 선택하지 않음

조건:
- `NONE`
- `RELATIONAL`
- `PLACEBO`
- `SUPPORT_PERMUTED`
- 각 조건 deterministic twin
- horizon **12,000 ticks**

결과:
- completed: **6/6**
- initial RELATIONAL vs PLACEBO choice differences: **0/6**
- RELATIONAL vs PLACEBO longitudinal divergence: **3/6**
- final Past Relational Structure difference RELATIONAL vs PLACEBO: **3/6**
- choice-distribution difference RELATIONAL vs PLACEBO: **3/6**
- total twin mismatch ticks: **0**
- `experimenterInterventionCount = 0`

특이성 음성대조:
- 양성 scenario 1, 3, 5: RELATIONAL prior가 각 **4회** 실제 적용되었고 장기분기 및 최종 과거 관계구조 차이가 관찰됨.
- 음성 scenario 2, 4, 6: RELATIONAL prior applied decisions가 **0**이고 12,000 ticks 동안 분기, 선택분포 차이, 과거 관계구조 차이가 모두 **0**.

판정:
- 본 최소 relation-conditioned attention operationalization은 matched canonical harness에서 **조건부 장기 인과기여**를 가질 수 있음.
- 효과는 prior가 실제 판단조건에 참여할 수 있을 때만 관찰되었음.
- necessity: **NOT NECESSARY WITHIN CURRENT HARNESS**
- sufficiency: **NOT ESTABLISHED**
- natural prevalence/generalization: **OPEN**
- full theoretical Individual Disposition: **PARTIALLY VALIDATED / OPEN COMPONENTS REMAIN**

### EX-04P-DL — Longitudinal Relational-Disposition Lineage Replay
Status: RUNNING / FINAL GENEALOGY GATE

목적:
- EX-04P-D의 장기분기만 보고 인과기여를 추론하지 않는다.
- RELATIONAL과 PLACEBO가 동일한 직전 party-state를 가진 판단에서 실제 policy/target이 달라지는 최초 branch point를 직접 기록한다.
- 첫 branch point 이후 차이는 현실화 경험 편입과 새로운 과거 관계구조 형성에 따른 누적결과로 분리한다.

통과조건:
- deterministic twin mismatch `0`
- `experimenterInterventionCount = 0`
- D에서 분기한 각 scenario에 matched pre-state policy difference 또는 actual target difference의 직접 lineage 존재

## EX-04M — 다중 OASIS 비교 장기실험 / Multi-OASIS Comparative Longitudinal Study
Status: NEXT AFTER EX-04P-DL GENEALOGY CLOSURE

목적:
- 여러 OASIS를 같은 또는 엄격히 대응되는 외생조건 아래 장기 관찰
- 서로 다른 과거 관계구조, 행동 결정 관계 후보군, 가능성 조합, 자기개입, 선택·책임, 현실화, 인연 재출현, 장기 행동경향 형성 비교

### A. 동일 NONE 대조조건 / Same NONE Control
- 두 개 이상의 OASIS에 가능한 한 동일한 초기 과거 관계구조·현재 현실·환경규칙 제공
- `initialDispositionPrior = NONE`
- 장기 현실흐름을 그대로 관찰

### B. 동일 최소 개성조건 비교 / Same Minimum Disposition Prior
- 여러 OASIS에 동일한 `initialDispositionPrior` 부여
- 경험과 과거 관계구조가 달라질 때 장기 행동경향과 행동 결정 관계 후보군의 유사성·차이 관찰

### C. 서로 다른 최소 개성조건 비교 / Different Minimum Disposition Priors
- OASIS 코어와 외생조건은 대응시키고 `initialDispositionPrior`만 다르게 설정
- 초기 개성이 행동 결정 관계 후보군, 가능성 탐색과 선택 방향의 차이와 함께 나타나는지 장기 관찰

공통 필수조건:
- 초기 설정 이후 실험자 개입 금지
- 각 OASIS의 `experimenterInterventionCount = 0`
- 이미 달라진 현실흐름을 강제로 동일상태로 되돌리지 않음

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
- EX-04P 결과의 재현성 확인
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

`EX-00 -> EX-00H H0 -> EX-01 H1 -> EX-02 H2 -> EX-03 H3 -> EX-04 H4 -> EX-04P A/B/C/D -> EX-04P-DL lineage gate -> EX-04M multi-OASIS -> EX-05 -> EX-06 -> EX-07`
