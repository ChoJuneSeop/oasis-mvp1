# Research axes and reality-gap axes

This package enforces a semantic boundary between two different coordinate systems.

`ResearchAxis` names the paper-level six-axis validation system: the four core causal
axes plus Choice and Responsibility. A `ResearchAxisAssessment` is an experimental
verdict backed by run evidence.

`RealityGapAxis` names five runtime observations made from the current reality:
Relation, Role, Process, Possibility Coverage, and Responsibility Coverage. A
`RealityGapObservation` is neither a paper verdict nor a probability, choice, re-entry,
or reevaluation.

The runtime order is intentionally constrained:

1. Observe the current flow.
2. Compose a non-scalar `RealityGapSignature` from current evidence.
3. With no active gap, return `MaintainCurrentFlow` and do nothing else.
4. With an active gap, emit only a gap-bound `RecallDirective`.
5. A separate component may retrieve past relations.
6. A later relation test may establish re-entry.
7. Possibility composition, verification, reevaluation, choice, and realization remain
   separate later operations.

Direct probability updates and direct choices are explicitly forbidden on the recall
directive. This prevents the paper's research axes and the runtime gap axes from being
used as synonyms and prevents gap detection from silently becoming re-entry or
reevaluation.
