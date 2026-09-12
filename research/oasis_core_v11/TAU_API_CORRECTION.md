# Authoritative flow tau correction

Harness v1.1 now passes host `tau` explicitly into Core evaluation, relation ablations, group ablations, and realization. Reconstruction receives the same authoritative current-flow tau. Epoch number and fixed simulator delta are not used to infer OASIS current time.

The relation-participation operator remains intentionally blind to current tau and historical completion time, preserving the no-recency-command boundary.

This correction precedes domain-policy admission and real CARLA G3.2 execution.
