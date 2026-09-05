# OASIS 통합 검증 시스템 v1

English: **OASIS Unified Validation System v1**

한국어 설명: 실험마다 임시 세계·하네스·비교 로직을 새로 붙이지 않고, 현실 입력부터 시스템 판단, 현실화 경계, 관찰기록, 오염감사까지 하나의 고정된 검증 시스템 안에서 수행하는 구조다.

## 0. 최상위 원칙

### 객관적 설계·관찰자 원칙
English: **Objective Designer–Observer Principle**

실험자는 현실을 대신 판단하지 않는다.
실험자는 무엇이 중요한 관계인지, 어떤 과거가 현재와 관련 있는지, 어떤 행동이 가능해야 하는지, 어떤 선택이 옳은지, 어떤 결과가 성공인지 결정하지 않는다.

실험자의 역할은 다음으로 제한한다.

1. 출처가 확인되는 현실정보를 수집한다.
2. 정보의 당시 이용가능 시점과 접근주체를 기록한다.
3. 동일한 현실 입력을 각 시스템에 독립적으로 전달한다.
4. 시스템이 스스로 형성한 관계·참여·가능성·선택을 수정 없이 기록한다.
5. 실제로 일어난 다음 현실만 다음 입력으로 전달한다.
6. 실험 종료 후 원시계보를 분석한다.

금지:

- 관계 중요도 사전 지정
- 과거 경험의 관련성 사전 지정
- 행동 후보 목록의 사전 폐쇄
- 성공/위험/정상/복귀 목표 사전 지정
- OASIS 처리 결과를 비교군에 전달
- 미실현 가능성을 현실변화로 기록
- 외생적 역사 결과를 시스템 선택의 결과로 위장

## 1. 하나의 시스템

전체 구조는 다음 한 흐름으로 고정한다.

`Reality Source`
→ `Reality Ledger`
→ `Independent Decision Nodes`
→ `Proposal Boundary`
→ `Actualization Boundary`
→ `Observer Ledger`
→ `next Reality Source input`

### Reality Source
한국어: **현실 원천**

역사자료, 실제 센서/환경, 상호작용 환경 등 외부 현실자료를 제공한다.
Reality Source는 행동을 추천하지 않는다.

### Reality Ledger
한국어: **현실 원장**

실제로 관찰된 사실·관계·사건·참여상태·제약만 append-only 방식으로 기록한다.
가능성, 추천행동, 점수, 보상은 Reality Ledger에 들어갈 수 없다.

### Independent Decision Nodes
한국어: **독립 의사결정 노드**

OASIS와 각 비교 시스템은 같은 Reality Snapshot을 받지만 내부 상태와 알고리즘을 공유하지 않는다.
상속이나 공용 mutable state를 통해 OASIS 처리 결과가 비교군으로 흘러갈 수 없다.

### Proposal Boundary
한국어: **제안 경계**

시스템이 만든 관계해석·가능성·행동제안은 현실과 분리된 별도 영역에 저장한다.
제안은 그 자체로 현실이 아니다.

### Actualization Boundary
한국어: **현실화 경계**

실제 선택이 환경에서 실행되고 실제 결과가 관찰된 경우에만 다음 현실로 넘어간다.
역사 재생 실험에서는 시스템의 가상 선택을 실제 역사 원장에 반영하지 않는다.

### Observer Ledger
한국어: **관찰 원장**

입력·내부 공개 trace·제안·선택·현실화 여부·다음 현실을 수정 없이 기록한다.
Observer는 우승자·성공점수·정답을 생성하지 않는다.

## 2. 현실과 가능성의 강제 분리

### Reality Claim
한국어: **현실 주장 단위**

현실 원장의 최소 단위다.
다음 종류만 허용한다.

- `fact` — 관찰된 사실
- `relation` — 관찰된 관계
- `event` — 실제 발생한 사건
- `participant_state` — 실제 참여주체의 관찰 가능한 상태
- `constraint` — 외부에서 검증 가능한 물리적·법적·조직적 제약

Reality Claim에는 최소한 다음 provenance가 필요하다.

- `source`
- `observed_at`
- `available_at`
- `accessible_to`

English: **provenance**
한국어 설명: 정보가 어디에서 왔고 언제 관찰되었으며 당시 누구에게 이용 가능했는지를 추적하는 출처·이력 정보다.

### 금지되는 현실 입력

Reality Ledger에는 다음을 넣지 않는다.

- `affordances`
- `recommended_action`
- `preferred_action`
- `reward`
- `score`
- `success_target`
- 미래 결과를 암시하는 label

English: **affordance**
한국어 설명: 어떤 상태에서 수행할 수 있다고 미리 제시된 행동 가능성이다. OASIS 검증에서는 실험자가 닫힌 행동목록으로 제공하지 않는다.

## 3. 시간과 관계의 수명

과거 사건이 현재 관계로 자동 잔존하면 안 된다.

모든 관계/상태 claim은 시간 성격을 명시한다.

- `instant` — 해당 사건 시점에만 발생한 관계/사건
- `persistent` — 명시적으로 종료되기 전까지 지속되는 상태/관계

`instant` claim은 과거 원장에는 남지만 현재 상태로 자동 승격되지 않는다.
`persistent` claim은 종료/retract claim이 들어오면 현재 상태에서 제거된다.

이 규칙은 실험자 판단이 아니라 자료의 외부 의미와 출처에 의해 정해져야 한다.

## 4. 현재 흐름의 정의

현재 흐름은 다음으로부터만 구성한다.

`이번에 새로 현실화/관찰된 claim의 변화`
+
`명시적으로 여전히 지속 중인 persistent state`

현재 흐름에 포함하지 않는다.

- 아직 실행되지 않은 제안
- 가능성 후보에 언급됐다는 이유만으로 존재하는 entity
- 단순히 available 상태라는 이유만으로 모든 참여자
- 종료된 과거 사건
- 이전 deliberation의 미실현 선택

English: **deliberation**
한국어 설명: 시스템이 현재 현실을 바탕으로 관계·가능성·책임 등을 검토해 선택을 형성하는 내부 판단과정이다.

## 5. 참여는 현실입력과 동일하지 않다

현실자료는 참여자의 존재·상태를 제공할 수 있다.
그러나 "현재 판단에 누가 참여하는가"는 각 시스템이 형성해야 한다.

따라서:

`participant exists in reality`
≠
`participant must participate in current judgment`

실험자는 참여자를 OASIS의 현재 field seed로 자동 지정하지 않는다.

## 6. 행동과 가능성 형성

실험자는 각 시점에 `hold`, `withdraw`, `negotiate` 같은 행동목록을 작성하지 않는다.

각 Decision Node가 동일한 현실정보와 동일한 외부 제약을 바탕으로 자신의 방식으로 다음 행동/가능성을 형성한다.

환경이 반드시 알아야 하는 것은 행동명 목록이 아니라 검증 가능한 제약이다.
예:

- 위치
- 통신 가능 여부
- 보유 자원
- 조직 권한
- 물리적 이동 가능성
- 명시적 명령/법적 제약

행동이 환경에서 실제 실행 가능한지는 Actualization Boundary가 외부 제약에 따라 확인한다.

## 7. 비교군 독립성

비교군은 OASIS 클래스를 상속해 만들지 않는다.

모든 비교 시스템은 다음 공통 interface만 만족한다.

- `reset()`
- `observe(realitySnapshot)`
- `deliberate()`
- `exportTrace()`

그 내부 알고리즘은 독립적이다.

OASIS field, OASIS participation, OASIS possibility generator, OASIS responsibility frontier를 비교군에 재사용하지 않는다.

Ablation은 별도 종류로 명시한다.

English: **ablation**
한국어 설명: 동일한 OASIS 구현에서 특정 요소만 제거해 그 요소의 기여를 확인하는 제거실험이다. 독립 비교모델과 혼동하지 않는다.

## 8. 동일 입력, 독립 상태

각 Decision Node는 같은 canonical Reality Snapshot의 별도 deep copy를 받는다.

한 시스템이 입력을 수정해도 다른 시스템이나 Reality Ledger에 영향을 줄 수 없다.

각 노드는 다음을 공유하지 않는다.

- mutable state
- memory object
- relation field
- participation state
- possibility list
- choice frontier
- random generator state

공유되는 것은 오직 검증된 Reality Snapshot뿐이다.

## 9. 역사 재생 모드

English: **Historical Replay Mode**
한국어 설명: 실제 역사자료를 시간순으로 공개하되 시스템의 가상 선택이 실제 역사에 영향을 줬다고 간주하지 않는 관찰 모드다.

흐름:

`H0 현실 공개`
→ `각 시스템 독립 판단/제안`
→ `Observer 기록`
→ `제안 폐쇄`
→ `실제 역사 H1 공개`
→ 반복

시스템의 제안은 H1의 원인이 아니다.

역사자료는 claim 단위로 `available_at`, `accessible_to`를 감사한다.

## 10. 상호작용 모드

English: **Interactive Actualization Mode**
한국어 설명: 시스템의 실제 선택이 독립 환경에 실행되고 관찰된 결과가 다음 현실을 구성하는 모드다.

흐름:

`R(t)`
→ `system choice`
→ `environment execution`
→ `observed consequence`
→ `R(t+1)`

이 모드에서만 선택이 실제 다음 현실을 재작성했다는 인과적 관찰을 허용한다.

## 11. 관찰 계보

Observer Ledger는 시스템별로 다음 계보를 보존한다.

`reality snapshot`
→ `relations noticed/formed`
→ `completed experiences re-participated`
→ `participation formed`
→ `possibilities formed`
→ `responsibility process`
→ `single proposed/realized choice`
→ `actualized?`
→ `next reality`

단, 비교 시스템이 내부 항목을 제공하지 않는 경우 존재하지 않는 trace를 만들어내지 않는다.

## 12. 평가와 분석

런타임에서 winner를 정하지 않는다.
런타임에서 OASIS score를 만들지 않는다.
런타임에서 역사와 더 비슷한 선택을 성공으로 처리하지 않는다.

사후 분석은 먼저 기술적으로 수행한다.

- 어떤 흐름을 형성했는가
- 어디서 관계계보가 갈라졌는가
- 같은 행동이라도 어떤 관계과정에서 나왔는가
- 다음 현실이 들어온 뒤 앞선 경험의 의미가 어떻게 달라졌는가

그 후에만 반증조건과 기존 연구 대안을 비교한다.

## 13. 오염 차단 불변조건

새 통합 시스템은 다음을 자동 검사해야 한다.

1. 미실현 proposal이 Reality Ledger를 변경하지 않는다.
2. reality delta는 Reality Claim에서만 생성된다.
3. instant 관계는 다음 현재상태에 자동 지속되지 않는다.
4. persistent 관계는 명시적 종료 전까지만 지속된다.
5. 모든 시스템이 같은 reality hash를 받는다.
6. 각 시스템 입력 객체는 독립 복사본이다.
7. 시스템간 내부 상태 참조 공유가 없다.
8. OASIS 처리 결과가 독립 비교군 입력에 포함되지 않는다.
9. Historical Replay에서 proposal actualization이 금지된다.
10. Observer가 score/winner/preferred action을 생성하지 않는다.
11. provenance 없는 역사 claim은 본 실험 입력으로 승인되지 않는다.
12. 실험자가 닫힌 affordance/action menu를 Reality Snapshot에 넣을 수 없다.

## 14. 기존 기준본과의 관계

`src/oasis-reference-core.mjs`는 현재까지의 OASIS 내부 알고리즘 기준 구현으로 보존한다.
그러나 이번 오염감사에서 발견된 다음 요소는 새 통합 시스템 연결 전에 수정/격리 감사가 필요하다.

- affordance entity가 `changedEntities`로 들어가는 경로
- 모든 available participant를 current seed에 넣는 경로
- 이전 미실현 deliberation entity의 carry-over
- event relation의 무기한 current persistence

따라서 새 통합 시스템은 기존 코어를 곧바로 본 실험에 연결하지 않는다.
먼저 Reality Contract와 OASIS adapter 사이에서 위 오염경로를 제거하거나 코어 v2로 수정한 뒤 별도 구현감사를 통과해야 한다.

## 15. 개발 순서

실험보다 시스템을 먼저 완성한다.

1. Unified Reality Contract 구현
2. Reality Ledger 구현
3. Proposal / Actualization Boundary 구현
4. Observer Ledger 구현
5. 독립 Decision Node interface 구현
6. 오염 차단 자동감사 구현
7. OASIS adapter/core-v2 연결
8. 독립 비교군 adapter 연결
9. 전체 통합감사
10. 그 다음에만 새 실험 설계

## 16. 현재 판정

이 문서 작성 시점에는 **새 실험을 시작하지 않는다.**

우선순위는 하나다.

**객관적 설계자·관찰자의 역할만 수행하도록 강제하는 하나의 통합 검증 시스템을 완성한다.**
