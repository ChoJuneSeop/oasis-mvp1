# EX-06 Legacy v1 Observer Comparison v3.0

상태 / Status: COMPLETED / REPRESENTATION-GRANULARITY DIFFERENCE OBSERVED  
기준일 / Date: 2026-09-07  
상위 기준 / Governing protocol: `../../OASIS_RESEARCH_PROTOCOL.md`

## 1. Purpose

동일 OASIS 현실흐름에 Legacy v1 관측축과 v3 연속 관계관측을 병렬 적용하여, 각 관측틀이 무엇을 직접 포착하고 무엇을 여러 축의 결합해석으로만 복원하는지 비교한다.

이 실험은 v1을 약화시키거나 v3 우월성을 사전에 가정하지 않는다.

## 2. Legacy v1 Preserved Axes

1. `divergenceDelay`
2. `realizedChange`
3. `persistence`
4. `reconvergence`
5. `accumulatedRelationalEffect`
6. `downstreamLongHorizonEffect`

Sources:
- `tools/causal-trace-ledger-v1.mjs`
- `docs/causal/CAUSAL_EXPERIMENT_INDEX_v1.2.md`

## 3. Run

Workflow: `OASIS EX-06 Legacy Observer Comparison v3`  
GitHub Actions run id: `34128409462`  
Head commit: `9afd570c360ee7f3f10bda71b1ef4abbf3aaf287`  
Artifact id: `10021117337`  
Result: **SUCCESS**

Shared flow:
- fresh EX-04M matched multi-OASIS flow
- horizon: **20,000 ticks**
- twin mismatch: **0**
- experimenter intervention: **0**

## 4. Results

- compared pairs: **6**
- divergent pairs: **5**
- pairs with same output while Past Relational Structures differ: **5**
- pairs with matched-prestate actual-choice lineage: **2**

Legacy v1 directly captures useful information about:
- divergence timing;
- realized-flow difference;
- persistence/reconvergence;
- accumulated relational difference;
- downstream long-horizon difference.

Therefore v1 is not classified as incapable of observing relational difference.

## 5. v3 Additional Explicit Representation in This Comparison

v3 explicitly retains together:
1. initial Past Relational Structure identity/condition;
2. disposition condition identity;
3. matched-prestate actual-choice lineage;
4. explicit `same current output + different Past Relational Structure` state.

For the same-output/different-process cases, Legacy v1 can recover the distinction by combining its reconvergence axis with accumulated relational difference. v3 records the corresponding process state and experimental condition identity explicitly in one continuous relational representation.

Thus the observed difference is one of **representation granularity and causal-condition explicitness**, not proof of universal superiority.

## 6. Sample Shared-Flow Cases

Same prior / different Past Relational Structure:
- R1↔R2: divergence tick **1**; same output observed while PRS differed; final PRS different; choice-distribution TV about **0.4604**.
- R1↔R3: divergence tick **1**; same-output/different-PRS observed at tick **4337**; TV about **0.3151**.
- R2↔R3: divergence tick **1**; same-output/different-PRS observed at tick **413**; TV about **0.5355**.

Different prior / same initial Past Relational Structure:
- PA↔PB: matched-prestate choice divergence at tick **1203**, `ruin` vs `shrine`; later same-output/different-PRS observed at tick **3187**.
- PA↔PC: same matched-prestate divergence pattern at tick **1203**; later same-output/different-PRS at tick **3187**.
- PB↔PC: no divergence within horizon.

## 7. Evidence Grades

- Legacy v1 timing/outcome coverage: **SUPPORTED**
- Legacy v1 accumulated relational difference coverage: **SUPPORTED**
- v3 explicit same-output/different-PRS representation: **OBSERVED**
- v3 explicit matched-condition and matched-prestate lineage retention: **OBSERVED**
- v3 universal superiority: **NOT ESTABLISHED**
- external/general validity of observer advantage: **UNVALIDATED**

## 8. Interpretation Boundary

Do not claim:
- Legacy v1 is wrong;
- v1 cannot observe relational differences;
- v3 is universally better;
- explicit representation automatically improves prediction, safety or industrial performance.

The scientifically supported conclusion is narrower: on this shared flow, v3 retains relational-condition identity and same-output/different-process state more explicitly as a continuous causal representation, while v1 retains useful segmented timing/outcome axes that can recover part of the same information through combined interpretation.
