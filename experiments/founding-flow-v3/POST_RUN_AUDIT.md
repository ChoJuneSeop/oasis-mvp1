# Founding Flow v3 — Post-Run Audit

## 실행 provenance

- Valid CI run: `34000766040`
- Job: `101399106582`
- Head: `001b99fe11a43eb22f8413e4b9679ab79ef33eb2`
- Artifact: `9979409786`
- Artifact digest: `sha256:68b492317af01df90a06a288a782fa6fc7a4db040fd5430eb6a650e9e1ef8f2a`
- Seeds: 101, 211, 307, 401, 503
- 12 decisions per seed and per archetype branch

Run `34000726311`은 protocol의 금지문장을 목표선언으로 오인한 정규식 false positive 때문에 실제 실행 전에 중단된 비실험 run이다.

## 사전 감사

- Unified contamination boundary: PASS
- Founding Flow v2 archetype-fidelity reconfirmation: PASS
- 성공값 감사: PASS
- 평가기준 감사: PASS
- 흐름 감사: PASS
- 구현 감사(사전 범위): PASS
- World-only environment identifiability audit: PASS

환경 감사에서 확인된 구조:
- initial touch targets: 0
- idle probe local frontier: `[] → [other-O] → [] → [resource-C] → [marker-M, resource-C] → [resource-C]`
- unique local frontiers: 4
- marker persistent relation assert/retract: PASS
- all exogenous frames accepted by RealityLedger with provenance: PASS

## 실행 후 집계 — 성능점수 아님

60 decisions per archetype에서 contingent tie 발생 횟수:

- Reactive: 51/60
- State-Memory: 52/60
- Temporal-Relational: 54/60
- Episodic: 15/60
- Predictive World Model: 50/60
- Goal/Utility: 47/60
- OASIS: 60/60

이 값은 우열이 아니라 의미적으로 단일 후보로 좁혀지지 않은 메커니즘 상태 기록이다.

## 사후 구현감사에서 발견된 핵심 문제

### C1 — Generic-founder reactivation collapse — CRITICAL

`OASISCore.reconstituteAffinityField()`는 현재 frontier와 과거 completed experience의 entity 집합이 하나라도 겹치면 그 경험을 재활성화할 수 있다.

모든 OASIS 행동과 거의 모든 completed experience에는 `founder`가 포함된다. 따라서 current flow에 founder가 들어오는 순간, **동일한 자기 자신이라는 사실만으로 과거 경험이 연쇄적으로 재활성화될 수 있다.**

실제 v3 trace에서 한 seed의 early rounds는 `experience:0`, 이후 `experience:0..n`이 거의 누적 전체로 재참여했다.

이것은 OASIS의 고정 이론인 “현재 흐름에서 유의미한 완결 관계과정만 재참여”와 다르다. 동일 actor 존재만으로 관계적 의미가 성립한다고 볼 수 없기 때문이다.

### C2 — Spatial complete-graph expansion — CRITICAL

현재 validation adapter는 `spatialRelations(snapshot)`의 모든 결과를 OASIS current relations로 삽입한다.

이 함수는 founder와 모든 positioned entity 사이에:
- 인접하면 `adjacent-to`
- 멀리 있어도 `located-relative-to`

관계를 만든다.

따라서 v3가 객체를 모서리로 분산했어도 OASIS 내부 current relation graph에서는 founder가 사실상 모든 객체에 연결된 hub가 된다. 외생적으로 한 객체만 변해도 그 객체 → founder → 나머지 객체로 frontier가 전파될 수 있다.

Temporal-Relational comparator 역시 같은 `spatialRelations()`를 사용하므로 이 문제는 OASIS만의 불리/유리 문제가 아니라 **공통 관계표현의 과연결 문제**다.

### C3 — Common-actor support collapse — HIGH

`_supportForAffordance()`는 affordance entity와 relation/experience entity가 하나라도 겹치면 support로 인정한다.

모든 primitive affordance에는 actor `founder`가 들어간다. 따라서 `founder` 하나의 공통성 때문에 서로 다른 과거 경험이 여러 현재 행동을 동시에 support하는 현상이 발생했다.

v3 raw trace에서 하나의 reactivated experience가 `step`, `emit`, `idle`, 여러 `touch` 후보에 동시에 동일 support로 붙는 사례가 반복됐다.

### C4 — Completed experience is reactivated mainly as prior choice step, not full observed outcome process — HIGH / SEPARATE FIX REQUIRED

closed experience에는 실제 outcome relations와 affected entities가 저장된다. 그러나 reference `_reactivatedAffordances()`는 재활성화할 때 주로 `exp.choice.steps`를 다시 affordance로 가져온다.

따라서 “완결된 경험 전체” 중 실제 결과가 다음 가능성의 구조에 얼마나 재참여하는지가 현재 validation adapter에서 충분히 전달되지 않는다.

이 문제는 C1~C3와 분리해서 검증해야 한다. 다음 버전에서 여러 변경을 동시에 넣어 원하는 결과를 만들지 않는다.

## v3 최종 판정

**Execution-valid / environment-audit-valid / OASIS relational-implementation contaminated for claim use.**

v3는 환경 설계 자체가 v2의 중앙 밀집 문제를 제거했음을 보여주는 methodology artifact로 보존한다. 그러나 OASIS와 Temporal-Relational의 관계확장 표현이 과도하게 연결되어 있어 시조 간 구조 차이의 논문 증거로 사용하지 않는다.

## 다음 버전 범위

다음 버전은 v3 world, seeds, rounds를 그대로 유지하고 오직 다음만 수정한다.

1. `founder`라는 공통 actor 하나만으로 completed experience가 재활성화되지 않게 한다.
2. 원거리 `located-relative-to`를 affinity/temporal relation bridge로 자동 사용하지 않는다. 실제 인접관계 또는 명시적 reality relation만 current relational bridge로 사용한다.
3. affordance support에서 common actor `founder` 단독 overlap을 관계근거로 사용하지 않는다.

C4(완결경험의 실제 outcome을 재활성화 affordance에 포함)는 위 수정의 결과를 본 뒤 별도 version으로 다룬다.

## 금지되는 해석

- v3의 높은/낮은 tie를 지능·성능으로 해석
- OASIS 60/60 tie를 실패 또는 성공으로 해석
- v3에서 관찰된 전체경험 재활성화를 OASIS 고유 장점으로 해석
- Temporal-Relational의 궤적을 계보 본질로 해석
- v3를 문화·세대 실험 증거로 사용
