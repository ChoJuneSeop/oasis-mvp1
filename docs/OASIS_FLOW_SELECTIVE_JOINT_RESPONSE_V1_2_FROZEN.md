# OASIS Flow-Selective Joint Response Experiment v1.2 — Frozen Design

Status: FROZEN BEFORE RESULTS

## Governing rule

실험 결과에 맞춰 OASIS 정의나 코드를 조정하지 않는다. 반복 중 수정 가능한 것은 (1) 고정 정의와 불일치한 구현, (2) 측정 오류, (3) 실행 오류뿐이다. 설계 논리 자체를 바꾸면 새 버전으로 분리한다.

## Fixed conceptual claims under test

1. 모든 실제 현실화 경험은 Past Relational Structure(과거 관계구조, PRS)에 편입된다.
2. 이후 재관계 또는 재현실화는 가능성일 뿐 편입의 성공조건이 아니다.
3. 과거 전체가 매 순간 판단에 참여하지 않는다. 현재 현실흐름이 관계 진입점을 열 때 해당 과거 영역만 현재 판단 후보가 될 수 있다.
4. 현재 흐름에서 관계, 가능성, 책임을 순차적 조기 탈락 사슬로 처리하지 않는다. 같은 현재 시점에서 이용 가능한 정보는 joint evaluation(결합평가)의 입력으로 유지한다.
5. 즉시평가와 심화평가는 행동권한상 분리한다. 즉시행동이 현실을 바꾸면 과거 시점의 심화판단을 그대로 다음 행동명령으로 적용하지 않는다.
6. 고정 정상/이상 임계값, 고정 최근-N 기억창, 고정 시간창을 새 선택호출 규칙의 핵심으로 사용하지 않는다.

## Stage A — production-path contract and selective recall

Purpose: 새 일반 PRS 선택호출 경로가 실제 production(실제 작동) 경로에 존재하며, 전체 PRS를 매 판단마다 순회하지 않고 현재의 사실적 관계키로 동일한 관계집합을 찾는지 검증한다.

Current relational keys K_t are generated from facts already present at time t: current place, current target, current chosen/ongoing choice, current leader if present, gate relation required by current target if present, and NPCs physically present at current place. The schema is fixed, but no permanent importance score is attached to any key.

Selective recall must use maintained indexes. No fixed top-k, age cutoff, risk threshold, or future outcome may be used.

Reference comparator for code-contract only: full scan over the same PRS using the exact same matching predicate. Selective and full-scan result sets must be identical. Full scan is not OASIS production behavior; it is an audit oracle.

Stage A is NOT allowed to claim crisis superiority or responsibility-axis validation. If U/I/V/T are not operationally represented in the current world, the code must report them as not operationalized rather than fabricate values.

## Stage B — joint/live timing and immediate action

Stage B starts only after Stage A contract passes. It must add a neutral flow-crisis harness with the same environment dynamics and action space for all comparison branches. Hidden analysis labels must never enter the agent input.

Comparators: Full-Flow OASIS; Full-Scan; Sequential-Frozen; Sequential-Live; Delayed-Action; Legacy production reference.

Sequential-Frozen tests implementation order on one frozen reality state. Sequential-Live tests information-aging and response delay while reality continues to move.

## Evidence and failure rules

- Selective recall misses any experience that the exact-predicate full scan finds: implementation failure.
- Selective recall depends on future information: experiment invalid.
- Selection uses legacy 80-episode, 1200-tick, or danger ±0.18 cutoffs as new PRS recall rules: implementation failure.
- PRS incorporation regresses: implementation failure.
- Result differs from expectation while implementation matches this frozen design: preserve the result; do not patch toward the expected outcome.
- No later reappearance of a stored experience: not a failure.

## Repetition policy

r1, r2, ... preserve failed reports and commits. Each code change must state whether it repairs implementation, measurement, or execution. Holdout streams are not used for tuning. Existing deterministic streams may be used for regression/smoke only.
