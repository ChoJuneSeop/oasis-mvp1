# H2 비현재 과거관계 미래효과 검증 결과 v3 / H2 Noncurrent Past Relational Future-Effect Result v3

상태 / Status: **VALID NEGATIVE RESULT**  
기준일 / Date: 2026-09-07  
관련 가설 / Related hypotheses: H2, H3  
GitHub Actions run id: `34108047268`  
Head commit: `4c56959c2551f1ad43845e6cfc8ea578642a029e`  
Result: **SUCCESS**

## 1. 질문 / Question

현재 시점에 직접 참여하지 않는 오래된 관계 episode들을 실험 초기조건에서만 제거한 뒤, 동일한 외생조건 아래 두 현실을 자율적으로 진행하면, full 구조에서 그 episode들이 자연 재출현할 때 이후 행동경로가 달라지는가?

Can currently nonparticipating old relational episodes, when removed only at the initial condition, later change autonomous behavior after their natural reappearance in the full branch under identical exogenous conditions?

## 2. 설계 / Design

각 체크포인트에서 세 분기를 사용했다.

1. full 과거 관계저장소 / full past relational store
2. 완전히 동일한 full twin / identical full twin validity control
3. 체크포인트 당시 비활성 latent episode만 제거한 절제군 / ablation of only the latent episode identities that were non-active at the checkpoint

초기조건 설정 이후 실험자 개입은 0이다.

- no experimenter intervention after initialization
- non-anticipatory
- diverged realities are not reset
- currently active latent episode identities are preserved at initialization
- recent relation-field episodes are preserved

## 3. 유효성 / Validity

- requested checkpoints: **3**
- valid checkpoints obtained: **3**
- full-twin mismatch: **0**
- active set preserved at initialization: **3/3**
- experimenter intervention after initialization: **0**

따라서 결과는 유효한 음성결과로 보존한다.

## 4. 결과 / Results

### Checkpoint 1

- checkpoint tick: **15,405**
- latent episodes: **150**
- active latent episodes: **90**
- initially inactive episodes removed: **60**
- first removed-episode reappearance: **15,844**
- distinct removed episodes later reappearing: **60/60**
- behavior divergence within 15,000-tick horizon: **0**

### Checkpoint 2

- checkpoint tick: **40,518**
- latent episodes: **874**
- active latent episodes: **250**
- initially inactive episodes removed: **624**
- first removed-episode reappearance: **40,719**
- distinct removed episodes later reappearing: **624/624**
- behavior divergence within 15,000-tick horizon: **0**

### Checkpoint 3

- checkpoint tick: **65,524**
- latent episodes: **1,214**
- active latent episodes: **373**
- initially inactive episodes removed: **841**
- first removed-episode reappearance: **65,725**
- distinct removed episodes later reappearing: **841/841**
- behavior divergence within 15,000-tick horizon: **0**

Aggregate:

- pairs with removed-relation reappearance: **3/3**
- pairs with behavior divergence: **0/3**
- target divergence: **0/3**
- leader divergence: **0/3**
- candidate-signature divergence: **0/3**
- current-place divergence: **0/3**

Evidence grade:

**NOT_SUPPORTED_FOR_BEHAVIOR_DIVERGENCE_WITHIN_TESTED_HORIZON**

## 5. 해석 / Interpretation

이 결과는 다음을 지지한다.

- 비현재 관계 episode는 이후 다시 현재와 관계할 수 있다.
- 그러나 **재출현 그 자체는 행동변화의 충분조건이 아니다.**
- episode identity 수 또는 단순 보존량 자체를 인과적 강도로 취급해서는 안 된다.

이 결과는 다음을 지지하지 않는다.

- 비현재 관계가 효과가 없다는 보편명제
- 과거 관계구조 전체가 행동에 무관하다는 주장
- H2 반증 전체
- H3 반증

현재 구현에서는 동일 relation key + 동일 decision footprint의 episode multiplicity가 구조적으로 중복될 수 있다는 기존 CR-03R 결과가 존재한다. 따라서 이번 episode-identity 절제 음성결과는 **관계구조의 인과단위를 episode 개수보다 상위 구조단위에서 다시 검증해야 한다**는 방향을 제시한다.

## 6. 다음 직접검증 / Next Direct Test

다음 실험은 episode identity가 아니라 체크포인트 당시 현재 활성집합에 존재하지 않는 **noncurrent-only relation key**를 구조단위로 절제한다.

핵심 판정:

- 현재 활성 relation key는 초기조건에서 그대로 보존
- 현재 비참여 relation key 전체만 초기조건에서 제거
- 이후 full 분기에서 제거 대상 key가 자연 재출현하는지 관찰
- 그 이후 행동·참여·선택·현실화 경로가 절제군과 달라지는지 관찰
- 음성결과도 그대로 보존

전체 Past Relational Structure의 공동 필요성·충분성은 여전히 **UNVALIDATED**이다.
