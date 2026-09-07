# OASIS Mathematical Operator Model v1.0 — Executable Specification v1.0

Date: 2026-09-08
Status: Reference executable specification / 참조 실행 명세
Governing mathematical source: `../MATHEMATICAL_OPERATOR_MODEL_v1.0_CLOSED_BASELINE.md`

## 0. Scope

This implementation translates the closed conceptual-operator model into an executable reference kernel.

English — **Reference executable kernel**: a minimal executable implementation used to make operator contracts concrete and testable. It is not automatically a domain-complete production system.

한글 설명 — **참조 실행 커널**: 수학적 연산자 계약을 실제 코드로 명확하게 만들고 검증하기 위한 최소 실행 구현이다. 특정 게임·로봇·차량·현실 도메인의 완성형 production을 뜻하지 않는다.

The implementation must not fill unspecified theoretical gaps with hidden reward, argmax, fixed thresholds, danger proxies, or experimenter-provided answer menus.

## 1. Runtime boundary

The world adapter provides only:

- `world.observe()` — returns the latest observable reality `Y_t`;
- `world.execute(possibility)` — applies one already-realized active intervention to the external world.

The adapter does **not** provide a pre-ranked candidate list.

Basic capabilities `B_t` are supplied as capability objects with `instantiate(context)`. A capability may instantiate executable primitive steps from the current observation. These primitives are capability manifestations, not predeclared answer choices.

## 2. F_t / O_t / Y_t

The kernel stores a chronological observation stream. `observe()` always calls the external world again; it does not assume the previous observation remains current.

This implements the moving-time rule:

`Y_t -> Γ_t -> Ω_t`

and, after self-intervention or elapsed reality:

`Y_(t+δ) -> Γ_(t+δ) -> Ω_(t+δ)`.

## 3. Relation existence and current participation

Historical relation occurrences are stored independently with:

- `e=1`: the relation occurrence remains in the historical structure;
- `q=1`: the relation occurrence currently participates;
- `q=0`: non-current but still retained.

No TTL, age window, recent-N cap, or time decay deletes a historical relation.

## 4. Γ — relation re-currentization

`gamma(observation, participation)` scans retained historical relation occurrences and applies a relation predicate against the latest observation.

Default predicate:
- no similarity score;
- no time threshold;
- no danger threshold;
- direct structural/entity contact with current observation only.

A domain may supply a stronger relation predicate, but it must remain auditable and cannot use future information.

## 5. Ω — possibility composition

`omega(...)` first asks each basic capability to instantiate currently executable primitive steps.

A possibility is represented by:

`c = <A_c, R_c, B_c, sigma, K_c>`

Code fields:
- `A_c`: participating entities;
- `R_c`: current/re-currentized relations relevant to the process;
- `B_c`: capabilities used;
- `sigma`: ordered capability-step composition;
- `K_c`: current execution conditions.

Composite possibilities require an explicit process bridge, such as:
- a provided token satisfying a later requirement;
- a created entity satisfying a later entity requirement;
- a provided/re-currentized relation kind satisfying a later relation requirement;
- an explicit bridge key.

Simple shared-entity overlap alone does not create a composite process.

## 6. κ — relational sub-combination

`kappa(possibility)` returns structured sub-combinations:
- participant ↔ relation;
- capability ↔ relation;
- ordered step-to-step process bridges.

It returns structure, not a utility score.

## 7. Ψ and P

`psi(...)` uses a supplied `potentialModel` only when one is explicitly provided.

Without a validated potential model:

`Ψ(c)=0`

for every currently constructible possibility, making `P` uniform.

This is deliberate. The kernel does not invent a universal relational potential law.

`distribution()` computes normalized softmax `P_t(c)` for traceability.

**P is never used by the default Choice Axis as argmax.**

## 8. ρ — Responsibility Axis

Responsibility is stored as a vector:
- uncertainty;
- irreversibility;
- affected scope;
- recoverability;
- life/safety impact;
- structural impact.

The default implementation consumes only explicit responsibility signals from current observation and possibility steps.

A generic field named `danger` is intentionally ignored.

A domain may supply `responsibilityModel`, but `danger = Responsibility` is prohibited.

## 9. A_resource — resource allocation

The default resource policy converts the responsibility vector into runtime search/verification resources.

This is explicitly a **reference allocation policy**, not a canonical OASIS law.

English — **Reference allocation policy**: an operational policy needed to assign finite compute in this reference implementation, not a claim that the exact formula is a theoretical invariant.

한글 설명 — **참조 자원배분 정책**: 유한한 컴퓨팅 자원을 배분하기 위해 참조 구현에서 사용하는 운용식이며, 그 식 자체가 OASIS의 불변 법칙이라는 뜻이 아니다.

## 10. χ — Choice Axis

Default Choice Axis contract:

1. no admissible possibility → `⊥`;
2. exactly one admissible possibility → realize that one;
3. multiple admissible possibilities + explicit `choicePolicy` that returns a valid possibility → realize it;
4. multiple admissible possibilities without a valid Choice Axis policy → unresolved, never implicit argmax/tie-break.

Thus the kernel does not convert mathematical incompleteness into a hidden preference rule.

## 11. S — Self-Intervention

When Choice Axis remains unresolved and self-intervention rounds remain, the kernel may:
- broaden resource budget;
- re-observe latest reality;
- rerun Γ and Ω.

It does not act on the external world during self-intervention.

After the allowed rounds, unresolved choice returns `⊥` rather than an arbitrary winner.

## 12. Life-value upper constraint

Explicit `lifeViolation=true` makes a possibility inadmissible.

If a possibility explicitly requires life assessment but no life evaluator exists, it is also inadmissible in the reference kernel.

A domain-specific life evaluator may be supplied through `lifeConstraint`.

Life value is not converted into reward or preference.

## 13. D — single realization

`deliberate()` closes to either:
- one possibility `c*`; or
- `⊥` non-intervention.

`step()` executes only the chosen `c*` through `world.execute()`.

No unchosen possibility is written to historical experience.

## 14. W — realized-experience incorporation

After active execution:

1. the world is observed again;
2. a realized experience is created from before-observation, realized possibility, actual execution result, and outcome observation;
3. `wIncorporate()` appends that experience to history;
4. relation occurrences from the realized process/outcome enter historical relation storage.

Previous history is not overwritten.

## 15. Heterogeneity

No anomaly detector or recovery-state operator exists in the kernel.

Unexpected reality is simply the next `Y_t` and is processed through the same observation → Γ → Ω flow.

## 16. Analysis-layer separation

Relation regeneration `R`, causal trajectory `Theta_I(tau)`, and noncommutativity/order analysis `N_ij` remain validation/analysis responsibilities.

The reference decision kernel exposes provenance sufficient for those analyses but does not turn them into hidden decision operators.

## 17. Explicit non-claims

This version does not claim:
- a universal formula for Ψ;
- a universal Choice Axis policy;
- a universal Responsibility formula;
- a universal resource-allocation formula;
- full domain physics;
- empirical superiority over other AI systems;
- production readiness.

It claims only that the closed mathematical semantics now have a runnable, auditable reference implementation without silently reintroducing the major rejected legacy assumptions.
