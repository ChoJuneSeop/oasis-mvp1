# P1-2 중립 합성 독립 반증검증 결과

## 판정
`STRUCTURE_SUPPORTED_SYNTHETIC`

이 판정은 합성 독립 반증환경에서 P1의 최소 구조적 주장(관계이력 × 현재 참여상태의 비독립적 결합)이 필요한 조건과 필요하지 않은 조건을 사전등록 기준으로 구별했다는 뜻이다.

현실세계 경험적 검증 또는 OASIS 고유 우월성의 증거가 아니다.

## 실행
- seed: 20260905
- repetitions: 8
- train/rep: 700
- test/rep: 350
- primary metric: held-out binary log loss

## 사전등록 조건
7개 조건 모두 충족.

### 음성대조군
1. null/current-only
   - relation_interaction gain vs current_only = -0.006823
   - 추가 history 구조가 오히려 불리했으며, 허위 이득 기준(< 0.003)을 충족.

2. Markov/current participation
   - relation_interaction gain vs participation_no_history = +0.000161
   - 0.003 미만으로 history의 허위 이득 없음.

3. additive history
   - interaction gain vs relation_additive = -0.001724
   - interaction이 불필요한 환경에서 추가 상호작용 구조의 허위 이득 없음.

### 양성대조군
4. history × participation interaction
   - relation_interaction gain vs relation_additive = +0.006179 log loss
   - 사전등록 최소 개선 0.004를 초과.
   - 8/8 반복에서 개선: positive replication rate = 1.0

### 순서 교란
5. interaction 환경에서 동일 사건집합의 순서를 shuffle
   - relation_interaction log loss 악화 = +0.004433
   - 사전등록 최소 0.003 초과.

6. null 환경에서 동일 shuffle
   - 악화 = +0.001921
   - 0.003 미만.

## 중립적 해석
이번 결과의 중요한 점은 relation/history 구조가 모든 환경에서 무조건 유리하지 않았다는 것이다. current-only, Markov, additive-history 음성대조군에서는 추가 구조가 유의미한 이득을 만들지 않았다. 반대로 관계이력과 현재 참여상태의 상호작용이 실제 데이터생성 과정에 포함된 양성대조군에서만 interaction 구조가 additive 구조보다 개선되었다.

따라서 현재 단계에서 지지되는 것은 다음의 제한된 주장이다.

> 관계 순서/이력과 현재 참여상태가 실제로 비독립적으로 결합하는 환경에서는, 그 상호작용을 제거한 모델보다 이를 표현하는 모델이 후속 결과 예측에서 유리할 수 있으며, 동일 사건집합의 순서 교란은 그 이점을 훼손할 수 있다.

## 아직 지지되지 않은 주장
- 현실세계에서 이런 구조가 일반적으로 존재한다.
- OASIS가 기존 일반 상호작용 모델보다 우월하다.
- 인연필드 전체가 실증적으로 검증되었다.
- P1 전체가 최종 검증되었다.

## 다음 검증
P1-3 외부/실증 검증으로 이동한다. OASIS가 생성하지 않은 공개 또는 독립 데이터에서 관계 순서, 참여상태, 후속 결과를 관측할 수 있는 과제를 선정하고, 동일한 음성대조/ablation 원칙과 사전등록을 유지한다.
