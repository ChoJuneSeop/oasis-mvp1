# EX-04M Multi-OASIS Comparative Longitudinal Evidence v3.0

상태 / Status: COMPLETED / VALID WITHIN TESTED CANONICAL HARNESS  
기준일 / Date: 2026-09-07  
상위 기준 / Governing protocol: `../../OASIS_RESEARCH_PROTOCOL.md`  
정의 기준 / Canonical semantics: `../OASIS_CAUSAL_RESEARCH_SYSTEM_v3.0_ko.md`

## 1. Research Question

동일 또는 엄격히 대응되는 외생 현실흐름 아래에서 다음 조건을 분리할 때 여러 OASIS의 장기 행동경로와 과거 관계구조가 어떻게 달라지는가?

1. 동일 `NONE` + 동일 과거 관계구조
2. 동일 최소 개성 prior + 동일 과거 관계구조
3. 동일 최소 개성 prior + 서로 다른 과거 관계구조
4. 서로 다른 최소 개성 prior + 동일 과거 관계구조

## 2. Artifact Control

production tie-break는 `P.id`를 사용하므로 서로 다른 party id를 비교하면 식별자 차이를 개성 효과로 오인할 수 있다. 따라서 모든 비교 OASIS는 production party id를 `dawn`으로 동일하게 유지하고 서로 독립된 세계 복제본으로 구성했다.

각 OASIS에는 동일조건 deterministic twin을 부여했다.

## 3. Run

Workflow: `OASIS EX-04M Multi-OASIS Longitudinal v3`  
GitHub Actions run id: `34122977647`  
Head commit: `9d50034b5799f24b23e767dd30b35a1386e88932`  
Horizon: **20,000 ticks**  
Result: **SUCCESS**

Methodological invariants:
- no experimenter intervention after initialization
- identical production party identity across compared OASIS worlds
- deterministic twin for each experimental world
- diverged worlds are never force-reset to a common state
- future information is not used to alter decisions

## 4. Results

Validity:
- total deterministic twin mismatch: **0**
- `experimenterInterventionCount`: **0**
- same `NONE` + same Past Relational Structure controls: **exactly matched**
- same prior + same Past Relational Structure controls: **exactly matched**

### G3 — Same Prior, Different Past Relational Structures

Pairwise behavioral divergence: **3/3 pairs**.

Interpretation:
- with the tested prior held matched, different initial Past Relational Structures were sufficient to produce different longitudinal behavioral paths in all three pairwise comparisons.
- this is not evidence that every difference in Past Relational Structure must always cause divergence.
- it does not establish whole-Past-Relational-Structure necessity or sufficiency.

### G4 — Different Priors, Same Past Relational Structure

Matched-prestate actual-choice divergence: **2/3 pairs**.

Interpretation:
- under this canonical exogenous stream, two of the three prior contrasts produced an actual choice difference while the immediately preceding production-relevant party state was matched.
- one prior pair did not diverge within the horizon.
- therefore different prior identities do not automatically imply behavioral divergence.

### Same Output, Different Past Relational Structure

After divergence, worlds were observed to return to the same current output/target while retaining different Past Relational Structures.

Therefore:
- same current output does not imply same causal process;
- current reconvergence does not imply future equivalence;
- a behavioral endpoint alone is insufficient to identify the relational process that produced it.

## 5. Evidence Grades

- same-condition deterministic integrity: **SUPPORTED**
- different Past Relational Structure contribution under matched prior: **SUPPORTED_WITHIN_THIS_CANONICAL_MULTI_OASIS_HARNESS**
- minimum disposition-prior contribution: **CONDITIONALLY_OBSERVED_IN_THIS CANONICAL STREAM**
- disposition necessity: **NOT ESTABLISHED**
- disposition sufficiency: **NOT ESTABLISHED**
- whole Past Relational Structure necessity: **UNVALIDATED**
- whole Past Relational Structure sufficiency: **UNVALIDATED**
- same output = same causal process: **REFUTED_WITHIN_TESTED_HARNESS**
- universal/external generalization: **UNVALIDATED**

## 6. Interpretation Boundary

Do not claim:
- `different prior -> different behavior` as a universal law;
- `different Past Relational Structure -> different behavior` in every possible state;
- a better outcome for one prior;
- disposition as a stand-alone cause;
- whole Past Relational Structure as fully active at every decision;
- real-world generalization from this harness.

EX-05 replication/falsification must determine whether the G3 and G4 effects persist under alternative predeclared exogenous streams.
