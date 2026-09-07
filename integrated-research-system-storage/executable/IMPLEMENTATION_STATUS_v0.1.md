# OASIS Mathematical Kernel v1 — Implementation Status v0.1

Date: 2026-09-08
Branch target: `storage/oasis-integrated-research-system-v1.0`
Canonical executable entrypoint: `src/oasis-math-kernel-v1-canonical.mjs`
Base infrastructure: `src/oasis-math-kernel-v1.mjs`

## Current implementation map

| Mathematical element | Reference implementation status | Boundary |
|---|---|---|
| O_t / Y_t | IMPLEMENTED | world adapter controls observability; completeness not assumed |
| F_t flow record | IMPLEMENTED | observation/history/process representation, not a claim of full reality |
| e/q relation state | IMPLEMENTED | no TTL/age deletion |
| Γ | IMPLEMENTED AS FAIL-CLOSED REFERENCE CONTRACT | canonical default requires directed relational recurrence; shared actor/endpoint alone is insufficient |
| B_t capabilities | IMPLEMENTED | capability manifestations, not action answer menu |
| Ω | IMPLEMENTED AS GENERATIVE REFERENCE COMPOSITION | unsatisfied primitive is not admitted atomically; explicit process bridge can construct a sequence |
| κ | IMPLEMENTED STRUCTURAL TRACE | not scalar utility |
| Ψ | CONTRACT + NEUTRAL DEFAULT | no universal potential formula claimed |
| P | IMPLEMENTED | normalized trace only; never default argmax |
| χ | CONTRACT + FAIL-CLOSED DEFAULT | multiple unresolved candidates do not get arbitrary winner |
| ρ | IMPLEMENTED VECTOR CONTRACT | generic danger ignored; exact theory remains domain/test dependent |
| A_resource | REFERENCE POLICY | operational finite-compute policy, not theoretical invariant |
| S | IMPLEMENTED RE-OBSERVE/RECOMPUTE LOOP | bounded reference self-intervention |
| life-value constraint | IMPLEMENTED EXPLICIT GATE | domain evaluator required for domain-specific life assessment |
| D | IMPLEMENTED | exactly one active realization or non-intervention |
| W | IMPLEMENTED | append-only realized experience incorporation |
| heterogeneity | NO SPECIAL OPERATOR | handled as new observation |
| R / Theta / N analysis | NOT DECISION OPERATORS | provenance exposed for later validation |

## Canonical hardening after recurrence audit

The first base draft was intentionally re-audited against earlier GitHub failures before being treated as canonical.

Two recurrence risks were found and blocked in the canonical entrypoint:

1. shared actor/endpoint overlap could have made the default Γ too permissive, resembling the old saturation path;
2. a capability step with unsatisfied prerequisites could have appeared as an atomic possibility even when it should only become available after a valid process bridge.

The canonical entrypoint therefore:
- requires the same directed relation structure (or explicit relation-id recurrence) for the default Γ;
- rejects unsatisfied primitive steps as atomic possibilities;
- still allows those steps to emerge through explicit token/entity/relation/bridge-key composition in Ω.

## Removed legacy shortcuts

This canonical kernel does not use:
- danger as Responsibility;
- fixed similarity/danger/time thresholds as OASIS theory;
- time-based relation expiry;
- pre-ranked external action menus;
- P argmax selection;
- lexicographic or random semantic tie-break as default Choice Axis;
- unrealized possibility persistence as future worlds;
- whole-history overwrite after realization;
- anomaly/recovery mode;
- shared actor/endpoint overlap alone as sufficient Γ evidence.

## Verification

Local syntax audit: PASS.

Local combined reference suite after hardening: **14/14 PASS**.

GitHub Actions canonical audit:
- workflow: `OASIS Mathematical Kernel v1 Canonical Audit`
- run: `34163195190`
- commit: `0ffc8a152d9dd111f6b3f447411a56804287f069`
- conclusion: **SUCCESS**

This verifies the reference implementation invariants in the current test suite. It is not empirical confirmation of OASIS theory and not yet domain-complete production validation.
