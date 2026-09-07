# EX-02 Whole Past Relational Structure Validation Protocol v3.0

상태 / Status: REQUIRED H2 INSTRUMENTATION SPEC
기준 / Canonical baseline: `../OASIS_CAUSAL_RESEARCH_SYSTEM_v3.0_ko.md`
가설 / Hypothesis: H2 — 새로운 과거 관계구조와 이후 현실관계

## 1. 검증 질문

현실화된 경험이 기존 과거 관계구조에 편입되어 새로운 과거 관계구조가 형성된 뒤, 그 **새로운 과거 관계구조 전체**가 이후 현실과 관계하는 출처 구조로 기능하면서 새로운 관계구조와 가능성 조합 형성에 참여하는가?

여기서 `전체`는 모든 과거 관계가 매 순간 능동적으로 표현된다는 뜻이 아니다.

정확한 의미는 다음과 같다.

- 이후 현실과 관계할 수 있는 출처 구조는 새로 형성된 과거 관계구조 전체다.
- 현재 현실과 실제로 관계하는 관계들은 그 전체 구조에서 조건에 따라 일부만 현재화될 수 있다.
- 따라서 활성 subset만 기록하고 이를 `전체 구조가 관계했다`고 선언해서는 안 된다.

## 2. 현재 120k 자료의 한계

현재 canonical audit는 다음을 관측할 수 있다.

- realized outcome
- 관계경험 증가 후보신호
- 관계 재조합 / compose
- noncurrent / reactivate
- select-participation
- same-current-state relational ablation

그러나 다음이 없다.

- 현실화 직후 형성된 **전체 과거 관계구조의 버전 식별자**
- 이후 현실 판단이 어느 전체 구조버전을 출처로 조회했는지에 대한 provenance
- 해당 구조버전과 현재 현실의 관계를 통해 어떤 관계 후보가 현재화되었는지에 대한 source-to-subset trace

따라서 현재 자료만으로 H2를 `SUPPORTED`로 승격하지 않는다.

## 3. 필수 계측

### A. Past Relational Structure Version

현실화된 경험의 편입 및 그에 따른 구조형성 완료 시점마다 다음을 기록한다.

- `pastStructureVersion`
- `formationTick`
- `realizedExperienceId`
- `priorStructureVersion`
- `structureFingerprint`
- `realizedRelationCount`
- `composedRelationCount`
- `latentRelationCount`

`structureFingerprint`는 비교·감사를 위한 결정론적 식별자이며 그 자체가 이론적 과거 관계구조를 대체하지 않는다.

### B. Subsequent Reality Relation Query

이후 행동결정 시마다 다음을 기록한다.

- `sourcePastStructureVersion`
- `currentRealitySignature`
- `relationalCandidatePoolSize`
- `currentlyRelatingRelationIds`
- `currentlyNonRelatingCount`
- `possibilityCompositionSignature`
- `participationStateSignature`
- `selectedAction`

핵심은 `currentlyRelatingRelationIds`만 기록하는 것이 아니라 **어느 전체 과거 관계구조 버전에서 그것들이 현재화되었는지**를 연결하는 것이다.

## 4. H2 최소 증거계보

다음 계보가 하나의 연속 trace로 존재해야 한다.

`Realized Experience`
→ `Incorporation into Existing Past Relational Structure`
→ `New Past Relational Structure Version formed`
→ `Later Current Reality`
→ `Query sourced from that whole Past Relational Structure Version`
→ `Currently relating subset emerges`
→ `New relational structure and/or possibility composition observed`

## 5. 강화 검증

가능한 경우 동일 현재상태 shadow 분석에서 다음을 비교한다.

- 실제 새 과거 관계구조 버전
- 직전 과거 관계구조 버전 또는 해당 현실화 경험의 구조적 참여를 제거한 분석 전용 counterfactual

이 counterfactual은 production 과거 관계구조에 절대 편입하지 않는다.

차이가 나타나더라도 `전체 구조의 모든 구성요소가 인과적으로 필요하다`고 해석하지 않는다.

## 6. 판정

- 구조버전 없음: `H2_UNVALIDATED_MISSING_WHOLE_STRUCTURE_PROVENANCE`
- 구조버전과 이후 현실 query 연결만 관측: `H2_STRUCTURE_RELATION_OBSERVED_WITHIN_HARNESS`
- 이후 새로운 관계구조/가능성 조합까지 연속 추적: `H2_SUPPORTED_WITHIN_HARNESS`
- 반복·다중 환경 재현 전: `GENERALIZATION_UNVALIDATED`

## 7. 금지 해석

- 활성 관계 subset = 과거 관계구조 전체
- 모든 과거 관계가 매 시점 능동 참여함
- 현실화로 전체 관계구조가 전면 재작성됨
- 단순 해시 변화 = H2 입증
- 한 시점의 다음 행동 변화 = 장기 H2 입증
- 미실현 가능성이 독립 미래경로로 보존됨

## 8. 실험자 비개입

초기조건과 환경 설정 이후 실험자는 판단, 개성, 관계, 가능성 조합, 선택, 책임, 현실화, 과거 관계구조를 변경하지 않는다.

구조버전 기록과 shadow counterfactual은 관측·분석 전용이며 production 현실흐름을 변경하지 않는다.
