# OASIS Causal Research System Specification v2.0

상태 / Status: current implementation specification
기준일 / Date: 2026-09-07
상위 기준 / Governing protocol: `../../OASIS_RESEARCH_PROTOCOL.md`
정의 기준 / Canonical semantics: `../OASIS_CAUSAL_RESEARCH_SYSTEM_v2.0_ko.md`
Legacy comparator: `CAUSAL_RESEARCH_SYSTEM_SPEC_v1.0.md`

## 1. 구현 목적 / Implementation purpose

v2 구현은 현실을 사건구간으로 분절해 차이의 지속시간을 재는 것을 중심으로 하지 않는다.

핵심 구현대상은 다음의 연속관계 과정이다.

`Past Relational Structure + Current Reality -> Possibility Composition -> Single Realization -> Realized Experience -> Incorporation into Existing Past Relational Structure -> New Past Relational Structure -> Relation with Subsequent Reality -> New Relational Structure / Possibility Composition`

## 2. 구현 모듈 / Implementation modules

1. Reality Flow Observer / 현실흐름 관측기
2. Past Relational Structure Observer / 과거 관계구조 관측기
3. Possibility Composition Trace / 가능성 조합 추적
4. Single Realization Trace / 단일 현실화 추적
5. Incorporation Evidence Trace / 과거 관계구조 편입 증거 추적
6. New Past Structure Formation Trace / 새로운 과거 관계구조 형성 추적
7. Subsequent Reality Relation Trace / 이후 현실과의 관계 추적
8. Relational Reappearance Trace / 인연 재출현 추적
9. Long-Horizon Persistence-Limit Inquiry / 인연 지속 제한 장기탐색
10. Shadow Counterfactual Comparator / 분석 전용 반사실 비교기
11. Non-Anticipation Guard / 비예견 검증기
12. Falsification and Evidence Grader / 반증·증거등급기

episodeId, tick, event ID는 감사와 추적을 위한 표식일 뿐 현실 자체의 존재론적 분절단위가 아니다.

## 3. 과거 관계구조 용어규칙 / Past-relational-structure terminology

이론 및 보고서의 중심 용어는 `Past Relational Structure / 과거 관계구조`로 통일한다.

기존 코드 필드 `relationHistory`는 호환성 때문에 남을 수 있다. 그러나 보고서에서 이를 곧바로 `관계이력`이라는 이론개념으로 승격하지 않는다.

특히 `relationHistoryAfter > relationHistoryBefore`는 다음과 같이만 해석한다.

`IMPLEMENTATION_CANDIDATE_INCORPORATION_SIGNAL`

이는 H1의 구조적 편입을 입증하지 않는다.

H1을 지지하려면 새 현실화 경험이 기존 과거 관계들과 실제 관계를 형성하거나, 이후 새로운 과거 관계구조의 구성에 참여하는 증거가 추가로 필요하다.

## 4. 핵심 가설과 구현 증거 / Hypothesis-to-evidence mapping

### H1 — Realization and Past-Structure Incorporation

필요 증거:
- 실제 현실화 관측
- 현실화된 경험의 과거 관계구조 편입 후보신호
- 기존 과거 관계들과의 후속 관계 또는 구조적 참여

단순 저장 증가만으로 `SUPPORTED` 판정 금지.

### H2 — New Past Relational Structure and Subsequent Reality Relation

필요 증거:
- H1 이후 새로운 과거 관계구조 구성 차이
- 그 전체 구조와 이후 현실의 관계과정 추적
- 이후 관계구조, 가능성 조합, 참여상태 또는 현실화에서 구조적 차이 관측

H2의 `과거 구조 변화`와 `후속 현실과의 관계`를 별도 독립효과로 쪼개지 않는다.

### H3 — Relational Reappearance

필요 증거:
- 과거에 형성된 관계
- 일정 기간 현재 판단/관계형성에 직접 참여하지 않음
- 사전 예약 없이 이후 현실조건에서 다시 관계함

재출현은 과거 상태 복원이나 reconvergence가 아니다.

### H4 — Relational Persistence-Limit Inquiry

필요 증거:
- 장기 현실흐름 추적
- 재출현 간격, 반복 재출현, 미재출현 상태 기록
- 시간경과와 구조변화 조건의 구분 가능한 비교

관찰기간 미재출현을 소멸 또는 영구 불가능으로 판정하지 않는다.

## 5. v2 핵심 보고축 / v2 primary report axes

1. `realizationObserved`
2. `pastStructureIncorporationCandidateSignal`
3. `structuralParticipationAfterIncorporation`
4. `newPastStructureSubsequentRealityRelationObserved`
5. `relationalReappearanceObserved`
6. `reappearanceGapObservations`
7. `persistenceLimitStatus`

`persistenceLimitStatus`의 기본값은 `OPEN_INQUIRY`이며 장기실험 전에는 제한의 존재/부재를 선언하지 않는다.

보조값:
- `divergenceDelay` — paired intervention 실험에서만 보조 시간정보

Legacy 비교용으로 v1 축을 별도 출력할 수 있으나 v2 핵심증거와 혼합하지 않는다.

## 6. 현재 audit 이벤트 매핑 / Current audit-event mapping

현재 production-compatible audit에는 다음 이벤트가 존재한다.

- `compose`
- `latentize`
- `reactivate`
- `noncurrent`
- `select-participation`
- `outcome`
- `field-spiral`

v2 해석:

- `outcome` = 단일 현실화 경계 후보
- `relationHistoryBefore/After` = 구현 필드 변화; 구조적 편입의 충분증거 아님
- `latentize/noncurrent` = 과거 관계가 현재 판단/관계형성에 직접 참여하지 않는 상태를 구현상 표시하는 사건
- `reactivate` = 현재 현실과 다시 관계한 후보사건
- `select-participation` = 재관계한 관계가 현재 판단에 참여한 증거
- `field-spiral` = 이후 판단조건 변화의 기존 구현 이벤트명; 전체 구조 재작성의 의미가 아님

## 7. 재출현 판정 / Reappearance classification

v2 tracker는 한 관계가 `latentize` 또는 `noncurrent` 상태를 거친 뒤 `reactivate` 되었는지를 기록한다.

추가로 다음을 기록한다.
- last non-participating/non-current tick
- next reactivation tick
- gap length
- repeated reappearance count
- reappearance reasons when available

재출현 시점이 코드에서 고정 예약되었거나 미래정보를 사용했다면 해당 증거는 무효다.

## 8. 장기 관찰 해석 / Long-horizon interpretation

관찰 종료시점까지 다시 관계하지 않은 관계는:

`NOT_REOBSERVED_WITHIN_HORIZON`

으로 기록한다.

다음으로 기록하지 않는다.
- extinct
- permanently unavailable
- never reappears

## 9. Legacy v1 비교군 / Legacy comparator

v1 구현과 다음 측정축은 보존한다.

- divergenceDelay
- realizedChange
- persistence
- reconvergence
- accumulatedRelationalEffect
- downstreamLongHorizonEffect

v2 실험자료에 필요할 경우 별도 comparator 분석으로만 적용한다.

## 10. 비예견·검증 불변조건 / Non-anticipatory invariants

다음은 hard invalidation 조건이다.

1. 미래정보가 현재 관계계산에 사용됨
2. 재출현 시점이 사전 예약됨
3. shadow/counterfactual 결과가 production 과거 관계구조에 편입됨
4. 현재와 직접 관계하지 않는 상태를 삭제와 동일시함
5. 단순 저장 증가를 구조적 편입 입증으로 선언함
6. 관찰기간 미재출현을 소멸로 선언함
7. episodeId/tick을 독립 현실의 존재론적 단위로 해석함
8. whole-structure rewrite를 현실화의 기본규칙으로 복원함
9. 미실현 가능성을 실제 평행 미래경로로 처리함

## 11. 증거 등급 / Evidence grading

- `IMPLEMENTATION_SIGNAL` — 코드상 사건/필드 변화만 존재
- `OBSERVED` — 실제 audit에서 현상 관측
- `SUPPORTED_WITHIN_HARNESS` — 통제실험과 반복에서 가설이 지지됨
- `REFUTED_WITHIN_HARNESS` — 사전정의 반증조건 충족
- `UNVALIDATED` — 증거 부족
- `OPEN_INQUIRY` — 방향을 선결하지 않은 탐색가설

## 12. v2 실험순서 / Experiment order

내부 선행연구 확인
→ H1 편입 구조 검증
→ H2 새로운 과거 관계구조와 이후 현실관계 검증
→ H3 자연적 재출현 검증
→ H4 장기 지속 제한 탐색
→ 반복·반증
→ Legacy v1 비교분석
→ 이후 인과율 수학화 검토

단일 causal-rate scalar는 이 순서가 충분히 진행되기 전에 도입하지 않는다.
