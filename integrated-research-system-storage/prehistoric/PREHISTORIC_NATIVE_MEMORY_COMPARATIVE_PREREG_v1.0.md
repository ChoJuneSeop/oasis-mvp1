# OASIS Prehistoric Native-Memory Comparison — Preregistration v1.0

이 문서는 PREHISTORIC_NATIVE_MEMORY_COMPARATIVE_PROTOCOL_v1.0.md의 실행값을 고정한다.

## 1. 1차 비교군 고정

Layer A는 총 6개 군이다.

A0 Reactive Baseline
A1 Raw Episodic Context
A2 Retrieval Episodic Memory
A3 Reflective Memory
A4 Hierarchical Memory
A5 OASIS Relational Recurrence

각 군은 6명의 neutral founder로 시작한다.

총 agent 수는 세계당 6명이다.

Layer A에서 OASIS-P1~P5 personality는 사용하지 않는다.

이유: memory mechanism과 personality effect를 분리하기 위해서다.

## 2. 2차 비교군 고정

Layer B에서만 기존 OASIS 시조 6명을 사용한다.

OASIS-N0 neutral
OASIS-P1 explorer
OASIS-P2 cooperative
OASIS-P3 self-reliant
OASIS-P4 continuity
OASIS-P5 compositional

타 시스템은 동일하게 6명으로 구성한다.

OASIS personality filter를 타 시스템에 복사하지 않는다.

## 3. 초기조건

모든 군의 H_0 / memory_0 / relation-history_0 / realization-history_0는 empty다.

금지:
reward, Q, target action, future stream, civilization goal, pretrained prehistoric solution, imported old experiment history.

## 4. capability

모든 군 공통 11개:

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

실제 world mutation은 이 grammar만 통한다.

## 5. 반복수

Pilot:
- 5 independent exogenous seeds per group

Main:
- 30 independent exogenous seeds per group

동일 seed는 A0~A5에 공통으로 사용한다.

Deterministic replay는 독립 seed로 세지 않는다.

## 6. run 지속 규칙

연구상 종료조건은 두 개뿐이다.

1. external civilization observer confirmation
2. natural terminal state

고정 cycle 수는 연구 종료조건이 아니다.

컴퓨팅 환경 때문에 segment guard가 필요하면 한 segment를 끊은 뒤 같은 세계 state, 같은 agent state, 같은 random stream position에서 checkpoint continuation한다.

Checkpoint continuation = 체크포인트 연속실행. 같은 trajectory를 중간 저장 후 이어서 실행하는 것이며 새 독립 run이 아니다.

OOM/timeout/runner shutdown은 결과가 아니다.

## 7. Layer A primary comparison

Primary condition은 native/unconstrained history use다.

즉 각 A0~A5는 자기 정의에 맞게 과거를 사용한다.

Budget-matched condition은 primary 결과 이후 sensitivity analysis로만 수행한다.

Sensitivity analysis = 민감도 분석. 메모리 예산 같은 외부 조건을 바꿨을 때 결과가 유지되는지 확인하는 보조 분석이다.

이 순서를 고정하는 이유는 memory budget 통제가 각 구조의 본래 메커니즘을 훼손할 수 있기 때문이다.

## 8. reference baseline 구현 경계

A0~A4는 OASIS 내부 연산자를 사용하지 않는다.

A1:
- 실제 realized experience를 시간순으로 저장
- 과거는 raw chronological context로만 제공
- 별도 relation recurrence 없음

A2:
- realized experience 저장
- current observation과 관련된 과거를 retrieval
- retrieval 결과는 정보 context일 뿐 possibility structure를 강제하지 않음

A3:
- realized experience 저장
- raw memory에서 summary/reflection memory를 추가 생성 가능
- reflection은 미래 정답/목표를 생성하지 않음

A4:
- recent/working memory와 long-term memory를 계층 분리
- 자체 read/write 이동정책 사용
- OASIS Gamma와 동일한 relation predicate를 사용하지 않음

A5:
- canonical OASIS kernel
- H incorporation
- Gamma relational recurrence
- Omega generative possibility composition
- single realization
- realized experience only incorporation

A1~A4가 선행연구의 공식 구현이라고 주장하지 않는다.
Architecture-matched reference baseline으로 명시한다.

## 9. 공통 action interface

모든 군은 동일한 observation schema를 받는다.

모든 군의 최종 실행 요청은 동일 primitive capability schema로 검증한다.

실행할 수 없는 high-level text는 world action으로 인정하지 않는다.

모델이 내부적으로 multi-step plan을 만들 수는 있으나 현실화되는 sequence는 공통 verifier를 통과해야 한다.

## 10. primary evidence

Cross-model primary evidence는 외부 observer가 기록한다.

- world ledger
- realized primitive sequence
- object state
- relation state
- structure lineage
- cross-agent reuse
- transmission/functional continuity
- natural terminal
- civilization E1-E4 evidence chain

OASIS 내부 Gamma/Omega/Psi/Choice/Responsibility 값은 cross-model primary metric이 아니다.

## 11. trajectory analysis

각 trajectory는 시간창별로 다음 외부 feature를 가진다.

- action diversity
- interaction density
- relation persistence
- relation recurrence observed in world
- cross-agent reuse rate
- historical reuse lag
- structure count
- structure survival
- lineage depth
- participation breadth
- resource concentration/dispersion

trajectory family 이름은 사전 지정하지 않는다.
사후 clustering으로 분류한다.

## 12. flow-preserving causal probe

Main 30 seed 중 seed hash 오름차순 첫 10개를 probe seed로 사용한다.

각 probe는 자연스럽게 충분한 과거가 형성된 첫 시점 이후 실시한다.

한 trajectory state를 복제하여:

intact branch = 원래 history access 유지
masked branch = 외부에서 선택한 하나의 historical source event 접근만 차단

현재 world state, agent physical state, exogenous random stream position은 동일하게 둔다.

그 뒤 두 branch를 모두 계속 흘린다.

primary probe outputs:
- first action divergence latency
- world event divergence
- relation divergence
- structure divergence
- civilization evidence-chain divergence

과거 정보 하나를 차단했는데 아무 차이도 안 날 수 있으며 그것 역시 정상 결과다.

## 13. blind observer rule

가능한 모든 cross-model metric extractor와 civilization observer에는 model identity를 전달하지 않는다.

Observer 입력은 world state / ledger만 사용한다.

Blind observer = 블라인드 관찰자. 어느 모델의 세계인지 모르는 상태에서 동일 규칙으로 판정하는 관찰자를 뜻한다.

## 14. 사전 가설

H0:
memory architecture 차이가 seed noise를 넘는 재현 가능한 world trajectory 차이를 만들지 않는다.

H1:
memory architecture 차이가 seed noise를 넘는 재현 가능한 world trajectory 차이를 만든다.

OASIS-specific:
관계과정 재현재화가 실제로 유효하다면 단순 chronological/retrieval/reflection/hierarchical memory와 다른 historical re-entry timing 또는 relation/structure trajectory가 관찰될 수 있다.

방향은 정하지 않는다.

## 15. 금지 결론

아래는 본 실험 하나로 직접 결론내리지 않는다.

- OASIS가 최고의 AI다.
- 문명이 빨리 생긴 모델이 더 우월하다.
- 협력이 많으면 더 우월하다.
- 복잡한 구조물이 많으면 더 우월하다.
- 한 seed의 결과가 이론을 증명/반증한다.

## 16. 성공적인 실험의 정의

성공적인 실험은 OASIS가 이기는 실험이 아니다.

다음이 충족되면 실험 설계가 성공한 것이다.

- 동일 초기조건
- capability parity
- seed parity
- contamination 없음
- observer blind
- 각 모델 고유 history mechanism 유지
- 현실은 행동 이후 강제동기화하지 않음
- 충분한 독립 반복
- 실패/차이에 대한 trajectory-level 원인 분석 가능

이 preregistration 이후 결과를 보고 metric, seed 수, 비교군을 임의 변경하지 않는다.
구조 변경이 필요하면 v1.1 이상 새 버전으로 분리한다.
