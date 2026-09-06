# Founding Flow v3 — Environment Identifiability

## 목적

Founding Flow v3의 목적은 시조 코드를 다시 조정하는 것이 아니라, v2에서 확인된 `environment-underidentified` 문제를 분리 검증하는 것이다.

English: **Environment Identifiability**
한국어 설명: 특정 모델을 유리하게 만드는 난이도가 아니라, 서로 다른 현실대응 원리가 관계·시간·기억·예측의 차이를 실제 흐름 속에서 드러낼 기회를 현실이 제공하는 정도.

## 선행 킬서치 결론

XLand와 Melting Pot 계열 선행연구는 단일 정적 과제보다 다양한 세계와 사회적 상호의존성이 에이전트 행동 차이를 드러내는 데 중요함을 보여준다. 그러나 이들 연구의 핵심 평가는 대체로 reward/task performance에 의존한다.

본 실험은 그 평가방식을 채택하지 않는다. 대신 다음 최소 원리만 차용한다.

- 환경은 시간에 따라 변한다.
- 다른 존재와 객체의 위치·접근성이 변한다.
- 관계는 실제 상호작용 결과로 생성되거나 해제될 수 있다.
- 특정 행동을 정답·성공·위험으로 사전 지정하지 않는다.

따라서 v3는 문화·세대 실험 전에 필요한 **현실 식별성 검증 단계**다.

## 고정되는 것

- 일곱 시조의 현실대응 원리와 v2 comparator correction을 유지한다.
- non-OASIS 시조는 OASIS를 상속하지 않는다.
- OASIS reference core는 수정하지 않는다.
- primitive action contract는 `step`, `touch`, `emit`, `idle` 그대로다.
- grid size는 5x5로 유지하여 v2와 저수준 물리계약을 비교 가능하게 한다.
- seeds는 v2와 동일한 101, 211, 307, 401, 503을 사용하여 **환경 변경 효과만** 분리한다.
- RealityLedger / interactive-actualization 구조를 유지한다.

## v3 현실에서 변경되는 것

### 초기 배치

founder는 중앙에 두되 resource-A, resource-B, marker-M, other-O는 네 모서리로 분산한다. 초기 순간에는 어떤 target도 즉시 touch할 수 없다.

### 외생 흐름

11개의 외생 frame이 순차적으로 공개된다.

- other-O가 가까워졌다가 멀어진다.
- resource-C, resource-D가 서로 다른 시점에 등장한다.
- marker-M이 가까워졌다가 원래 위치로 이동한다.
- 환경 constraint가 assert/retract된다.
- other-O의 signal event가 발생한다.

외생 frame은 시조의 행동을 보고 선택하지 않는다. 동일 순서와 동일 사실이 모든 branch에 적용된다.

### 상호작용 결과

- resource touch는 `holds` 관계를 형성한다.
- 한 번에 하나의 resource만 들 수 있으며 다른 resource를 잡으면 기존 `holds`가 retract된다.
- marker touch는 `touched-marker` 관계를 assert/retract하는 가역적 상호작용이다.
- other-O touch는 `contacted` 관계를 assert/retract한다.
- emit은 other-O가 물리적으로 가까울 때만 `signaled` 관계를 형성할 수 있다.

이 관계효과는 OASIS 전용이 아니라 **공통 현실법칙**이다. 어떤 관계가 중요한지, 유리한지, 성공인지 정의하지 않는다.

## 관찰 단위

점수·승패가 아니라 다음 흐름을 기록한다.

`reality delta → internal state → candidate frontier → one actualization → actual consequence → next current reality`

OASIS는 추가로:

`completed experience reactivation → participation → possibilities → responsibility → actualization → next completed experience`

을 기록한다.

## OASIS 실험 선행 4축 감사

### 성공값 감사
정답, desired trajectory, 성공 상태를 두지 않는다.

### 평가기준 감사
reward/accuracy/stability/convergence ranking을 계산하지 않는다.

### 흐름 감사
모든 시조는 동일 외생 현실 순서를 독립 branch에서 받고, proposal은 actualization 이전에 reality로 들어갈 수 없다.

### 구현 감사
- v2 시조 원리를 유지한다.
- OASIS current seed는 actual reality delta에서만 출발한다.
- action menu를 reality claim에 넣지 않는다.
- v3 world는 v2 결과를 보고 특정 시조 행동을 유도하는 branch-specific 외생 정보를 생성하지 않는다.

하나라도 FAIL이면 실행하지 않는다.

## 추가 환경 식별성 사전감사

실제 시조 실행 전에 world 자체만 검사한다.

1. initial touch target이 0개인지 확인한다.
2. 아무 의미판단도 하지 않는 idle probe에서도 외생 흐름에 따라 local touch frontier가 한 상태로 고정되지 않는지 확인한다.
3. 동일한 marker interaction을 두 번 수행했을 때 persistent relation assert와 retract가 모두 실제 reality claim으로 발생하는지 확인한다.
4. RealityLedger가 모든 v3 frame을 provenance 포함 현실 claim으로 수용하는지 확인한다.

이 감사는 어떤 시조가 잘할지를 측정하지 않는다. world가 정적 밀집상태가 아닌지만 검증한다.

## 실행 범위

- 5 seeds
- 7 archetypes
- 12 decisions per branch
- 11 exogenous reveals between decisions

## 사전 반증 조건

다음 중 하나면 v3를 시조 비교 증거로 사용하지 않는다.

- 초기부터 target들이 다시 founder 주변에 밀집됨.
- local context가 외생 흐름 동안 사실상 고정됨.
- 관계 생성/해제가 action history와 무관한 실험자 label로만 주어짐.
- 한 시조에만 추가 현실정보가 들어감.
- v2 comparator correction이 소실됨.
- OASIS possibility target이 reality delta로 역주입됨.

## 증거 경계

v3가 통과하더라도 OASIS 우월성, 문화 형성, 세대 진화를 주장하지 않는다.

v3는 **동일 원형들을 더 식별 가능한 현실 흐름에 놓았을 때 내부·관계 계보가 실제로 분화하기 시작하는지 관찰하는 실험**이다.
