# Founding Flow v7 — Relation Mutation Polarity Preservation

## 목적

Founding Flow v7은 v6에서 정확히 국소화된 C4-N 하나만 수정한다.

### C4-N — Relation Mutation Polarity Collapse

English: **Relation Mutation Polarity Collapse**

한국어 설명: 관계 형성(`upsert`)과 관계 해제(`remove`)의 변화 방향은 raw historical relation에는 남아 있지만, relation signature와 structural identity를 만들 때 `op`가 빠져 서로 반대인 완결 관계과정이 같은 구조로 접히는 문제.

v7의 목적은 이 변화 방향을 **historical relational structure의 정체성**에서 보존하는 것이다.

## 선행 킬서치 결론

이 수정은 OASIS의 신규성 주장이 아니다.

Temporal graph / dynamic graph 분야에서는 이미:
- edge addition
- edge deletion
- edge modification

을 서로 다른 시간적 변화 연산으로 표현한다.

특히 Temporal Change Graph는 graph evolution을 atomic change operation의 순서로 나타내며, graph stream representation도 link appearance와 disappearance를 별도 event로 취급한다.

따라서 OASIS에서 `upsert`와 `remove`를 동일 structural signature로 접는 것은 일반적인 dynamic-graph semantics보다도 정보가 적은 표현이다.

v7은 이 표준적 구분을 OASIS의 역사적 관계과정 표현에 복원하는 **implementation fidelity correction**이다.

## 변경하지 않는 것

- OASIS reference core 파일 자체는 수정하지 않는다.
- v5의 Process-Evidence Reactivation을 유지한다.
- v4의 founder-only / far-spatial / common-actor guards를 유지한다.
- v5의 co-presence-only exclusion을 유지한다.
- current live-world relation의 assert/retract semantics를 변경하지 않는다.
- choice, responsibility, participation, possibility generation 규칙을 변경하지 않는다.
- comparator 구현을 변경하지 않는다.
- Founding Flow v3 world, seeds, 12 rounds, 11 exogenous frames를 그대로 유지한다.
- reward, score, winner, desired trajectory 없음.

## v7의 단일 수정

Historical/current relation을 structural identity에 넣을 때 relation signature가 mutation `op`를 포함한다.

기본 형태:

`<op>:<from>-><to>:<kind>:<context>`

예:

`upsert:founder->other-O:contacted:`

과

`remove:founder->other-O:contacted:`

는 다른 historical relational structure로 기록된다.

`op`가 명시되지 않은 derived relation은 `upsert`로 간주하지 않고 **`observe`**라는 별도 structural token을 사용한다. 이는 자동 공간관계처럼 state mutation event가 아닌 관찰/도출 관계와 실제 relation mutation을 구분하기 위함이다.

중요:
- historical `remove`를 현재의 negative edge나 현재 부재 사실로 주입하지 않는다.
- `remove`는 오직 과거 완결과정에서 “그 관계가 해제되었다”는 historical event identity다.
- 현재 world state는 기존 RealityLedger/OASIS observe semantics가 그대로 결정한다.

## 왜 단순히 outcome을 미래 consequence로 복사하지 않는가

과거에 관계가 형성됐다고 현재 같은 행동의 미래에도 반드시 형성된다고 볼 수 없다.

따라서 v7은:
- 과거 outcome을 predicted consequence로 넣지 않는다.
- past result를 현재 action의 확정 결과로 취급하지 않는다.
- historical relation mutation의 **정체성만** 보존한다.

## 사전 4축 감사

1. 성공값 감사 — 특정 행동, tie 감소, 특정 reactivation을 목표로 두지 않는다.
2. 평가기준 감사 — 성능점수/승패 없음.
3. 흐름 감사 — historical mutation은 historical evidence일 뿐 current live state를 덮어쓰지 않는다.
4. 구현 감사 — relation structural key 이외의 선택·책임·가능성 로직이 바뀌지 않는지 확인한다.

## Targeted twin audits

### A. Polarity twin

동일:
- actor
- target
- relation id/from/to/kind
- historical choice
- current flow
- affordance

과거 outcome `op`만:
- upsert
- remove

으로 다르게 한다.

필수:
- raw historical relation op 차이 유지
- relationSignature 차이 발생
- structuralExpansion.structureKey 차이 발생

choice 차이는 요구하지 않는다.

### B. Positive kind control

`contacted`와 `signaled` relation kind 차이는 계속 구분되어야 한다.

### C. Observation-vs-mutation control

`op` 없는 derived `adjacent-to` relation과 명시적 `upsert` relation은 structural token에서 구분되어야 한다.

### D. v5 regression guards

- co-presence-only experience는 reactivation 불가
- founder-only experience는 reactivation 불가
- far `located-relative-to` bridge 금지

하나라도 FAIL이면 full Founding Flow v7 실행을 중단한다.

## Full-flow 실행

Targeted audits를 통과한 경우에만 v3 world에서:
- 5 seeds
- 7 archetypes
- 12 decisions

을 동일하게 실행한다.

사후 관찰:
- relation create/remove가 실제로 생긴 completed experience에서 structural signature가 mutation direction을 보존하는가
- C1-C3/C5가 회귀하지 않는가

특정 행동/semantic choice 수는 성공값이 아니다.

## 증거 경계

v7은 OASIS 우월성·고유성·문화·세대 진화 증거가 아니다.

v7이 증명할 수 있는 것은 오직:

> OASIS validation implementation이 실제 관계 형성과 관계 해제를 서로 다른 historical relational process identity로 보존하는가

이다.
