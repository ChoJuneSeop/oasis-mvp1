# Founding Flow v1 — Post-Run Audit

## 실행 provenance

- Valid CI run: `33999658638`
- Job: `101396126112`
- Head: `08075ad4146d7d0d88a604f4948abb1e607fbdc1`
- Artifact: `9979098278`
- Artifact digest: `sha256:2b6df0ba8a1c6d30e560d3842ac1ad8c78a2b6ec72a9afead88d1778f32241ac`
- Five seeds: 101, 211, 307, 401, 503
- Seven founder decisions per seed and per ancestor branch

## 사후 판정

**Execution-valid / architecture-diagnostic.**

사전 오염경계 감사와 4축 감사는 모두 PASS했고 실제 실행도 정상 종료했다. 그러나 현재 결과를 시조 간 의미적 우열 또는 OASIS 고유 행동차이의 논문 증거로 사용하지 않는다. 사후 trace가 비교 시조 구현의 포화와 OASIS의 전면적 비의미 tie-realization을 드러냈기 때문이다.

## 확인된 사항

### 1. 현실/제안 경계 — PASS

- 현실 입력에 고수준 action menu가 들어가지 않았다.
- 모든 시조는 동일 초기 현실내용을 독립 branch로 받았다.
- OASIS `changedEntities`와 seed는 실제 reality delta에서 출발했다.
- primitive action의 target이 reality change로 역주입되지 않았다.
- 비교 시조는 OASIS 상속형이 아니다.

이는 v2 역사실험에서 확인된 treatment leakage와 affordance→reality contamination을 이번 실행에서는 재현하지 않았음을 뜻한다.

### 2. OASIS의 35개 실제 선택이 모두 contingent tie — CONFIRMED / CRITICAL FOR INTERPRETATION

5 seeds × 7 rounds의 OASIS deliberation 전부 `tieBreakUsed=true`였다.

따라서 OASIS의 action sequence 차이는 이 실행에서 의미적 선호·책임판단·관계적 우위의 증거가 아니다. 현재 primitive world에서는 OASIS가 여러 물리 가능성 사이에서 책임/불변제약으로 비대칭을 만들 이유가 거의 없었고, 최종 실제화는 기록된 realization seed에 의해 이루어졌다.

그럼에도 completed experience는 각 seed에서 7개씩 정상 폐쇄되었으며, 이후 current flow와 연결되는 경우 과거 experience 재활성화가 발생했다. 이것은 메커니즘 실행 확인이지 선택 우월성 증거가 아니다.

### 3. Temporal-Relational comparator의 고정 순서 포화 — CONFIRMED

모든 seed에서 `touch:resource-A`를 7회 연속 선택했다.

원인은 관계 후보가 동일 sequence일 때 관계 삽입 순서가 사실상 첫 대상 선택으로 이어지는 구현이다. 이는 관계추론의 필연적 결과라고 해석할 수 없으며, hidden insertion-order preference가 섞인 구현 artifact다.

다음 버전에서는 동일 recency/구조 관계 간 순서를 의미판단으로 사용하지 않고 contingent realization 또는 명시적 관계근거로 분리해야 한다.

### 4. Episodic comparator의 반복 포화 — CONFIRMED

대부분 seed에서 최초/초기 합법 episode의 action을 이후에도 반복했다. 현재 context가 모든 persistent subject를 포함하여 과거 episode와의 overlap이 넓게 유지되므로 retrieval이 쉽게 한 action에 고정된다.

이는 경험기억 계보 자체의 필연적 한계라고 결론 내릴 수 없다. 현재-flow relevance를 더 엄격히 정의한 strong episodic comparator가 필요하다.

### 5. Predictive World Model과 Goal/Utility가 사실상 동일 궤적 — CONFIRMED / IMPLEMENTATION SCOPE ISSUE

같은 seed에서는 두 시조가 동일 target을 받았고 모든 round에서 target touch를 반복했다.

현재 구현은 target 자체는 정의했지만 **goal completion condition**을 충분히 정의하지 않았다. 따라서 이미 persistent relation이 생긴 뒤에도 같은 touch가 계속 최상위 후보로 남았다.

이 결과는 world-model reasoning과 direct utility의 본질적 동등성을 뜻하지 않는다. 다음 버전에서는 결과를 본 뒤 성공값을 추가하는 것이 아니라, 실행 전부터 목표조건과 전이모델의 종료 의미를 명확히 동결해야 한다.

### 6. 세계가 OASIS의 의미적 책임/구조 차이를 드러내기에는 너무 중립적이었다 — CONFIRMED AS SCOPE LIMIT

`step/touch/emit/idle`의 저수준 물리세계는 설계자 편향을 줄이는 데는 유효했으나, 현재 버전에서는 책임·의무·명시적 과정 bridge가 거의 없다.

따라서 OASIS는 관계와 경험을 재구성해도 선택 frontier에서 대부분 의미적으로 동등한 primitive들만 남았다.

이것은 OASIS 실패도 성공도 아니다. **현재 세계가 OASIS의 의미적 선택형성을 판별하지 못한 것**이다.

## 보존 가능한 증거

- unified validation system의 reality/proposal/actualization isolation이 실제 실행에서 작동했다.
- 일곱 시조 branch가 독립 상태로 실행됐다.
- OASIS의 미실현 primitive가 reality delta를 오염시키지 않았다.
- OASIS actualization → completed experience 폐쇄가 35/35 실행되었다.
- raw action genealogy와 각 내부 trace는 후속 설계 감사 자료로 보존한다.

## 금지되는 해석

- OASIS가 다른 시조보다 다양하다/창의적이다.
- Temporal-Relational 또는 Episodic 계보는 본질적으로 반복적이다.
- World Model과 Goal/Utility는 본질적으로 동일하다.
- OASIS의 action sequence가 관계적 의미판단으로 생성됐다.
- v1이 문화·세대 진화를 검증했다.

## 다음 버전 요구조건

1. Temporal-Relational의 동일시점 관계 후보에서 insertion order를 의미적 선택근거로 사용하지 않는다.
2. Episodic comparator는 현재-flow relevance를 좁힌 strong retrieval을 사용한다.
3. Goal/Utility와 Predictive World Model의 goal condition 및 completion semantics를 실행 전에 명확히 정의한다.
4. OASIS의 contingent tie와 semantic choice를 결과에서 완전히 분리한다.
5. 세계를 더 복잡하게 만들더라도 성공/위험/선호를 넣지 않는다. 관계·책임이 필요하다면 실제 상호작용의 결과로만 발생하도록 설계한다.
6. v1 결과를 본 뒤 바뀐 조건은 별도 버전으로 사전등록하고 v1과 섞지 않는다.

## 최종 상태

**Founding Flow v1은 첫 실제 통합 실행으로 보존한다. 논문용 시조 비교 증거가 아니라 통합시스템과 다음 실험설계를 검증한 architecture-diagnostic baseline이다.**
