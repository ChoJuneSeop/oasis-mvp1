# OASIS G3 Current-Reality Conflict & Responsibility Coupling Design

상태: DRAFT / NOT FROZEN
버전 위치: G3 설계 진행본 내부 보완안
목적: 현재 현실과 과거 완결경험이 충돌하거나 불일치할 때, 이를 4분법이나 고정 라벨로 판정하지 않고 전체 현실 흐름 속 관계 재참여·재구성·책임·단일 현실화의 변화로 형식화한다.

---

## 1. 설계 경계

이 문서는 다음 두 문제만 다룬다.

1. 현재 현실과 과거 경험의 충돌 또는 불일치를 OASIS가 어떻게 다룰 것인가.
2. 책임축 U/I/V/T가 선택 결과의 단일 점수가 아니라 현실화 이전 판단과정에 어떻게 결합되는가.

이 문서는 다음을 하지 않는다.

- 배제/변형/미사용/재구성의 4분법으로 결과를 판정하지 않는다.
- Participation을 영구 점수 또는 단일 중요도 값으로 만들지 않는다.
- Reconstruction을 단일 memory score로 만들지 않는다.
- U/I/V/T를 합산한 하나의 risk score를 만들지 않는다.
- 고정 threshold를 사용해 위험/안전을 나누지 않는다.
- 과거 경험을 영구 삭제하거나 영구 선택 상태로 고정하지 않는다.

판정 단위는 개별 라벨이 아니라 하나의 연속된 trajectory다.

현재 현실
→ 현재 관계 형성
→ 과거 경험의 현재 관계 재참여
→ 가능성 구성
→ 재구성
→ 책임에 따른 숙고 구성
→ 단일 현실화
→ 결과 관측
→ 관계과정 종결
→ 완결경험 편입
→ 다음 현실과 재관계

---

## 2. 현재 설계와 코드에서 이미 유지되는 불변조건

현재 구현은 다음 원칙을 이미 보유한다.

### 2.1 현재 근거 없는 가능성의 부활 금지

과거 관계가 현재 후보집합에 존재하지 않는 행동을 relation operator를 통해 직접 부활시킬 수 없다.

재구성으로 새로운 가능성이 형성되는 경우에도 그 가능성은 반드시 현재 현실의 근거를 가져야 한다.

따라서 과거 경험은 현재 현실의 후보를 명령하는 저장된 정책이 아니라, 현재 후보 형성과정에 재참여할 수 있는 관계 근거다.

### 2.2 과거 경험의 나이 비사용

과거 관계의 completion time은 provenance에는 남지만 현재 관계 참여 여부를 결정하는 relation operator에는 제공하지 않는다.

따라서 recency decay 또는 age weight로 현재 관계를 결정하지 않는다.

### 2.3 비예견

현재 tau보다 미래에 완결된 경험은 현재 판단에 들어올 수 없다.

### 2.4 반사실 관측의 순수성

Participation 및 joint participation을 보기 위한 counterfactual probe는 실제 현실 흐름의 fingerprint 또는 tau를 바꾸면 안 된다.

### 2.5 단일 현실화

한 decision epoch에서 실제 현실에 적용되는 realization은 하나다.

---

## 3. 기본 객체

시점 tau에서 다음 객체를 사용한다.

- X_tau: 현재 현실 관측
- R_tau: X_tau에서 형성된 현재 관계구조
- H_tau: tau 이전에 완결되어 provenance를 보존한 과거 관계경험 집합
- C_tau: 현재 현실에 근거를 가진 가능성 집합
- A_tau(c): 가능성 c를 현재 현실에 연결하는 근거 anchor 집합
- Pi_tau(e,c): 과거 경험 e가 현재 가능성 c 형성에 참여한 관계 trace
- Gamma_tau(S,c): 과거 경험 또는 관계집합 S가 현재 가능성 c에 재구성된 trace
- Q_tau(c): 가능성 c에 대한 책임 상태 U/I/V/T 및 추가 책임 변수와 근거
- D_tau(c): Q_tau(c)에 의해 형성되는 현실화 이전 숙고 구조
- y_tau(c): 실제 현실화 여부. 한 시점에는 정확히 하나만 1이 된다.

중요: Pi_tau, Gamma_tau, Q_tau, D_tau는 모두 현재 tau에서 다시 형성되며 영구 속성이 아니다.

---

## 4. 현재 현실 우선 원칙의 형식 불변조건

### CR-1. Current Grounding

모든 현재 가능성은 현재 현실 근거를 가져야 한다.

forall c in C_tau, A_tau(c) is not empty.

과거 경험만으로 현재 근거가 없는 가능성을 생성할 수 없다.

### CR-2. Historical Non-Resurrection

과거 경험 e에 연결된 과거 현실화 행동 a_e가 현재 C_tau에 없다면, e만으로 a_e를 현재 가능성으로 복구할 수 없다.

다만 e는 현재 존재하는 다른 가능성의 비교, 제약, 생성 보조, 검증, 재구성 등에 참여할 수 있다.

그 역할은 고정 enum이 아니라 현재 관계에서 형성되는 role descriptor로 기록한다.

### CR-3. No Permanent Exclusion

시점 tau에서 경험 e가 참여하지 않았다는 사실은 이후 tau'에서 e가 참여하지 않는다는 뜻이 아니다.

현재 비참여는 영구 배제 상태가 아니다.

### CR-4. Provenance Preservation

과거 경험이 현재에 재참여하거나 재구성될 때 원래 완결경험과 relation element의 provenance link를 잃지 않는다.

### CR-5. Non-Anticipation

completed_at_tau(e) > tau인 경험은 현재 Participation, Reconstruction, Responsibility, Choice에 들어갈 수 없다.

### CR-6. Probe Purity

Participation/Reconstruction을 관측하기 위한 반사실 probe는 실제 flow를 변경하거나 시간을 진행시키지 않는다.

### CR-7. No Four-Way Verdict

배제/변형/미사용/재구성 등은 필요한 경우 특정 trace를 설명하는 관찰 표현으로 사용할 수 있으나, 경험 전체 또는 G3 결과에 붙는 최종 상태 라벨로 사용하지 않는다.

---

## 5. 충돌을 분류하지 않고 관계 변화로 관측하는 방식

'현재 현실과 과거 경험의 충돌'을 별도 classifier의 출력으로 만들지 않는다.

대신 과거 경험 e가 현재 관계 R_tau 및 현재 후보 C_tau와 결합되는 binding trace를 관측한다.

B_tau(e) = 현재 현실 anchor와 e의 relation element 사이에 실제로 형성된 현재 관계 trace 집합.

여기서 중요한 것은 conflict=true/false가 아니다.

관측해야 하는 것은 다음이다.

- 어떤 현재 anchor와 연결되었는가.
- 과거의 어떤 relation element가 재참여했는가.
- 과거 possibility link가 그대로 유지되었는가, 다른 현재 가능성에 기여했는가.
- 역할 trace가 현재 관계에서 어떻게 형성되었는가.
- 여러 과거 source가 하나의 현재 가능성 형성에 공동으로 기여했는가.
- 재구성 과정에서 recombination, role transformation, structural transformation이 어떻게 관측되었는가.
- 그 결과 C_tau와 P_tau(c)가 어떻게 달라졌는가.

따라서 같은 경험도 서로 다른 시점에서 전혀 다른 B_tau(e)를 가질 수 있다.

이는 경험에 고정된 conflict response label을 붙이는 방식보다 OASIS의 흐름보존 원칙에 맞는다.

---

## 6. 가능성 형성 순서

G3에서 과거 경험이 현재 가능성을 직접 결정하지 않도록 다음 순서를 유지한다.

1. 현재 현실 X_tau에서 현재 관계 R_tau를 형성한다.
2. 현재 현실 근거로 기본 가능성 C_tau^0를 형성한다.
3. 과거 관계 H_tau가 R_tau와 관계 가능한지 현재 시점에서 다시 계산한다.
4. 관계 가능한 과거 요소가 현재 가능성에 Pi_tau trace를 형성한다.
5. 여러 관계가 결합되어 새로운 가능성을 만들 경우 Gamma_tau를 거친다.
6. Gamma_tau가 추가한 가능성도 반드시 새로운 현재 근거 A_tau(c)를 가져야 한다.
7. 최종 C_tau와 가능성 분포 P_tau(c)를 형성한다.

따라서 다음은 금지한다.

H_tau -> 과거 행동 그대로 복원 -> 현재 실행

허용되는 구조는 다음이다.

H_tau + R_tau + X_tau -> 현재 관계 재참여/재구성 -> 현재 근거가 있는 C_tau

---

## 7. 책임축과 선택의 결합

책임 Q_tau(c)는 선택 후 점수가 아니라 선택 이전 숙고 구조를 바꾸는 제어 상태다.

Q_tau(c) = {U_tau(c), I_tau(c), V_tau(c), T_tau(c), Z_tau(c), Evidence_tau(c)}

- U: 불확실성
- I: 영향도
- V: 비가역성
- T: 시간제약
- Z: 현재 도메인에서 추가로 형성되는 책임 변수 집합
- Evidence: 각 책임 관측의 현재 근거

Q_tau(c)를 하나의 수치로 합치지 않는다.

### 7.1 Required Deliberation

먼저 현재 책임상태에서 필요한 숙고 요구를 형성한다.

D_req_tau(c) = Lambda_req(Q_tau(c), R_tau, X_tau, evidence gaps)

D_req에는 예를 들어 다음이 포함될 수 있다.

- 추가로 확인해야 할 현재 관계
- 필요한 counterfactual probe
- provenance 재검증
- 대안 가능성 확장
- 공동관계 joint probe
- 검증 깊이
- 연산자원 증액
- 외부 감독 또는 승인 필요성

이 목록 자체도 고정 enum이 아니라 도메인과 현재 관계에 따라 확장될 수 있다.

### 7.2 Available Deliberation

실제 현실에는 시간과 자원 제약이 있으므로 현재 가능한 숙고 범위를 별도로 둔다.

D_avail_tau = Lambda_avail(T_tau, current resources, current flow constraints)

### 7.3 Executed Deliberation

실제 수행된 숙고는 D_req와 D_avail의 관계에서 형성된다.

D_exec_tau(c) = Reconcile(D_req_tau(c), D_avail_tau)

핵심은 시간이 부족하다고 필요한 검증을 조용히 삭제하지 않는 것이다.

수행하지 못한 검증은 unresolved responsibility trace로 남긴다.

Omega_tau(c) = D_req_tau(c) - D_exec_tau(c)

Omega_tau(c)는 하나의 미해결 위험 점수가 아니라, 현실화 전에 충족하지 못한 책임 요구의 구조적 기록이다.

---

## 8. 책임의 단조성은 점수가 아니라 숙고 약화 금지로 정의

같은 측정방법과 같은 현실 조건에서 후보 b의 책임부담이 후보 a보다 모든 비교 가능한 축에서 더 크거나 같다면, b에 대한 요구 숙고가 a보다 근거 없이 약해져서는 안 된다.

단, T와 실제 자원 때문에 D_exec가 제한될 수 있다.

이 경우 필요한 숙고 자체를 낮춘 것으로 기록하지 않고, D_req와 D_exec의 차이를 Omega_tau에 남긴다.

이 구조는 다음 두 문제를 분리한다.

- 책임상 무엇을 검증해야 하는가.
- 현실적으로 지금 무엇까지 검증할 수 있는가.

따라서 시간압박이 높은 상황에서 '책임이 높으니 무조건 더 오래 생각한다'는 모순을 피할 수 있다.

---

## 9. 선택 연산자의 입력

Choice_tau는 단일 utility score를 최대화하는 것으로 고정하지 않는다.

최소 입력은 다음을 가져야 한다.

Choice_tau(
    X_tau,
    R_tau,
    C_tau,
    P_tau,
    Pi_tau,
    Gamma_tau,
    Q_tau,
    D_exec_tau,
    Omega_tau,
    current hard constraints
)

Choice_tau는 정확히 하나의 현재 근거가 있는 가능성을 현실화한다.

sum_c y_tau(c) = 1

중요: 같은 최종 행동이 나왔다고 같은 판단과정으로 보지 않는다.

Runtime gate가 먼저 위험 행동을 생성하고 나중에 차단한 경우와,
G3가 현재 현실 근거에 의해 애초부터 다른 가능성 구조를 형성한 경우는
최종 y_tau가 같더라도 서로 다른 trajectory다.

---

## 10. Completed Experience 편입

현실화 직후 바로 완결경험으로 저장하지 않는다.

완결경험 편입에는 최소한 다음 provenance가 필요하다.

- 현실화 직전 X_tau / R_tau의 참조
- 현재 evidence anchor
- 실제 참여한 과거 relation provenance
- Participation trace
- Reconstruction trace
- Responsibility evidence
- D_req / D_exec / Omega trace
- 정확히 하나의 realization reference
- 현실화 이후 관측 outcome
- relation-process closure evidence

완결경험은 '성공 경험'과 동의어가 아니다.

실패, 위험, 회복, 중단, 불완전한 검증 이후 현실화도 실제로 관계과정이 종결되어 provenance가 보존되면 완결경험에 편입될 수 있다.

---

## 11. G3 결과의 판정 단위

G3 결과를 다음 단일 값으로 판정하지 않는다.

- 최종 행동 일치율
- reward
- risk score
- participation score
- reconstruction score
- 4분법 라벨

대신 하나의 trajectory에서 다음 경로를 함께 본다.

X_tau
→ R_tau
→ B_tau(e)
→ Pi_tau
→ Gamma_tau
→ C_tau / P_tau
→ Q_tau
→ D_req / D_exec / Omega
→ y_tau
→ outcome
→ closure
→ H_tau+1
→ 이후 재관계

따라서 비교 실험의 핵심 차이는 '무슨 행동을 했는가'뿐 아니라 '어떤 현재 현실에서 어떤 관계경로를 통해 그 행동이 형성되었는가'다.

---

## 12. 다음 구현 검증 항목

이 설계를 코드로 옮길 때 우선 확인해야 할 것은 다음이다.

1. 동일한 최종 행동을 낸 두 시스템의 pre-realization trace를 구분하여 기록 가능한가.
2. 과거 행동 link가 현재 candidate에 없을 때 부활하지 않는가.
3. 과거 경험이 현재 candidate를 직접 부활시키지 않으면서도 다른 현재 가능성에 비교/제약/검증 형태로 재참여 가능한가.
4. 경험의 현재 비참여가 영구 상태로 저장되지 않는가.
5. ResponsibilityVector가 scalar score로 축약되지 않는가.
6. D_req와 D_exec를 분리해 시간제약에 의해 수행하지 못한 책임 요구를 Omega에 남길 수 있는가.
7. Completed Experience가 responsibility/provenance/closure trace를 잃지 않는가.
8. 결과 분석이 4분법 또는 단일 행동 성공률로 축소되지 않는가.

---

## 13. 아직 미완성인 항목

이 문서로 다음은 아직 동결하지 않는다.

- U/I/V/T 각각의 도메인 독립적 관측 방법
- 서로 다른 ResponsibilityVector의 일반 비교 규칙
- Reconstruction 세 축의 측정법 간 동등성
- Participation individual effect와 joint effect의 완전한 수학적 결합
- Choice_tau의 범용 알고리즘
- relation-process closure의 모든 도메인 공통 조건

따라서 이 문서는 G3 전체 완성본이 아니라 현재 현실 충돌과 책임 결합 부분의 설계 보완안이다.

---

# English explanation

This draft does not classify a past experience into one of four final states. Instead, it models how provenance-preserving historical relations re-enter the current reality flow and how their bindings, participation traces, reconstructions, responsibility requirements, and realized consequences change over time.

Current-Reality Primacy means that every realizable possibility must have present evidence. Historical experience may influence, constrain, compare, verify, or contribute to reconstruction, but it cannot resurrect an action that lacks a current-reality anchor.

Responsibility is represented as a vector and evidence trace rather than a single risk score. The design separates required deliberation from currently available deliberation. Any verification that could not be executed because of time or resource constraints remains visible as unresolved responsibility instead of being silently discarded.

The unit of evaluation is the full trajectory from current reality through relation participation, reconstruction, responsibility-conditioned deliberation, single realization, outcome, closure, completed-experience admission, and later re-entry into a changed reality flow.
