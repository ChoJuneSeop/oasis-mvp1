# H2 비현재 Relation-Key 미래효과 검증 결과 v3 / H2 Noncurrent Relation-Key Future-Effect Result v3

상태 / Status: **VALID NEGATIVE RESULT**  
기준일 / Date: 2026-09-07  
관련 가설 / Related hypotheses: H2, H3  
GitHub Actions run id: `34108556274`  
Head commit: `347e379954d653ca97f9a57c8d121d56787cb1d8`  
Result: **SUCCESS**

## 1. 질문 / Question

현재 활성 관계집합에 존재하지 않는 relation key를 실험 초기조건에서만 제거한 뒤, 동일한 외생조건 아래 현실을 자율적으로 진행하면, full 분기에서 그 key들이 자연 재출현할 때 이후 행동경로가 달라지는가?

If relation keys absent from the current active relational set are removed only as an initial structural condition, can their later natural reappearance in the full branch change subsequent autonomous behavioral trajectory under identical exogenous conditions?

## 2. 설계 / Design

각 체크포인트에서 세 분기를 사용했다.

1. full Past Relational Structure representation
2. identical full twin validity control
3. noncurrent-only relation-key ablation

절제군에서는 체크포인트의 현재 `activeKeys`에 없는 relation key에 속한 recent/latent episode를 모두 초기조건에서 제거했다.

보존 조건:
- 현재 active relation keys 유지
- active key에 속한 episode multiplicity 유지
- 초기 target/leader/candidate signature/current position 유지
- 초기조건 설정 이후 실험자 개입 0
- 동일 외생조건
- 비예견성 / non-anticipatory
- 분기된 현실 강제 재동기화 금지

## 3. 유효성 / Validity

- requested checkpoints: **3**
- valid checkpoints: **3**
- full-twin mismatch: **0**
- active keys preserved at initialization: **3/3**
- initial behavior preserved: **3/3**
- experimenter intervention after initialization: **0**

따라서 결과는 유효한 음성결과로 보존한다.

## 4. 결과 / Results

### Checkpoint 1

- tick: **15,405**
- stored relation keys: **10**
- active relation keys: **7**
- noncurrent-only keys removed: **3**
- removed latent episodes: **60**
- removed recent episodes: **7**
- first removed-key reactivation in full: **15,844**
- distinct removed keys reactivated: **3/3**
- first regeneration of removed key in ablated branch: **16,049**
- behavior divergence within horizon: **0**

### Checkpoint 2

- tick: **40,518**
- stored relation keys: **10**
- active relation keys: **4**
- noncurrent-only keys removed: **6**
- removed latent episodes: **624**
- first removed-key reactivation in full: **40,719**
- distinct removed keys reactivated: **6/6**
- first regeneration of removed key in ablated branch: **41,614**
- behavior divergence within horizon: **0**

### Checkpoint 3

- tick: **65,524**
- stored relation keys: **10**
- active relation keys: **4**
- noncurrent-only keys removed: **6**
- removed latent episodes: **841**
- first removed-key reactivation in full: **65,725**
- distinct removed keys reactivated: **6/6**
- first regeneration of removed key in ablated branch: **66,336**
- behavior divergence within horizon: **0**

Aggregate:

- pairs with removed-key reactivation: **3/3**
- pairs with behavior divergence: **0/3**
- target divergence: **0/3**
- leader divergence: **0/3**
- candidate-signature divergence: **0/3**
- current-place divergence: **0/3**
- pairs where removed keys were naturally regenerated in the ablated branch: **3/3**

Evidence grade:

**NOT_SUPPORTED_FOR_RELATION_KEY_BEHAVIOR_DIVERGENCE_WITHIN_TESTED_HORIZON**

## 5. 해석 / Interpretation

이 결과는 다음을 직접 지지한다.

- 과거 관계 key는 현재 비참여 상태였다가 이후 다시 활성화될 수 있다.
- relation key 재출현 자체는 행동변화의 충분조건이 아니다.
- relation key의 존재/부재를 곧바로 인과적 강도 또는 행동 결정력으로 해석해서는 안 된다.
- 절제군에서도 동일 key가 이후 현실화된 경험을 통해 다시 형성될 수 있으므로, 단순 key 보존보다 현실과 관계하는 구조적 방식이 중요하다.

이 결과는 다음을 지지하지 않는다.

- 비현재 관계는 미래효과가 없다는 보편명제
- H2 전체 반증
- H3 반증
- Past Relational Structure 전체 무효
- 모든 환경에서 key가 무의미하다는 주장

기존 CR-03R에서는 동일 key + 동일 place-set의 episode multiplicity가 현재 판단에서 등가일 수 있음이 확인되었고, 현재 검증에서는 key 전체 절제도 세 조건에서 행동분기를 만들지 못했다. 따라서 다음 직접 인과단위는 단순 episode identity나 relation key가 아니라 **현재/이후 현실과 접속되는 관계 footprint·coverage 및 그 조합구조**로 검증한다.

## 6. 다음 직접검증 / Next Direct Test

다음 실험의 최소 단위:

**Relational Decision Footprint = relation key + relational place/context coverage**

검증 원칙:
- 현재 행동은 동일한 두 Past Relational Structures를 초기조건으로 만든다.
- 현재 active behavior를 유지하는 공통 footprint는 보존한다.
- 현재 비참여이지만 구조적으로 독립적인 footprint/coverage만 한쪽 초기조건에서 제거한다.
- 미래 tick을 사전에 고르지 않는다.
- 동일 외생조건 아래 자율 진행한다.
- full 분기에서 해당 footprint가 자연적으로 현재 현실과 다시 관계하는 순간과, 이후 참여/선택/현실화 차이를 추적한다.
- 절제군에서 동일 footprint가 새로 형성되는 경우도 별도 기록한다.
- 음성결과도 보존한다.

전체 Past Relational Structure의 공동 필요성·충분성은 계속 **UNVALIDATED**이다.
