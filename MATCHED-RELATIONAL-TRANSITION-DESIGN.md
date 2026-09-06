# Matched Relational Transition — frozen pre-result design

## 목적
기존 `relationProcess`가 과거 행동쌍의 결과값(pair residual)에 다시 묶이는 실패를 피하고, 현재와 비슷한 완결 경험들 사이에서 한 참여/행동 요소가 달라졌을 때 `before → after` 흐름변화가 어떻게 달라졌는지를 관계변환으로 추출·합성하는지 검증한다.

## 신규성 판단
이 실험은 신규성 주장용이 아니다. causal nearest-neighbor matching, counterfactual credit assignment, invariant action-effect modeling, compositional causal world models가 이미 존재하므로, 이번 단계는 OASIS 내부 메커니즘 진단으로만 사용한다.

## 고정 조건
- 이전 LOCO holdout seed는 재사용하지 않는다.
- 새 holdout seed 12개를 첫 실행 전 고정한다.
- 모든 모델은 동일 active memory와 동일 LOCO 제거를 받는다.
- 정확한 oracle action pair만 active memory에서 제거하고 두 primitive component는 각각 다른 경험에 남긴다.
- `matchedTransition`은 단일 nearest pair가 아니라 다중 matched pair를 사용한다.
- pair distance가 local caliper를 넘으면 버린다.
- exact-other-component support가 부족할 때만 다른 other-level pair를 고정 penalty와 함께 보조근거로 사용한다.
- support가 부족하면 임의 외삽하지 않는다.
- 두 변환 순서 `[0→1]` / `[1→0]`의 예측 불일치를 기록한다.
- 성능 우승 여부를 CI 성공조건으로 사용하지 않는다.
- 안정성은 원래 좌표 복귀가 아니라 action 후 local gain < 1인 새 국소 수축 흐름으로 평가한다.

## 대조군
- nearestCase
- caseAdapt
- componentValue
- localRewardRidge
- 기존 relationProcess
- 새 matchedTransition

## 핵심 관찰값
- full / LOCO 안정화율
- regret
- oracle action 재생성률
- local novel action 비율
- candidate coverage
- matched pair support
- anchor support
- 두 변환순서의 path agreement
- pair distance

## 강한 반증 기준
1. matchedTransition이 support를 충분히 얻고도 기존 relationProcess보다 개선되지 않으면 현재 관계변환 설계는 실패다.
2. matchedTransition이 개선되더라도 localRewardRidge와 동등/열등하면 OASIS 고유 우월성 근거가 아니다.
3. 성능향상이 특정 exact pair의 간접 재사용 때문이면 재조합 근거로 인정하지 않는다.
4. support가 낮아 결과가 나쁘면 메커니즘 실패와 데이터지원 부족을 구분한다.
