# OASIS 검증 호환성 기준표 — 2026-09-07

## 목적
새 연산자 실험이 기존 OASIS 검증을 덮어쓰거나 과거 결과의 의미를 바꾸지 않도록 실험 지위를 분리한다.

## A. 기준 실험(canonical)

### relation-field.js / browser-world-test.mjs
- 실제 MVP 관계장과 실제 의사결정 흐름 사용
- 최근 relation window: 18
- relation-field episode 보존: 80
- 재활성화 연령 제한: 1200 ticks
- browser matched run: 40 x run100 = 4000 ticks 이상
- 핵심 판정: 관계과정 형성/재조합/현재흐름 재활성화/참여/선택/결과반영이 실제 엔진에서 발생하는가
- NoRelation과 NoFeedback은 기존 정의를 유지
- 높은 횟수나 점수는 우월성 증거로 해석하지 않음

### open-possibility-flow-test.mjs
- 각 stage 520 ticks
- 새 경험이 들어온 뒤 관계/판단 구조의 비폐쇄적 생성 가능성을 관찰
- 유한 실행으로 무한 가능성을 주장하지 않음

## B. 보조 연산자 실험(auxiliary)

### long-horizon-operator-test.mjs
- O1~O4의 계산구조가 장기 시간축에서 구현 가능한지 보는 합성 메커니즘 검증
- production relation-field의 직접 증거가 아님

### o1-order-long-horizon-paired-test.mjs
- 동일 A/B 사건의 순서만 뒤집는 합성 쌍대 장기 실험
- 이후 외생 현실은 동일
- 순서서명에서 유도된 별도 합성 관계키 사용
- production relation-field.js를 import/patch하지 않음
- 결과는 O1 후보의 수학적 가능성에만 사용

## C. 현재 확인된 핵심 비호환점

1. production relation-field의 `pairKey(a,b)`는 정렬되어 관계 키 수준에서 A→B와 B→A를 구분하지 않는다.
2. production episode의 `a`, `b`, `from`에는 순서 흔적이 남지만 현재 활성화/fieldHasPair의 핵심 관계 키는 순서 비민감이다.
3. 따라서 기존 relation-field 결과를 "완전한 비가환 O1 구현"으로 재해석하면 안 된다.
4. 기존 18/80/1200 제한을 제거한 결과를 기존 browser-world 결과와 동일 조건으로 비교하면 안 된다.
5. 장기 합성실험의 수치가 기존 실험의 성공/실패 판정을 변경하지 않는다.

## D. 앞으로의 장기 본검증 원칙

production 코드는 덮어쓰지 않는다.

장기 relation-field 검증은 별도 adapter/harness에서 다음을 병렬 실행한다.

- 기준 재현군: 18 / 80 / 1200 유지
- 장기 확장군: 관계형성·참여·선택·결과반영 규칙은 그대로 유지하고 window/age만 확장

비교 질문은 "어느 것이 더 좋은가"가 아니라 다음이다.

- 유한 창 때문에 어떤 과거 관계과정이 사라지는가
- 창을 확장했을 때 과거 과정이 언제 다시 현재화되는가
- 재활성화가 실제 참여·가능성·선택에 연결되는가
- 차이가 발생했다가 자연복귀하는가
- 끝내 현재화되지 않는 과정이 어떻게 남는가

## E. 논문 사용 등급

- 기준 실험: 현재 구현에 대한 직접 구조증거
- 보조 합성실험: 연산자 수학/구현 가능성 근거
- 장기 adapter 실험: 완료 전까지 논문 본증거로 사용 금지
- Stage 30 미통과 주장(미실현 가능성의 후속 인과효력): 별도 미검증 상태 유지

새 실험은 기존 검증을 "수정"하지 않고, 검증 층을 추가하는 방식으로만 관리한다.
