# OASIS EX-04P Individual Disposition Evidence v3.0

상태 / Status: current EX-04P evidence record  
기준일 / Date: 2026-09-07  
상위 기준 / Governing protocol: `../../OASIS_RESEARCH_PROTOCOL.md`  
정의 기준 / Canonical semantics: `../OASIS_CAUSAL_RESEARCH_SYSTEM_v3.0_ko.md`  
실험 인덱스 / Experiment index: `CAUSAL_EXPERIMENT_INDEX_v3.0.md`  
증거원장 / Evidence ledger: `CAUSAL_EVIDENCE_LEDGER_v3.0.md`

## 1. 연구질문 / Research Question

개성 / Individual Disposition은 OASIS 행동결정 구조에서 공식 초기조건으로 둘 수 있는가, 그리고 그 초기조건은 실제 행동결정과 이후 현실흐름에 어떤 차이를 만들 수 있는가?

본 검증은 다음을 구분한다.

1. 개성이 행동 또는 현실화의 필요조건인가?
2. 최소 개성 초기조건이 동일 현재의 선택에 참여할 수 있는가?
3. 그 참여가 단순한 일반 tie-breaker가 아니라 관계 identity에 조건화되어 있는가?
4. 관계 identity에 조건화된 최소 개성 초기조건이 장기 현실흐름과 이후 과거 관계구조에 차이를 만들 수 있는가?
5. 위 결과가 개성의 충분조건성·보편성·인간 성격과의 동일성을 의미하는가?

## 2. 공통 방법론 경계 / Common Methodological Boundary

- 초기조건과 환경을 설정한 뒤 실험자가 판단, 개성, 관계, 행동 결정 관계 후보군, 가능성 조합, 선택, 책임, 현실화 또는 과거 관계구조를 중간에 변경하지 않는다.
- 모든 자율적 장기 evidence run에서 `experimenterInterventionCount = 0`을 요구한다.
- 동일 조건 deterministic twin이 불일치하면 해당 run을 증거에서 제외한다.
- 개성은 특정 결과·보상·목표값을 직접 부여하는 파라미터로 구현하지 않는다.
- 개성은 특정 행동의 단독 원인 또는 충분조건으로 사전 가정하지 않는다.
- `initialDispositionPrior = NONE`은 개성의 이론적 부재 선언이 아니라 필요성·효과를 검증하는 대조조건이다.

## 3. EX-04P-A — Minimum Disposition Initial-Condition Comparison

Workflow: `OASIS EX-04P Minimum Disposition Comparison v3`  
Run id: `34119083697`  
Head commit: `9813aa439647320c6bbc08e6bd9becb73d123b80`  
Result: **SUCCESS**

### 3.1 설계

- 조건 A: `initialDispositionPrior = NONE`
- 조건 B: 고정 최소 개성 초기값 `MIN_RELATIONAL_ATTENTION_A`
- 조건 B는 production top-vote tie이면서 관계맥락이 존재할 때만 고정된 관계맥락 attention fingerprint로 동률 순서를 조정한다.
- candidate membership을 추가·삭제하지 않는다.
- 위험, 보상, 결과품질, 목적지 목표값을 prior에 넣지 않는다.
- 두 조건 모두 deterministic twin을 둔다.
- 120,000 ticks.

### 3.2 결과

- completed ticks: **120,000**
- same-current decision evaluations: **1,997**
- top-vote tie moments: **11**
- tie moments with relational context: **11**
- prior-applicable moments: **11**
- shadow choice changes: **4**
- shadow resolved-target changes: **4**
- shadow leader changes: **4**
- candidate membership changes: **0**
- first longitudinal divergence: **tick 1,439**
- NONE vs PRIOR choice-distribution total variation: **0.21125765955666664**
- NONE: **1,997 decisions / 1,997 outcomes**
- PRIOR: **1,604 decisions / 1,604 outcomes**
- relation-event difference, PRIOR − NONE: **-341**
- NONE twin mismatch ticks: **0**
- PRIOR twin mismatch ticks: **0**
- `experimenterInterventionCount`: **0**

### 3.3 판정

- NONE 조건에서도 행동과 현실화가 정상적으로 지속되었다.
- 따라서 이 최소 개성 초기값은 **현재 harness에서 행동 또는 현실화의 필요조건이 아니다**.
- 최소 prior가 일부 동일현재 동률에서 선택을 바꿀 수 있음은 관찰되었다.
- 그러나 A의 prior는 관계맥락 전체를 hash salt로 사용했으므로, 관계 identity 고유 효과와 일반 deterministic tie-breaker 효과를 완전히 분리하지 못한다.

Evidence grade:
- necessity for behavior/realization: **NOT NECESSARY WITHIN CURRENT HARNESS FOR THIS MINIMUM PRIOR**
- same-current effect: **EXPLORATORY POSITIVE EFFECT**
- relation-identity specificity: **NOT ISOLATED BY EX-04P-A**
- sufficiency: **NOT ESTABLISHED**

## 4. EX-04P-B — Relational-Support Specificity Gate

Workflow: `OASIS EX-04P Relational Support Specificity v3`  
Run id: `34120121323`  
Head commit: `79edf25800f5a5aa97bb751720219be23db5009d`  
Result: **SUCCESS / INCONCLUSIVE FOR SPECIFICITY EFFECT**

### 4.1 설계

canonical `NONE` 120,000-tick trajectory를 변경하지 않는 shadow-only gate로 다음을 비교했다.

1. 직접 관계지지 identity를 사용하는 relational prior
2. 관계 identity를 사용하지 않는 candidate-only placebo
3. base vote와 candidate membership은 유지하고 support identity만 순환 교환한 permutation

eligible 조건은 모든 최상위 동률 가능성이 비어 있지 않고 서로 다른 direct relational support를 갖는 경우로 제한했다.

### 4.2 결과

- decision evaluations: **1,997**
- top-vote tie moments: **11**
- eligible distinct-direct-support tie moments: **0**
- relation-prior applied moments: **0**
- candidate membership changes: **0**
- deterministic twin mismatch ticks: **0**
- `experimenterInterventionCount`: **0**

### 4.3 판정

이 run은 효과 부재를 입증하지 않는다.

정확한 판정은:

**INCONCLUSIVE_NO_ELIGIBLE_DISTINCT_SUPPORT_TIES**

즉 기존 canonical 자연 trajectory에서는 본 specificity 가설을 검증할 수 있는 동률조건이 관찰기간 내 발생하지 않았다.

Evidence grade:
- natural availability of eligible distinct-support ties: **NOT OBSERVED WITHIN THIS 120K TRAJECTORY**
- relational-support specificity effect: **INCONCLUSIVE IN NATURAL CANONICAL TRAJECTORY**

## 5. EX-04P-C — Matched Initial-Condition Relational-Support Specificity Battery

Workflow: `OASIS EX-04P Matched Initialization Specificity v3`  
Run id: `34121040185`  
Head commit: `ac81c834264544811520ac42320fc33f9562b395`  
Artifact id: `10018217336`  
Artifact SHA-256: `a3bb61b412f02b98c9e5baabe24e10cf2456844c7df1651dd282d4fd17362669`  
Result: **SUCCESS**

### 5.1 설계

사전 정의한 factorial axes를 사후 성공사례 선택 없이 전부 평가했다.

- party: `dawn`, `star`, `blue`
- current public place
- danger: `0.00` to `0.70`, step `0.01`
- distinct target/support pair

각 scenario에서 Past Relational Structure는 판단 시작 전에만 구성했다. 판단 시작 뒤 관계·후보·선택을 변경하지 않았다.

비교:
1. relational-support-identity prior
2. candidate-only placebo
3. support-identity permutation

### 5.2 결과

- total predeclared scenarios: **76,680**
- evaluated scenarios: **76,680 / 76,680**
- top-vote tie scenarios: **6,348**
- eligible distinct direct relational support scenarios: **4,809**
- relational prior choice changes vs canonical: **2,744 / 4,809 = 57.06%**
- relational prior resolved-target changes vs canonical: **2,744**
- placebo choice changes vs canonical: **2,640 / 4,809 = 54.90%**
- relational vs placebo choice disagreements: **2,455 / 4,809 = 51.05%**
- support-identity permutation choice changes: **4,797 / 4,809 = 99.75%**
- support-identity permutation resolved-target changes: **4,797**
- candidate membership changes: **0**
- `experimenterInterventionCount`: **0**

Per party:
- each evaluated: **25,560**
- each top ties: **2,116**
- each eligible: **1,603**
- permutation-sensitive: **1,599** each
- relational vs placebo disagreement: dawn **548**, star **1,103**, blue **804**

### 5.3 판정과 제한

C는 B에서 부족했던 testability를 해결하고, 관계 identity에 조건화된 최소 attention prior가 candidate-only placebo와 구별되는 선택규칙으로 구현될 수 있음을 확인한다.

그러나 prior 함수가 애초에 support identity를 입력으로 사용하도록 구성되었으므로, support identity permutation에 대한 높은 민감도 자체를 자연적으로 발생한 개성의 발견으로 해석하면 안 된다.

따라서 C의 올바른 증거등급은:

- matched-condition testability: **SUPPORTED**
- operational relation-identity specificity: **SUPPORTED FOR THIS PREDECLARED OPERATIONALIZATION**
- construct/implementation specificity: **SUPPORTED**
- longitudinal causal effect: **NOT TESTED BY EX-04P-C**
- necessity: **NOT TESTED BY EX-04P-C**
- sufficiency: **NOT ESTABLISHED**

## 6. EX-04P-D — Longitudinal Relational-Disposition Matched Branch Test

Workflow: `OASIS EX-04P Longitudinal Relational Disposition v3`  
Run id: `34121565845`  
Head commit: `be0c7b8d019d7faa90a85c0bd6b6310929498ea7`  
Artifact id: `10018430879`  
Artifact SHA-256: `549a29020397eac93ea4cc6f7c8896115c379bf2a9d008239780f88962e798d4`  
Result: **SUCCESS**

### 6.1 사전 선택 규칙

EX-04P-C와 동일한 lexicographic factorial order에서 **eligibility만을 기준으로** 각 party의 첫 2개 eligible configuration을 선택했다.

총 6개 scenario이며 branch outcome을 보고 scenario를 선택하지 않았다.

### 6.2 조건

각 scenario에 다음 4개 branch를 두고, 각각 deterministic twin을 추가했다.

1. `NONE`
2. `RELATIONAL`
3. `PLACEBO`
4. `SUPPORT_PERMUTED`

공통:
- horizon: **12,000 ticks**
- 같은 외생환경
- initial prior는 run 전에 고정
- 관계-prior와 placebo는 production top-vote tie이면서 모든 최상위 가능성이 비어 있지 않고 서로 다른 direct relational support를 가질 때만 작동
- support-permuted branch는 base votes와 candidate membership을 보존
- mid-run prior mutation 없음
- mid-run relation/candidate manipulation 없음
- `experimenterInterventionCount = 0`

### 6.3 Aggregate 결과

- scenarios: **6**
- completed: **6/6**
- initial RELATIONAL vs PLACEBO choice differences: **0/6**
- initial RELATIONAL vs SUPPORT_PERMUTED choice differences: **0/6**
- RELATIONAL vs PLACEBO longitudinal divergence: **3/6**
- RELATIONAL vs NONE longitudinal divergence: **3/6**
- RELATIONAL vs SUPPORT_PERMUTED longitudinal divergence: **3/6**
- final Past Relational Structure difference, RELATIONAL vs PLACEBO: **3/6**
- choice-distribution difference, RELATIONAL vs PLACEBO: **3/6**
- total deterministic twin mismatch ticks: **0**
- `experimenterInterventionCount`: **0**

### 6.4 양성 scenario와 음성 scenario의 분리

양성 scenario 1, 3, 5에서는 RELATIONAL prior가 장기 run 중 **4회** 적용되었다.

- scenario 1: RELATIONAL vs PLACEBO first divergence **tick 703**, TV distance **0.19355766465343688**, final Past Relational Structure difference **true**
- scenario 3: RELATIONAL vs PLACEBO first divergence **tick 390**, TV distance **0.11839708561020035**, final Past Relational Structure difference **true**
- scenario 5: RELATIONAL vs PLACEBO first divergence **tick 390**, TV distance **0.17061323618700666**, final Past Relational Structure difference **true**

음성 scenario 2, 4, 6에서는 RELATIONAL prior applied decisions가 모두 **0**이었다.

- RELATIONAL vs PLACEBO divergence: **none within 12,000 ticks**
- choice-distribution TV distance: **0**
- final Past Relational Structure difference: **false**
- 모든 branch trajectory가 동일하게 유지되었다.

이 양성/음성 분리는 단순히 prior가 존재한다는 사실만으로 현실흐름이 달라지는 것이 아니라, **prior가 실제 판단조건에서 참여할 수 있는 순간이 발생해야 차이가 나타날 수 있음**을 보여준다.

### 6.5 해석 제한

- 여섯 scenario의 최초 선택은 모두 네 조건에서 동일했다. 따라서 D의 장기 분기는 실험자가 최초 행동을 서로 다르게 강제한 결과가 아니다.
- 첫 분기 이후 각 branch는 서로 다른 현실화 경험과 과거 관계구조를 형성할 수 있으므로, 모든 후속 차이를 initial prior의 직접효과로 해석하지 않는다.
- 후속 차이는 **초기 고정 관계-prior가 특정 판단순간에 참여한 뒤 서로 달라진 현실화 경험이 과거 관계구조에 편입되고 그 새로운 과거 관계구조가 이후 현실과 관계하면서 누적된 결과**로 해석한다.
- 본 prior는 연구자가 사전에 정의한 최소 관계-attention operationalization이다. 인간의 성격 또는 모든 AI 개성의 보편적 형태를 증명하지 않는다.

Evidence grade:
- longitudinal contribution of this minimum relational-attention prior: **SUPPORTED WITHIN MATCHED CANONICAL HARNESS**
- downstream Past Relational Structure difference after conditional participation: **OBSERVED WITHIN MATCHED CANONICAL HARNESS**
- no-effect when prior never becomes eligible: **OBSERVED IN 3/3 ZERO-APPLICATION MATCHED SCENARIOS**
- necessity for behavior/realization: **NOT NECESSARY WITHIN CURRENT HARNESS**
- sufficiency: **NOT ESTABLISHED**
- universal/general AI behavior claim: **UNVALIDATED**

## 7. EX-04P Integrated Interpretation

현재 EX-04P 결과를 합치면 다음과 같이 정리한다.

### 7.1 현재 지지되는 것

1. `NONE` 조건에서도 OASIS는 행동과 현실화를 지속할 수 있다.
2. 따라서 본 최소 개성 초기값은 현재 harness에서 행동 또는 현실화의 필요조건이 아니다.
3. 관계 identity에 조건화된 최소 attention prior는 matched eligible condition에서 candidate-only placebo와 구별되는 선택규칙으로 구현될 수 있다.
4. 이 prior가 실제 판단흐름에서 조건부로 참여한 matched longitudinal scenario에서는 placebo와 다른 장기 행동흐름 및 과거 관계구조가 형성될 수 있다.
5. prior가 적용될 판단조건이 한 번도 발생하지 않은 matched scenario에서는 차이가 관찰되지 않았다.

### 7.2 현재 지지되지 않거나 미검증인 것

- 개성이 모든 AI 행동의 필요조건이라는 주장
- 개성이 특정 행동의 충분조건이라는 주장
- 하나의 최소 관계-attention prior가 개성 전체를 대표한다는 주장
- 개성이 인간 성격과 동일한 구조라는 주장
- 자연 canonical trajectory에서 distinct-support tie가 얼마나 자주 발생하는지에 대한 일반 빈도 주장
- 모든 환경·모델·AI에 대한 보편적 일반화
- Self-Intervention과 Responsibility Axis를 포함한 전체 Individual Disposition construct의 완전 검증

## 8. Current Evidence Grade for Individual Disposition

Definitional status: **FORMAL BEHAVIORAL INITIAL CONDITION**

Empirical status:

**MINIMUM RELATIONAL-ATTENTION OPERATIONALIZATION SHOWS CONDITIONAL CAUSAL CONTRIBUTION WITHIN MATCHED CANONICAL HARNESS; NOT NECESSARY FOR BEHAVIOR/REALIZATION IN THE CURRENT HARNESS; SUFFICIENCY, NATURAL PREVALENCE, FULL-CONSTRUCT VALIDITY, AND GENERALIZATION REMAIN OPEN**

세부 등급:
- formal initial-condition role: **RETAINED**
- necessity for behavior/realization: **NOT SUPPORTED / NOT NECESSARY WITHIN CURRENT HARNESS**
- conditional contribution under predeclared minimum relational-attention operationalization: **SUPPORTED WITHIN MATCHED CANONICAL HARNESS**
- relation-identity specificity: **SUPPORTED FOR THIS OPERATIONALIZATION UNDER MATCHED ELIGIBLE CONDITIONS**
- natural prevalence in unmodified canonical trajectory: **INCONCLUSIVE**
- sufficiency: **NOT ESTABLISHED**
- full theoretical Individual Disposition: **PARTIALLY VALIDATED / OPEN COMPONENTS REMAIN**
- universal/general AI behavior: **UNVALIDATED**

## 9. Next Gate

EX-04P의 초기조건 비교 질문은 현재 harness 수준에서 실질적으로 답을 얻었다.

다음 순서는 `EX-04M — Multi-OASIS Comparative Longitudinal Study`로 이동할 수 있다.

단, EX-04M에서도 다음을 유지한다.

- `NONE` 대조조건 보존
- 동일 minimum prior와 서로 다른 minimum prior를 분리
- 각 OASIS의 현실흐름이 갈라진 뒤 강제 재동기화 금지
- 동일 결과 = 동일 인과과정으로 해석하지 않음
- 차이 = 개성 단독 인과효과로 자동 해석하지 않음
- 장기 행동경향과 초기 prior를 동일시하지 않음
