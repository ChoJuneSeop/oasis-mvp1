# P1-3 외부/실증 독립검증 사전등록

Date fixed: 2026-09-05 (Asia/Seoul)
Reference: P1_MASTER_PREREGISTRATION.md, OASIS 이론·수학 통합초안 v0.1

## 0. 원칙
결과를 보기 전에 데이터셋, 과제, 비교군, 주평가지표와 Kill Criterion을 고정한다. 불리한 데이터셋/seed/분할도 삭제하지 않는다. 본 단계는 P1의 외부 실증 타당성 검증이며, 합성실험 결과를 외부 증거로 합산하지 않는다.

## 1. 외부 데이터셋 고정
### Dataset A — Stanford SNAP MOOC temporal interaction dataset
- 실제 MOOC 사용자-활동 상호작용 411,749건
- 사용자 7,047명, 활동 target 97개
- 시간순서, target, 행동 feature, dropout label 존재
- OASIS가 생성하거나 선택적으로 가공한 데이터가 아님

### Dataset B — GroupLens MovieLens 100K
- 실제 MovieLens 평점 100,000건
- 사용자 약 1,000명, 영화 약 1,700편
- user, movie, rating, timestamp, genre 정보 사용
- 고정된 공개 벤치마크 데이터

두 데이터셋은 결과를 확인하기 전에 고정하며, 하나가 실패해도 교체하지 않는다.

## 2. Dataset A 과제: 다음 활동 target 예측
각 사용자 행동열에서 시점 t까지의 행동을 완결 경험으로 보고, 현재 target을 현재 참여/관계조건의 최소 관측표현으로 둔다. 목표는 다음 행동 target y_(t+1)의 확률분포를 예측하는 것이다.

동일 timestamp 내 순서는 실질적 시간순서로 간주하지 않는다. 동일 timestamp를 가로지르는 transition은 주분석에서 제외한다.

사용자별 시간순으로 60% train / 20% validation / 20% test를 고정한다. 모델 튜닝은 validation에서만 수행하며 test 결과를 보고 파라미터를 바꾸지 않는다.

### Dataset A 비교군
- A-B0: global next-target popularity
- A-B1: current-state first-order Markov P(next|current)
- A-B2: current-state + user frequency/recency, current target과 무관한 개인 history 요약
- A-B4: generic sequence baseline, global second-order Markov P(next|previous,current) with backoff
- A-O1: relational reactivation, 사용자의 train history 중 현재 target과 관계된 과거 transition만 재활성하여 다음 target 분포를 구성
- A-O2: A-O1 + relation-history recency weighting. 현재 target이 어떤 과거 transition을 재활성할지와 그 관계순서/시간가중을 함께 사용

A-O1/O2는 OASIS 전체 구현이 아니라 P1의 최소 연산적 operationalization이다.

### Dataset A 반증/교란
- user train history target order를 사용자별로 shuffle하되 target multiset은 보존한다.
- 같은 test set에서 A-O2 성능을 다시 측정한다.
- current target과 무관한 user-frequency baseline은 shuffle에 구조적으로 민감하지 않아야 한다.

## 3. Dataset B 과제: 미래 평점의 고평가 여부 예측
사용자별 평점열에서 rating >= 4를 high-rating=1로 정의한다. 현재 영화의 item/genre는 현재 조건, 과거 평점 사건은 완결 경험으로 둔다. 목표는 각 사용자의 시간상 후반부 평점에서 high-rating 확률을 예측하는 것이다.

사용자별 시간순 60% train / 20% validation / 20% test. 동일 timestamp 묶음의 내부 순서가 임의적일 수 있으므로 recency/order 분석에서는 동일 timestamp 간 상대순서 효과를 제외한다.

### Dataset B 비교군
- B-B0: global/item current-state prior
- B-B2: item prior + 사용자의 전체 과거 선호/frequency 요약
- B-B4: item prior + context-independent recency-weighted user history
- B-O1: current movie genre와 과거 영화 genre의 관계(similarity)에 따라 과거 rating을 context-conditioned reactivation
- B-O2: B-O1 + recency/order weighting

### Dataset B 반증/교란
- 사용자별 train history의 (movie,rating) 사건쌍 순서를 shuffle하여 사건집합은 유지하고 순서만 제거한다.
- B-O2의 held-out log loss 악화를 본다.
- B-O1은 순서가 아닌 context similarity 효과이므로 shuffle에 반드시 악화될 필요는 없다.

## 4. 주평가지표 및 통계
- Primary: held-out log loss
- Secondary: Brier score(이진), top-k/MRR(다중분류 가능 시)
- 사용자 단위 paired bootstrap 1,000회, seed 20260905
- 주효과는 strongest simpler baseline 대비 상대 log-loss 개선율

Positive-support threshold는 master preregistration을 그대로 사용한다:
- relative held-out improvement >= 0.5%
- paired bootstrap 95% CI가 0을 제외
- history-order permutation degradation >= 0.5%이며 95% CI가 0을 제외할 때 order/history consequence 지지

## 5. Dataset별 판정
### SUPPORT
- O1/O2 중 relation-reactivation 구조가 strongest simpler baseline보다 >=0.5% 개선하고 CI가 0을 제외하며,
- 해당 데이터셋에서 주장이 요구하는 permutation/ablation 효과도 재현됨.

### PARTIAL
- history/context 정보는 유효하지만 similarity/recency 또는 generic sequence baseline이 동일하거나 더 잘 설명함.

### NOT_SUPPORTED
- 추가 관계정보의 개선 <0.5%이고 CI가 0을 포함하며, permutation도 <0.5%/CI 0 포함.

### INCONCLUSIVE
- 표본/변수/식별 문제로 사전 기준을 적용할 수 없음.

## 6. P1-3 종합 및 Kill Criterion
- 두 외부 데이터셋 모두 NOT_SUPPORTED이고 master K1 조건을 충족하면 P1 core empirical claim은 해당 외부 범위에서 FAIL.
- 한 데이터셋만 지지하면 P1-3은 PARTIAL 또는 INCONCLUSIVE이며 PASS 금지.
- 두 데이터셋에서 C1-C4가 지지되어도 generic sequence/similarity baseline이 OASIS operationalization과 동등 이상이면 K3에 따라 OASIS-specificity는 지지하지 않고 PARTIAL.
- P1 PASS는 master preregistration의 모든 조건을 만족할 때만 허용한다.

## 7. 고정 seed 및 보고
- primary seed: 20260905
- bootstrap reps: 1000
- 모든 결과 JSON artifact 보존
- 결과 확인 후 threshold/model/dataset 교체는 post-hoc으로만 별도 기록
