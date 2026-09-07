# EX-07 Causal-Form and Mathematical Formalization Review v3.0

상태 / Status: COMPLETED / SINGLE CONTEXT-FREE SCALAR NOT SUPPORTED AS SUFFICIENT REPRESENTATION  
기준일 / Date: 2026-09-07  
상위 기준 / Governing protocol: `../../OASIS_RESEARCH_PROTOCOL.md`  
정의 기준 / Canonical semantics: `../OASIS_CAUSAL_RESEARCH_SYSTEM_v3.0_ko.md`

## 1. Purpose

OASIS의 반복 관계과정에 측정 가능한 인과적 규칙성이 존재하는지, 존재한다면 단일 상수로 충분히 표현 가능한지 검토한다.

사전에 단일 인과율 상수를 가정하지 않는다.

## 2. Run

Workflow: `OASIS EX-07 Causal Form Review v3`  
GitHub Actions run id: `34128790516`  
Job id: `101763656798`  
Head commit: `c57b5cf3d27008aed08e3f8c6370902532e32f70`  
Artifact id: `10021307544`  
Artifact digest: `sha256:85962949a33dea7baac2bfa7ae2897ad410bc83755c1f15be1f3a592aafdf706`  
Result: **SUCCESS**

EX-07은 과거 결과 파일을 단순 재독하지 않고 다음을 fresh replay했다.
1. EX-04P-C matched relational-support specificity battery
2. EX-04M multi-OASIS longitudinal comparison
3. EX-05 replication/falsification battery

Validity:
- all source replays valid
- deterministic twin integrity preserved
- `experimenterInterventionCount = 0`

## 3. Empirical Effect Definition

한 개입계열 `I`, 현재/관계조건 `z`, 사전 정의된 scenario family `Q`에 대해 다음 경험적 효과를 사용한다.

`theta_I(z; Q) = Q 안의 matched 조건에서 개입 I가 선택 또는 현실화 행동을 바꾼 경험적 빈도`

이 값은 OASIS 내부에 미리 내장된 존재론적 상수가 아니다. 특정 조건집합과 실험분포에 대해 얻는 측정치다.

단일 상수 가설:

`H_scalar: theta_I(z; Q) = theta_0 for all tested z`

단, 서로 다른 개입계열을 하나의 숫자로 합칠 수 있다는 공통척도성은 사전에 가정하지 않는다.

## 4. Within-Class Context Heterogeneity

Intervention class:
`minimum relational-support attention` vs `candidate-only placebo` under eligible matched top-vote ties.

Overall:
- effects: **2,455**
- eligible: **4,809**
- pooled effect rate: **0.510501 = 51.05%**

By party condition:
- `dawn`: **548/1,603 = 34.19%**
- `star`: **1,103/1,603 = 68.81%**
- `blue`: **804/1,603 = 50.16%**

Heterogeneity:
- Pearson descriptive `X^2 = 385.2496`
- `df = 2`
- rate range = **0.346226**

Model-description comparison:
- scalar BIC: **6673.0464**
- party-conditioned BIC: **6296.4593**
- `Delta BIC = BIC_scalar - BIC_conditioned = 376.5871`

Interpretation:
**CONTEXT_CONDITIONED_DESCRIPTION_STRONGLY_PREFERRED_WITHIN_THIS_PREDECLARED_FACTORIAL_BATTERY**

Thus a single context-free rate is a poor sufficient empirical summary of this intervention class inside the tested factorial battery.

## 5. Longitudinal Context Dependence

### 5.1 Same Past Relational Structure, Different Disposition Prior

Canonical EX-04M:
- effects: **2/3**
- rate: **66.67%**

Alternative EX-05 exogenous streams:
- E137: **0/3**
- E977: **0/3**
- E4099: **0/3**
- combined shifted streams: **0/9 = 0%**

Conclusion:
**the tested minimum disposition-prior effect is stream-conditional and is not a robust stream-invariant effect.**

### 5.2 Same Prior, Different Past Relational Structure

Canonical EX-04M:
- effects: **3/3 = 100%**

Alternative EX-05 exogenous streams:
- E137: **3/3**
- E977: **3/3**
- E4099: **3/3**
- combined shifted streams: **9/9 = 100%**

Conclusion:
**the tested initial Past Relational Structure difference effect replicated across all predeclared streams in this harness family.**

This does not establish universal necessity or universal sufficiency of Past Relational Structure.

## 6. Causal-Form Verdict

Current finding:
**A SINGLE CONTEXT-FREE SCALAR IS NOT SUPPORTED AS A SUFFICIENT EMPIRICAL REPRESENTATION WITHIN THE TESTED SCOPE.**

Minimum currently supported form:
**context-conditioned effect function or family of effect measures.**

A safe abstract form is:

`theta_I = theta_I(z; Q)`

where `z` may include current reality, Past Relational Structure, participation/relation conditions and other experimentally isolated decision conditions.

Current evidence also supports retaining relational-structural condition identity in the mathematical description. However it does **not** establish that the final theory is irreducible to every finite vector, function, distribution or operator representation.

## 7. What Is Not Yet Established

- universal causal constant: **NOT ESTABLISHED**
- exact causal function: **NOT ESTABLISHED**
- probability distribution as fundamental causal law: **NOT ESTABLISHED**
- one common numerical scale across Past Relational Structure, disposition prior and support-identity interventions: **NOT ESTABLISHED**
- irreducibility of relational structure to any mathematical function/vector: **OPEN**
- external real-world generalization: **UNVALIDATED**

## 8. Evidence Grades

- repeated causal regularity: **OBSERVED_WITHIN_CANONICAL_AND_REPLICATION_HARNESSES**
- single universal/context-free scalar as sufficient representation: **NOT SUPPORTED WITHIN TESTED SCOPE**
- context dependence: **SUPPORTED WITHIN TESTED SCOPE**
- Past Relational Structure condition dependence: **ROBUSTLY_REPLICATED_ACROSS_PREDECLARED_EX05_STREAMS**
- disposition-prior general effect: **NOT REPLICATED; CONDITIONAL EFFECT ONLY**
- exact mathematical law: **OPEN_INQUIRY**
- external generalization: **UNVALIDATED**

## 9. Mathematical Discipline

Do not pool numerically distinct intervention classes into one `causal rate` unless a common estimand is independently justified.

Do not infer that a context-free scalar can never be useful. A scalar may still be useful inside a narrowly fixed and explicitly conditioned subproblem.

The present result is narrower and stronger:

**for the tested OASIS causal processes, a single context-free scalar is not sufficient to preserve the observed condition dependence.**
