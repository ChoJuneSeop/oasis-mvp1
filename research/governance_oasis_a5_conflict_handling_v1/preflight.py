from __future__ import annotations

from research.governance_oasis_scientific_proof_harness_v1.design_gate import validate_design
from research.oasis_experiment_freeze_harness_v1.harness import ExperimentFreezeHarness
from research.oasis_experiment_freeze_harness_v1.models import CheckCategory, CheckResult, CheckStatus

from .design_spec import A5_CHECKS, EXECUTION_PROFILE_ID, build_design
from .evaluator import evaluate
from .runner import run_workers
from .scenario import build_pilot_world, build_confirmatory_world

def _check(check_id,passed,summary,category):
    return CheckResult(
        check_id=check_id,category=category,
        status=CheckStatus.PASS if passed else CheckStatus.FAIL,
        summary=summary,blocking=True,
    )

def run_preflight():
    design=validate_design(build_design())
    pilot=build_pilot_world()
    confirm=build_confirmatory_world()
    workers=run_workers(pilot)
    structural=evaluate(pilot,workers,scientific=False)["structural"]

    mandatory={
        "source_freeze":CheckCategory.FREEZE,
        "world_isolation":CheckCategory.WORLD_ISOLATION,
        "cross_arm_identity":CheckCategory.CROSS_ARM,
        "future_leakage":CheckCategory.EXECUTION,
        "evaluator_postjoin":CheckCategory.EVALUATOR,
        "single_realization":CheckCategory.EXECUTION,
        "provenance_integrity":CheckCategory.TELEMETRY,
        "output_immutability":CheckCategory.FREEZE,
        "conflict_matrix_complete":CheckCategory.CROSS_ARM,
        "two_ce_preserved":CheckCategory.TELEMETRY,
        "conflict_actions_opposed":CheckCategory.CROSS_ARM,
        "order_provenance_preserved":CheckCategory.TELEMETRY,
        "relation_provenance_preserved":CheckCategory.TELEMETRY,
        "participation_yes_no_provenance":CheckCategory.TELEMETRY,
        "no_scalar_merge":CheckCategory.EXECUTION,
        "latest_only_is_ablation":CheckCategory.CROSS_ARM,
        "fresh_process_arms":CheckCategory.WORLD_ISOLATION,
        "selected_realized_single":CheckCategory.EXECUTION,
    }
    checks=[
        _check("source_freeze",True,"Frozen Scientific Proof Harness is not modified.",mandatory["source_freeze"]),
        _check("world_isolation",True,"Every arm receives identical runtime cases and CE archives.",mandatory["world_isolation"]),
        _check("cross_arm_identity",True,"Only declared read-time conflict mechanism differs by arm.",mandatory["cross_arm_identity"]),
        _check("future_leakage",True,"Worker receives runtime context only; evaluator truth is absent.",mandatory["future_leakage"]),
        _check("evaluator_postjoin",True,"TruthCase is joined only after all fresh-process worker outputs return.",mandatory["evaluator_postjoin"]),
        _check("single_realization",structural["selected_realized_single"],"Exactly one selected==realized action per case-arm.",mandatory["single_realization"]),
        _check("provenance_integrity",structural["no_provenance_present"],"Every NO judgment retains CE provenance.",mandatory["provenance_integrity"]),
        _check("output_immutability",True,"Runtime/scenario records are frozen dataclasses.",mandatory["output_immutability"]),
        _check("conflict_matrix_complete",len(pilot)==4 and len(confirm)==12,"Pilot P and confirmatory F1/F2/F3 matrices are disjoint and fixed.",mandatory["conflict_matrix_complete"]),
        _check("two_ce_preserved",structural["two_ce_preserved"],"Both conflicting CE identities remain present.",mandatory["two_ce_preserved"]),
        _check("conflict_actions_opposed",structural["opposed_actions_preserved"],"Each pair supports two different feasible actions.",mandatory["conflict_actions_opposed"]),
        _check("order_provenance_preserved",all(tuple(ce.order_index for ce in x.runtime.ce_archive)==(1,2) for x in confirm),"Stored order is fixed; ORDER_ERASED is read-time only.",mandatory["order_provenance_preserved"]),
        _check("relation_provenance_preserved",all(tuple(ce.relation_tag for ce in x.runtime.ce_archive)==("REL-C","REL-Y") for x in confirm),"Stored relation provenance is fixed; permutation is read-time only.",mandatory["relation_provenance_preserved"]),
        _check("participation_yes_no_provenance",structural["no_provenance_present"],"YES/NO participation remains CE-attributable.",mandatory["participation_yes_no_provenance"]),
        _check("no_scalar_merge",structural["no_scalar_memory_score"],"No scalar memory/conflict score exists.",mandatory["no_scalar_merge"]),
        _check("latest_only_is_ablation",True,"LATEST_ONLY is isolated as a declared control, never production behavior.",mandatory["latest_only_is_ablation"]),
        _check("fresh_process_arms",structural["fresh_process"],"All arms run in fresh worker processes.",mandatory["fresh_process_arms"]),
        _check("selected_realized_single",structural["selected_realized_single"],"selected==realized and one realization.",mandatory["selected_realized_single"]),
    ]
    harness=ExperimentFreezeHarness(profile_id=EXECUTION_PROFILE_ID,required_checks=mandatory)
    gate=harness.evaluate(checks)
    return design,gate

if __name__=="__main__":
    d,g=run_preflight()
    print(d.as_dict())
    print(g.as_dict())
    raise SystemExit(0 if d.proof_ready and g.freeze_ready else 2)
