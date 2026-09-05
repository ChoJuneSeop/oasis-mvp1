# OASIS 통합 검증 시스템 기준점 저장 — 2026-09-06

## 현재 브랜치

`architecture/oasis-unified-validation-system-v1`

## 최상위 원칙

실험자는 신이 아니라 **객관적 설계자이자 객관적 관찰자**다.

실험자는:
- 현실 자료와 출처를 제공한다.
- 동일한 현실을 각 시스템에 독립적으로 전달한다.
- 시스템이 스스로 형성한 관계·참여·가능성·선택을 기록한다.
- 역사 재생에서는 시스템의 가상 선택을 다음 역사에 원인으로 주입하지 않는다.
- 상호작용 실험에서는 외부에서 관찰된 실제 결과만 다음 현실에 반영한다.

실험자는 다음을 하지 않는다.
- 행동 메뉴를 미리 주입하지 않는다.
- 추천행동·선호행동·정답·성공값을 넣지 않는다.
- reward/score/ranking으로 시스템을 유도하지 않는다.
- 특정 관계나 참여자를 중요하다고 미리 지정하지 않는다.
- OASIS 내부처리를 비교군에 흘려보내지 않는다.

## 하나의 시스템으로 설계

이제 논문 검증을 실험별 임시 harness의 집합으로 만들지 않는다.

통합 흐름:

`Reality Ledger -> isolated delivery -> Decision Nodes -> Proposal Boundary -> Observer Ledger -> (historical: discard proposal / interactive: externally observed actualization) -> next Reality`

모든 실험은 이 공통 시스템 위에서만 실행한다.

## 구현된 핵심 계층

### `src/validation/oasis-unified-validation-system.mjs`

1. `RealityLedger`
   - 현실 claim만 저장.
   - `fact`, `relation`, `event`, `participant_state`, `constraint`만 허용.
   - 모든 claim에 `source`, `observed_at`, `available_at`, `accessible_to` provenance를 강제.
   - `event`는 기본적으로 instant이며 자동 지속하지 않음.
   - persistent claim은 명시적 assert/retract로만 유지/종료.

2. Reality 입력 금지 필드
   - affordance/action menu/candidate actions
   - recommended/preferred action
   - reward/score/success target/winner

   현실 입력 단계에서 가능성·평가를 주입하면 즉시 거부한다.

3. `ObserverLedger`
   - 실행을 서술적으로 기록.
   - winner/score/ranking 유형의 평가 기록을 생성하지 못하게 제한.

4. `OASISUnifiedValidationSystem`
   - `historical-replay`
     - 모든 시스템에 동일한 shared reality snapshot을 독립 복사 전달.
     - 시스템 proposal은 기록만 하고 다음 역사 reveal 전에 `proposal-closed-unactualized`로 종료.
     - proposal이 역사 현실을 재작성할 수 없음.
   - `interactive-actualization`
     - 시스템별 독립 reality branch 사용.
     - 외부에서 관찰된 `outcomeFrame`과 receipt가 있을 때만 실제화 경계를 통과.

5. Decision Node 독립성
   - 모든 비교 시스템은 `reset/observe/deliberate` 계약만 공유.
   - 내부 알고리즘 상속을 요구하지 않는다.
   - OASIS와 비교군이 같은 코어를 상속하는 v2 오염 경로를 구조적으로 제거하는 방향.

## v2 오염에서 반영한 강제 경계

- 미실현 가능성이 realityChangedEntities로 들어가지 못하도록 Reality와 Proposal을 분리.
- 모든 available participant를 자동 current seed로 넣는 실험 하네스 패턴 금지 방향.
- warmup 마지막 deliberation을 다음 현실의 일부로 자동 이월하지 않음.
- event relation이 current relation으로 영구 지속되지 않도록 instant/persistent 구분.
- 비교군이 OASIS reconstitution을 호출한 뒤 일부만 지우는 구조 사용 금지.
- 현재 행동과 과거 재활성 행동의 비대칭 admission rule을 실험 harness에서 만들지 않음.
- 실험자가 원자 행동집합을 미리 닫는 action-menu 입력 금지.

## 자동 감사

Workflow:
`OASIS Unified Validation System Audit`

확인된 CI run:
`33998648979`

결과: PASS

현재 감사 항목:
- 통합 검증 시스템 문법
- contamination audit 문법
- Reality에 행동 메뉴 주입 거부
- Proposal이 historical reality에 누출되지 않는지
- instant event 자동 지속 금지
- 동일 shared reality의 독립 전달
- historical replay actualization 금지
- interactive branch 격리
- 이전 contaminated v2 harness를 새 시스템이 import하지 않는지

## 현재 상태의 의미

이 시점은 **실험 결과가 아니라 실험 인프라 설계 기준점**이다.

아직 하지 않은 것:
- OASIS Reference Core를 새 Decision Node 계약에 맞게 정화 연결
- 독립 비교군 구현
- 세계/역사 입력 adapter의 provenance-aware 변환 계층 완성
- 현재 흐름 seed 정의 재검증
- possibility 형성 인터페이스의 최종 감사
- 새 본 실험 실행

따라서 다음 재개 시 원칙:

**새 실험을 돌리지 않는다.**

먼저 하나의 통합 검증 시스템 안에서 OASIS node, 독립 comparator node, reality adapter, observer contract를 모두 완성하고 오염감사를 통과시킨다.

## 보존 규칙

- `main`은 변경하지 않는다.
- 기존 `implementation/oasis-integrated-core-v1`은 OASIS 기준 구현 역사로 보존한다.
- `experiment/blind-historical-flow-v2`는 contaminated diagnostic run으로 보존한다.
- 새 검증은 `architecture/oasis-unified-validation-system-v1`에서 계속한다.
