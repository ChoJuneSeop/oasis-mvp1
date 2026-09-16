# GH-1 Admission Gate

Status: `FROZEN`

GH-1 execution is permitted only when all pre-execution gates below are evidenced in-repository and in CI.

1. Governance Harness v0.4 closure/attack/regression gate PASS.
2. GH-1 Experimental Specification v1.0 FINAL present and frozen.
3. GH-1 Experimental Design v1.0 FINAL present and frozen.
4. Prior-work audit completed, including public-code inspection for the closest implementations.
5. Actual `CurrentRelationalCoreV11` admission PASS under ADM-01..ADM-12.
6. Gap Detector Validity Gate PASS on pre-registered detector-validation cases separate from confirmatory scenarios.
7. RNG Isolation Gate PASS for separate environment/Core/history/participation/evaluator/run-order streams.
8. Fresh Process Gate PASS for G1/G2/G3 arm isolation.
9. Experiment inputs and code basis frozen by Git blob hashes and a basis commit.

The admission gate does not claim that GH-1A/GH-1B hypotheses are supported. It only authorizes their execution under the frozen design.
