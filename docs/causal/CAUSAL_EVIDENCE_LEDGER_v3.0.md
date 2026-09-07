# OASIS Causal Evidence Ledger v3.0

상태 / Status: current evidence interpretation  
기준일 / Date: 2026-09-07  
상위 기준 / Governing protocol: `../../OASIS_RESEARCH_PROTOCOL.md`  
정의 기준 / Canonical semantics: `../OASIS_CAUSAL_RESEARCH_SYSTEM_v3.0_ko.md`  
Predecessor evidence: `CAUSAL_EVIDENCE_LEDGER_v2.0.md`  
Legacy evidence: `CAUSAL_EVIDENCE_LEDGER_v1.5.md`

## 1. Evidence Migration Rule

v3는 v2/Legacy의 증거를 성공결과로 재작성하지 않는다. 기존 관측·반증·미검증 상태를 보존하고, v3에서 직접 계측·재검증한 결과만 v3 증거등급으로 승격한다.

특허성, 과학적 타당성, 산업적 가치, 투자 가치는 서로 다른 판정축이다.

## 2. Canonical Terminology Boundary

- 과거 관계구조 / Past Relational Structure: 현재까지 현실화된 경험과 관계가 편입되어 형성된 과거의 관계구조.
- 인연필드 / Relational Field: **열린 가능성 조합의 장 / Open Field of Possibility Combinations**.
- `열린`은 가능성을 사전 고정목록으로 폐쇄하지 않는다는 의미이며 수학적 무한이나 물리적 장을 주장하지 않는다.
- 인연 / Re-relatable Past Relation: 과거에 실제 형성·편입되었고 이후 변화한 현실에서 다시 현재와 관계할 수 있는 과거 관계.
- 행동 결정 관계 후보군 / Behavioral Decision Relational Candidate Set: 현재 행동결정에 참여할 수 있는 관계 후보들의 현재적 집합. 인연필드 전체와 동일하지 않다.
- 구현 필드 `relationHistory`는 계측용 구현 흔적이며 이론적 존재론 용어가 아니다.
- 구현 필드 `cands`는 행동/목적지 후보목록이며 이론적 Behavioral Decision Relational Candidate Set과 동일시하지 않는다.
- 구현에서 반복 primitive relation event가 `relationExists(P,npc)` 또는 `relationHistory.length > 0`로 압축될 경우, 개별 event identity를 독립 인과단위로 자동 해석하지 않는다.
- `relationField.active`가 relation key 단위로 행동결정에 노출될 경우 exact episode identity는 provenance로 보존하되 개별 episode의 필요·충분성을 자동 추론하지 않는다.

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

Current status: **PARTIALLY SUPPORTED WITH DIRECT NATIVE RELATIONAL-CANDIDATE INSTRUMENTATION WITHIN THE CANONICAL HARNESS; FULL H0 REMAINS OPEN**

### 4.1 Same-current relational ablation

Observed across **297** matched same-current shadow rows:
- reactivated relational layer present: **297/297**
- action/destination candidate-list differences: **0/297**
- participation-leader differences: **284/297**
- selected-action differences: **204/297**
- both leader and selected action changed: **191/297**
- leader only changed: **93/297**
- selected action only changed: **13/297**

Interpretation:
- reactivated past relations contributed to participation and/or selected action under a fixed current state in this harness.
- this does **not** show that implementation destination list `cands` is the theoretical Behavioral Decision Relational Candidate Set.

### 4.2 Native relational-candidate direct instrumentation

Primary validation run: **OASIS H0 Native Relational Candidate Trace v3 #3**  
GitHub Actions run id: `34114248846`  
Head commit: `e76ba9a579d414e7800db5eaddf7a344e7448edf`  
Result: **SUCCESS**

Exact-lineage replay: **OASIS H0 Native Relational Candidate Lineage v3 #1**  
GitHub Actions run id: `34114757668`  
Head commit: `c37d329156171ddfc030280ca5e6945109e3afae`  
Result: **SUCCESS**

The two 120,000-tick runs reproduced the same aggregate summary exactly.

Method:
- production decision semantics unchanged; instrumentation only
- `initialDispositionPrior = NONE`
- no experimenter intervention after initialization
- non-anticipatory
- a semantic twin receives the same exogenous conditions
- any instrumented/twin world-state mismatch invalidates the run
- reconstructed active relation keys must exactly equal production `relationField.active`

Native implementation-level relational candidate representation:
1. global past-relation presence predicate used by participation: `P.relationHistory.length > 0`;
2. NPC-level relation-presence predicates used by gate, destination ranking and hidden readiness: `relationExists(P,npc)`;
3. currently active composed relation keys used by relational-field participation/ranking/hidden readiness;
4. primitive event identities and exact composed episode identities are retained only as provenance where production has already compressed them to predicate/key level.

Observed:
- completed ticks: **120,000**
- decision evaluations: **1,997**
- decisions with a native relational candidate layer: **1,997/1,997**
- decisions without that layer: **0/1,997**
- total native relational-candidate items observed: **23,335**
- primitive relation-presence candidate items: **11,177**
- active relation-key candidate items: **12,158**
- unique candidate identifiers: **28**
  - primitive relation-presence identifiers: **9**
  - active relation-key identifiers: **19**
- decisions with implemented current possibility projection: **1,997/1,997**
- candidate-to-possibility direct support links: **40,103**
- collective-participation candidate items: **14,155**
- decisions where the selected possibility had direct relational support: **1,988/1,997 = 99.55%**
- decisions where the relational set participated collectively: **1,997/1,997**
- selected decisions later realized within horizon: **1,994/1,997 = 99.85%**
- superseded before realization: **0**
- unresolved at horizon: **3**
- reconstructed active-key mismatch: **0**
- semantic-twin behavior mismatch ticks: **0**
- `experimenterInterventionCount`: **0**

Exact-lineage replay:
- sampled decision lineages: **60**
- sampled lineages with completed realization record: **60/60**
- example: at tick **217**, current reality at `forest` contained relational candidates including `relation-presence:엘리` and active relation key `루카↔엘리`; these directly supported the selected decision row `hidden:herbRuin`, whose actual target `ruin` was realized at tick **439**.

Interpretation boundary:
- the run directly instruments an **implementation-level native relational candidate layer** that is distinct from destination `cands` and that participates in current decision construction.
- the recorded possibility rows are the **implemented current decision possibility projection** (`id`, votes, voices, direct relational support, collective relational participation). They are not claimed to exhaust the theoretical Open Field of Possibility Combinations.
- candidate membership is distinguished from action-specific direct support and from collective participation-state influence.
- the observation does not establish candidate-set sufficiency or necessity for every AI behavior.
- primitive relation event identity is not declared an independent cause when production uses only relation-presence predicates.
- exact composed episode identity is not declared individually necessary when production exposes relation-key-level active structure.
- Individual Disposition remains unvalidated because the run used `NONE`.
- Responsibility Axis and Self-Intervention are not fully isolated by this run.

Evidence grades:
- Past Relational Structure contribution through relational predicates/active relations: **OBSERVED_WITHIN_CANONICAL_HARNESS**
- Behavioral Decision Relational Candidate Set native implementation-level trace: **DIRECTLY_INSTRUMENTED_WITHIN_CANONICAL_HARNESS_AT_CURRENT_IMPLEMENTATION_GRANULARITY**
- implemented Possibility Composition projection: **DIRECTLY_INSTRUMENTED_IMPLEMENTATION_PROJECTION_WITHIN_CANONICAL_HARNESS**
- candidate → participation/selection → realization chain: **OBSERVED_WITHIN_CANONICAL_HARNESS; SUFFICIENCY_AND NECESSITY NOT ESTABLISHED**
- theoretical Possibility Composition as a complete abstract object: **UNVALIDATED**
- Individual Disposition contribution: **UNVALIDATED**
- full H0 including disposition, responsibility, self-intervention and complete factor interaction: **PARTIALLY SUPPORTED / OPEN COMPONENTS REMAIN**
- any single component as universal sufficient cause: **NOT ESTABLISHED**

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

Current status: **PARTIALLY SUPPORTED WITHIN CANONICAL HARNESS FOR LONGITUDINAL STRUCTURAL CONTINUITY AND JOINT ACTIVE-RELATIONAL CONTRIBUTION; WHOLE PAST RELATIONAL STRUCTURE CLAIM REMAINS UNVALIDATED**

### 6.1 Longitudinal downstream structural chain

Observed chain:

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

### 6.2 Joint active-relational-set contribution

Validation run: **OASIS H2 Joint Active Relational Set v3**  
GitHub Actions run id: `34098060582`  
Head commit: `6fafe08c585704ce008fc1f0e59f6849363259f2`  
Result: **SUCCESS**

Validity:
- replay mismatch: **0**
- full-choice mismatch: **0**
- duplicate-footprint violations: **0**

Observed:
- decisions with active reactivated relations: **1,967**
- joint decision-effect moments: **297**
- joint resolved-target-effect moments: **204**
- mean active episode identities at joint-effect moments: **692.6229**
- decision moments with an individually necessary episode identity: **1/297**
- decision moments with an individually sufficient episode identity: **297/297**
- decision moments with no individually necessary identity but redundant/overdetermined contribution: **296/297**
- resolved-target moments with an individually necessary episode identity: **0/204**
- resolved-target moments with an individually sufficient episode identity: **204/204**
- resolved-target moments with redundant/overdetermined contribution and no individually necessary identity: **204/204**

Interpretation:
- the currently active reactivated relational subset can contribute jointly to decision and resolved target under the tested same-current state.
- the observed joint effect is not generally reducible to one uniquely necessary episode identity.
- this supports **joint active-relational contribution**, not whole-Past-Relational-Structure necessity or sufficiency.

Evidence grade:
- joint active relational set: **SUPPORTED_WITHIN_CANONICAL_HARNESS_FOR_JOINT_ACTIVE_RELATIONAL_SET_WITH_COMPONENT_NONTRIVIALITY**

### 6.3 Cross-key alternative sufficient relational routes

Validation run: **OASIS H2 Cross-Key Overdetermination v3**  
GitHub Actions run id: `34098153324`  
Head commit: `131c2939cda406086b41981fcc34764fca8f4196`  
Result: **SUCCESS**

Validity:
- replay mismatch: **0**
- full-shadow target mismatch: **0**
- representative-compression mismatch: **0**

Observed:
- joint decision effects: **297**
- joint resolved-target effects: **204**
- cross-key overdetermined decision effects: **165/297 = 55.56%**
- cross-key overdetermined resolved-target effects: **77/204 = 37.75%**
- moments with 2+ sufficient relation keys: decision **165**, resolved target **77**
- maximum number of sufficient relation keys observed at one moment: **7** for both decision and resolved target
- moments with duplicate episode identities: **297**
- moments with multiple distinct footprints inside one relation key: **0**

Interpretation:
- distinct relation keys can provide alternative sufficient relational routes for the same-current decision effect and, in a substantial subset, for the resolved target effect.
- this directly supports nontrivial relational structure among the **currently active** past relations.
- it does not establish one universal cause, whole-Past-Relational-Structure necessity/sufficiency, or simultaneous activity of all past relations.

Evidence grade:
- cross-key alternative relational contribution: **SUPPORTED_WITHIN_CANONICAL_HARNESS_FOR_CROSS_KEY_ALTERNATIVE_RELATIONAL_CONTRIBUTION**

### 6.4 Dormant/noncurrent future-effect falsification tests

Two additional initial-condition ablations tested whether later natural reappearance of currently nonparticipating relational material is by itself sufficient to alter the autonomous future behavioral path.

Dormant exact-episode removal:
- valid checkpoints: **3/3**
- removed dormant episodes later naturally reappeared: **3/3**
- forward horizon: **15,000 ticks** per checkpoint
- behavior, leader, candidate-signature, resolved-target and position divergence: **0/3**

Noncurrent relation-key removal:
- valid checkpoints: **3/3**
- removed noncurrent relation keys later naturally reactivated in full branches: **3/3**
- forward horizon: **15,000 ticks** per checkpoint
- behavior, leader, candidate-signature, resolved-target and position divergence: **0/3**
- ablated branches later regenerated the same relation keys from new experience.

Interpretation:
- **reappearance itself is not sufficient for behavioral divergence** in the tested horizon.
- dormant episode count is not a sufficient behavioral causal unit.
- bare relation-key existence is not a sufficient behavioral causal unit.
- these are valid negative results and are preserved rather than rewritten as support.

### 6.5 Relational-footprint testability boundary

A finer proposed unit, `relation key + place/context footprint`, was tested next.

Result:
- semantic twin mismatch: **0**
- eligible checkpoints satisfying the required distinct within-key footprint condition: **0**
- classification: **NOT TESTABLE IN THE CURRENT CANONICAL HARNESS**

Interpretation:
- the current canonical runtime does not preserve enough distinct within-key place/context footprint structure for this specific ablation to be instantiated.
- this is an implementation representation limit, not evidence that H2 is false.
- the result also warns against attributing causal individuality to information that the runtime has already compressed away.

### 6.6 H2 integrated interpretation and remaining boundary

The combined H2 evidence supports:
1. long-horizon feed-forward from past relational participation into realized outcome and new relational structure formation;
2. joint contribution of the currently active reactivated relational subset;
3. alternative sufficient routes across distinct relation keys in the same-current active structure.

The negative tests additionally establish that:
4. natural reappearance alone is not sufficient for behavioral divergence within the tested horizon;
5. episode identity/count and bare relation-key existence should not be treated as automatically sufficient causal units;
6. current implementation compression limits finer footprint-level testing.

Still not established:
- that every element of Past Relational Structure is active at a given moment;
- that the **entire newly formed Past Relational Structure**, including currently inactive/nonparticipating relations, is jointly necessary;
- that the entire Past Relational Structure is jointly sufficient;
- universal actual-causation or real-world generalization.

Therefore:
- downstream structural process: **OBSERVED_WITHIN_CANONICAL_HARNESS**
- joint active-relational contribution: **SUPPORTED_WITHIN_CANONICAL_HARNESS**
- cross-key alternative sufficient routes: **SUPPORTED_WITHIN_CANONICAL_HARNESS**
- dormant episode/key reappearance as sufficient cause of behavior divergence: **NOT SUPPORTED WITHIN TESTED HORIZON**
- finer within-key relational footprint test: **NOT TESTABLE IN CURRENT CANONICAL HARNESS**
- H2 integrated hypothesis: **PARTIALLY SUPPORTED / STRONGLY NARROWED REMAINING GAP**
- whole Past Relational Structure joint causal necessity: **UNVALIDATED**
- whole Past Relational Structure joint causal sufficiency: **UNVALIDATED**

## 7. H3 — Relational Reappearance

Current status: **OBSERVED IMPLEMENTATION / CAUSAL GENERALIZATION UNVALIDATED**

Canonical harness contains natural `latentize/noncurrent` and contextual `reactivate` events without researcher intervention after initialization.

Current long-horizon re-analysis additionally observes repeated reappearance. This supports the existence of reappearance behavior inside the harness but does not establish universal environmental generalization.

The H2 negative future-effect tests also show that reappearance must not be equated with behavioral effect: a relation may naturally reappear without producing observed behavioral divergence in the tested horizon.

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

`NONE` remains a valid control condition for testing necessity/effect. The canonical H0-H2 runs used `NONE`; their success therefore cannot be used to claim that disposition caused those results.

Required follow-up:
- EX-04P NONE vs minimum-disposition prior
- fixed initial prior
- observed disposition pattern separated from initial prior
- no mid-run researcher adjustment

## 10. Behavioral Decision Relational Candidate Set

Definitional status: **FORMAL BEHAVIORAL INTERMEDIATE**  
Empirical status: **DIRECTLY INSTRUMENTED AT CURRENT IMPLEMENTATION GRANULARITY / FULL THEORETICAL CONSTRUCT NOT YET EXHAUSTIVELY VALIDATED**

Direct evidence now exists for:
1. explicit native relational candidate-set trace at production predicate/key granularity;
2. current relational reason/basis for candidate entry;
3. candidate membership vs direct possibility support vs collective participation;
4. connection to an implemented current Possibility Composition projection;
5. connection through participation/selection to later realization;
6. semantic-twin equality and `experimenterInterventionCount = 0`.

Still required before full construct closure:
- disposition comparison;
- explicit Responsibility Axis isolation;
- explicit Self-Intervention isolation where applicable;
- validation that the implemented possibility projection sufficiently represents the intended theoretical Possibility Composition across broader conditions;
- replication across additional environments/harnesses.

Do not infer candidate-set validation from destination-list equality/difference alone. The direct v3 trace is the current evidence basis.

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

The H0 direct trace observes implemented selection and realization but does not by itself isolate Responsibility Axis necessity or sufficiency.

## 13. No-Experimenter-Intervention

Current status: **MANDATORY METHODOLOGICAL INVARIANT**

After initialization, researcher intervention into judgment, disposition, relations, candidate set, possibility composition, choice, responsibility, realization or Past Relational Structure invalidates that run as autonomous longitudinal evidence.

Run #15, the H2 shadow validations, the H2 future-effect tests, H0 direct candidate trace and H0 lineage replay preserve the no-mid-run-intervention boundary for evidence interpretation.

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
- `tools/h2-joint-active-relational-set-v3.mjs`
- `tools/h2-cross-key-overdetermination-v3.mjs`
- H2 dormant/noncurrent future-effect analyzers
- `tools/h0-native-relational-candidate-trace-v3.mjs`
- `tools/h0-native-relational-candidate-lineage-v3.mjs`
- corresponding GitHub Actions validation workflows

Therefore the prior statement that v3 had only definitions and no v3-specific evidence implementation is retired.

Remaining implementation gaps:
- Individual Disposition comparison instrumentation
- whole-Past-Relational-Structure test beyond the current runtime's compressed inactive/nonparticipating representation
- explicit Self-Intervention trace
- explicit Responsibility Axis isolation
- multi-OASIS longitudinal comparison
- broader replication of the native candidate/Possibility Composition projection outside the canonical harness

## 18. Current Evidence Priorities

1. EX-04P disposition comparison: `NONE` vs fixed minimum-disposition prior
2. explicit Responsibility Axis / Self-Intervention isolation within the behavioral chain
3. EX-03/H3 causal replication across conditions
4. EX-04 long-horizon persistence-limit inquiry
5. EX-04M multi-OASIS longitudinal comparison
6. H2 whole-Past-Relational-Structure test if a runtime representation capable of preserving the required inactive relational structure is available
7. replication/falsification across environments
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
- full H2 from longitudinal lineage, joint-active-set, cross-key evidence, or reappearance alone
- full Past Relational Structure joint necessity/sufficiency from the active relational subset
- behavioral effect merely from relation reappearance
- individual causal identity for primitive events or exact episodes when production has compressed them to presence/key-level predicates
- theoretical Behavioral Decision Relational Candidate Set from implementation destination `cands`
- full theoretical Possibility Composition from the current implementation projection
- disposition necessity/sufficiency before comparison evidence
- causal strength from divergence delay
- responsibility = danger
- self-intervention superiority
- strong will = strong causality
- universal/general real-world validity from one canonical harness
- scalar causal rate before evidence supports it
