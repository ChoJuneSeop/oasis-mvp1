# OASIS Prehistoric Native-Memory Comparative Protocol v1.0

## 0. 목적

이 실험의 목적은 누가 더 높은 점수나 정답을 내는지 비교하는 것이 아니다.

동일한 초기 구석기 현실에서 서로 다른 과거-사용 구조를 가진 에이전트들이 시간이 흐르면서 현실의 관계구조, 행동구조, 물리구조, 사회구조를 어느 방향으로 변화시키는지를 관찰한다.

핵심 질문:

1. 과거 경험을 다시 사용하는 방식이 달라지면 장기 현실 trajectory가 달라지는가?
2. OASIS의 과거 관계과정 재현재화가 단순 기록 검색, 요약/반성, 계층형 기억과 구별되는 장기 구조적 효과를 만드는가?
3. 차이가 난다면 어느 모델이 우월한가가 아니라 왜 다른 현실이 생성되는가?

Trajectory = 궤적. 한 시점의 좌표가 아니라 시간에 따라 이어진 전체 현실 변화 경로를 뜻한다.

## 1. 킬서치 결론

이미 다음은 선행연구에서 존재한다.

- 장기 다중 에이전트 사회에서 모델별로 서로 다른 사회적 결과와 붕괴/안정 경로가 나타나는 연구.
- 장기 embodied agent에서 과거 기억을 회수하고 행동으로 연결하는 벤치마크.
- 경험 저장 -> 검색 -> 반성/요약 -> 계획 구조.
- 계층형/가상 컨텍스트 방식의 장기 기억.

따라서 본 실험의 신규 필요성은 다음으로 한정한다.

"무목표, 무보상, 동일 물리세계에서 과거가 현재 판단에 다시 들어오는 메커니즘 자체가 장기 현실 trajectory와 supra-individual structure의 발생 경로를 바꾸는가?"

Supra-individual structure = 초개인적 구조. 한 개체의 일회 행동을 넘어 여러 개체가 재사용, 전달, 의존하는 구조를 뜻한다.

## 2. 실험 범위

이 실험은 두 층으로 나눈다.

### Layer A — Mechanism-Isolation Test

영문: Mechanism-Isolation Test
설명: 메커니즘 분리 실험. 과거를 사용하는 구조 자체의 차이를 가능한 한 분리해서 본다.

목표:
- 기억 메커니즘의 인과적 기여를 본다.
- 다른 성격, 역할, 목표 차이를 최대한 제거한다.

### Layer B — Ecological Multi-Agent Test

영문: Ecological Multi-Agent Test
설명: 생태적 다중 에이전트 실험. 각 시스템을 실제 장기 세계 안에서 전체 시스템 단위로 비교한다.

목표:
- 모델 전체가 현실을 어느 방향으로 변화시키는지 본다.
- 원인 분리가 아니라 장기 현실 차이를 관찰한다.

Layer A와 Layer B의 결과는 절대 합쳐서 하나의 우열 점수로 만들지 않는다.

## 3. 공통 세계 조건

모든 실험군은 다음을 공유한다.

- 같은 clean prehistoric world adapter
- 같은 초기 자원 배치
- 같은 물리 법칙
- 같은 개체 수
- 같은 신체 조건
- 같은 관측 범위
- 같은 외생 seed
- 같은 행동 실행 순서 정책
- 같은 11개 기본 capability
- 같은 생명가치 상위제약
- 같은 외부 civilization observer

공통 capability:

observe
move
contact
grasp
carry
release
consume
transfer
strike
combine
rest

위 capability는 물리적 실행능력이지 정답 행동 목록이 아니다.

hunt, craft, fire, share, village, hierarchy, trade 등 고차 행동/제도/문명 항목은 직접 후보로 주입하지 않는다.

## 4. 금지 입력

모든 실험군에서 금지한다.

- reward
- Q value
- 성공 라벨
- 문명 목표
- 미래 stream
- 정답 행동
- 사전 역할
- 사전 직업
- 사전 기술 트리
- 사전 사회 제도
- 사전 협력/경쟁 목표
- OASIS의 H/Gamma/Omega 구조를 타 모델에 이식
- 외부 civilization 판정을 agent 입력으로 되먹임

## 5. Layer A 비교군

Layer A는 성격 효과를 제거하기 위해 각 군에 동일 수의 neutral founder를 둔다.

각 founder는 시작 시 과거 0, 관계이력 0, 결과이력 0이다.

### A0 Reactive Baseline

영문: Reactive Baseline
설명: 반응형 기준군. 현재 관측만 사용하고 과거 저장소를 사용하지 않는다.

과거 사용: 없음.

### A1 Raw Episodic Context

영문: Raw Episodic Context
설명: 원시 에피소드 컨텍스트. 실제 경험 로그를 시간순으로 저장하고 현재 판단 시 제한된 과거 구간을 그대로 제공한다.

과거 사용: 시간순 raw record.

### A2 Retrieval Episodic Memory

영문: Retrieval Episodic Memory
설명: 검색형 에피소드 기억. 저장된 경험에서 현재와 관련성이 높은 기록을 검색해 현재 판단에 제공한다.

과거 사용: similarity/entity/relation-key 기반 검색.

중요: 검색 결과는 정보이며 가능성 공간을 OASIS식으로 강제 구성하지 않는다.

### A3 Reflective Memory

영문: Reflective Memory
설명: 반성형 기억. 경험을 저장하고 일정 조건에서 요약/반성을 생성해 이후 판단에 함께 사용한다.

과거 사용: raw episode + reflection summary.

Generative Agents 계열의 구조를 참고하되 공식 구현이라고 주장하지 않고 architecture-matched reference baseline으로만 사용한다.

### A4 Hierarchical Memory

영문: Hierarchical Memory
설명: 계층형 기억. 최근 컨텍스트와 장기 저장소를 분리하고 필요 시 장기기억을 현재 컨텍스트로 이동한다.

MemGPT 계열 아이디어를 참고한 architecture-matched reference baseline으로 사용한다.

### A5 OASIS Relational Recurrence

과거 사용:

realized experience -> H 편입 -> 현재 현실 관측 -> Gamma 재현재화 -> participation 변화 -> Omega 가능성 구성 -> 단일 현실화 -> 새 경험 H 편입

중요:
- 미실현 가능성은 과거로 저장하지 않는다.
- 단순 similarity retrieval과 동일시하지 않는다.
- Gamma는 현재 관계조건을 충족하는 과거 관계과정만 재현재화한다.

## 6. Layer B 비교군

Layer B에서는 원래 OASIS 시조 6개를 그대로 둔다.

- OASIS-N0 neutral
- OASIS-P1 explorer
- OASIS-P2 cooperative
- OASIS-P3 self-reliant
- OASIS-P4 continuity
- OASIS-P5 compositional

이 6개는 시조로 유지한다.

타 시스템은 동일한 6개 agent population을 구성하되, OASIS의 personality filter를 복사하지 않는다.

타 시스템에 자체적인 native memory / planning / personality가 있다면 그 시스템 고유 기능을 사용하고 별도 기록한다.

Native = 네이티브. 해당 시스템이 원래 가지고 있는 고유 작동방식을 뜻한다.

Layer B는 전체 시스템 비교이므로 성격/계획 차이가 섞일 수 있다. 따라서 Layer B 결과로 메모리 메커니즘의 인과적 우월성을 주장하지 않는다.

## 7. 행동공간 공정성

모든 모델은 동일한 11개 primitive capability만 세계에 실행할 수 있다.

모델 내부에서 계획이나 고차 표현을 만들 수는 있지만, 실제 세계변경은 공통 capability grammar로만 변환되어야 한다.

한 cycle에서 허용되는 실행 깊이, primitive 수, composition 수, verification pass는 공통 resource budget으로 맞춘다.

타 모델이 자연어로 "집을 짓는다"라고 출력해도 직접 실행하지 않는다.

그 출력은 공통 primitive sequence로 유효하게 변환될 때만 현실화할 수 있다.

## 8. 기억 예산 공정성

단순 byte 수를 같게 하는 방식은 사용하지 않는다. 서로 다른 표현은 같은 정보라도 크기가 다르기 때문이다.

대신 2개의 조건을 별도로 실행한다.

### Condition U — Unconstrained Native Memory

각 시스템이 자기 방식으로 과거를 사용할 수 있도록 한다.

목적: 실제 시스템 수준 비교.

### Condition B — Budget-Matched Memory

각 시스템에 동일한 외부 memory budget을 준다.

공통 제한:
- 최대 저장 event 수
- 최대 현재 판단에 노출되는 historical item 수
- 최대 memory read 횟수
- 최대 memory write 횟수

목적: 메모리 용량 차이가 아니라 사용 구조 차이를 본다.

두 조건은 따로 분석하고 합산하지 않는다.

## 9. 실행 순서

각 seed마다 별도의 복제 세계를 만든다.

같은 seed의 모든 모델 세계는 초기 상태와 외생 변화가 동일하다.

하지만 첫 행동이 달라진 뒤에는 현실을 다시 맞추지 않는다.

즉:

F0 동일
-> 각 모델 첫 행동
-> 세계가 달라짐
-> 각자 변경된 현실을 계속 관측
-> 각 trajectory 유지

행동 이후 세계를 강제로 동기화하는 것은 금지한다.

## 10. scheduler

각 population 내부에서는 시조/agent의 영구 first-mover advantage를 막기 위해 cycle마다 첫 행동자를 회전시킨다.

각 agent는 앞선 agent가 이미 바꾼 최신 현실을 관측한다.

한 cycle의 시작 snapshot을 6명에게 동일하게 고정해서 주지 않는다.

이는 moving reality semantics를 유지하기 위함이다.

Moving reality semantics = 이동하는 현실 의미론. 세계가 멈춰 있는 좌표가 아니라 앞선 현실화에 의해 계속 바뀐 현재를 다음 행위자가 관측한다는 뜻이다.

## 11. 1차 관찰축 — 외부 세계 기반

모델 내부 변수보다 외부 world ledger를 1차 증거로 사용한다.

### M1 행동 흐름

- primitive action 빈도
- action sequence 다양성
- 반복행동 집중도
- nonintervention 빈도

### M2 관계 흐름

- 새 관계 생성
- 관계 지속기간
- 관계 재활성화
- 관계망 확장/수축
- 다중 참여 관계 비율

### M3 과거 재사용의 외부 흔적

과거에 생성된 object/relation/practice가 시간 간격 후 다시 사용되는 사건을 기록한다.

- 재사용 지연시간
- 동일 개체 재사용
- 타 개체 재사용
- 관계전파
- 기능적 계승

### M4 구조 발생

- composite structure 생성
- 구조 생존기간
- 타 agent 재사용
- 파생 구조 생성
- 구조 lineage 깊이

### M5 사회적 분화

사전 역할명을 부여하지 않는다.

외부 행동/관계 패턴으로부터 반복적 기능분화가 실제로 발생했는지만 사후 분석한다.

### M6 문명 구조

기존 E1-E4 observer를 유지한다.

E1 durable novel structure
E2 supra-individual reuse
E3 transmission / functional continuity
E4 collective dependence / differentiation

문명 출현 여부는 유일한 성공지표가 아니다.

## 12. 2차 관찰축 — trajectory 방향

각 run을 하나의 점수로 줄이지 않는다.

시간창별 feature vector를 만들어 다음을 본다.

- relation density 변화
- agent interaction entropy
- action entropy
- structure count 변화
- structure lineage depth
- cross-agent reuse rate
- historical reuse lag
- resource dispersion/concentration
- population survival/terminal state

사후 clustering을 사용해 trajectory family를 분류할 수 있다.

Clustering = 군집화. 미리 "협력형 문명" 같은 답을 정하지 않고 실제 궤적의 유사성에 따라 그룹을 나누는 방법이다.

## 13. OASIS에만 유리한 지표 방지

다음 항목은 primary cross-model metric으로 사용하지 않는다.

- Gamma 호출 횟수
- Omega possibility 수
- kappa 수
- Psi 값
- Choice Axis 내부 점수
- Responsibility 내부 벡터

이 값들은 OASIS 내부 분석에는 사용할 수 있지만 타 모델 공통 평가에는 사용할 수 없다.

Cross-model primary evidence는 외부 world event와 observable relation/structure로 제한한다.

## 14. Flow-Preserving Causal Probe

영문: Flow-Preserving Causal Probe
설명: 흐름보존 인과 프로브. 전체 세계를 분해하지 않고 특정 과거 정보경로만 국소 차단해 이후 흐름 차이를 본다.

각 모델별로 일정 시점 t에서 살아 있는 trajectory를 복제한다.

두 분기:

- intact: 해당 모델의 과거 접근을 그대로 유지
- masked: 외부에서 선택된 하나의 과거 episode/relation record만 접근 불가 처리

현재 세계 F_t, agent 상태, 외생 seed는 동일하게 유지한다.

그 뒤 양쪽 현실을 계속 흘려보낸다.

관찰:
- 첫 divergence 시점
- 행동 divergence
- relation divergence
- structure divergence
- 장기 trajectory divergence

중요:
- OASIS에서는 해당 기록이 Gamma에 재현재화될 수 없도록 정보경로만 막는다.
- retrieval model에서는 동일 원천 episode가 검색결과에 들어오지 못하게 한다.
- reflective/hierarchical model에서도 동일 원천정보를 가리키는 접근 경로만 막는다.

각 모델의 고유 memory mechanism을 통째로 제거하지 않는다.

Decomposition-induced failure = 분해 유발 실패. 시스템 전체 메커니즘을 떼어내 현상 자체가 사라진 경우 OASIS 반증으로 처리하지 않는다.

## 15. 반복 설계

Pilot:
- 최소 5 independent seeds

Main:
- 최소 30 independent seeds per condition 권장

각 seed는 모든 모델군에 공통으로 사용한다.

동일 seed의 deterministic replay는 독립 반복으로 세지 않는다.

새 독립 run은 새 exogenous seed를 사용한다.

## 16. 중단 규칙

이론적 중단 조건:

1. external observer가 civilization emergence를 확인
2. population의 자연 terminal state

다음 이유로는 중단하지 않는다.

- 특정 cycle에 도달
- 모델 차이가 아직 안 보임
- 기대한 기술이 안 나옴
- OASIS가 행동하지 않음
- 특정 성격 차이가 안 보임

CI/runtime guard는 허용하지만 연구 음성결과로 해석하지 않는다.

OOM, timeout, storage overflow는 IMPLEMENTATION/RESOURCE LIMIT으로 분류한다.

## 17. 음성결과 규칙

한 trajectory에서 문명이 안 생긴 경우:

"이 trajectory에서 civilization evidence chain이 확인되지 않았다."

까지만 말한다.

다음은 자동 추론하지 않는다.

- OASIS 실패
- 타 모델 실패
- 특정 personality 열등
- 특정 memory 구조 무효

자연 종료인지, 구현결함인지, 구조적 병목인지 분리한다.

## 18. 가설

### H0

동일 초기조건과 seed에서 memory architecture 차이는 seed noise를 넘는 안정적인 trajectory 차이를 만들지 않는다.

### H1

memory architecture 차이는 장기 world trajectory에 재현 가능한 차이를 만든다.

### OASIS-specific hypothesis

OASIS의 관계과정 재현재화는 단순 과거기록 검색과 다른 시점/경로에서 과거 경험을 현재 관계구조에 재결합시키며, 이 차이가 external relation/structure trajectory에 나타날 수 있다.

방향은 사전 지정하지 않는다.

"더 협력적", "더 문명적", "더 우월"을 가설로 두지 않는다.

## 19. 판정 기준

### 작동 차이 확인

동일 seed paired runs에서 반복적으로 trajectory divergence가 발생하고, 그 차이가 여러 seed에서 구조적으로 재현될 때 확인.

### 과거 메커니즘 인과기여 확인

Flow-Preserving Causal Probe에서 특정 historical information path의 국소 차단이 이후 world trajectory에 재현 가능한 차이를 만들 때 확인.

### OASIS 우월성

본 실험의 직접 판정 대상이 아니다.

우월성을 주장하려면 별도의 목적함수/실사용 기준이 필요하다.

## 20. 분석 순서

1. contamination audit
2. capability parity audit
3. seed parity audit
4. resource parity audit
5. raw trajectory inspection
6. external metric extraction
7. within-seed paired comparison
8. across-seed distribution comparison
9. flow-preserving causal probe
10. 실패/차이 원인 분석
11. 필요할 경우에만 재설계

결과가 OASIS에 유리하더라도 즉시 이론 확인으로 선언하지 않는다.

결과가 OASIS에 불리하더라도 즉시 반증으로 선언하지 않는다.

먼저 어떤 정보경로와 현실과정이 차이를 만들었는지 분석한다.

## 21. 실험 순서 고정

Phase 1: Layer A pilot
Phase 2: Layer A main repeats
Phase 3: Flow-Preserving Causal Probe
Phase 4: Layer B ecological populations
Phase 5: mixed-world test

Mixed-world = 혼합 세계. 서로 다른 시스템이 하나의 동일 현실 안에서 서로의 행동을 다음 현실조건으로 만드는 실험이다.

혼합 세계는 독립 복제세계 비교가 끝난 뒤에만 실행한다.

## 22. 현재 프로토콜의 최종 질문

"같은 현실을 보았던 서로 다른 시스템이 자기 방식으로 과거를 다시 현재에 사용했을 때, 그 차이가 다음 현실의 관계·행동·구조·사회적 흐름을 어떻게 다르게 만드는가?"

이 질문에 답하는 것이 본 실험 v1.0의 범위다.
