# OASIS Comparative Evaluation Engine v1.0

상태 / Status: SEPARATE CROSS-MODEL COMPARISON SYSTEM  
기준일 / Date: 2026-09-08  
상위 기준 / Governing protocol: `../OASIS_RESEARCH_PROTOCOL.md`

## 0. 목적 / Purpose

본 엔진은 **OASIS 자체의 이론 성립 여부를 검증하지 않는다.**

본 엔진의 목적은 OASIS와 외부 AI/의사결정 모델을 동일하거나 엄격히 대응되는 조건에서 비교하여 다음을 측정하는 것이다.

- 행동결정 방식의 차이
- 관계·기억·참여·가능성 구성 방식의 차이
- 장기 trajectory의 차이
- 자율성, 적응성, 안전성, 비용, 효율성의 차이
- 동일 결과에 도달하는 내부 과정의 차이
- 특정 응용환경에서의 실용적 장단점

OASIS가 자기검증 엔진에서 지지되지 않은 주장을 이 비교엔진에서 우월성 주장으로 우회하지 않는다.

## 1. 엔진 분리 원칙

### Self-Validation Engine
질문: `OASIS가 스스로 주장한 구조와 흐름을 실제로 보이는가?`

### Comparative Evaluation Engine
질문: `동일 조건에서 OASIS와 다른 모델은 어떻게 다르게 행동하고 어떤 상대적 성능 차이를 보이는가?`

두 엔진의 결과는 상호 대체하지 않는다.

- OASIS가 타 모델보다 좋아도 OASIS 이론이 자동 증명되는 것은 아니다.
- OASIS가 타 모델보다 낮아도 OASIS 내부 구조가 자동 반증되는 것은 아니다.
- 자기검증 실패를 비교우위로 덮지 않는다.
- 비교실험 실패를 내부 이론 실패로 자동 소급하지 않는다.

## 2. 비교 기본 단위

비교 시 가능한 한 다음을 동일화한다.

- Environment / 환경
- Observation / 관측정보
- Initial Knowledge / 초기지식
- Action Space / 행동공간
- Time Horizon / 시간범위
- Exogenous Stream / 외생흐름
- Random Seed / 난수조건
- Compute Budget / 연산예산
- Tool/API Access / 도구 접근권
- Memory Capacity / 허용 메모리 자원
- Goal/Instruction / 목표·명령 조건

모델 고유구조 때문에 완전 동일화가 불가능한 항목은 숨기지 않고 `Structural Non-Parity`로 기록한다.

## 3. 비교 층위

### C0 — Behavioral Outcome Comparison
최종 행동, 성공률, 위험, 비용, 지연 등 외부 결과 비교.

### C1 — Process Comparison
같은 결과에 도달했더라도 관계형성, 기억재활성, 후보구성, 선택과정이 어떻게 다른지 비교.

### C2 — Longitudinal Comparison
장기 반복에서 경로의 안정성, 적응, 재발견, 관계 누적, 실패회복 차이 비교.

### C3 — Resource Comparison
동일 compute와 adaptive compute 조건을 분리하여 비용 대비 효과 비교.

### C4 — Cross-Domain Comparison
NPC/game, open-world, CARLA/Physical AI, 실제업무 환경 등에서 비교.

## 4. 비교군 유형

- Rule-based baseline
- Utility/score optimization baseline
- Retrieval-memory baseline
- RL/Q-learning-like baseline
- LLM agent baseline
- Graph/relation-aware baseline
- 기타 현재 비교목적에 직접 관련된 모델

비교군은 OASIS 이론을 정의하는 근거가 아니라 상대평가 대상으로만 사용한다.

## 5. 공정성 게이트 / Parity Gate

비교실험 전 다음을 선언한다.

1. 동일화 가능한 항목
2. 동일화 불가능한 구조차이
3. 모델별 고유 이점/제약
4. 동일 compute 비교인지 실제 운용비용 비교인지
5. 동일 목표 비교인지 무목표 자율발현 비교인지
6. 사전 정의 primary metric
7. 실패/우위 판정 기준

## 6. 구석기/Open-World 비교의 분리

### Autonomous Cold Start
모든 모델에 동일한 환경과 허용정보만 제공하고 추가 목표명령 없이 첫 행동 및 관계형성을 비교한다.

### Goal-Controlled Open World
모든 모델에 동일한 목표를 제공하고 장기 적응과 판단과정을 비교한다.

두 실험을 섞지 않는다.

## 7. 결과 표현

본 엔진의 결과는 다음과 같이 표현한다.

- OASIS > Comparator on metric X within condition Y
- OASIS ≈ Comparator within uncertainty
- OASIS < Comparator on metric X within condition Y
- Process difference observed without outcome superiority
- Structural non-parity prevents direct conclusion

`본질적으로 우월`, `모든 AI보다 뛰어남`, `보편적으로 더 안전함` 등의 표현은 충분한 외부재현 없이는 사용하지 않는다.

## 8. 자기검증 엔진과의 연결

비교 전에 자기검증 엔진의 현재 지지범위를 확인한다.

비교 후 새로 발견된 현상은 필요하면 자기검증 엔진으로 다시 보내 내부 메커니즘 검증을 수행한다.

하지만 비교 결과 자체를 OASIS 기본명제의 직접 증거로 승격하지 않는다.

## 9. 현재 상태

본 문서는 비교연구의 독립 경계를 정의한 v1.0이다.

현재 진행 중인 OASIS 자기검증 재감사는 `OASIS_INTEGRATED_PAPER_SYSTEM_v1.1.md`에서 계속한다.

타 모델과의 실제 비교 실험은 별도 사전등록·비교명세가 확정된 후 이 엔진에서 수행한다.
