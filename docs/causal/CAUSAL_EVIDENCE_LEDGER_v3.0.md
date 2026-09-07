# OASIS Causal Evidence Ledger v3.0

상태 / Status: current evidence interpretation  
기준일 / Date: 2026-09-07  
상위 기준 / Governing protocol: `../../OASIS_RESEARCH_PROTOCOL.md`  
정의 기준 / Canonical semantics: `../OASIS_CAUSAL_RESEARCH_SYSTEM_v3.0_ko.md`  
Predecessor evidence: `CAUSAL_EVIDENCE_LEDGER_v2.0.md`  
Legacy evidence: `CAUSAL_EVIDENCE_LEDGER_v1.5.md`

## 1. Evidence Migration Rule

v3는 v2의 증거를 성공결과로 재작성하지 않는다. v2/Legacy의 관측·반증·미검증 상태를 보존하고, v3에서 새로 직접 계측한 결과만 v3 증거등급으로 승격한다.

특허성, 과학적 타당성, 산업적 가치, 투자 가치는 서로 다른 판정축이다.

## 2. Canonical Terminology Boundary

- 과거 관계구조 / Past Relational Structure: 현재까지 현실화된 경험과 관계가 편입되어 형성된 과거의 관계구조.
- 인연필드 / Relational Field: **열린 가능성 조합의 장 / Open Field of Possibility Combinations**.
- `열린`은 가능성을 사전 고정목록으로 폐쇄하지 않는다는 의미이며 수학적 무한이나 물리적 장을 주장하지 않는다.
- 인연 / Re-relatable Past Relation: 과거에 실제 형성·편입되었고 이후 변화한 현실에서 다시 현재와 관계할 수 있는 과거 관계.
- 행동 결정 관계 후보군 / Behavioral Decision Relational Candidate Set: 현재 행동결정에 참여할 수 있는 관계 후보들의 현재적 집합. 인연필드 전체와 동일하지 않다.
- 구현 필드 `relationHistory`는 계측용 구현 흔적이며 이론적 존재론 용어가 아니다.
- 구현 필드 `cands`는 행동/목적지 후보목록이며 이론적 Behavioral Decision Relational Candidate Set과 동일시하지 않는다.

## 3. Canonical v3 Validation Run

검증 run: **OASIS Causal Research System v3 Validation #15**  
GitHub Actions run id: `34097168183`  
Head commit: `90a902cb7576a621bea310bc4a4b6c9f7ac972c3`  
Result: **SUCCESS**

통과 단계:
1. canonical validation guard
2. fixed 120,000-tick longitudinal audit
3. scale-safe inherited v2 causal trace assembly
4. H1 exact structural incorporation genealogy
5. H2 integrated downstream structural genealogy
6. v3 behavioral causal evidence assembly

Methodological invariants:
- `experimenterInterventionCount = 0`
- non-anticipatory analysis
- diagnostic counterfactual does not write unrealized paths into production Past Relational Structure
- whole-structure overwrite not assumed
- persistent parallel unrealized realities not assumed

## 4. H0 — Behavioral Decision Participation

Current status: **PARTIALLY SUPPORTED WITHIN CANONICAL HARNESS FOR THE RELATIONAL COMPONENT**

Same-current-state relational ablation rows: **297**

Observed:
- reactivated relational layer present: **297/297**
- action/destination candidate-list differences: **0/297**
- participation-leader differences: **284/297**
- selected-action differences: **204/297**
- both leader and selected action changed: **191/297**
- leader only changed: **93/297**
- selected action only changed: **13/297**

Interpretation:
- reactivated past relations contributed to participation and/or selected action under a fixed current state in this harness.
- this does **not** show that the implementation destination list `cands` is the theoretical Behavioral Decision Relational Candidate Set.
- H0 as a full hypothesis remains incomplete because native candidate-set formation, possibility composition, Individual Disposition, and full factor interaction are not yet directly identified.

Evidence grades:
- Past Relational Structure contribution through reactivated past relations: **OBSERVED_WITHIN_CANONICAL_HARNESS**
- selected-action contribution: **OBSERVED_WITHIN_CANONICAL_HARNESS**
- Behavioral Decision Relational Candidate Set native trace: **UNVALIDATED / DIRECT TRACE REQUIRED**
- Individual Disposition contribution: **UNVALIDATED**
- any single component as sufficient cause: **NOT ESTABLISHED**

## 5. H1 — Realization and Incorporation into Past Relational Structure

Current status: **SUPPORTED WITHIN CANONICAL HARNESS FOR EXACT STRUCTURAL LINEAGE**

The validating genealogy is not storage growth. It is:

**realized outcome → current realized relation incorporated in implementation trace → compose with prior relation → exact episode formation → non-current/latent interval → exact reactivation → the same exact episode participates in selection → the same exact episode reaches a later outcome**

Run #15 results:
- qualifying structural formation links: **10,045**
- exact episodes later becoming latent/non-current within horizon: **9,805**
- exact episodes later reactivated: **9,781**
- exact episodes later participating in selection: **9,752**
- exact episodes reaching a later outcome: **9,705**
- exact ordered reactivation → participation → outcome chains: **9,705**
- distinct participating parties in qualifying H1 genealogy: **3**
- distinct composed relation keys: **19**

Interpretation:
- H1 is no longer supported merely by `relationHistory` count growth.
- exact structural lineage is directly observed inside the canonical harness.
- this does not establish universal causality, real-world generalization, or whole-structure overwrite.

## 6. H2 — New Past Relational Structure and Subsequent Reality Relation

Current status: **PARTIALLY SUPPORTED WITHIN CANONICAL HARNESS; INTEGRATED CLAIM REQUIRES JOINT-STRUCTURE TEST**

Observed downstream chain:

**past relational participation → realized outcome → incorporation → same-tick formation of new relational episode(s)**

Run #15 results:
- outcomes carrying past-relational participation: **1,958**
- those outcomes with incorporation signal: **874**
- those outcomes producing new relational structure: **874**
- source episode links across those structural outcomes: **1,152,200**
- unique source exact episodes: **9,694**
- distinct source relation keys: **19**
- structural outcomes involving more than one source relation key: **864/874**
- newly composed episodes: **9,906**
- distinct newly composed relation keys: **19**
- participating parties: **3**
- source-episode age range: **596 to 119,551 ticks**; median **34,980 ticks**
- distinct source relation keys per structural outcome: median **4**, maximum **7**

Interpretation:
- relationally participated outcomes can feed forward into new relational structure formation over long horizons in this harness.
- multi-key participation shows that the observed process is not restricted to a single relation key.
- however, the claim that the **entire newly formed Past Relational Structure as a joint structure** is causally necessary or uniquely sufficient is not yet established.
- the theoretical `Possibility Composition` object is not yet directly instrumented.

Therefore:
- downstream structural process: **OBSERVED_WITHIN_CANONICAL_HARNESS**
- H2 integrated process: **PARTIALLY SUPPORTED**
- whole Past Relational Structure joint causal necessity: **UNVALIDATED**
- direct Possibility Composition instrumentation: **UNVALIDATED**

## 7. H3 — Relational Reappearance

Current status: **OBSERVED IMPLEMENTATION / CAUSAL GENERALIZATION UNVALIDATED**

Canonical harness contains natural `latentize/noncurrent` and contextual `reactivate` events without researcher intervention after initialization.

Current long-horizon re-analysis additionally observes repeated reappearance. This supports the existence of reappearance behavior inside the harness but does not establish universal environmental generalization.

## 8. H4 — Relational Persistence-Limit Inquiry

Current status: **OPEN_INQUIRY**

Observed non-current → reappearance gaps in the current 120k dataset reach up to **4,089 ticks**, and **9,587** exact relations were observed reappearing more than once in the re-analysis.

These observations do not establish that no temporal or structural limit exists.

A relation not reobserved by the horizon is only:
- `NOT_REOBSERVED_WITHIN_HORIZON`

Never infer extinction from horizon non-observation.

## 9. Individual Disposition

Definitional status: **FORMAL BEHAVIORAL INITIAL CONDITION**  
Empirical status: **NECESSITY AND EFFECT UNVALIDATED**

`NONE` remains a valid control condition for testing necessity/effect. The canonical H0-H2 run used `NONE`; its success therefore cannot be used to claim that disposition caused those results.

Required follow-up:
- EX-04P NONE vs minimum-disposition prior
- fixed initial prior
- observed disposition pattern separated from initial prior
- no mid-run researcher adjustment

## 10. Behavioral Decision Relational Candidate Set

Definitional status: **FORMAL BEHAVIORAL INTERMEDIATE**  
Empirical status: **NATIVE TRACE NOT YET VALIDATED**

Required evidence:
1. explicit candidate-set formation trace
2. reason/current relational basis for entry
3. candidate membership vs actual participation
4. connection to Possibility Composition
5. connection to Participation, Choice, Responsibility and Realization

Do not infer candidate-set validation from destination-list equality/difference.

## 11. Self-Intervention

Current status: **CONCEPTUALLY ADMITTED / DISTINCT CAUSAL FORM UNVALIDATED**

Correct interpretation:
- will does not directly create an outcome.
- self-intervention may alter later possibility/decision conditions through the OASIS process.

Strong will ≠ stronger causal rate.

## 12. Choice and Responsibility

Current status: **RETAINED OASIS COMPONENTS / NOT CAUSAL-RATE EQUIVALENTS**

Not established:
- responsibility = danger
- responsibility = causal strength
- responsibility alone constitutes an intervention

## 13. No-Experimenter-Intervention

Current status: **MANDATORY METHODOLOGICAL INVARIANT**

After initialization, researcher intervention into judgment, disposition, relations, candidate set, possibility composition, choice, responsibility, realization or Past Relational Structure invalidates that run as autonomous longitudinal evidence.

Run #15 satisfies this condition with `experimenterInterventionCount = 0`.

## 14. Multi-OASIS and Longitudinal Disposition

Current status: **PLANNED / NO v3 INTEGRATED RESULT YET**

Planned conditions remain:
1. multiple OASIS with identical `NONE` controls
2. multiple OASIS with identical minimum disposition prior
3. multiple OASIS with different minimum disposition priors

Difference does not automatically prove disposition causation; same realization does not imply the same causal process.

## 15. Legacy v1 Observer Comparison

Current status: **PRESERVED AS OBSERVATIONAL-FRAME COMPARATOR**

Legacy axes remain available for comparison but do not define OASIS internally and do not automatically establish v3 superiority.

## 16. Causal-Rate Form

Current status: **OPEN_INQUIRY**

No scalar is assumed. Permitted empirical outcomes include scalar, function, distribution, multiple components, or evidence that a single-scalar representation is unsuitable.

## 17. Current Implementation Status

v3-specific reproducible instrumentation now exists:
- `tools/causal-trace-ledger-v2-safe.mjs`
- `tools/h1-structural-incorporation-v3.mjs`
- `tools/h2-integrated-structure-v3.mjs`
- `tools/causal-trace-ledger-v3.mjs`
- `.github/workflows/causal-trace-ledger.yml`

Therefore the prior statement that v3 had only definitions and no v3-specific evidence implementation is retired.

Remaining implementation gaps:
- native Behavioral Decision Relational Candidate Set trace
- direct Possibility Composition trace
- Individual Disposition comparison instrumentation
- whole-Past-Relational-Structure joint causal test for H2
- explicit self-intervention trace
- multi-OASIS longitudinal comparison

## 18. Current Evidence Priorities

1. H2 joint-structure causal test
2. native Behavioral Decision Relational Candidate Set + Possibility Composition instrumentation for H0
3. EX-03/H3 causal replication across conditions
4. EX-04 long-horizon persistence-limit inquiry
5. EX-04P disposition comparison
6. EX-04M multi-OASIS longitudinal comparison
7. replication/falsification
8. Legacy observer comparison
9. causal-rate form review

## 19. Evidence Discipline

Do not claim:
- whole-structure overwrite
- every past relation is active at every moment
- mathematical infinity or physical-field status from Relational Field
- persistent unrealized parallel paths
- extinction from horizon non-observation
- H1 from count growth alone
- full H2 from the current partial structural chain alone
- full Past Relational Structure joint necessity without joint-structure testing
- Behavioral Decision Relational Candidate Set from implementation destination `cands`
- disposition necessity/sufficiency before comparison evidence
- causal strength from divergence delay
- responsibility = danger
- self-intervention superiority
- strong will = strong causality
- universal/general real-world validity from one canonical harness
- scalar causal rate before evidence supports it
