# OASIS G3 Participation / Reconstruction / Provenance Refinement

상태: DRAFT / NOT FROZEN
목적: Participation과 Reconstruction을 흐름 관측값으로 유지하면서, 사전 라벨 의존·상호작용 누락·provenance 누락을 방지한다.

---

## 1. Participation은 scalar degree가 아니라 현재 관계 trace다

시점 tau에서 과거 relation element e의 Participation은 다음 구조로 본다.

Pi_tau(e) = {
  current anchors,
  current candidate links,
  distribution effect observation,
  dynamic role trace,
  generated possibility trace,
  interaction traces,
  measurement method,
  evidence
}

여기서 distribution effect는 Pi_tau(e)의 한 관측성분일 뿐이다.

다음을 금지한다.

- distribution_effect를 memory importance로 해석
- distribution_effect == 0을 non-participation으로 판정
- role trace를 고정 enum으로 제한
- 여러 Participation 성분을 하나의 participation score로 합산
- 과거 epoch의 participation 값을 다음 epoch의 영구 weight로 사용

---

## 2. Individual probe와 Joint probe의 관계

현재 individual leave-one-relation-out effect만으로는 redundancy 또는 interaction 때문에 실제 구조적 참여를 놓칠 수 있다.

따라서 joint probe는 필요하다.

하지만 joint probe의 실행 조건을 '이미 reconstruction으로 판정되었는가'에만 의존하면 안 된다.

그렇게 하면 reconstruction operator가 먼저 인식하지 못한 상호작용은 영원히 joint probe 대상이 되지 않을 수 있다.

이는 관측기가 관측대상의 사전 분류에 의존하는 순환 위험을 만든다.

---

## 3. Interaction Probe Set

joint probe 대상은 고정된 모든 조합을 brute force로 검사하지 않는다.

대신 현재 흐름에서 실제 구조적으로 연결된 relation set을 형성한다.

G_tau(c) = 현재 가능성 c에 기여하거나 동일한 current anchor 관계망에 연결된 과거 relation element의 집합.

InteractionProbeSet_tau는 최소한 다음 source set을 포함한다.

1. multi-source reconstruction의 source set
2. 동일 current candidate에 둘 이상이 실제 contribution trace를 가진 relation set
3. 동일 current anchor 또는 동일 current relation subgraph에 공동으로 연결된 relation set 중, individual probe만으로 contribution genealogy가 분리되지 않는 집합

중요:

- 이 조건은 'synergy', 'redundancy' 같은 결과 라벨을 사전에 부여하지 않는다.
- joint probe 결과도 하나의 interaction observation일 뿐 global participation score가 아니다.
- 모든 조합을 검사하는 고정 combinatorial search를 요구하지 않는다.
- 실제 현재 관계그래프에서 형성된 연결구조를 따라 probe family가 동적으로 생성된다.

---

## 4. Reconstruction의 세 관측축

현재 Reconstruction은 다음 세 관측축을 유지한다.

- c: recombination / 재조합
- v: role transformation / 역할 변환
- s: structural transformation / 구조 변형

이 세 값은 하나의 Reconstruction Degree로 합산하지 않는다.

또한 (c,v,s)를 전역 좌표처럼 해석하지 않는다.

### 4.1 Method-local comparability

각 축의 값은 measurement_method와 evidence에 종속된다.

따라서 서로 다른 방법으로 얻은 0.7과 0.7을 같은 의미라고 가정하지 않는다.

필요한 경우 다음 metadata를 함께 보존한다.

- method id / version
- observation scope
- domain
- reference structure
- evidence
- comparability context

### 4.2 Vector 사용 제한

(c,v,s) vector는 현재 reconstruction 상태를 보존하기 위한 표현이다.

기본 G3에서는 다음을 자동으로 하지 않는다.

- vector norm으로 reconstruction 강도 계산
- Euclidean distance로 경험 간 유사도 판정
- 고정 threshold로 low/medium/high 등급화
- 과거 vector를 영구 memory weight로 사용

이런 연산이 특정 실험에서 필요하다면 별도 측정가설과 정당화가 필요하다.

---

## 5. Reconstruction은 Participation의 상위등급이 아니다

Participation과 Reconstruction은 독립 축이다.

가능한 흐름 예시는 다음과 같다.

- 과거 관계가 현재 가능성을 제약하지만 reconstruction은 거의 없을 수 있다.
- 과거 관계가 distribution effect를 거의 만들지 않지만 역할 구조를 바꿀 수 있다.
- 여러 과거 관계가 공동으로 새 가능성 구조를 만들 수 있다.
- 과거 경험이 현재 epoch에 전혀 참여하지 않을 수 있다.

이 예시는 고정 4분류가 아니다.

각 epoch에서 실제 trace가 어떻게 형성되는지를 설명하기 위한 사례다.

---

## 6. Provenance 범위 보완

현재 Completed Experience의 provenance는 reconstruction source만으로 제한되어서는 안 된다.

재구성 없이 다음과 같이 참여한 과거 관계도 decision genealogy에 남아야 한다.

- possibility distribution에 영향을 준 관계
- candidate formation에 기여한 관계
- constraint/comparison/verification 역할을 수행한 관계
- responsibility observation의 근거가 된 관계
- joint interaction에서만 효과가 드러난 관계

따라서 provenance를 두 층으로 구분한다.

### 6.1 Historical Source Lineage

현재 epoch 판단에 실제 참여한 모든 과거 relation element와 현재 trace의 연결.

### 6.2 Reconstruction Lineage

그중 reconstruction에 실제 source로 들어간 relation element와 transformation trace.

Reconstruction Lineage는 Historical Source Lineage의 부분집합일 수 있다.

이를 통해 reconstruction이 없더라도 과거 경험이 현재 판단에 참여한 계보를 잃지 않는다.

---

## 7. Current Evidence와 Historical Provenance의 비대칭

현재 근거와 과거 provenance는 동일한 종류의 근거가 아니다.

현재 evidence anchor는 '지금 이 possibility가 현실과 관계 가능한가'를 지지한다.

과거 provenance는 '어떤 과거 관계가 현재 가능성 형성과 판단과정에 다시 참여했는가'를 보존한다.

따라서 과거 provenance의 양이 많다고 현재 grounding이 강해지는 것으로 자동 해석하지 않는다.

현재 grounding 없이 historical support만 많은 possibility는 현실화 후보가 될 수 없다.

---

## 8. 다음 코드 설계 변경 후보

아직 canonical code를 변경하지 않는다.

experiment branch에서 다음 인터페이스를 먼저 검토한다.

1. ParticipationMeasurement에 current anchor/reference trace를 연결
2. GroupParticipationMeasurement의 source set을 reconstruction source 외의 structural interaction set에서도 생성 가능하게 확장
3. ReconstructionMeasurement에 method scope/comparability metadata 추가
4. HistoryEntry provenance를 Historical Source Lineage와 Reconstruction Lineage로 구분
5. CandidateGroundingTrace와 historical lineage를 ChoiceGenealogy에서 함께 연결

---

## 9. 검증 질문

다음 질문에 모두 답할 수 있어야 이 부분을 G3에서 동결할 수 있다.

- individual effect 0인 relation이 joint probe 또는 role trace에서 구조적 참여를 보일 수 있는가.
- reconstruction이 없더라도 과거 relation의 현재 참여 계보를 복원할 수 있는가.
- multi-source interaction을 reconstruction operator의 사전 인식 없이도 필요한 경우 관측할 수 있는가.
- (c,v,s)가 서로 다른 measurement method 사이에서 잘못 비교되지 않는가.
- current evidence와 historical provenance를 혼동하지 않는가.
- 어느 경우에도 Participation/Reconstruction이 영구 score나 고정 라벨로 변환되지 않는가.

# English explanation

Participation is treated as a structured current-epoch trace rather than a scalar memory importance score. Individual counterfactual effect is only one observable and may be zero even when structural participation exists.

Joint probes should not depend exclusively on a reconstruction operator having already identified a multi-source reconstruction. Interaction probe sets should also arise from the current contribution and anchor graph, otherwise unrecognized interactions can be missed by construction.

Reconstruction observables are method-scoped. The c/v/s vector records recombination, role transformation, and structural transformation, but it is not a universal coordinate system, score, rank, or thresholded class.

Historical provenance should include all past relations that actually participated in the current decision genealogy, while reconstruction provenance is a more specific subset describing relations that entered a reconstruction process.
