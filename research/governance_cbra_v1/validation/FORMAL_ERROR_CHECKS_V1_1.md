# CBRA v1.1 Formal Design Error Checks

Status: THREE_PASS_FORMAL_ERROR_CHECK_PASS

Validated code head: `8fa58bd5e9db7bc616155f277cfd11632473d08b`
Validation run: `35325339219`
Validation job: `105536959865`

## Pass 1 — definition consistency

**PASS.**

Checked:

- CBRA is a post-Closure Governance auxiliary operator axis, not a seventh fundamental OASIS axis.
- It does not rewrite the realized past.
- participation YES and NO are distinct first-class provenance targets.
- selected and nonselected candidates are both retained.
- NO/nonselected findings use EVIDENCE_CONSISTENCY and do not claim unrealized counterfactual outcomes.
- U/I/V/T are separate targets and are not reduced to a responsibility scalar.
- CONFIRMED / REVISED / INCONCLUSIVE remain typed revalidation states.
- external failure is not automatically equivalent to decision error.
- append-only revalidation history is not a memory score.
- dormancy means absence of new authoritative evidence, not deletion or permanent closure.

No unresolved definitional contradiction remains within the v1.1 claim boundary.

## Pass 2 — causal consistency

**PASS.**

Required order:

committed Governance provenance
→ later authoritative evidence
→ CBRA checkpoint
→ optional later current-review projection
→ later Governance decision.

Verified prohibitions:

1. evidence observed at or before Closure is rejected;
2. evidence after checkpoint time is rejected;
3. checkpoints must increase monotonically;
4. the same event-target evidence cannot be replayed as new evidence;
5. relation/scope mismatched evidence is preserved but cannot directly revise the original judgment;
6. exogenous-only evidence cannot directly revise the original decision;
7. future checkpoints are excluded by history_as_of(current_decision_tau);
8. changed relation/scope does not automatically inherit a prior same-context revision;
9. current-review projection does not mutate or replace stored CBRA history;
10. the original decision and realization remain immutable.

No reverse-causal path remains in the v1.1 axis contract.

## Pass 3 — execution consistency

**PASS.**

Automated validation:

- corrected CBRA axis invariants: **15/15 PASS**;
- current-review projection tests: **5/5 PASS**;
- existing Governance v0.4 attack regression: **16/16 PASS**;
- compileall: **PASS**.

Execution-specific checks include:

- post-Closure-only evidence,
- no future evidence,
- no future checkpoint read,
- cross-relation isolation,
- cross-scope isolation,
- duplicate evidence rejection,
- append-only ordered history,
- non-counterfactual NO/nonselected semantics,
- exogenous-failure non-revision,
- separate U/I/V/T revalidation,
- no score/weight/latest-state storage API.

## Closure of v1.0 findings

- E-01 evidence time not first-class → **CLOSED**
- E-02 relation/scope not first-class → **CLOSED**
- E-03 duplicate evidence replay → **CLOSED**
- E-04 future checkpoint read boundary → **CLOSED**
- E-05 empty checkpoints → **CLOSED**
- E-06 NO/nonselected semantic ambiguity → **CLOSED**
- E-07 monitoring lifetime undefined → **CLOSED**
- E-08 downstream current-time read undefined → **CLOSED** by ephemeral as-of review projection

## Bounded limitations, not unresolved errors

- v1.1 revalidates responsibility at U/I/V/T axis level, not each sub-obligation as an independent causal target.
- causal attribution labels must be supplied by the experimental/domain evidence generator; CBRA does not claim a universal learned causal-discovery mechanism.
- behavioral benefit is not established by these invariant tests.
- real-world or CARLA generalization is not established.

These are explicit claim boundaries and do not block the planned finite synthetic failure-CE comparison.
