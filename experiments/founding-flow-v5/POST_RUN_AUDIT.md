# Founding Flow v5 — Post-Run Audit

## 실행 provenance

- Valid CI run: `34001176534`
- Job: `101400199203`
- Head: `00e61bc28e34d489f02f6d03389c87a8687137cb`
- Artifact: `9979524556`
- Artifact digest: `sha256:b4927cf85d741dc16707d8b7e701d10429eb17b0015707958f992d2f4a60cf52`
- Seeds: 101, 211, 307, 401, 503
- 12 decisions per seed / 60 OASIS decisions total

## 사전 감사

모두 PASS:

- Unified contamination boundary
- 성공값 감사
- 평가기준 감사
- 흐름 감사
- 구현 감사
- C5 targeted synthetic audit
- v4 far-spatial regression audit

C5 targeted audit에서:

- co-presence-only experience → process evidence `[]`, reactivated `[]`
- explicit process relation experience → matching current entity에서 reactivation 가능
- actual choice entity experience → matching current entity에서 reactivation 가능
- actual outcome affected entity experience → matching current entity에서 reactivation 가능
- founder-only experience → reactivated `[]`

## 실제 trace 회귀검사

v3 world의 `experience:0`은 모든 seed에서:

- 초기 `before.changedEntities`에는 founder와 초기 4개 객체가 모두 들어가지만
- actual choice entity는 founder뿐이고
- actual outcome affected entity도 founder뿐이며
- process relation은 없다.

따라서 v5 runner는 round 1 이후 실제 trace에서 `experience:0`이 한 번이라도 reactivation되면 실행 자체를 실패하도록 사전 고정했다.

Valid run은 이 조건을 전부 통과했다.

즉 **raw initial co-presence가 completed relational experience relevance로 다시 누출되지 않았다.**

## 실제 genealogy 관찰

60개 OASIS deliberation 중:

- reactivation 0개: 45 round
- 모든 prior experience가 자동 reactivation: 0 round

이 수치는 성능점수가 아니라 C5 교정 후 genealogy 구조 기록이다.

Current delta별 reactivation은 seed history에 따라 달라졌다.

예:

### Seed 101
모든 12 round에서 reactivation 0.

이 seed의 OASIS는 실제 non-founder process relation을 거의 만들지 않았으므로, 과거 경험을 억지로 불러오지 않았다.

### Seed 307
round 7에서 `resource-D`와 실제 `adjacent-to/holds` 관계가 형성된 뒤:
- round 8 `other-O` → experience:7
- round 9 `other-O` → experience:7,8
- round 11 `other-O` → experience:7,8,9,10

해당 경험들의 process evidence에는 실제 `resource-D`, `other-O`, `signaled`/adjacency/holds 관계가 존재했다.

### Seed 401
round 1에서 실제 `other-O` contact가 형성된 이후, 그 관계가 지속되는 동안 후속 경험들이 relation/process evidence를 통해 이어졌다.

예:
- experience:1 = actual `touch:other-O`, process relations에 `adjacent-to`, `contacted`
- experience:2 = later step이지만 persistent `contacted` 관계가 current process relation으로 포함
- experience:3 = `resource-C` interaction과 함께 `other-O` contact가 지속

따라서 후속 `other-O` current delta에서 이 계보가 재참여한 것은 단순 snapshot co-occurrence가 아니라 실제 persistent relation/process history에 근거한다.

## C5 최종 판정

**FIX CONFIRMED.**

v5는 다음을 분리했다.

`같은 장면에 있었다`

≠

`완결 관계과정에 참여했다`

그리고 actual relation / choice / outcome evidence가 있는 경험은 막지 않았다.

따라서 v5는 C5 구현교정 증거로 보존한다.

## 아직 남은 핵심 문제 — C4

v5는 C4를 의도적으로 수정하지 않았다.

현재 closed experience에는 실제 outcome relation과 affected entity가 저장된다. 그러나 reference `_reactivatedAffordances()`는 reactivated experience에서 주로 **과거 choice step**을 다시 affordance로 가져온다.

따라서 과거 완결경험이 선택적으로 정확히 호출되더라도, 그 경험의 실제 outcome process가 현재 possibility / responsibility 구조로 충분히 복원된다고 아직 말할 수 없다.

예를 들어:

`touch resource-D → holds relation 발생`

이라는 완결경험이 재활성화될 때 현재 구현은 주로 `touch resource-D`라는 과거 행동 step을 되가져오며, 그때 실제로 발생했던 `holds` relation의 결과 구조는 reactivated possibility의 consequence/relations로 자동 복원되지 않는다.

이것은 OASIS의 “완결 경험 재참여” 정의를 검증하기 위해 별도 실험이 필요하다.

## tie 기록

v5 OASIS tie counts는 seed별 12, 12, 11, 10, 11이었다.

v4와 거의 동일하며, 이를 실패로 해석하지 않는다. C5는 **어떤 경험을 호출하는가**의 문제였고 C4는 **호출된 완결경험이 현재 가능성에 무엇을 가져오는가**의 문제다.

따라서 semantic choice가 크게 늘지 않은 것은 C5 수정 실패의 증거가 아니다.

## v5 최종 상태

**Execution-valid / C1-C3 preserved / C5 fix-valid / C4 still open / not paper superiority evidence.**

## 다음 버전 범위

다음 실험은 C4 하나만 다룬다.

질문:

> 선택적으로 재활성화된 completed experience가 과거의 choice action뿐 아니라 **실제로 관찰된 outcome relation/process**를 현재 possibility의 구조적 정보로 다시 가져와야 하는가?

중요한 제한:

- 과거 outcome을 미래의 확정 결과로 취급하지 않는다.
- “전에 이렇게 됐으니 이번에도 반드시 이렇게 된다”는 규칙을 넣지 않는다.
- 과거 actual outcome은 **historical relational evidence**로만 참여해야 한다.
- 현재 현실의 실제 결과는 여전히 external actualization을 통해서만 확정된다.

이 경계를 사전 킬서치와 별도 protocol에서 먼저 검증한다.
