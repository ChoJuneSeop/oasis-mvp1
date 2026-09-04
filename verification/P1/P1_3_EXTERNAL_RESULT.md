# P1-3 외부/실증 독립검증 결과

Date: 2026-09-05 (Asia/Seoul)
Preregistration commit: 45545d4dfbad3465c0c46c896fa4b40e9b76b73e
Execution run: GitHub Actions 33917331758
Seed: 20260905
Bootstrap: user-cluster paired bootstrap 1,000 reps

## 종합 판정
`P1-3 = PARTIAL_OR_INCONCLUSIVE`

P1 전체에 대한 현재 엄격 판정은 `PARTIAL`이다.

이 결과는 P1의 일반적 history dependence 일부는 외부 데이터에서 지지하지만, 사전등록한 P1 최소 relational-reactivation operationalization이 강한 generic sequence/recency baseline을 넘어서는 OASIS-specific incremental value는 확인하지 못했다는 뜻이다.

## Dataset A — Stanford SNAP MOOC
- loaded users: 7,047
- evaluated users: 5,846
- evaluated targets observed in training: 88
- test transitions: 73,671

### held-out log loss
- B0 global popularity: 5.645043
- B1 current-state first-order Markov: 2.542677
- B2 current + user frequency/recency: 2.542677
- B4 generic second-order Markov: 2.424786
- O1 personalized relational reactivation: 2.544527
- O2 relational reactivation + recency/order: 2.542937

Strongest simpler baseline: `B4`

O2 relative improvement vs B4: `-4.8726%`
95% bootstrap CI: `[-5.2820%, -4.4621%]`

즉 O2가 B4보다 유의하게 나빴다. 반면 B4는 B1보다 약 4.64% 낮은 log loss를 보였다. 따라서 이 데이터에서는 '순차적 관계이력 자체가 유용하다'는 일반 주장은 강하게 지지되지만, 이번 P1 relational-reactivation operationalization의 추가가치는 지지되지 않는다.

### history-order permutation
O2 original log loss: 2.542937
O2 shuffled-history log loss: 2.544174
relative degradation: `+0.0487%`
95% bootstrap CI: `[+0.0259%, +0.0721%]`

순서 교란 효과의 방향은 존재하지만 사전등록 최소효과 0.5%에 크게 못 미친다.

Dataset A verdict: `PARTIAL`

## Dataset B — GroupLens MovieLens 100K
- loaded/evaluated users: 943
- test ratings: 20,381
- target: rating >= 4 binary probability

### held-out log loss
- B0 item/current-state prior: 0.633626
- B2 item + user overall history: 0.639191
- B4 context-independent recency sequence: 0.631745
- O1 genre-conditioned relational reactivation: 0.633236
- O2 genre-conditioned reactivation + recency/order: 0.633316

Strongest simpler baseline: `B4`

O2 relative improvement vs B4: `-0.2487%`
95% bootstrap CI: `[-0.6468%, +0.1149%]`

O2는 강한 baseline을 넘지 못했고 CI도 0을 포함했다. O1은 B0보다 아주 소폭 낮은 log loss였지만 개선폭은 약 0.062%로 사전등록 0.5% threshold에 못 미친다.

### history-order permutation
O2 original log loss: 0.633316
O2 shuffled-history log loss: 0.634856
relative degradation: `+0.2431%`
95% bootstrap CI: `[+0.0416%, +0.4437%]`

순서효과는 통계적으로 양의 방향이지만 사전등록한 최소 실질효과 0.5%에는 못 미친다.

Dataset B verdict: `PARTIAL`

## 사전 Kill Criterion 판정
### K1 core empirical kill
엄격한 사전 K1 조건은 현재 충족하지 않는다. 이유: 두 데이터 모두 O2의 외부 추가가치를 지지하지 않았으나, permutation 효과 CI가 0을 완전히 포함하지 않는 등 K1의 모든 conjunctive 조건이 그대로 충족된 것은 아니다.

### K3 OASIS-specificity kill
`TRIGGERED`.
두 외부 데이터셋 모두 strongest generic/simple sequence baseline B4가 O2와 동등 이상이었고, 특히 MOOC에서는 B4가 O2보다 약 4.87% 우수했다. 따라서 현재 데이터 범위에서 P1의 OASIS-specific incremental value C5는 지지되지 않는다.

Master preregistration 규칙에 따라 K3만으로 P1 전체를 FAIL로 두지는 않으며, `general history dependence supported, OASIS-specificity unsupported`의 PARTIAL 판정을 적용한다.

## 주장별 판정
- C1 context-dependent reactivation: `WEAK / NOT CONSISTENTLY SUPPORTED`
- C2 history dependence beyond current state: `SUPPORTED IN MOOC; WEAK IN MOVIELENS`
- C3 participation/current-context modulation of history: `NOT CONSISTENTLY SUPPORTED`
- C4 observable downstream consequence: `SUPPORTED FOR GENERIC SEQUENCE HISTORY; NOT ESTABLISHED FOR OASIS-SPECIFIC REACTIVATION`
- C5 OASIS-specific incremental value: `NOT SUPPORTED (K3)`

## 중립적 결론
외부 실제 데이터는 '과거 순서/동적 history가 현재/다음 행동 예측에 의미가 있을 수 있다'는 P1의 일반 방향과 양립한다. 그러나 이번에 사전등록한 P1 최소 구현은 단순하고 일반적인 sequence/recency 모델보다 추가 설명력을 보이지 못했다.

따라서 P1을 PASS로 판정하면 안 된다. 현재 가장 엄격하고 적절한 판정은 `PARTIAL`이다.

이는 P1의 존재론적/개념적 정의가 거짓임을 증명한 것도 아니고, OASIS 전체 시스템이 작동하지 않는다는 뜻도 아니다. 다만 외부 데이터에서 OASIS-specific relational field가 별도의 예측적 필요성을 갖는다는 주장은 현재 증거로 성립하지 않는다.

## 다음 단계
P1의 판정은 PARTIAL로 고정하고 P2 독립검증으로 이동한다. 향후 P1을 재검증하려면 post-hoc 개선이 아니라 새로운 preregistered replication으로 별도 기록한다.
