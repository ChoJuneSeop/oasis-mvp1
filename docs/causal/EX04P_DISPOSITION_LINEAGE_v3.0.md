# OASIS EX-04P Disposition Lineage Replay v3.0

상태 / Status: completed lineage validation  
기준일 / Date: 2026-09-07  
상위 증거기록 / Parent evidence: `EX04P_DISPOSITION_EVIDENCE_v3.0.md`

## Validation Run

Workflow: `OASIS EX-04P Longitudinal Disposition Lineage v3`  
Run id: `34122198661`  
Head commit: `fe150380f7b6955c821bb624a04f87109d868d4e`  
Result: **SUCCESS**

## Purpose

EX-04P-D의 최종 장기분기만 보고 개성 초기조건의 인과기여를 추론하지 않는다.

RELATIONAL prior와 candidate-only PLACEBO branch가 **동일한 직전 party-state**를 가진 판단에서 실제 policy/target이 달라지는 최초 branch point를 직접 추적한다.

첫 branch point 이후의 차이는 직접 prior 효과와 구분하여, 서로 다른 현실화 경험의 편입 → 새로운 과거 관계구조 형성 → 이후 현실과의 관계에서 누적된 결과로 해석한다.

## Validity

- replay scenarios: **6/6**
- divergent scenarios: **3/6**
- divergent scenarios with matched-pre-state policy difference: **3/3**
- divergent scenarios with matched-pre-state actual-choice difference: **3/3**
- deterministic twin mismatch ticks: **0**
- `experimenterInterventionCount`: **0**

## Direct Branch Lineage

### Scenario 1 — dawn

- first world divergence: **tick 703**
- pre-decision party-state: **matched**
- RELATIONAL policy top: `canyon`
- PLACEBO policy top: `ruin`
- RELATIONAL actual target: `canyon`
- PLACEBO actual target: `ruin`
- RELATIONAL prior applied count over horizon: **4**
- PLACEBO applied count over horizon: **4**
- twin mismatches: **0 / 0**

### Scenario 3 — star

- first world divergence: **tick 390**
- pre-decision party-state: **matched**
- RELATIONAL policy top: `canyon`
- PLACEBO policy top: `tower`
- RELATIONAL actual target: `canyon`
- PLACEBO actual target: `tower`
- RELATIONAL prior applied count: **4**
- PLACEBO applied count: **2**
- twin mismatches: **0 / 0**

### Scenario 5 — blue

- first world divergence: **tick 390**
- pre-decision party-state: **matched**
- RELATIONAL policy top: `canyon`
- PLACEBO policy top: `tower`
- RELATIONAL actual target: `canyon`
- PLACEBO actual target: `tower`
- RELATIONAL prior applied count: **4**
- PLACEBO applied count: **6**
- twin mismatches: **0 / 0**

## Negative-Lineage Controls

Scenario 2, 4, 6:

- first world divergence: **none within 12,000 ticks**
- matched-pre-state policy difference: **none**
- matched-pre-state actual-choice difference: **none**
- RELATIONAL prior applied count: **0**
- PLACEBO applied count: **0**
- twin mismatch ticks: **0**

## Evidence Grade

- matched-pre-state policy lineage: **DIRECTLY OBSERVED IN ALL 3 DIVERGENT MATCHED SCENARIOS**
- matched-pre-state actual-choice lineage: **DIRECTLY OBSERVED IN ALL 3 DIVERGENT MATCHED SCENARIOS**
- conditional causal contribution of the predeclared minimum relational-attention disposition operationalization: **SUPPORTED WITHIN MATCHED CANONICAL HARNESS**
- no-effect when the eligibility condition never arises: **OBSERVED IN ALL 3 ZERO-APPLICATION CONTROLS**
- necessity for behavior/realization: **NOT NECESSARY WITHIN CURRENT HARNESS**
- sufficiency: **NOT ESTABLISHED**
- universal/general AI behavior claim: **UNVALIDATED**

## Interpretation Boundary

이 lineage replay가 지지하는 직접 주장은 다음과 같다.

**동일한 직전 현재상태에서, 사전에 고정된 관계 identity 기반 최소 attention prior와 관계 identity를 사용하지 않는 matched placebo가 서로 다른 선택을 만들 수 있으며, 그 선택 차이가 이후 서로 다른 현실화 경험과 과거 관계구조의 장기 분기로 이어질 수 있다.**

그러나 다음은 주장하지 않는다.

- 개성이 모든 행동의 필요조건이다.
- 개성이 특정 행동의 충분조건이다.
- 본 하나의 prior가 개성 전체를 대표한다.
- 이후 모든 tick의 차이가 initial prior의 직접효과다.
- 인간 성격과 동일하다.
- 다른 환경·모델·실세계에도 자동 일반화된다.
