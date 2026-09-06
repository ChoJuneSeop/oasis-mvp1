# Founding Flow v2 — Post-Run Audit

## 실행 provenance

- Valid CI run: `34000270643`
- Job: `101397765954`
- Head: `cda68e819b24dc5216bbd82be7fb23d7813da476`
- Artifact: `9979269657`
- Artifact digest: `sha256:c9abcd4d30487301719c769fee157a140483974197a49bdeb9393deff446e8da`
- Seeds: 101, 211, 307, 401, 503
- Seven decisions per seed and per ancestor branch
- World: Founding Flow v1 world intentionally unchanged

참고: run `34000229649`는 실제 실험 실행 전에 audit wording regex가 금지문구 속 `winner` 표현까지 오인하여 중단된 비실험 CI 실패다. 실제 execution은 발생하지 않았고, 금지기준을 약화하지 않은 채 명시적 목표선언과 금지문구를 구분하도록 protocol wording만 정정한 뒤 valid run을 수행했다.

## 최종 판정

**Execution-valid / archetype-fidelity improved / environment-underidentified.**

v2는 v1에서 확인된 세 comparator 구현문제를 교정했고 모든 사전 감사와 targeted archetype-fidelity audit를 통과했다. 그러나 현재 5x5 primitive world가 대부분 시조에서 의미적 비대칭을 충분히 만들지 못해, 시조 간 본질적 차이나 OASIS 고유성을 판정하는 논문 증거로는 아직 사용하지 않는다.

## 사전감사 결과

### OASIS 실험 선행 4축 감사

- 성공값 감사: PASS
- 평가기준 감사: PASS
- 흐름 감사: PASS
- 구현 감사: PASS

### 추가 시조 충실도 감사

1. Temporal insertion-order invariance: PASS
2. Episodic local relevance: PASS
3. Goal terminal semantics: PASS
4. Unified-system contamination boundary: PASS
5. blind-historical-flow-v2 harness non-import: PASS

## v1 문제별 결과

### 1. Temporal-Relational insertion-order saturation — FIXED

v1에서는 모든 seed에서 `touch:resource-A`가 7회 반복되었다. v2에서는 동일 최신 sequence 관계를 set으로 유지하고 배열 삽입순서를 의미판단에 사용하지 않았다.

독립 audit에서 claim 배열을 역순으로 뒤집어도 candidate frontier와 실제화 action이 동일하게 유지됐다.

실제 run에서도 v1의 `resource-A` 고정포화는 사라졌다. 따라서 v1의 반복은 Temporal-Relational 계보의 본질적 결과가 아니라 구현 artifact였다는 해석이 강화된다.

주의: v2의 Temporal-Relational도 35회 중 29회가 동등후보 contingent tie였다. 따라서 현재 세계가 시간관계 의미를 강하게 분리했다고 볼 수는 없다.

### 2. Episodic global-persistent overlap — IMPLEMENTATION FIXED, WORLD-LOCAL SATURATION REMAINS

v2는 retrieval context를 전체 persistent subject가 아니라 current delta + founder 인접 local context + current relation delta로 제한했다. founder 자체도 overlap 근거에서 제외했다.

독립 locality audit에서 멀리 있는 persistent `far-Z`만 공유하는 과거 episode는 recall되지 않았다. 따라서 v1의 global persistent overlap 오염은 제거됐다.

그러나 실제 5x5 세계에서는 founder가 중앙에 있고 resource-A, resource-B, marker-M, other-O가 모두 초기에 인접해 있다. 이 때문에 local context 자체가 넓고 반복적으로 유사하다.

실제 결과:
- seed 101: `touch:marker-M` 7/7
- seed 211: `idle` 4/7, `step:1:0` 2/7
- seed 307: `touch:resource-A` 6/7
- seed 401: `touch:resource-B` 7/7
- seed 503: `touch:marker-M` 7/7

raw trace를 보면 반복은 global persistent subject 때문이 아니라 local Jaccard overlap 0.6~1.0이 지속되는 데서 발생한다.

따라서 이 현상을 Episodic 계보의 본질적 한계로 결론내리지 않는다. v2에서는 **retrieval implementation은 교정됐지만 world geometry가 episodic discrimination에 충분하지 않다**고 판정한다.

### 3. Predictive World Model / Goal Utility terminal semantics — FIXED

v1에서는 목표 target과 terminal condition이 분리되지 않아 목표 contact 후에도 동일 target touch가 계속 최상위로 남았다.

v2는 실행 전에 다음 terminal relation을 동결했다.
- resource → `holds`
- marker → `touched-marker`
- other → `contacted`

독립 audit에서 terminal relation 형성 직후 두 시조 모두 goal completed 상태를 인식했고, candidate frontier가 단일 target touch에서 전체 legal primitive 집합으로 풀렸다.

실제 run에서도 각 goal 기반 시조는 첫 목표 actualization 뒤 더 이상 target touch를 의미적으로 강제하지 않았다. 이후 동일 target touch가 다시 나타나는 경우에도 completed-goal contingent tie 중 우연히 실제화된 것이며 목표추구 증거가 아니다.

따라서 v1의 두 시조 동일 반복궤적은 본질적 동등성 증거가 아니며 implementation scope issue였음이 확인됐다.

### 4. OASIS semantic choice vs contingent realization — CLEANLY SEPARATED, STILL 0 SEMANTIC CHOICES

v2에서도 OASIS는 5 seeds × 7 rounds = 35/35 모두 `tieBreakUsed=true`였다.

- OASIS contingent tie: 35/35
- OASIS semantic choice: 0/35
- completed experiences: 35/35 정상 폐쇄

따라서 OASIS action sequence는 이번에도 관계적 의미선택 또는 책임판단의 증거가 아니다.

이것은 OASIS failure로 판정하지 않는다. 현재 primitive world에서 relation/responsibility/current-flow support가 후보들을 충분히 비대칭화하지 못했다.

## 전체 tie 구조

이 현상은 OASIS만의 문제가 아니다.

- Reactive: 35/35 tie
- State-Memory: 34/35 tie
- Temporal-Relational: 29/35 tie
- Episodic: 8/35 tie
- Predictive World Model: 30/35 tie
- Goal/Utility: 30/35 tie
- OASIS: 35/35 tie

이 값은 성능지표가 아니라 **의미적으로 구별되지 않은 후보가 얼마나 자주 남았는지에 대한 메커니즘 진단값**이다.

대부분 시조가 높은 tie 비율을 보였다는 사실은 현재 세계가 시조 고유 원리를 드러내는 데 필요한 관계적/시간적/인과적 구조가 부족함을 보여준다.

## 보존 가능한 결과

- unified reality/proposal/actualization isolation이 재현됐다.
- 7개 branch 독립성이 유지됐다.
- OASIS current seed contamination이 재발하지 않았다.
- Temporal insertion-order artifact가 제거됐다.
- Episodic global persistent overlap artifact가 제거됐다.
- Goal completion omission artifact가 제거됐다.
- OASIS semantic/tie 구분이 명시적으로 기록됐다.
- v1과 동일 world를 사용했기 때문에 comparator correction 효과를 world change와 분리할 수 있다.

## 금지되는 해석

- OASIS가 다른 시조보다 우월/열등하다.
- OASIS가 의미적으로 더 다양하다.
- Episodic 계보는 본질적으로 반복적이다.
- Temporal-Relational 계보가 무작위 이동형이다.
- Predictive World Model과 Goal/Utility가 본질적으로 같다/다르다.
- 높은 tie 비율이 지능 또는 성능의 낮음을 의미한다.
- v2가 문화 또는 세대 진화를 검증했다.

## 다음 실험 설계에 주는 요구

v2 다음 단계에서는 comparator 원형을 다시 수정하는 것이 아니라 **환경 식별력(environment identifiability)**을 별도 축으로 설계해야 한다.

English: **Environment Identifiability**
한국어 설명: 특정 모델을 유리하게 만드는 난이도가 아니라, 서로 다른 현실대응 원리가 실제로 다른 관계·시간·기억·예측·책임 과정을 형성할 기회를 현실이 제공하는 정도.

다음 world는 다음을 만족해야 한다.

1. 초기 모든 객체를 founder 주변에 밀집시키지 않는다.
2. 관계가 실제 interaction 결과로 형성·소멸·방향전환될 수 있어야 한다.
3. 과거 episode와 현재 local context가 때로는 겹치고 때로는 분리되어야 한다.
4. temporal relation의 order/direction이 실제 후속 현실과 연결될 수 있어야 한다.
5. goal/world-model이 단순 Manhattan one-step과 동일해지지 않도록 물리적 인과구조는 존재할 수 있으나, 성공·위험·선호를 주입하지 않는다.
6. OASIS에만 책임/관계를 제공하지 않는다. 동일 외부 현실에서 모든 시조가 각자의 방식으로 해석하게 한다.
7. 의미 비대칭은 experimenter-authored action ranking이 아니라 실제 interaction history에서 발생해야 한다.
8. 새 world는 v2와 섞지 않고 별도 사전등록 버전으로 실행한다.

## 최종 상태

Founding Flow v2는 v1 comparator corrections를 검증한 **valid methodology checkpoint**로 보존한다.

그러나 OASIS 또는 시조 간 구조적 차이의 논문 증거로는 아직 부족하다. 다음 단계는 시조 코드를 더 손대는 것이 아니라, 객관적 설계·관찰자 원칙 아래 각 원형이 실제로 살아갈 수 있는 **더 식별 가능한 현실 흐름**을 별도 실험으로 설계하는 것이다.
