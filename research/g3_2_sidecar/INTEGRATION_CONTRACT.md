# G3.2 Integration Contract

This sidecar connects to the existing frozen G3.1/CARLA harness without modifying the real flow.

Required inputs from the harness:

- current `tau` and a stable flow fingerprint
- current reality view available to OASIS at that epoch
- past relation elements whose completion time is not later than current `tau`
- full possibility distribution for the current epoch
- relation-ablated counterfactual possibility distribution for each past relation element
- dynamic role trace and generated-possibility trace for each relation element that structurally participates
- for every multi-source reconstruction, a matching joint relation-set ablation to expose redundancy or synergy that individual ablations can hide
- reconstruction observations for recombination, role transformation, and structural transformation, with method and evidence kept separately
- after real realization: exactly one realization reference, observed post-realization outcome, relation-process closure evidence, and provenance links

Participation interpretation:

- participation is not represented by one permanent scalar score
- individual `distribution_effect` is only the current-epoch counterfactual effect on the possibility distribution
- `distribution_effect == 0` does not mean non-participation when role or possibility-construction traces exist
- group `joint_distribution_effect` is an interaction observation for a relation set, not a replacement global score
- participation and reconstruction remain independent axes

Forbidden shortcuts:

- recency decay as relevance
- fixed participation or reconstruction thresholds
- binary selected/rejected memory as the core criterion
- interpreting zero individual distribution effect as proof of non-participation
- multi-relation reconstruction without a matching joint relation-set probe
- fixed closure duration, distance, or frame count
- future state or post-outcome information entering the decision-time calculation
- counterfactual probe changing or advancing the real flow
- collapsing participation or reconstruction into one memory score

The current repository branch does not contain the G3.1/CARLA execution harness itself. Therefore this contract is intentionally implemented as a read-only port and runtime sidecar. The concrete adapter must be attached only where the frozen harness can provide these signals without expanding OASIS Core access to CARLA world/map/raw actor data.
