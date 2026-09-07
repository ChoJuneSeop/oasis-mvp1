# OASIS Mathematical Kernel v1 — Implementation Status v0.1

Date: 2026-09-08
Branch target: `storage/oasis-integrated-research-system-v1.0`

## Current implementation map

| Mathematical element | Reference implementation status | Boundary |
|---|---|---|
| O_t / Y_t | IMPLEMENTED | world adapter controls observability; completeness not assumed |
| F_t flow record | IMPLEMENTED | observation/history/process representation, not a claim of full reality |
| e/q relation state | IMPLEMENTED | no TTL/age deletion |
| Γ | IMPLEMENTED AS REFERENCE CONTRACT | default structural predicate is not claimed unique |
| B_t capabilities | IMPLEMENTED | capability manifestations, not action answer menu |
| Ω | IMPLEMENTED AS GENERATIVE REFERENCE COMPOSITION | domain capability grammar still required |
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

## Removed legacy shortcuts

This kernel does not use:
- danger as Responsibility;
- fixed similarity/danger/time thresholds as OASIS theory;
- time-based relation expiry;
- pre-ranked external action menus;
- P argmax selection;
- lexicographic or random semantic tie-break as default Choice Axis;
- unrealized possibility persistence as future worlds;
- whole-history overwrite after realization;
- anomaly/recovery mode.

## Local verification at creation

Node.js syntax check: PASS.

`node --test` reference suite: 11/11 PASS locally before GitHub commit.

This local pass verifies implementation invariants in the reference suite only. It is not empirical validation of the OASIS theory.
