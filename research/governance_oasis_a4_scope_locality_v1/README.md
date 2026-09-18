# Governance OASIS A4 Scope Locality v1

Official axis: `A4_OVERGENERALIZATION_PREVENTION`.

This experiment closes the gap left by GH-3 and CBRA Failure CE v1.1 by
requiring all three contexts in one preregistered confirmatory matrix:

- SAME_SCOPE
- CHANGED_SCOPE
- UNRELATED_RELATION

The unrelated relation is deliberately **base-eligible before feedback**. This
prevents a false pass where unrelated participation is absent for unrelated
reasons.

Arms:

- `SCOPE_LOCAL_PRODUCTION`: REVISED feedback applies only when relation and scope match.
- `SCOPE_GUARD_ABLATED`: relation/scope guard removed; REVISED feedback is applied globally.
- `RECORD_ONLY`: identical feedback provenance is retained but hidden from later participation.

Support requires legitimate same-scope influence, zero inappropriate production
exclusion in changed/unrelated contexts, and a causal separation from the
guard-ablated control. Completed Experience provenance remains present in every
arm; no deletion or permanent scalar memory weight is permitted.

This is finite deterministic synthetic mechanism evidence, not universal
deployment-safety or performance evidence.
