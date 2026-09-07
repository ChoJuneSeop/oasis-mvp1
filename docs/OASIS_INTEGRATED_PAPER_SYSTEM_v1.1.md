# OASIS Integrated Paper System v1.1

상태 / Status: CURRENT OFFICIAL PAPER-VALIDATION SYSTEM  
기준일 / Date: 2026-09-08  
상위 기준 / Governing protocol: `../OASIS_RESEARCH_PROTOCOL.md`

## 1. 업데이트 목적

본 버전은 2차 논문 시스템에서 재정의된 `3대 통합원리 → 8개 형식 기본명제 → 1개 통합명제`의 의미론을 유지하면서, 이전 검증엔진에 남아 있던 분해형 검증논리를 교체한다.

핵심 교정:

- 기본명제는 독립 모듈이 아니다.
- OASIS는 하나의 연속 현실흐름 속에서 관계과정, 참여상태, 가능성 조합, 선택·책임, 단일 현실화, 현실화 경험 편입, 후속 현실과의 재관계가 유기적으로 작동하는 시스템이다.
- 검증은 부분을 떼어 각각 입증한 뒤 전체를 재조립하는 방식이 아니라, 전체 흐름을 유지한 상태에서 특정 관계·결합을 국소적으로 개입하는 방식으로 수행한다.

## 2. 유지되는 이론구조

다음 계층은 유지한다.

`3대 통합원리 → 8개 형식 기본명제 → 1개 통합명제`

2차에서 재정의된 기본명제의 현재 의미를 다시 1차 정의로 되돌리지 않는다.

기본명제는 하나의 현실흐름을 서로 다른 형식적 관점에서 기술하기 위한 상호의존적 명제군이다.

## 3. 공식 검증대상

검증의 최소 기본단위는 독립 모듈이 아니라 `전체 OASIS 흐름 / Full OASIS Flow`다.

Canonical flow:

`과거 관계구조 + 현재 현실`
`→ 관계 재활성·참여`
`→ 가능성 조합`
`→ 선택·책임·현실 제약`
`→ 단일 현실화`
`→ 현실화 경험`
`→ 기존 과거 관계구조에 편입`
`→ 새로운 과거 관계구조`
`→ 이후 현실과의 재관계`
`→ 새로운 관계·가능성 조합`

각 시점 내부의 관계는 선형으로 고정하지 않는다.

## 4. 공식 검증 순서

### Stage F0 — Full Flow Baseline

개입 없는 기준 OASIS를 충분한 시간 동안 관찰하여 전체 흐름과 계보를 확보한다.

필수 기록:
- current reality
- activated/re-relatable past relations
- participation state
- possibility composition
- choice/responsibility trace
- realization
- realized experience
- incorporation into Past Relational Structure
- subsequent reality relation
- longitudinal trajectory

### Stage F1 — Flow-Preserving Local Intervention

전체 흐름은 유지하고 특정 정보경로 또는 관계만 개입한다.

예:
- 관계 순서정보만 shuffle
- 특정 재활성 경로만 차단
- participation admission만 제한
- responsibility↔search coupling만 단방향화 또는 고정
- realized-experience incorporation만 지연/차단

비대상 흐름이 함께 붕괴하면 해당 run은 confirmatory evidence에서 제외한다.

### Stage F2 — Interaction/Coupling Perturbation

독립 요소의 효과가 아니라 관계결합 자체를 검증한다.

예:
- relation-history ↔ reactivation
- reactivation ↔ participation
- participation ↔ possibility composition
- responsibility ↔ search space
- realized experience ↔ later relational structure

### Stage F3 — Longitudinal Emergent Validation

전체 흐름이 장기간 반복될 때 나타나는 구조적 확장, 비현재화, 자연복귀, 현실 재구성, 관계 재출현, 비동일 장기 변화 등을 검증한다.

나선은 독립 ON/OFF 모듈로 검증하지 않고 장기 발생현상으로 관측한다.

### Stage F4 — External/Domain Validation

구석기/open-world, NPC/game world, CARLA/Physical AI, 실제 데이터 등으로 전이·외적타당성을 검증한다.

### Stage F5 — Causal Synthesis

F0~F4에서 확보된 흐름보존 증거를 종합한다.

단순 ablation 결과 하나를 보편적 인과증명으로 사용하지 않는다.

## 5. 검증 렌즈 / Validation Lenses

기존 E1~E7은 독립 구현모듈이 아니라 다음 검증 렌즈로 사용한다.

- L1 Relational History & Reactivation
- L2 Possibility Composition & Structural Expansion
- L3 Realization & Realized-Experience Incorporation
- L4 Responsibility / Authority / Resource Control
- L5 Heterogeneity / Non-current / Natural Return / Reality Reconfiguration
- L6 Longitudinal Structural Dynamics
- L7 Application & External Validation

각 렌즈는 Full OASIS Flow를 관측하거나 국소개입하기 위한 실험군이다.

## 6. 증거등급

1. `LEGACY_DISCOVERY`
   - 이전 탐색 실험

2. `LEGACY_DECOMPOSITION`
   - 독립모듈 분해 또는 흐름붕괴 가능성이 있는 실험

3. `FLOW_PRESERVED_OBSERVATIONAL`
   - 개입 없이 전체 흐름에서 계보·현상 관찰

4. `FLOW_PRESERVED_INTERVENTION`
   - 전체 흐름을 유지한 통제 개입

5. `FLOW_PRESERVED_REPLICATED`
   - 사전 정의된 여러 외생흐름·seed에서 반복

6. `INDEPENDENT_EXTERNAL_REPRODUCTION`
   - 현재 harness 밖의 독립 환경/재현

## 7. 실패분류

- `GENUINE_FAILURE`: 흐름보존 조건에서도 주장이 실패
- `DECOMPOSITION_INDUCED_FAILURE`: 분해로 성립조건이 제거됨
- `INTERACTION_FAILURE`: 특정 결합을 끊을 때 현상이 소실됨
- `NULL_WITHIN_HORIZON`: 관측기간 내 차이 미관찰
- `REPRESENTATION_LIMIT`: 현재 구현표현으로 검증 불가

실패는 삭제하지 않으며 성공결과로 재작성하지 않는다.

## 8. 실험 전 Flow-Preservation Gate

모든 confirmatory experiment는 실행 전에 다음을 선언한다.

1. Full Flow baseline
2. 변경할 단 하나의 관계/결합/정보경로
3. 유지해야 하는 비대상 흐름
4. primary downstream outcome
5. decomposition failure criterion
6. genuine falsification criterion
7. 동일 외생조건/seed/twin 규칙
8. 비예견 및 실험자 비개입 규칙

## 9. 현재 v3 인과연구와의 관계

`OASIS Causal Research System v3.0`은 이미 다음 흐름을 구현기준으로 사용한다.

`Past Relational Structure + Current Reality → Possibility Composition → Single Realization → Realized Experience → Incorporation into Existing Past Relational Structure → New Past Relational Structure → Relation with Subsequent Reality`

따라서 v3 증거는 자동 폐기하지 않는다.

각 EX-00~EX-07 결과를 본 v1.1의 Flow-Preservation Gate로 재감사하여 증거등급을 재부여한다.

## 10. 즉시 검증 우선순위

1. EX-04M / EX-05 — 서로 다른 초기 Past Relational Structure가 full longitudinal flow에서 만드는 차이
2. EX-01 — 현실화 경험 편입 후 재활성→참여→후속결과 계보
3. EX-02 — active relational set과 이후 선택/현실의 관계
4. EX-00H — 관계 후보층이 가능성조합·현실화 과정에 참여하는 계보
5. 과거 독립 ablation 실험 — decomposition-induced failure 여부 재분류
6. Responsibility Axis와 Possibility Composition의 흐름보존 국소개입 신규검증

## 11. 판정 원칙

현재 시스템의 목적은 OASIS를 반드시 성공시키는 것이 아니다.

새 검증방식에서도 흐름보존 조건으로 반복 실패하면 해당 주장을 줄이거나 폐기한다.

반대로 독립분해에서는 실패하지만 full-flow local intervention에서만 반복적으로 효과가 나타날 경우, 그 차이 자체가 OASIS의 관계적·유기적 작동가설에 대한 중요한 검증대상이 된다.
