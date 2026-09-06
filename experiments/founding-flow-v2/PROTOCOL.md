# Founding Flow v2 — Pre-Registered Protocol

## 목적

Founding Flow v2의 목적은 OASIS 또는 다른 시조의 성능 우열을 판정하는 것이 아니다. v1에서 발견된 비교 시조 구현 편향을 제거하고, 동일한 저수준 현실에서 각 시조가 자신의 원형 원리만으로 어떤 행동계보와 내부변화를 형성하는지 다시 관찰하는 것이다.

## English name

**Founding Flow v2 — Archetype-Faithful Baseline**

한국어 설명: 시조별 고유 현실대응 원리를 유지하면서 숨은 삽입순서, 과도한 기억 중첩, 미정의 목표 종료조건 같은 구현 편향을 제거한 기준 흐름 실험.

## 선행 킬서치 결론

인공 에이전트의 문화전승·사회학습·세대축적 자체는 선행연구가 이미 다룬다. 따라서 본 실험은 “AI도 문화를 만든다”를 주장하기 위한 실험이 아니다. 선행연구 다수는 동일하거나 유사한 학습/보상 규칙 안에서 전승과 진화를 관찰한다. 본 프로젝트에서 아직 분리 검증이 필요한 것은 서로 다른 현실대응 원형을 동일 현실에 놓았을 때의 생성계보 차이다.

따라서 세대 실험에 앞서 시조 구현 자체의 숨은 편향을 제거한 baseline이 필요하다.

## v1에서 동결된 문제

1. Temporal-Relational: 동일 sequence 관계의 배열 삽입순서가 첫 target 선택으로 누출.
2. Episodic: 모든 persistent subject를 context로 사용하여 거의 모든 과거 episode가 계속 관련 있는 것으로 판정.
3. Predictive World Model / Goal Utility: goal completion semantics가 없어 terminal relation 형성 뒤에도 같은 target touch 반복.
4. OASIS: 35/35 선택이 contingent tie였으므로 action sequence를 semantic OASIS 판단으로 해석할 수 없음.

## v2에서 허용되는 변경

### Temporal-Relational
- 동일 최신 sequence의 관계를 하나의 set으로 유지한다.
- 배열 삽입순서는 의미적 선택근거로 사용하지 않는다.
- 동등 후보는 contingent realization으로 분리 기록한다.

### Episodic
- 기억 retrieval context를 전체 persistent world가 아니라 current delta + founder 주변 local context + current relation delta로 제한한다.
- founder 자체는 relevance overlap에서 제외한다.
- 동등 episode는 하나를 임의의 의미적 우선순위로 고르지 않고 동등 frontier로 유지한다.

### Predictive World Model / Goal Utility
- 동일 seed에서 동일 target을 유지한다.
- target과 founder 사이에 type별 terminal relation이 형성되면 goal은 완료된 것으로 간주한다.
  - resource → `holds`
  - marker → `touched-marker`
  - other → `contacted`
- goal 완료 후 새 목표를 실험자가 추가하지 않는다.
- 완료 후 행동차이가 생기더라도 성능으로 해석하지 않는다.

### OASIS
- v1에서 통과한 unified adapter와 reference core를 그대로 사용한다.
- semantic choice와 contingent tie를 결과에서 완전히 분리한다.
- tie action 자체를 관계적 의미판단으로 해석하지 않는다.

## 변경하지 않는 것

- Founding Flow v1의 물리세계 그대로 사용.
- 5x5 공간.
- primitive action: `step`, `touch`, `emit`, `idle`.
- 동일 exogenous frame sequence.
- 동일 seeds: 101, 211, 307, 401, 503.
- 7 decision rounds.
- 동일 RealityLedger / interactive-actualization 구조.
- OASIS reference core 자체는 수정하지 않는다.
- main branch는 수정하지 않는다.

## 왜 세계를 바꾸지 않는가

v2에서 환경까지 복잡하게 바꾸면 comparator correction 효과와 world complexity 효과를 분리할 수 없다. 따라서 v2는 v1과 같은 현실을 사용해 구현편향 제거 효과만 본다. 관계·책임이 더 풍부한 세계는 v2 사후감사를 통과한 뒤 별도 버전에서 설계한다.

## 관찰 단위

점수나 승패가 아니라 각 시조의 흐름을 기록한다.

- reality delta
- internal state change
- relation history / recalled episodes / model prediction / utility state
- candidate frontier
- contingent tie 여부
- one realized primitive action
- actual outcome
- 다음 current reality
- OASIS의 경우 reactivated completed experience, participation, possibilities, choice, responsibility, completed experience lineage

## 금지된 평가

- reward ranking
- accuracy ranking
- winner
- stability/recovery를 성공으로 정의
- action diversity를 창의성으로 정의
- 반복행동을 곧바로 열등성으로 정의
- OASIS tie action을 semantic superiority로 해석

## OASIS 실험 선행 4축 감사

### 1. 성공값 감사
사전 목표 결과, winner, desired trajectory가 없어야 한다.

### 2. 평가기준 감사
cross-system 성능점수를 계산하지 않는다.

### 3. 흐름 감사
모든 시조는 동일 reality content를 독립 branch에서 받고, proposal은 actualization 전 reality에 들어갈 수 없다.

### 4. 구현 감사
- non-OASIS 시조는 OASIS를 상속하지 않는다.
- Temporal-Relational은 insertion-order invariant여야 한다.
- Episodic relevance는 global persistent-subject overlap을 사용하지 않는다.
- Goal completion은 실행 전 정의되어 있어야 한다.
- OASIS current seed는 actual reality delta에서만 출발한다.

하나라도 FAIL이면 실제 실행을 중단한다.

## 사전 반증 조건

다음 중 하나가 발견되면 v2 결과를 논문 증거로 사용하지 않는다.

- 동일 의미 관계의 입력 배열 순서를 바꾸었을 때 Temporal-Relational candidate frontier가 달라짐.
- Episodic retrieval이 current delta/local context와 무관한 global persistent overlap으로 결정됨.
- 완료된 goal target을 World Model 또는 Goal Utility가 terminal 미정의 때문에 계속 최우선으로 반복함.
- OASIS possibility target이 reality delta/current seed로 역주입됨.
- 한 comparator가 OASIS core state를 공유/상속함.
- 실행 뒤 평가기준을 추가해 결과를 유리하게 재분류함.

## 증거 경계

v2가 통과하더라도 다음을 증명하지 않는다.

- 문화 형성
- 세대 진화
- OASIS 우월성
- OASIS 고유성
- 실제 인간사회와 동일한 발전

v2는 오직 **시조 충실도와 baseline 흐름 비교의 다음 단계**다.
