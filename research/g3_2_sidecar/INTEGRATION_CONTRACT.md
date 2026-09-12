# G3.2 Integration Contract

This sidecar connects to the existing frozen G3.1/CARLA harness without modifying the real flow.

Required inputs from the harness:

- current `tau` and a stable flow fingerprint
- current reality view available to OASIS at that epoch
- past relation elements whose completion time is not later than current `tau`
- full possibility distribution for the current epoch
- relation-ablated counterfactual possibility distribution for each past relation element
- dynamic role trace for each participating relation element
- reconstruction observations for recombination, role transformation, and structural transformation, with method and evidence kept separately
- after real realization: exactly one realization reference, observed post-realization outcome, relation-process closure evidence, and provenance links

Forbidden shortcuts:

- recency decay as relevance
- fixed participation or reconstruction thresholds
- binary selected/rejected memory as the core criterion
- fixed closure duration, distance, or frame count
- future state or post-outcome information entering the decision-time calculation
- counterfactual probe changing or advancing the real flow
- collapsing reconstruction axes into one memory score

The current repository branch does not contain the G3.1/CARLA execution harness itself. Therefore this contract is intentionally implemented as a read-only port. The concrete adapter must be attached only where the frozen harness can provide these signals without expanding OASIS Core access to CARLA world/map/raw actor data.
