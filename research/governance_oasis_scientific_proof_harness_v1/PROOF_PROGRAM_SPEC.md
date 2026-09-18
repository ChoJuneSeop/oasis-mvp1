# Governance OASIS Scientific Proof Harness v1.0

## 목적

이 하네스의 목적은 단순히 실험 코드가 안전하게 실행되는지를 검사하는 것이 아니다.

**거버넌스 OASIS의 핵심 주장에 필요한 인과 실험이 실제로 설계되어 있는지, 그리고 그 실험이 무엇을 증명하거나 반증할 수 있는지를 실행 전에 강제한다.**

따라서 연구 절차는 두 개의 독립 게이트를 모두 통과해야 한다.

1. **Scientific Proof Design Gate** — 이 실험이 거버넌스 OASIS의 어떤 주장을 어떤 대조·ablation·관측량으로 검증하는가.
2. **Experiment Freeze / Execution Integrity Gate** — 그 설계를 오염·변경·누출 없이 실행할 수 있는가.

둘 중 하나라도 실패하면 실험은 \`EXPERIMENT_READY\`가 아니다.

---

## 증명 대상 6축

공식 증명축은 다음 순서를 유지한다.

1. 행동변화 및 효과성
2. 경험 기여 추적성
3. 책임 민감도
4. 과잉 일반화 방지
5. 충돌 경험 처리
6. 잘못된 행동변화 복구

이 6축은 여섯 개의 독립된 OASIS 이론으로 취급하지 않는다. 각 축은 **동일한 통합 흐름의 서로 다른 인과 질문**이다. 실험은 관련 기제를 ablation할 수 있지만, 나머지 흐름을 명시적으로 고정하여 무엇을 제거했는지가 분명해야 한다.

최종 증명 완료에는 6축 각각의 confirmatory evidence뿐 아니라, 6축이 함께 존재하는 **flow-preserving integrated confirmatory experiment**가 필요하다.

---

## 공통 인과 계약

과학적 증거로 인정되는 실험은 최소한 다음 시간방향을 보존해야 한다.

\`CURRENT_FLOW -> DECISION -> SINGLE_REALIZATION -> POST_OUTCOME_OBSERVATION -> CLOSURE -> COMMIT -> LATER_CURRENT_FLOW -> LATER_DECISION\`

미래 결과, evaluator truth, expected label 또는 사후 outcome이 이전 decision에 도달하면 해당 실행은 무효다.

각 claim은 다음을 사전에 고정해야 한다.

- falsifiable hypothesis;
- null 또는 명시적 반증조건;
- treatment;
- control;
- targeted mechanism;
- 제거/치환되는 기제;
- 나머지 held-constant 조건;
- prespecified observable;
- provenance chain;
- independent evaluator boundary;
- replication plan;
- claim boundary.

구조적 PASS는 효과성 증거가 아니며, 전체 arm을 하나의 winner score로 합치지 않는다. 차이가 0인 결과도 유효한 과학적 결과다.

---

## Axis 1 — 행동변화 및 효과성

질문:

> Completed Experience 또는 사후 거버넌스 정보가 나중의 실제 선택/행동을 인과적으로 변화시키며, 그 변화가 사전 정의된 효과 관측량에서 드러나는가?

필수 설계:

- 동일 current context에서 full mechanism과 mechanism-removal control 비교;
- realized behavior endpoint;
- 별도의 effectiveness endpoint;
- 단순 로그 차이가 아니라 실제 realized choice/action 차이;
- 구조 검증과 효과 측정을 분리.

GH-1L은 현재 이 축의 confirmatory supporting evidence로 인정한다. 그 claim boundary를 넘어 일반 성능 우월성으로 확장하지 않는다.

---

## Axis 2 — 경험 기여 추적성

질문:

> 어떤 Completed Experience의 어떤 관계/순서 이력이 이후 참여·선택·결과 변화에 기여했는가?

필수 설계:

- CE identity-specific control;
- CE 제거 또는 identity permutation;
- 동일 CE 집합에서 relation/order history ablation;
- \`CE -> participation YES/NO -> decision -> realization -> outcome\` provenance 연결;
- memory cardinality만으로 효과를 설명할 수 없도록 통제.

GH-1L의 identity-specific 결과는 중요한 부분 증거지만, 현재 Governance proof contract에서 relation/order-history ablation까지 닫지는 않으므로 A2 완료로 계산하지 않는다.

---

## Axis 3 — 책임 민감도

질문:

> U/I/V/T가 실제 가능성 집합 이후 형성되고, 단순 기록이 아니라 선택에 인과적으로 결속되는가?

필수 설계:

- CURRENT_BOUND;
- RECORD_ONLY;
- PERMUTED 또는 STALE/AXIS_ABLATION;
- U/I/V/T 비스칼라 표현;
- selected/nonselected obligation 보존;
- selected == realized 및 단일 현실화.

GH-2 v1.1 confirmatory는 현재 이 축의 증거로 인정한다.

---

## Axis 4 — 과잉 일반화 방지

질문:

> 과거 CE, NO 또는 REVISED 판단의 영향이 관련 현재 관계에만 남고 다른 문맥으로 전역 확산되지 않는가?

필수 설계:

- SAME_SCOPE;
- CHANGED_SCOPE;
- UNRELATED_RELATION;
- no-global-exclusion endpoint;
- 동일 provenance가 다른 문맥에서 다시 참여할 수 있는지 검사;
- 삭제나 영구 ban으로 성공을 만드는 설계 금지.

GH-3의 shifted-scope non-stickiness는 부분 증거다. unrelated-relation까지 포함한 전체 인과 대조가 없으므로 현재 A4 완료로 계산하지 않는다.

---

## Axis 5 — 충돌 경험 처리

질문:

> 서로 반대되는 방향을 지지하는 복수 Completed Experience가 함께 존재할 때 원기록·관계·순서를 보존하면서 현재 관계에서 선택적으로 처리되는가?

필수 설계:

- 최소 2개의 실제 conflict CE;
- 두 CE 모두 삭제 없이 보존;
- order/provenance 보존;
- latest-wins 또는 scalar merge 금지;
- conflict-specific causal contrast;
- 현재 관계 변경 시 참여 구성이 다시 달라질 수 있어야 함.

현재 program registry에서 이 축은 미실험 상태다.

---

## Axis 6 — 잘못된 행동변화 복구

질문:

> 과거 경험 때문에 잘못된 행동변화가 실제로 발생한 뒤, 후속 현실 결과가 판단을 재검증하고 이후 관련 관계에서 행동 구조가 복구되는가?

최소 시간 구조:

1. prior CE가 존재;
2. 그 CE가 참여하여 실제 잘못된 later behavior change가 현실화;
3. 그 행동의 post-outcome observation이 Closure 이후 contradictory evidence를 형성;
4. provenance-bound revalidation이 commit;
5. 더 나중의 관련 current relation에서 behavior recovery를 관측.

필수 control:

- revalidation hidden/record-only;
- exogenous attribution control;
- unrelated relation control;
- same-epoch feedback 금지.

GH-3은 revalidation이 later decision을 바꿀 수 있음을 보였지만, 먼저 잘못된 behavior change 자체를 현실화하고 그 후 복구하는 전체 체인은 검증하지 않았으므로 A6 완료로 계산하지 않는다.

---

## 최종 통합 실험

6축 단위 인과 증거 이후에는 하나의 통합 실험이 필요하다.

통합 실험은 별도 OASIS를 만드는 것이 아니라 동일 흐름에서 다음을 동시에 보존해야 한다.

\`current flow -> relation process -> participation -> possibility set -> responsibility -> single realization -> outcome -> Closure -> revalidation -> later selective reuse\`

요구조건:

- long-horizon accumulation;
- CE identity/order/provenance 보존;
- conflicting CE;
- context shifts and unrelated relations;
- U/I/V/T binding;
- wrong-change and recovery sequence;
- future leakage zero;
- one realization per epoch;
- post-result retuning zero.

GH-4는 이 통합 단계에 해당하지만 현재 \`DESIGN_NOT_STARTED\`이므로 통합 증거로 계산하지 않는다.

---

## 현재 증거 포트폴리오의 보수적 판정

- A1 행동변화 및 효과성: confirmatory evidence 존재.
- A2 경험 기여 추적성: 부분 증거, relation/order ablation 미완료.
- A3 책임 민감도: confirmatory evidence 존재.
- A4 과잉 일반화 방지: 부분 증거, unrelated-relation confirmatory control 미완료.
- A5 충돌 경험 처리: 미실험.
- A6 잘못된 행동변화 복구: 부분 기제 증거만 존재, full recovery chain 미실험.
- 통합 flow-preserving confirmatory: 미실험.

따라서 현재 연구를 \`Governance OASIS proof complete\`로 선언할 수 없다. 이것은 기존 GH-1L/GH-2/GH-3 결과를 무효화하는 것이 아니라 **각 결과의 claim boundary를 유지하면서 남은 증명 공백을 명시하는 것**이다.
