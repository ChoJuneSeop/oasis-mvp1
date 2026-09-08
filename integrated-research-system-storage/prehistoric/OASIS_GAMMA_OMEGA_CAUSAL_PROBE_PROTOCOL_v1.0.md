# OASIS Γ / Ω Flow-Preserving Causal Probe Protocol v1.0

## 0. 목적과 범위

이 실험의 목적은 OASIS 전체 우월성을 검증하는 것이 아니다.

확인할 질문은 두 개다.

Q1. 과거 관계의 현재 재활성화 Γ가 이후 world trajectory에 인과적으로 기여하는가?
Q2. Ω의 관계적 순차 composition이 이후 world trajectory에 인과적으로 기여하는가?

이 두 질문은 기존 prehistoric native-memory comparison에서 관찰된 A5 OASIS의 높은 events/realization 및 장기 trajectory 차이의 원인을 좁히기 위한 것이다.

핵심 원칙은 Flow Preservation Principle이다.
OASIS 전체 흐름은 유지하고, Γ 또는 Ω의 특정 정보경로만 국소 개입한다.

금지 결론:
- 이 실험만으로 OASIS가 최고의 AI라고 주장하지 않는다.
- civilization speed 하나로 우월성을 판단하지 않는다.
- events/realization 감소만으로 Ω의 인과성을 증명하지 않는다.
- intervention 때문에 현상 자체가 정의상 사라진 결과를 causal proof로 과장하지 않는다.

## 1. 고정 공통조건

기존 Main v2의 clean prehistoric world와 canonical OASIS semantics를 유지한다.

공통:
- 6 neutral founders
- H0 empty
- relation-history0 empty
- reward 없음
- Q 없음
- target action 없음
- future stream 없음
- civilization goal 없음
- imported experiment history 없음
- 동일 observation schema
- 동일 life constraint
- 동일 responsibility/resource policy
- 동일 choice policy
- 동일 11 capabilities

capabilities:
observe, move, contact, grasp, carry, release, consume, transfer, strike, combine, rest

world physics, observer, action verifier, exogenous process는 intervention branch 사이에서 동일하다.

## 2. seed 규칙

새 confirmatory seed family를 사용한다.
기존 Main v1/v2 결과를 보고 seed를 선택하지 않는다.

seed는 protocol namespace + index의 deterministic hash 순서로 생성한다.

예:
`oasis-gamma-omega-causal-v1:000` ...

각 실험은 hash 순서 첫 40개 family를 사전 고정한다.

intervention eligibility를 충족하지 못한 seed도 삭제하지 않고 `INTERVENTION_NOT_REACHED`로 보고한다.

confirmatory causal estimate는 eligibility를 충족한 paired branches에서 계산하고, eligibility rate 자체도 결과로 보고한다.

사후 seed 추가는 하지 않는다.

## 3. intervention-validity gate

개입이 실제 계산경로를 바꾸지 않은 no-op 상태를 causal null로 해석하지 않는다.

각 branch는 개입 직후 반드시 다음을 기록한다.

Gamma gate:
- intact activeRelations count
- intervened activeRelations count
- blocked sourceExperienceId / occurrenceId count

Omega gate:
- intact total possibility count
- intact composite possibility count
- intervened total possibility count
- intervened composite possibility count
- sigma depth distribution

개입 전후 내부 대상값이 동일하면 해당 fork는 `INTERVENTION_NO_OP`로 분류하고 primary causal estimate에서 제외하되 빈도는 보고한다.

## 4. Experiment G — Γ causal probe

### 4.1 질문

과거 historyRelations는 계속 저장되지만, 현재와 다시 관계할 수 있는 historical relation이 Γ를 통해 activeRelations로 재진입하지 못하게 하면 이후 trajectory가 달라지는가?

### 4.2 intervention onset

각 seed trajectory를 intact OASIS로 흐르게 한다.

첫 시점 t에서 다음을 모두 만족하면 checkpoint를 잡는다.

G-eligibility:
1. historyRelations.length > 0
2. canonical Gamma activeRelations.length >= 1
3. 그 active relation 중 최소 하나가 현재 capability instantiation 또는 possibility R_c에 실제로 연결됨

최대 300 cycle 안에 도달하지 않으면 `INTERVENTION_NOT_REACHED`.

### 4.3 동일 checkpoint에서 3-way fork

G0 INTact:
- canonical Γ 그대로

G1 GAMMA-OFF:
- historyRelations 저장과 W incorporation은 그대로 유지
- canonical current observation.relations는 그대로 유지
- Γ output activeRelations만 빈 배열로 강제
- e 값/history record 삭제 금지
- current relation 사용 금지 아님
- 이후 새 realized experience의 history incorporation도 계속 수행

즉 `과거 관계의 현재 재진입 경로`만 차단한다.

G2 HISTORY-LOSS CONTROL:
- Γ 자체는 canonical로 유지
- G1에서 차단되는 active historical relation 수와 동일한 수의 history record를 deterministic hash로 선택해 접근에서 제외
- 선택은 current relevance와 무관하게 수행
- current relations는 유지

목적: Γ의 관계적 재활성화 효과와 단순 history information loss 효과를 분리한다.

G2에서 우연히 active relation이 제거된 정도는 별도 기록한다.

### 4.4 primary outcomes

개입 직후 값 자체보다 이후 흐름을 본다.

paired horizon:
- +1 realized action
- +10 cycles
- +30 cycles
- +100 cycles
- civilization confirmation 또는 natural terminal

외부 primary metrics:
1. first action divergence latency
2. world ledger divergence
3. relation-set divergence
4. relation persistence / recurrence in observable world
5. cross-agent reuse rate
6. historical reuse lag
7. structure count
8. structure survival
9. lineage depth
10. participation breadth
11. civilization evidence-chain path
12. time-to-civilization, 단 우월성 점수가 아니라 trajectory endpoint timing으로만 사용

내부 mediator diagnostics:
- activeRelations count
- historical participants count
- total Omega possibilities
- composite Omega possibilities
- chosen sigma depth
- relation-bearing possibility share

### 4.5 Gamma 결과 해석

G1 != G0이고 G2가 G0에 더 가깝다면:
- generic history loss보다 relational recurrence path의 causal contribution을 지지한다.

G1 ~= G2 != G0이면:
- 과거 정보 손실의 일반효과일 가능성이 크다.

G1 ~= G0:
- 이 scope에서 Gamma causal necessity를 지지하지 않는다.
- redundancy/alternate path 가능성을 별도 분석한다.

G1이 즉시 멈추거나 가능성 생성 자체가 붕괴하면:
- `decomposition-induced failure` 여부를 검사한다.
- current-only possibilities가 정상 생성되는지 확인한 뒤 해석한다.

## 5. Experiment O — Ω composition causal probe

### 5.1 질문

같은 current observation, 같은 activeRelations, 같은 primitive capability instantiation이 존재할 때, 여러 executable primitive step을 관계적으로 순차 composition하는 Ω 기능이 이후 world trajectory에 기여하는가?

### 5.2 intervention onset

intact OASIS를 흐르게 하다가 첫 시점 t에서 다음을 모두 만족하면 checkpoint를 잡는다.

O-eligibility:
1. intact Omega에 atomic possibility 존재
2. intact Omega에 sigma.length >= 2 composite possibility 최소 1개 존재
3. composite possibility 최소 하나가 life constraint를 통과할 수 있음

최대 300 cycle 안에 도달하지 않으면 `INTERVENTION_NOT_REACHED`.

### 5.3 동일 checkpoint에서 3-way fork

O0 INTACT:
- canonical Omega composition 그대로

O1 ATOMIC-ONLY:
- capability instantiation 동일
- activeRelations 동일
- atomic possibility 생성 동일
- sigma.length >= 2 composition만 금지
- current relations, Gamma, participation, responsibility, life constraint, Choice Axis, W incorporation은 유지

O2 COUNT-MATCHED PRUNING CONTROL:
- intact Omega를 먼저 생성
- O1의 candidate count와 동일한 수만 deterministic hash로 유지
- 가능하면 atomic/composite를 모두 포함하도록 stratified deterministic selection
- candidate count 감소 자체와 composition 제거 자체를 분리하기 위한 대조군

### 5.4 primary outcomes

중요:
`events/realization`은 O1에서 기계적으로 감소할 가능성이 매우 높으므로 단독 primary causal evidence로 사용하지 않는다.

primary external outcomes:
1. +10/+30/+100 cycle world ledger divergence
2. relation persistence/recurrence
3. cross-agent reuse
4. structure count/survival
5. lineage depth
6. participation breadth
7. civilization evidence-chain path
8. time-to-civilization
9. normalized world change per primitive step
10. realized sequence novelty / recombination rate

secondary/mechanistic outcomes:
- events/realization
- chosen sigma depth
- composite choice rate
- relation-bearing composite share
- possibility diversity

### 5.5 Omega 결과 해석

O1 != O0이고 O2가 O0에 더 가깝다면:
- candidate count reduction보다 composition 자체의 causal contribution을 지지한다.

O1 ~= O2 != O0이면:
- composition 제거보다 choice-set cardinality 감소의 일반효과일 가능성이 크다.

O1에서 events/realization만 감소하고 장기 external trajectory가 유지되면:
- 4.05 events/realization 차이는 composition의 직접적 표현효과지만 장기 구조 인과성은 지지되지 않는다.

O1에서 downstream relation/structure trajectory도 체계적으로 달라지면:
- Omega composition의 장기 causal contribution을 지지한다.

## 6. Experiment GO — 2x2 interaction probe

G와 O 각각에서 intervention-validity가 충분히 확보된 뒤 실시한다.

공통 onset 조건:
- active Gamma relation >= 1
- admissible composite Omega possibility >= 1

동일 checkpoint 4-way fork:

GO00: Gamma intact + Omega intact
GO10: Gamma off + Omega intact
GO01: Gamma intact + Omega atomic-only
GO11: Gamma off + Omega atomic-only

목적:
- Gamma main effect
- Omega main effect
- Gamma x Omega interaction

해석:
- GO10과 GO01이 각각 차이를 만들고 GO11이 단순 합보다 더 크게 달라지면 interaction 가능성
- Gamma 효과가 Omega composition이 있을 때만 나타나면 `과거 관계 재활성화 -> 복합 가능성 구성` 연쇄를 지지
- Omega 효과가 Gamma off에서도 유지되면 composition의 효과가 historical recurrence에만 의존하지 않음을 의미

이 실험은 factorial causal probe이며 OASIS 전체 우월성 검정이 아니다.

## 7. blind analysis

cross-branch external metric extractor는 branch label을 받지 않는다.

branch label은 집계 단계에서만 결합한다.

observer는 기존 civilization E1-E4 규칙 그대로 유지한다.
observer rule을 결과를 본 뒤 변경하지 않는다.

## 8. paired statistical analysis

seed family별 동일 checkpoint fork이므로 paired analysis를 사용한다.

primary:
- paired effect distribution
- median paired difference
- bootstrap 95% CI
- Wilcoxon signed-rank 또는 permutation paired test

multiple outcomes는 사전 지정한 family별로 correction한다.

civilization confirmation은 포화될 수 있으므로 primary discriminator로 두지 않는다.

trajectory distance는 window별로 보고한다.

효과크기와 방향을 p-value보다 우선 보고한다.

## 9. 사전 중립 가설

Gamma H0:
Gamma-off와 intact 사이에 seed noise를 넘는 downstream trajectory 차이가 없다.

Gamma H1:
Gamma-off가 downstream trajectory를 재현 가능하게 변화시킨다.

Omega H0:
Atomic-only와 intact 사이에 candidate-count control을 넘는 downstream trajectory 차이가 없다.

Omega H1:
Composition 제거가 candidate-count control을 넘는 downstream trajectory 차이를 만든다.

Interaction H0:
Gamma와 Omega의 효과는 독립/가산적이다.

Interaction H1:
Gamma와 Omega 사이에 비가산적 interaction이 있다.

방향은 사전에 정하지 않는다.

## 10. falsification-friendly outcomes

모두 정상 결과다.

- Gamma-off no effect
- Omega atomic-only no downstream effect
- only immediate events/realization effect
- delayed effect only
- pathway substitution
- variance increase/decrease only
- effect only under specific world relation density
- Gamma/Omega interaction absent
- Gamma/Omega interaction present

null 결과를 구현 실패로 재분류하지 않는다. 단 intervention-validity gate를 통과하지 못한 경우만 기술적 no-op로 분리한다.

## 11. 실행 순서

1. code-level intervention unit audit
2. deterministic same-checkpoint equivalence audit for intact/sham branches before intervention
3. Experiment G
4. blind aggregate
5. Experiment O
6. blind aggregate
7. 결과를 보기 전에 고정된 GO 조건이 충족되면 Experiment GO
8. combined causal analysis

본실험 결과를 본 뒤 intervention, metric, seed family, observer를 임의 수정하지 않는다.
구조 변경이 필요하면 v1.1 이상으로 분리한다.
