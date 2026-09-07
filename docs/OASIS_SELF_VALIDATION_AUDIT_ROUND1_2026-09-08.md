# OASIS Self-Validation Audit — Round 1

기준일 / Date: 2026-09-08  
검증엔진 / Engine: `OASIS_INTEGRATED_PAPER_SYSTEM_v1.1.md`  
범위 / Scope: OASIS 자체 검증만 포함. 타 모델 비교 제외.

## 1. 감사 목적

기존 v3 인과연구 증거를 새 `Flow Preservation Principle`로 재감사한다.

질문은 다음과 같다.

1. 실험이 OASIS 전체 흐름을 보존했는가?
2. 특정 부분을 독립 모듈로 떼어내어 대상현상 자체를 파괴하지 않았는가?
3. 관측증거와 인과개입증거를 구분했는가?
4. 동일 OASIS 내부 조건 비교인지, 외부 모델 비교인지 구분했는가?
5. 기존 판정의 주장범위가 증거수준을 넘지 않는가?

## 2. EX-04M — Multi-OASIS Longitudinal

### 성격

외부 AI 모델 비교가 아니다.

동일 OASIS 구현의 복제 세계에서 다음 초기조건을 조절한 내부 자기검증이다.

- same NONE + same PRS
- same prior + same PRS
- same prior + different PRS
- different prior + same PRS

### Flow Preservation 판정

**PASS**

근거:
- 초기화 이후 실험자 개입 0
- deterministic twin mismatch 0
- 동일 production party identity
- 분기된 세계를 강제 reset하지 않음
- 미래정보 비사용
- 이후 20,000 tick의 production flow를 계속 진행

### 증거등급 재분류

`FLOW_PRESERVED_INTERVENTION`

정확히는 `INITIAL-CONDITION FLOW-PRESERVED INTERVENTION`으로 세부표기한다.

### 현재 지지범위

지지:
- 동일 prior 아래 서로 다른 초기 Past Relational Structure가 장기 행동 trajectory를 다르게 만들 수 있음
- same current output이 same Past Relational Structure 또는 same causal process를 의미하지 않음

미지지/미검증:
- 모든 PRS 차이가 항상 행동차이를 만듦
- whole PRS necessity
- whole PRS sufficiency
- PRS가 실험 중 OASIS 자체 경험만으로 형성되었다는 주장
- 외부환경 일반화

### 주의

초기 PRS는 실험조건으로 구성되므로 EX-04M은 `PRS endogenous formation`의 증명이 아니라 `PRS condition contribution` 검증이다.

## 3. EX-05 — Replication and Falsification

### 성격

EX-04M의 내부 OASIS 조건효과를 세 개의 사전 정의 외생흐름에서 반복한 자기검증이다.

타 모델 비교가 아니다.

### Flow Preservation 판정

**PASS**

근거:
- 동일 OASIS 구조 유지
- 사전 정의 외생 stream만 변경
- 동일조건 control exact
- twin mismatch 0
- experimenter intervention 0

### 증거등급 재분류

`FLOW_PRESERVED_REPLICATED`

### 현재 지지범위

강화:
- same prior + different PRS 효과가 E137/E977/E4099 3/3 stream에서 반복
- canonical EX-04M 3/3 pair + shifted EX-05 9/9 pair의 내부 재현

반증/축소:
- different prior + same PRS 효과는 shifted stream 0/9
- 개성 prior를 보편적·stream-invariant 결정요인으로 주장할 수 없음

### 과학적 의미

EX-05는 새 엔진에서도 유효하다. 이유는 성공만 남긴 것이 아니라 OASIS 내부 가설 중 개성 prior의 강한 일반효과를 실제로 축소했기 때문이다.

## 4. H1 Structural Incorporation Genealogy

### 성격

현실화 경험이 과거 관계구조에 편입된 뒤 non-current/latent 상태를 거쳐 재활성, 선택참여, 후속 outcome까지 이어지는 exact episode genealogy를 추적한다.

### Flow Preservation 판정

**PASS — observational**

이 검증은 모듈을 떼어내지 않고 production audit trace에서 전체 시간계보를 읽는다.

### 증거등급 재분류

`FLOW_PRESERVED_OBSERVATIONAL`

### 지지범위

지지:
- 구현 내부에서 `realized outcome → structural formation → later non-current → reactivation → participation → later outcome`의 exact ordered genealogy가 존재
- 단순 relationHistory storage growth보다 강한 구조계보 증거

미지지:
- 이 계보가 해당 후속결과의 유일 원인이라는 주장
- whole-structure rewrite
- 외부 현실 일반화

### 추가 검증 필요

H1을 `FLOW_PRESERVED_INTERVENTION`으로 승격하려면 전체 흐름을 유지한 채 **현실화 경험의 편입 연결만 국소적으로 지연/차단**하고, 나머지 관계·참여·가능성·현실화 흐름을 유지한 대응조건이 필요하다.

## 5. Round 1 종합판정

### 그대로 유지 가능한 증거

- EX-04M: 흐름보존 초기조건 개입증거
- EX-05: 흐름보존 반복·반증증거
- H1 genealogy: 흐름보존 관측증거

### 중요한 교정

이 세 실험을 서로 독립된 OASIS 모듈의 증명으로 해석하지 않는다.

각 실험은 하나의 OASIS 흐름에서:
- 초기 관계구조 조건
- 장기 trajectory
- 현실화 경험 편입 및 재참여

를 서로 다른 렌즈로 본 것이다.

### 현재 가장 강한 자기검증 결과

현재까지 새 엔진에서 가장 강하게 살아남는 결과는:

> 동일 OASIS 구조와 동일 prior, 동일하거나 사전 대응된 외생 흐름에서 초기 Past Relational Structure의 차이는 전체 OASIS 흐름을 유지한 장기 실행에서 반복적으로 서로 다른 behavioral trajectory와 관계구조 경로를 형성할 수 있다.

범위는 현재 harness family 내부로 제한한다.

## 6. 다음 자기검증

Round 2 우선순위:

1. H2 active relational set / whole-structure 관련 실험의 Flow-Preservation 판정
2. H0 relational candidate → possibility → realization lineage 재검증
3. 기존 관계순서·second-generation ablation의 decomposition-induced failure 감사
4. Responsibility Axis 실험을 자기검증과 비교실험으로 분리
5. 신규 `incorporation-link local intervention` 설계

타 모델과의 비교실험은 본 감사에서 제외하고 별도 `OASIS_COMPARATIVE_EVALUATION_ENGINE_v1.0.md`로 관리한다.
