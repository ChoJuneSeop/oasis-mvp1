# OASIS 이질성 이후 흐름 검증 기록 — 2026-09-06

## 검증 질문
이질성을 고정된 사건으로 정의하지 않은 연속 현실 흐름에서, 이탈 이후 스스로 기존 흐름으로 복귀하는 경우와 미해소 상태가 지속되는 경우에 OASIS의 관계경험 참여와 행동 궤적이 달라지는가?

영문 용어 설명: post-hoc heterogeneity flow validation은 이질성의 종류를 모델에게 사전에 알려주지 않고 전체 실행 후 reference trajectory에서 흐름을 사후 분류하는 검증을 뜻한다. Closed-experience relation memory는 행동 전 흐름, 행동, 행동 후 흐름을 하나의 완료된 경험으로 저장하는 관계기억 표현을 뜻한다.

## 실험 전 확인
- 기존 responsibility-allocation 시험은 Phase 3에서 위험도와 목표를 실험자가 직접 강제했으므로 이번 질문에는 부적합했다.
- 기존 relation-field 구현은 현재 위험도와 과거 장소 위험도의 근접성으로 관계를 활성화하여, 이질성 이후의 흐름보다 순간 상태 유사성에 과도하게 의존할 가능성이 확인됐다.
- 단순 surprise / prediction-error 기반 기억 재활성 및 event segmentation은 기존 연구와 중복 위험이 있어 본 검증의 핵심으로 사용하지 않았다.

## 1차 — 사후 이질성 흐름 검증
- 5 offsets × 3600 ticks
- 67 post-hoc windows: transient 41, persistent 26
- OASIS transient: recovery 0.93, lag 31.0, relation judgment 3.98
- OASIS persistent: recovery 0.96, lag 40.4, relation judgment 5.73
- NoRelation transient lag 25.8, persistent lag 39.2

판정: 관계 참여는 관측됐지만 NoRelation 대비 회복 우위가 없었고, 관계필드가 분석창 전체에서 사실상 계속 활성화되어 자연복귀와 지속흐름을 구별하지 못했다.

## 2차 — 미해소 흐름 기반 탐색예산
- relation judgment: transient 3.98 → 1.51, persistent 5.73 → 1.65
- persistent recovery lag: 40.4 → 48.8

판정: 과잉 관계개입은 줄었으나 새 탐색예산이 실제 양의 예산을 얻지 못했고, 기존 relationHistory 경로가 잔존했다. 따라서 혼합 실험으로 폐기한다.

## 구조 진단
기존 relationField episode는 NPC 쌍, 장소, 시점만 보유하고 그 경험 이후 흐름이 해소됐는지 악화됐는지를 저장하지 않았다. 즉 현재 구현은 이론에서 말하는 ‘완결 경험’보다 관계 유사성 기억에 가까웠다.

## 3차 — 완결 경험형 관계기억 독립 검증
기존 OASIS relation 플래그를 시험 안에서 끄고 새 완결경험 메커니즘만 OASIS-Full에 적용했다. 모든 모델에 동일 실행가능 장소와 동일 행동→현실 피드백 법칙을 적용했다.

- 7 offsets × 4200 ticks
- 152 post-hoc windows
- 완결 여정 345
- 미해소 흐름을 줄인 여정 170
- 관계 episodes 1283, positive episodes 585
- 관계기인 선택변경 98
- peak unresolved-flow need 0.917

기존 면적 기반 분류:
- OASIS transient: lag 14.5, area 120.81, relation choice 1.21
- OASIS persistent: lag 32.1, area 139.45, relation choice 0.84
- NoRelation transient: lag 14.9, area 123.13
- NoRelation persistent: lag 32.4, area 140.65

판정: 완결경험 메커니즘은 실제로 형성·사용됐고 NoRelation 대비 작은 방향성 차이가 관찰됐다. 그러나 persistent에서 relation choice가 더 많지 않아 핵심 가설을 지지하지 못했다.

## 4차 재분석 — 자연복귀 시간 기준
면적 크기가 아니라 reference trajectory의 자연복귀 시간으로 다시 보니 전체 수준에서는 오래 지속된 구간에서 관계 선택 변경이 더 많아지는 방향이 보였다. 그러나 시드 분해 결과 자연복귀 구간과 지속구간이 서로 다른 시드에 집중되어 있어 seed confounding이 확인됐다. 따라서 이 전체 비교는 증거로 채택하지 않는다.

동일 시드 내부에서 지속시간 하위/상위 구간을 비교할 수 있었던 5개 시드에서는:
- 최대 미해소 흐름은 오래 지속된 구간에서 5/5 시드 모두 증가
- 관계기인 선택변경률은 오래 지속된 구간에서 4/5 시드 감소

판정: 현재 구현은 ‘이질성 이후 미해소 흐름이 커지는 것’은 추적하지만, 그 책임량을 관계필드의 실제 행동 개입으로 전달하는 연결부가 충분히 작동하지 않는다.

## 현재 결론
1. 이질성을 고정 사건으로 처리한 기존 시험은 본 가설 검증에 부적절했다.
2. ‘현재 좌표 위험값’ 대신 ‘이탈 이후 흐름’을 관찰하도록 시험 구조를 교정했다.
3. 완결 경험에 결과 정보를 포함해야 한다는 구조적 필요성이 실험에서 드러났다.
4. 현재 데이터는 OASIS 우월성을 입증하지 않는다.
5. 현재 병목은 unresolved-flow responsibility가 증가해도 relation intervention으로 일관되게 전달되지 않는 결합부다.
6. 다음 검증은 각 동일 시드 내부에 빠른 자연복귀와 오래 지속되는 흐름이 모두 존재하도록 reference 환경을 먼저 검증한 뒤, relation-support mass와 실제 행동변경을 별도로 계측해야 한다.

## 상태
- 실험 브랜치: `validation/heterogeneity-flow`
- `main` 미변경
- 핵심 GitHub Actions run: `34005306145` — success
- 이 기록은 검증 결과 보존용이며 main 병합 근거가 아니다.
