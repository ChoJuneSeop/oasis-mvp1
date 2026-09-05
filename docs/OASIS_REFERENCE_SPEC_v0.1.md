# OASIS Reference Specification v0.1

This document is independent from the current MVP implementation. It defines the minimum conditions an implementation must satisfy before its behavior is treated as OASIS evidence.

## Required properties

1. **O1 — First action without external task**: the system can generate an action or no-op without externally supplied goals, rewards, survival commands, exploration commands, or prior experience.
2. **O2 — Present-flow priority**: decisions can depend on the transition/process by which the present was formed, not only on a current scalar/state coordinate.
3. **O3 — Directed relational process**: A→B must remain distinguishable from B→A; multi-step order such as A→B→C must be preserved.
4. **O4 — Selective reactivation**: past processes are inactive by default and reactivate only when the present flow establishes a structural relation to them.
5. **O5 — Dynamic participation**: which participants contribute to a decision can change with the present flow and relational structure.
6. **O6 — Possibility combination**: new candidate structures can emerge from changed relations/experience rather than only from rescoring a fixed action list.
7. **O7 — Single realization**: multiple possibilities may coexist, but one action is realized at a decision instant.
8. **O8 — Outcome rewrites the next present**: the realized result can alter later relations, participation, and possibility structure.
9. **O9 — Structural expansion**: new experience can generate previously absent relational structure, not only update a scalar weight.
10. **O10 — Dynamic choice/responsibility interaction**: uncertainty, risk, outcomes, and relational change can alter verification/exploration/resource allocation without being reduced to one fixed threshold.
11. **O11 — Memory silence is valid**: existing memory does not imply mandatory retrieval; zero active past processes must be possible.
12. **O12 — Flow-level observation**: primary evidence must retain the chain present flow → active/silent past → participation → possibility change → choice → outcome → next present. Aggregate averages are secondary summaries.

## Validation order

Reference specification → implementation-fidelity tests → neutral-world validation → comparator-native validation → shared-world experiment.

## Important boundary

Passing this specification does **not** show that OASIS is superior or novel. It only shows that the implementation being tested is sufficiently faithful to the OASIS construct to justify later scientific comparison.
