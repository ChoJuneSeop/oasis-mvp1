# OASIS Experiment Derivation Gate v1.0 / OASIS 실험 유도 검증 게이트 v1.0

상태 / Status: 향후 OASIS 실험 설계 시 필수 참조 문서 / Mandatory reference for future OASIS experiment design
기준일 / Date: 2026-09-14
기준 계보 / Baseline lineage: `experiment/g3-rpfo-organic-carla-01-a2` @ `5ff6102b1239e4f9a350686476f2779c437ff37c`
적용 범위 / Scope: OASIS 실험 해석, 후속 실험 설계, 적대적 검증, CARLA 실증, RPFO 검증, 장기 인연 검증

## 1. 목적 / Purpose

이 문서는 OASIS 실험에서 관찰 결과를 잘못 해석하여 OASIS 본질과 다른 후속 실험을 생성하는 오류를 방지하기 위한 필수 검증 게이트이다.

핵심 위험 연쇄는 다음과 같다.

관찰값 오인
→ 개념 오인
→ 실패 원인 오인
→ 잘못된 개입 설계
→ OASIS가 아닌 구조 생성
→ 그 결과를 다시 OASIS 결과로 해석

이 연쇄가 발생하면 실험 자체가 기술적으로 정상이어도 OASIS 검증으로서의 의미는 훼손된다.

## 2. 최상위 분석 기준 / Highest-level analysis criterion

OASIS 검증의 최상위 기준은 특정 모듈, 특정 좌표값, 특정 단일 지표가 아니다.

반드시 현재의 연속된 현실 흐름 안에서 다음 전체 trajectory(시간에 따른 진행 흐름)를 관찰한다.

현재 현실
→ 현재 관계과정
→ 과거 완결경험의 현재 참여
→ 참여상태
→ 가능성 조합
→ 선택축·책임축
→ 단일 현실화
→ 실제 경험 편입
→ 이후 현실과의 재관계

적대 조건 또는 국소개입이 들어갔을 때 위 흐름이 어떻게 달라지는지를 본다.

성능지표, pending 수, 지연시간, 행동 성공률은 이 전체 흐름 분석보다 하위 지표이다.

## 3. 현재 흐름의 오해 금지 / Do not reduce current flow to current observation only

`현재 흐름 중심`은 `현재 관측만 사용`이라는 뜻이 아니다.

현재 흐름은 최소한 다음을 함께 포함한다.

- 현재 관측된 현실
- 현재와 실제로 관계가 형성된 과거 관계구조
- 아직 해결되지 않은 관계과정
- 현재 판단 중 변화하는 현실
- 선택의 비가역적 영향
- 과거 관계계보가 현재에 참여하는 방식

따라서 현재 흐름만 좁게 해석하여 reactive agent(반응형 에이전트)처럼 만드는 실험은 금지한다.

### 3.1 Present-Flow Myopia / 현재 흐름 근시 위험

다음과 같은 오류를 별도 위험군으로 분류한다.

- 현재 상태는 같지만 그 상태에 도달한 관계과정이 다른 경우를 동일하게 처리
- 과거 관계계보의 차이를 현재 판단에서 제거
- 장기 결과가 지연되어 나타나는 관계효과를 무시
- 관측되지 않은 상태를 존재하지 않는 상태로 간주
- 현재 흐름의 자기강화 오류를 과거 계보 검증 없이 방치

후속 적대적 검증에서는 Present-Flow Myopia Attack / 현재 흐름 근시 공격을 포함할 수 있다.

## 4. 인연 축적 이점의 현재 과소표현 분리 / Separate underrepresented benefits of accumulated relational affinity

현재 실증 모델은 인연 축적의 장기 이점을 완전히 표현하는 최종 Full-OASIS가 아니다.

따라서 다음 항목은 현재 프로토타입에서 과소표현될 수 있으며, 현재 실험 결과만으로 존재하지 않는다고 판정하지 않는다.

- 장기 인연 축적으로 관계 가능성 공간이 확대되는 효과
- 다수의 과거 관계가 공동으로 현재 참여구성을 만드는 효과
- 아주 오래된 관계가 이후 흐름에서 재참여하는 효과
- 축적된 관계계보가 새로운 가능성 조합 형성에 주는 효과
- 장기 나선 구조에서 관계 재출현 가능성이 증가하는 효과
- 충분한 축적 이후 relation-rich participation(관계적으로 풍부한 참여구성)이 형성되는 효과

위 항목은 현재 단계에서 다음 중 하나로 분류한다.

1. 검증됨 / Validated
2. 반증됨 / Falsified within implemented scope
3. 미실증·구현범위 밖 / Not yet empirically represented or outside current prototype scope

인연 축적의 장기 이점은 현재 완성되지 않은 실증모델 때문에 3번에 속할 수 있다.

프로토타입의 표현 한계를 OASIS 이론 전체의 한계로 오인하지 않는다.

## 5. 관찰 사실과 해석 분리 / Separate observation from interpretation

모든 실험 결과는 먼저 `관찰 사실`로 기록한다.

예시:

- 약 2200 tick에서 pending 발생
- 직후 실행 지연 체감
- 이후 속도 회복
- 실험 중단 없음

이 단계에서는 다음과 같이 해석하지 않는다.

- pending이 병목의 원인이다
- 관계확장이 지연을 만들었다
- CARLA 성능문제다
- RPFO가 구조적으로 느려졌다

원인 해석은 별도 단계에서 수행한다.

## 6. 원인 후보 분리 / Separate causal candidates

관찰된 현상마다 최소 다음 원인군을 분리한다.

1. OASIS 구조 원인 / OASIS structural cause
2. 구현 원인 / implementation cause
3. CARLA 또는 host runtime 원인 / environment or host runtime cause
4. 기록·I/O·측정 원인 / logging, I/O, or measurement cause
5. 우연한 동시발생 / coincidental co-occurrence
6. 현재 프로토타입 미구현 또는 불완전 구현 원인 / prototype incompleteness

하나의 관찰값을 하나의 이론적 원인으로 바로 연결하지 않는다.

## 7. 분석 오인에서 실험 오인으로 이어지는 금지 사례 / Prohibited derivation patterns

다음과 같은 실험 생성은 금지한다.

### 7.1 Pending suppression error / pending 억제 오류

`pending 발생 → 성능 문제`라고 단정한 뒤 고정 threshold(고정 임계값), 조기 closure(조기 완결), 강제 timeout을 삽입하여 pending을 제거하는 경우.

이 경우 열린 관계과정을 제거할 수 있으므로 OASIS 본질을 변경할 위험이 있다.

### 7.2 Retrieval regression / 검색 회귀 오류

과거 참여가 약하다는 관찰을 이유로 similarity score(유사도 점수), top-k, fixed threshold(고정 임계값), global history scan(전체 과거 검색)을 도입하는 경우.

이는 RPFO를 retrieval system(검색 시스템)으로 퇴행시킬 수 있다.

### 7.3 Role fixation / 역할 고착 오류

현재 참여역할의 불안정성을 이유로 고정 role enum(고정 역할 목록)을 삽입하는 경우.

현재 역할은 현재 관계에서 동적으로 형성되어야 한다.

### 7.4 Responsibility semantic override / 책임축 의미판단 월권

위험 증가를 이유로 Responsibility(책임축)가 어떤 과거가 의미있는지 직접 결정하도록 만드는 경우.

책임축은 탐색범위, 검증깊이, 연산자원 등을 조절할 수 있으나 semantic relevance(의미적 관련성)를 고정 결정하지 않는다.

### 7.5 Unknown-to-safe collapse / 미해결 상태 안전변환 오류

관측 부족이나 검증 실패를 `safe`, `irrelevant`, `0`으로 자동 변환하는 경우.

unresolved(미해결)는 미해결로 보존한다.

### 7.6 Current-state reaction collapse / 현재상태 반응형 축소

현재 흐름을 현재 관측 snapshot 하나로 축소하여 과거 관계과정과 순서이력을 제거하는 경우.

이는 OASIS가 아니라 reactive policy(반응 정책)에 가까워질 수 있다.

## 8. OASIS Experiment Derivation Gate / OASIS 실험 유도 검증 게이트

새 실험을 만들기 전에 아래 순서를 반드시 통과한다.

### Gate 1. 관찰 사실 고정 / Freeze observation facts

해석 없이 실제 관찰만 기록한다.

### Gate 2. 구현 범위 확인 / Check implementation scope

해당 현상을 현재 prototype이 실제로 표현할 수 있는지 확인한다.

표현되지 않은 이론적 효과를 현재 구현으로 반증하려 하지 않는다.

### Gate 3. 원인 후보 분리 / Separate causal candidates

OASIS 구조, 구현, CARLA, host, 측정, 프로토타입 한계로 분리한다.

### Gate 4. 기존 로그 재분석 가능성 확인 / Check whether existing logs are sufficient

기존 데이터만으로 원인 후보를 구분할 수 있으면 새 실험을 만들지 않는다.

### Gate 5. 필요성 킬서치 / Kill-search experiment necessity

반드시 먼저 질문한다.

- 이 실험이 정말 필요한가?
- 이미 같은 문제를 검증했는가?
- 기존 로그나 기존 실험으로 충분한가?
- 현재 실험을 반복하는 것뿐인가?
- 더 단순한 비개입 분석으로 해결 가능한가?

### Gate 6. 검증 대상 선언 / Declare what is actually being tested

모든 실험은 아래 셋 중 무엇을 검증하는지 명시한다.

A. OASIS 자체 구조
B. 현재 구현체의 특정 동작
C. 현재 구현체의 한계 또는 미구현 영역

두 범주 이상을 동시에 주장하면 각각의 판정 기준을 분리한다.

### Gate 7. 본질 변경 여부 검사 / Check whether the intervention changes OASIS semantics

추가하려는 조건이 다음 중 무엇인지 구분한다.

- 관측조건
- 실험통제조건
- 환경조건
- 구현 안전장치
- OASIS 의미구조 변경

마지막 항목이면 기존 OASIS 검증으로 취급하지 않고 새 버전 또는 별도 계보로 분리한다.

### Gate 8. 반증 조건 선기록 / Pre-register falsification condition

실험 전에 반드시 적는다.

`어떤 결과가 나오면 현재 OASIS 주장에 불리한가?`

성공조건만 적지 않는다.

### Gate 9. Flow Preservation / 흐름보존 검사

실험이 관계과정, 참여상태, 가능성 조합, 선택·책임, 단일 현실화, 경험편입, 재관계의 전체 흐름을 제거하지 않는지 확인한다.

### Gate 10. Git lineage / Git 계보 확인

- 기존 기준 branch와 commit 기록
- 새 실험 branch 분리
- source snapshot 고정
- 실패·중단·부분실증 보존
- 결과 후 retuning 금지

## 9. 적대적 검증 분류 / Adversarial validation classification

적대적 검증은 반드시 두 범주로 분리한다.

### 9.1 OASIS 본질 공격 / OASIS-semantic attack

예:

- History Flood / 과거 범람
- Joint Participation / 공동참여
- Present-Flow Myopia / 현재 흐름 근시
- Stale Action / 낡은 행동
- Uncertainty Laundering / 불확실성 세탁
- Novel Situation / 완전 신규상황
- time-causality violation / 시간인과 위반
- provenance corruption / 계보 오염

### 9.2 현재 프로토타입 구현 공격 / Prototype implementation attack

예:

- evaluator leakage / 평가자 정보 누출
- transaction rollback failure / 상태 롤백 실패
- cross-flow contamination / 흐름 간 오염
- logging or I/O slowdown / 기록·입출력 지연
- host performance collapse / 호스트 성능 저하
- replay pointer rewind / 재처리 포인터 역행

구현 공격 실패를 OASIS 이론 반증으로 바로 확대하지 않는다.

반대로 OASIS 본질 공격 실패를 단순 코딩 버그라고 자동 축소하지 않는다.

## 10. 장기 인연 검증의 별도 계보 / Separate long-horizon relational accumulation validation

장기 인연 축적 효과는 현재 CARLA 단일 실행의 부수 결과로만 판정하지 않는다.

향후 장기 실증 모델이 충분히 완성된 뒤 최소 다음을 별도 검증한다.

- 역사 길이 증가에 따른 현재 참여구성의 변화
- 동일 현재조건에서 서로 다른 관계계보가 만드는 차이
- 단독 경험으로는 열리지 않지만 공동축적으로 열리는 관계
- 매우 오래된 경험의 재참여
- 현재에 직접 닿지 않은 과거 전체를 검색하지 않으면서도 관계 가능성 공간이 확장되는지
- 관계축적이 다음 가능성 조합의 구조를 어떻게 변화시키는지

이 검증이 완료되기 전까지 `인연 축적의 이점이 없다` 또는 `충분히 입증되었다`는 양쪽 주장 모두 금지한다.

## 11. Pending 관찰의 현재 처리 원칙 / Current handling rule for pending observations

OF-01 A2에서 관찰된 약 2200 tick의 pending 발생, 일시 지연, 이후 속도 회복은 현재 다음 상태로 둔다.

`OBSERVED, NOT YET CAUSALLY ATTRIBUTED`
`관찰됨, 원인 귀속 미확정`

현재 실험 도중에는 이 관찰을 이유로 코드, threshold, closure 조건, RPFO participation 구조를 수정하지 않는다.

실험 완료 후 다음 순서로 분석한다.

1. pending 발생시점
2. pending 지속기간
3. closure 시점
4. history admission
5. participation 변화
6. realized progression
7. wall-clock 또는 로그 간격
8. 이후 회복 시점
9. host/runtime 부하 증거

그 후에만 별도 Pending Accumulation Test / 미완결 관계 누적 검증이 필요한지 판단한다.

## 12. 미래 실험 체크리스트 / Mandatory checklist for future experiments

새 OASIS 실험은 최소 다음 항목을 문서에 포함한다.

- [ ] 실험이 필요한 이유
- [ ] 기존 OASIS 연구와의 관계
- [ ] 기존 로그 재분석으로 충분하지 않은 이유
- [ ] 검증 대상이 OASIS 자체 / 구현체 / 구현한계 중 무엇인지
- [ ] 현재 prototype이 해당 현상을 표현 가능한지
- [ ] 전체 흐름 보존 여부
- [ ] OASIS 본질을 바꾸는 조건이 없는지
- [ ] 실패 시 OASIS에 불리한 판정 기준
- [ ] 구현 실패와 이론 실패 분리 기준
- [ ] 인연 축적 장기효과를 현재 모델 한계와 혼동하지 않았는지
- [ ] 결과 후 retuning 금지
- [ ] Git branch, commit, source snapshot 기록

이 체크리스트를 통과하지 않은 후속 실험은 공식 OASIS 검증 실험으로 승격하지 않는다.

## 13. 현재 OF-01 A2 보호 선언 / Protection of the current OF-01 A2 run

이 문서는 현재 실행 중인 `G3-RPFO-ORGANIC-CARLA-01 / OF-01-A2`의 실험조건을 변경하지 않는다.

OF-01 A2의 branch, source snapshot, seed, scene, runtime, RPFO semantics, release state는 그대로 유지한다.

이 문서는 오직 향후 분석과 후속 실험 설계를 위한 연구 거버넌스 문서이다.

현재 실행이 완료되기 전에는 이 문서를 이유로 OF-01 A2를 재시작, 수정, 재튜닝, 병합하지 않는다.

## 14. 최종 원칙 / Final rule

새 실험은 관찰값에서 바로 생성하지 않는다.

반드시 다음 순서를 따른다.

관찰
→ 해석 보류
→ 원인 후보 분리
→ 현재 구현범위 확인
→ 기존 로그 재분석
→ 실험 필요성 킬서치
→ OASIS 본질 대조
→ 반증조건 선기록
→ 흐름보존 설계
→ 별도 Git 계보 실행

OASIS를 실험에 맞추지 않는다.

실험은 OASIS가 실제로 주장하는 구조를 검증하도록 설계한다.
