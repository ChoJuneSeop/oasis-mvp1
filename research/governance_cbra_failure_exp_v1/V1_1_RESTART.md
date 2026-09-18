# CBRA Failure CE v1.1 Restart Record

Status: DESIGN_RESTARTED_BEFORE_NEW_EXECUTION

Restart base: `5531fef20ce096f7f59e41756ff76fea50638f83`, the v1.0 pre-experiment evidence lineage.

The v1.0 confirmatory output is not imported as scientific evidence or used to tune behavior. v1.1 changes are restricted to three structural defects found in the v1.0 post-run audit:

1. remove CBRA instantiation from GENERAL_HARNESS;
2. make confirmatory families operational rather than duplicated labels;
3. make delayed failure genuinely longitudinal through two ordered checkpoints.

All CBRA axis semantics remain frozen. Prior GH-1/GH-1L/GH-2/GH-3/GH-4/Core lineages remain untouched.
