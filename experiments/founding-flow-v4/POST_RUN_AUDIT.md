# Founding Flow v4 — Post-Run Audit

## 실행 provenance

- Valid CI run: `34000997097`
- Job: `101399723880`
- Head: `1fca32a1db9b0ddffc759b2b9126911cdc122b29`
- Artifact: `9979474178`
- Artifact digest: `sha256:be72bc410f96062f439888ae2c5ac25b50fd49f7244c4f7a4994b92a1696145a`
- Seeds: 101, 211, 307, 401, 503
- 12 decisions per seed / 60 OASIS decisions total

## 사전 감사 결과

모두 PASS:

- Unified validation contamination boundary
- 성공값 감사
- 평가기준 감사
- 흐름 감사
- 구현 감사
- Environment Identifiability audit
- Founder-only non-reactivation audit
- Non-founder matching reactivation audit
- Common-actor support exclusion audit
- Far `located-relative-to` exclusion audit

Targeted audit에서 실제 확인:

- founder 하나만 공유하는 경험 → reactivation `[]`
- `resource-A`가 현재와 다시 연결된 matching 경험 → reactivation 가능
- founder-only `idle` → past-experience support `[]`
- target-matching `touch:resource-A` → matching support 유지
- v3 초기 원거리 spatial relations → OASIS/Temporal 모두 자동 bridge 없음

## v4가 실제로 교정한 것

### C1 Generic-founder reactivation collapse — FIX CONFIRMED

v3의 “같은 founder라는 이유만으로 모든 경험이 연쇄 재활성화”는 제거됐다.

실제 60개 OASIS 판단 중 18개 round에서 reactivated completed experience가 0개였다.

특히 여러 seed에서:
- `resource-C` 등장
- `resource-D` 등장
- `environment` 변화

가 과거 전체기억을 자동 호출하지 않았다.

### C2 Far-spatial complete graph — FIX CONFIRMED

`located-relative-to`는 OASIS current affinity bridge와 Temporal-Relational history에서 제거됐다.

좌표 사실 자체는 현실에 남아 있다. 단지 원거리에 위치한다는 이유만으로 관계필드를 완전연결시키지 않는다.

### C3 Common-actor affordance support — FIX CONFIRMED

`founder` 하나만 공통인 `idle`, `emit`, unrelated step/touch가 과거경험 support를 자동 획득하는 경로는 targeted audit에서 제거됐다.

따라서 v4는 C1~C3에 대해서는 구현 교정 성공으로 보존할 수 있다.

## 사후 새로 발견된 문제

### C5 — Snapshot co-occurrence is treated as relational relevance — CRITICAL

현재 `experienceEntities(exp)`는 다음을 함께 relevance entity 집합에 넣는다.

- process relations
- choice entities
- outcome affected entities
- **before.changedEntities**
- **after.changedEntities**

문제는 `changedEntities`가 곧 관계과정 참여자를 뜻하지 않는다는 것이다.

가장 분명한 반례는 모든 seed의 `experience:0`이다.

`experience:0`의 실제 구조:

- before.changedEntities = `founder, other-O, resource-A, resource-B, marker-M`
- choice entities = `founder`뿐
- outcome affected = `founder`뿐
- process relations = 없음

즉 첫 행동이 이동/emit 등이고 다른 객체와 실제 관계과정이 없었는데도, 초기 스냅샷에서 함께 관측됐다는 이유로 `experience:0`은 이후 `other-O` 또는 `marker-M` 등이 current delta에 다시 들어오면 재활성화될 수 있다.

이는 다음 두 문장을 잘못 동일시한다.

`같은 현재 장면에서 관측되었다`

과

`완결된 관계과정에 참여했다`

OASIS 고정이론상 인연은 단순 co-presence가 아니라 현재에서 다시 유의미해지는 **완결 관계과정**이다. 따라서 snapshot 동시관측만으로 experience relevance를 열어주는 것은 구현 왜곡이다.

### C5의 실제 trace 영향

v4는 v3보다 선택성이 크게 개선됐지만 late rounds에서 다시 넓은 재활성화가 나타났다.

예: seed 101
- round 3 (`resource-C`) → 0
- round 6 (`environment`) → 0
- round 7 (`resource-D`) → 0
- round 10 (`environment`) → `experience:6` 단독

반면 `other-O`가 current delta가 되는 후반 round에서는 초기 `experience:0`을 시작으로 과거경험 frontier가 다시 넓어졌다.

전체 60 round 중 과거 경험 전부가 재활성화된 round도 16개 있었다. 이것은 C1의 founder-only collapse와는 다른 원인이다. `before/after.changedEntities`의 장면 co-occurrence가 relation bridge처럼 사용되기 때문이다.

### C4 — Full observed outcome process is not yet restored — STILL OPEN

v3에서 발견한 C4는 v4에서 의도적으로 수정하지 않았다.

closed experience에는 outcome relation과 affected entity가 저장되지만, reference `_reactivatedAffordances()`는 주로 `exp.choice.steps`를 다시 후보로 가져온다.

따라서 v4에서도 past completed process의 실제 결과가 다음 possibility/responsibility 구조에 충분히 복원됐다고 볼 수 없다.

C4와 C5를 같은 버전에서 동시에 수정하지 않는다.

## tie 기록 — 성능평가 금지

v4에서 OASIS tie는 seed별 12, 12, 11, 10, 11이었다.

이 수치는 우열·성공·실패가 아니다. C4가 아직 열려 있고 primitive world의 의미구조가 제한적이므로 semantic choice 수를 v4 성공조건으로 사용하지 않는다.

한편 일부 round에서 OASIS가 단일 frontier를 형성한 사례가 처음 나타났다. 예:
- seed 307 round 7: `touch:resource-D`, tie=false
- seed 401 round 1: `touch:other-O`, tie=false
- seed 401 round 3: `touch:resource-C`, tie=false
- seed 503 round 3: `touch:resource-C`, tie=false

이것도 OASIS 우월성 증거가 아니라 C1~C3 교정 후 구조적 비대칭이 발생할 수 있다는 메커니즘 관찰일 뿐이다.

## v4 최종 판정

**Execution-valid / C1-C3 fix-valid / still not paper claim evidence.**

v4는 founder hub, far-spatial complete graph, common-actor support라는 세 구현오염을 실제로 제거했다. 그러나 C5 때문에 completed relational experience의 재활성화 범위가 아직 장면 동시관측에 의해 부풀려질 수 있다.

따라서 논문용 시조 비교 증거로 사용하지 않고 구현 계보의 검증자료로 보존한다.

## 다음 버전의 단일 범위

다음 버전은 v4 world, seeds, rounds, archetypes를 모두 유지하고 **C5만** 수정한다.

completed experience의 재활성화 eligibility를 계산할 때 단순 `before.changedEntities` / `after.changedEntities` co-occurrence를 관계근거로 사용하지 않는다.

재활성화의 비공통 근거는 최소한 다음 실제 process evidence에서 나와야 한다.

- process relation endpoint
- actual choice entity
- actual outcome affected entity / outcome relation endpoint

단, generic `founder` 단독은 계속 충분조건이 아니다.

C4의 outcome-process를 reactivated affordance에 복원하는 수정은 다음 별도 버전으로 남긴다.

## 금지되는 해석

- v4에서 tie가 줄었다/늘었다를 성능으로 해석
- 일부 single-frontier choice를 OASIS 성공으로 해석
- late-round broad reactivation을 OASIS의 넓은 통찰로 해석
- v4를 문화·세대 진화 증거로 사용
