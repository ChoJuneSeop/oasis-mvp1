# GH-4 Integrated Causal Theory Model

Status: STAGE_2_THEORY_DEFINED

GH-4 treats Governance OASIS as a sequential governance process, not as a memory-scoring system.

## Epoch ordering

For epoch t:

1. Observe current flow F_t.
2. Determine current Gap G_t from present-flow evidence only.
3. If G_t = NO, do not access historical Completed Experiences.
4. If G_t = YES, obtain only Completed Experiences whose completion time is strictly earlier than the current decision time.
5. Decide participation for every retrieved candidate in the current relation and context. Retrieval alone has no causal force.
6. Form current possibilities in Core from the current observation plus only the participating view.
7. Recompute responsibility R_t over the actual current candidate set using U/I/V/T burden structure.
8. Bind one selected candidate and realize exactly that candidate.
9. Observe the authoritative post-realization state.
10. Reach Closure and revalidate the Gap/participation/choice/responsibility provenance.
11. Atomically commit history, governance provenance, feedback and the newly completed experience.
12. The committed experience may first become eligible at a later decision time t+k, k>0.

## Decision eligibility

A Completed Experience CE_j is archive-eligible at decision time tau_t only when:

- CE_j.completed_tau < tau_t,
- CE_j belongs to the currently queried relation,
- the arm permits run-created experiences to be decision-eligible.

Eligibility does not imply participation.

## Contextual participation

Participation is recomputed from current relation context. The experiment uses relation identity plus current scope density as the contextual boundary. A prior REVISED judgment may block a candidate only when that feedback is provenance-matched and the current scope matches the scope in which that experience was completed. When scope changes, eligibility is recomputed from the present context.

This is intentionally not implemented as a permanent memory weight, decay factor, confidence score or learned scalar.

## Responsibility

Responsibility is formed only after Core exposes the actual current possibility identifiers. U/I/V/T are represented as candidate-specific burden sets. A candidate dominates another only by set inclusion on all four axes with at least one strict inclusion. No weighted sum or scalar responsibility score is used.

If multiple candidates remain non-dominated, the frozen experiment uses deterministic candidate-order tie resolution. This tie rule is an experimental control, not a normative claim.

## Outcome revalidation

Authoritative post-observation maps the realized decision into one of three typed states already used in GH-3: CONFIRMED, REVISED or INCONCLUSIVE. The state is committed as provenance-bound feedback. It does not rewrite the past decision and does not retroactively alter the realization.

## Long-horizon accumulation

The archive grows only after Closure. Run-created Completed Experiences retain their individual provenance and completion time. There is no reset within an arm. The scientific question is whether the governance order remains valid while this accumulation occurs and whether prespecified ablations separate the contribution of:

- run-created experience re-entry,
- outcome feedback exposure,
- responsibility binding,
- selective participation.
