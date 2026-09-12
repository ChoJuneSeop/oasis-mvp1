# G3.2 Pre-Experiment Gate

## Necessity check

The surviving Protocol v2.2 integrity report proves that a CARLA execution path existed, but the exact v1.0 runtime source was not preserved. Older Phase 30/32 CARLA code is not equivalent to the v2.2 six-layer validation architecture and must not be silently promoted into the current paper harness.

Therefore a new G3.2 CARLA run is scientifically necessary only after the exact runtime source set is frozen and hash-verified. Otherwise the run would not be reproducible and could not distinguish a harness change from an OASIS effect.

## Runtime source identities required before execution

1. CARLA host port / Environment Actuator implementation
2. OASIS Core adapter implementation
3. Observation Gateway implementation
4. Independent Evaluator implementation

Each item must have:
- a repository path;
- SHA-256;
- source committed before experiment execution;
- no future state/trajectory/scenario-label/trigger/seed/raw-actor-ID/full-map-topology leakage into OASIS Core.

## Fixed G3.2 invariants

- current reality primacy;
- no recency decay or permanent memory importance;
- no binary memory gate;
- no fixed Participation or Reconstruction semantic threshold;
- relation-element participation and action impact remain distinct;
- multi-source Reconstruction requires a matching joint relation probe;
- counterfactual probes cannot mutate or advance the real CARLA flow;
- one and only one real actuation per decision epoch;
- only realized outcomes that reach relation-process closure may enter new historical experience;
- no post-hoc parameter/threshold changes after observing failures.

## Current status

BLOCKED FOR REAL CARLA EXECUTION.

Reason: the canonical Harness v1.1 and G3.2 sidecar are frozen and verified, but the four runtime component source files above have not yet been recovered or supplied as current canonical implementations.

This block is a reproducibility gate, not an OASIS failure and not a G3.2 experimental result.
