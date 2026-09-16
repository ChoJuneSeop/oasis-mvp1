# Scenario construction

The deterministic generator creates a 512-tick continuous world with evaluator-only
classes: history-neutral, history-critical, relational mismatch, context reversal,
conflicting history, novel, and long re-entry. The final tick re-enters REL-A after a
long non-participation interval.

`MATCH-1` supplies two frames with the same observable speed, front presence, distance,
and relative speed but distinct relationship histories. Labels and expected actions
remain in `EvaluatorTruth`; the runner receives only immutable runtime mappings.
