# P1-2 독립 합성 반증검증 사전등록

## 목적
P1의 핵심 구조인 관계이력과 현재 참여상태의 비독립적 결합이, OASIS 공식 자체를 사용하지 않는 별도 데이터생성 과정에서도 예측에 필요한 경우와 필요하지 않은 경우를 구별할 수 있는지 시험한다.

이 실험은 현실세계 경험적 타당성 검증이 아니라 합성 독립 반증검증이다.

## 데이터생성 체계
서로 다른 네 체계를 사용한다.

1. `null_current_only`
   - 다음 결과는 현재 상태만으로 생성한다.
   - 관계이력과 참여상태는 불필요하다.
   - history 구조가 큰 이득을 보이면 과민반응으로 본다.

2. `markov_participation`
   - 현재 상태와 현재 참여상태만으로 생성한다.
   - 과거 관계이력은 불필요하다.

3. `history_additive`
   - 관계이력은 필요하지만 현재 참여상태와의 상호작용은 필요하지 않다.
   - 단순 history 모델이 충분해야 한다.

4. `history_participation_interaction`
   - 관계이력과 현재 참여상태의 결합이 다음 결과에 영향을 준다.
   - 단, 데이터생성식은 기존 P1 구현의 재활성화 공식과 다른 순차 잠재상태 갱신식으로 구성한다.

## 비교 모델
- current_only
- similarity_memory
- participation_no_history
- relation_additive
- relation_interaction

`relation_interaction`은 P1 구조의 최소 연산적 표현이며 OASIS 전체 모델이 아니다.

## 주평가지표
- held-out binary log loss

## 보조평가지표
- Brier score
- 관계 순서 shuffle에 따른 성능 변화

## 사전등록 판정기준
다음 조건을 모두 만족하면 `STRUCTURE_SUPPORTED_SYNTHETIC`으로 판정한다.

A. 음성대조군 억제
- `null_current_only`에서 relation_interaction이 current_only보다 평균 log loss 0.003 이상 개선하지 않아야 한다.
- `markov_participation`에서 relation_interaction이 participation_no_history보다 평균 log loss 0.003 이상 개선하지 않아야 한다.
- `history_additive`에서 relation_interaction이 relation_additive보다 평균 log loss 0.003 이상 개선하지 않아야 한다.

B. 양성대조군 감도
- `history_participation_interaction`에서 relation_interaction이 relation_additive보다 평균 log loss를 최소 0.004 개선해야 한다.
- 그 개선이 반복 실험의 최소 65%에서 나타나야 한다.

C. 순서 의존성
- `history_participation_interaction`에서 동일 test 사건집합의 순서를 무작위로 섞으면 relation_interaction의 평균 log loss가 최소 0.003 악화되어야 한다.
- `null_current_only`에서 같은 shuffle 악화량은 0.003 미만이어야 한다.

## 판정
- 모든 A/B/C 충족: STRUCTURE_SUPPORTED_SYNTHETIC
- 일부만 충족: PARTIAL
- 양성대조군 실패 또는 음성대조군에서 구조적 과민반응: NOT_SUPPORTED
- 실행/표본 문제가 판정을 막음: INCONCLUSIVE

## 고유성 제한
relation_interaction이 성공하더라도 이는 'history×participation 구조가 필요한 환경을 구별할 수 있음'을 의미할 뿐 OASIS의 독점적 또는 고유한 우월성을 증명하지 않는다. 이후 일반적 상호작용 모델 및 외부 공개데이터와 비교해야 한다.

## 실행 고정값
- 기본 seed: 20260905
- 반복수: 8
- 반복당 train: 700
- 반복당 test: 350
- 동일 코드/seed의 모든 결과를 artifact로 보존한다.
