# CBRA Failure CE v1.0 Confirmatory Structural Audit

Status: DIAGNOSTIC_ONLY / NOT SCIENTIFICALLY ADMISSIBLE

Run: 35328002555
Frozen snapshot: 067bf002296f7eb524d99337c66fc28703543226
Artifact: 10540106287
Artifact ZIP SHA256: 4a39a2c5ef0ee230c34e979ca55e407299dec8959ca241629b3dbbf43270f543
Raw JSON SHA256: 5beaf75a12836c95994480cb9e3b5bcf233db3564a54ec28f7fcbd4c674a5885

The workflow and frozen output contract passed. However, post-run structural audit found design defects that invalidate scientific comparison claims.

## Defect 1 — comparator instrumentation contamination

`run_case` constructed a CBRA axis/checkpoint before arm branching. Therefore GENERAL_HARNESS also received CBRA-derived checkpoint fields even though its behavior ignored them. This violates the intended comparator boundary ("no CBRA loop").

## Defect 2 — inert confirmatory family factor

F1/F2/F3/F4 were labels only and did not alter any runtime relation/scope/evidence condition. The four families were therefore duplicate replications, not meaningful operational variation.

## Defect 3 — delayed failure insufficiently longitudinal

The delayed-failure class changed the single checkpoint timestamp but did not contain a prior immediate checkpoint followed by a later contradictory checkpoint. It therefore did not fully test the continuous-monitoring property.

## Consequence

The numerical results from v1.0 are preserved as diagnostic output only and must not be cited as confirmatory evidence of CBRA benefit over a general harness.

No v1.0 result value will be used to tune v1.1 rules. v1.1 corrections are restricted to the three structural defects above.
