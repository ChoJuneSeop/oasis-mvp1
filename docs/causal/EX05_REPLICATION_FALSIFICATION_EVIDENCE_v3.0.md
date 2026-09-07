# EX-05 Replication and Falsification Evidence v3.0

상태 / Status: COMPLETED / MIXED POSITIVE AND NEGATIVE REPLICATION RESULT  
기준일 / Date: 2026-09-07  
상위 기준 / Governing protocol: `../../OASIS_RESEARCH_PROTOCOL.md`  
선행 실험 / Parent experiment: `EX04M_MULTI_OASIS_EVIDENCE_v3.0.md`

## 1. Purpose

EX-04M의 결과를 동일 외생흐름에만 의존하는 현상으로 오인하지 않기 위해, 사전에 고정한 서로 다른 외생흐름에서 다음 두 효과를 독립적으로 재검증한다.

1. same prior + different Past Relational Structure
2. different prior + same Past Relational Structure

성공결과뿐 아니라 재현 실패를 정식 반증증거로 보존한다.

## 2. Design

Base design: EX-04M matched multi-OASIS comparison  
Horizon per stream: **8,000 ticks**

Predeclared exogenous offsets:
- `E137`: 137
- `E977`: 977
- `E4099`: 4099

Controls:
- identical production party id
- same `NONE` controls
- same-prior/same-Past-Relational-Structure controls
- deterministic twins
- no experimenter intervention after initialization

## 3. Run

Workflow: `OASIS EX-05 Replication and Falsification v3`  
GitHub Actions run id: `34128014053`  
Job id: `101761166707`  
Result: **SUCCESS**

Validity:
- all three child runs valid
- deterministic twin mismatch: **0**
- same-condition controls: **exact**
- `experimenterInterventionCount`: **0**

## 4. Positive Replication — Past Relational Structure

The EX-04M same-prior/different-Past-Relational-Structure effect reproduced in **3/3 predeclared alternative exogenous streams**.

Thus, inside this tested harness family:
- Past Relational Structure differences can repeatedly differentiate later behavioral paths while prior is held matched;
- the observation is not restricted to the single canonical exogenous stream used in EX-04M.

Evidence grade:
**ROBUSTLY_REPLICATED_ACROSS_THE_THREE_PREDECLARED_EXOGENOUS_STREAMS_WITHIN_CURRENT_HARNESS_FAMILY**

This does not establish universal necessity, universal sufficiency, or external generalization.

## 5. Negative Replication — Individual Disposition Prior

The EX-04M different-prior/same-Past-Relational-Structure matched-prestate actual-choice effect reproduced in **0/3 alternative exogenous streams**.

This is a substantive falsification result.

Therefore the prior EX-04P-D/DL and EX-04M positive observations must be narrowed:
- the tested minimum relational-attention prior **can** contribute to behavior under some matched conditions;
- the effect is **not robustly replicated across the three alternative exogenous streams**;
- it cannot be promoted to a general, stream-invariant behavioral effect;
- disposition remains unnecessary for behavior in the current harness because `NONE` conditions remain behaviorally active;
- sufficiency remains unestablished.

Evidence grade:
**CONDITIONAL_EFFECT_OBSERVED_PREVIOUSLY / GENERAL_EFFECT_NOT_REPLICATED_IN_EX05**

## 6. Same Output, Different Process Replication

Same-output/different-Past-Relational-Structure states were reproduced across **3/3 alternative exogenous streams**.

This strengthens the empirical distinction:

**same current output ≠ same Past Relational Structure ≠ same causal process**

It still does not imply that all hidden process differences are behaviorally relevant at every subsequent moment.

## 7. Integrated EX-05 Verdict

- deterministic integrity: **SUPPORTED**
- Past Relational Structure behavioral contribution: **REPLICATED ACROSS ALL THREE PREDECLARED EXOGENOUS STREAMS**
- disposition-prior general effect: **NOT REPLICATED**
- disposition conditional contribution: **RETAINED FROM PRIOR POSITIVE MATCHED TESTS**
- same output = same causal process: **REFUTED AGAIN ACROSS REPLICATION STREAMS**
- external generalization: **UNVALIDATED**

## 8. Evidence Discipline

This result must not be rewritten as an all-positive experiment.

The disposition-prior replication failure is part of the final scientific result and must remain visible in the evidence ledger, paper discussion, limitations and any subsequent mathematical formalization.
