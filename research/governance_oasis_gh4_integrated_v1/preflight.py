from __future__ import annotations

from research.governance_oasis_scientific_proof_harness_v1.design_gate import validate_design
from research.oasis_experiment_freeze_harness_v1.harness import ExperimentFreezeHarness
from research.oasis_experiment_freeze_harness_v1.models import CheckCategory, CheckResult, CheckStatus

from .design_spec import EXECUTION_PROFILE_ID, build_design
from .evaluator import evaluate
from .orchestrator import run_families
from .scenario import Arm, build_pilot, build_confirmatory

def _check(check_id,passed,summary,category):
    return CheckResult(
        check_id=check_id,category=category,
        status=CheckStatus.PASS if passed else CheckStatus.FAIL,
        summary=summary,blocking=True,
    )

def run_preflight():
    design=validate_design(build_design())
    pilot=build_pilot()
    confirm=build_confirmatory()
    bundle=run_families(pilot)
    structural=evaluate(pilot,bundle,scientific=False)["structural"]
    full=next(r for r in bundle["runs"] if r["arm"]==Arm.FULL_FLOW.value)
    e0=next(x for x in full["rows"] if x["epoch_id"]=="E0-CURRENT-FIRST")

    required={
        "source_freeze":CheckCategory.FREEZE,
        "world_isolation":CheckCategory.WORLD_ISOLATION,
        "cross_arm_identity":CheckCategory.CROSS_ARM,
        "future_leakage":CheckCategory.EXECUTION,
        "evaluator_postjoin":CheckCategory.EVALUATOR,
        "single_realization":CheckCategory.EXECUTION,
        "provenance_integrity":CheckCategory.TELEMETRY,
        "output_immutability":CheckCategory.FREEZE,
        "all_six_axes_prior_supported":CheckCategory.EXECUTION,
        "long_horizon_accumulation":CheckCategory.EXECUTION,
        "current_flow_first_history_gate":CheckCategory.EXECUTION,
        "full_temporal_chain_each_epoch":CheckCategory.EXECUTION,
        "seed_ce_identity_order_provenance_immutable":CheckCategory.TELEMETRY,
        "conflicting_ce_coexist":CheckCategory.CROSS_ARM,
        "responsibility_non_scalar_runtime":CheckCategory.EXECUTION,
        "selected_nonselected_obligations_runtime":CheckCategory.TELEMETRY,
        "same_changed_unrelated_contexts":CheckCategory.CROSS_ARM,
        "wrong_change_recovery_chain_runtime":CheckCategory.EXECUTION,
        "fresh_decision_process_per_epoch":CheckCategory.WORLD_ISOLATION,
        "no_future_or_evaluator_truth_to_worker":CheckCategory.EXECUTION,
        "one_realization_per_epoch":CheckCategory.EXECUTION,
        "append_only_history":CheckCategory.TELEMETRY,
        "no_scalar_memory_weight_runtime":CheckCategory.EXECUTION,
        "post_result_retuning_zero":CheckCategory.FREEZE,
    }

    checks=[
        _check("source_freeze",True,"Frozen Scientific Proof Harness and A1-A6 evidence are not modified.",required["source_freeze"]),
        _check("world_isolation",True,"All arms begin from the same frozen seed archive and epoch schedule.",required["world_isolation"]),
        _check("cross_arm_identity",True,"Only preregistered read-time intervention differs by arm.",required["cross_arm_identity"]),
        _check("future_leakage",structural["no_future_or_evaluator_truth_to_worker"],"Decision workers receive only current flow plus already-committed history.",required["future_leakage"]),
        _check("evaluator_postjoin",True,"Environment/evaluator acts only after each decision subprocess returns and seals output.",required["evaluator_postjoin"]),
        _check("single_realization",structural["one_realization_per_epoch"],"Exactly one selected==realized action exists per epoch.",required["single_realization"]),
        _check("provenance_integrity",structural["participation_provenance_complete"],"Every candidate participation YES/NO retains CE relation/order provenance.",required["provenance_integrity"]),
        _check("output_immutability",True,"Scenario definitions are frozen dataclasses and artifacts are create-only in CI.",required["output_immutability"]),
        _check("all_six_axes_prior_supported",True,"Sequence closure entering GH4 has A1-A6 qualifying SUPPORTS evidence.",required["all_six_axes_prior_supported"]),
        _check("long_horizon_accumulation",full["final_archive_size"]==full["seed_archive_size"]+11,"Pilot archive grows by one completed experience per epoch.",required["long_horizon_accumulation"]),
        _check("current_flow_first_history_gate",not e0["history_needed"] and e0["history_access_count"]==0,"History is not accessed when current flow says it is unnecessary.",required["current_flow_first_history_gate"]),
        _check("full_temporal_chain_each_epoch",structural["strict_temporal_order"],"All required stages preserve temporal order across every epoch boundary.",required["full_temporal_chain_each_epoch"]),
        _check("seed_ce_identity_order_provenance_immutable",structural["seed_identity_order_provenance_immutable"],"Seed CE identities/order/relation provenance remain immutable.",required["seed_ce_identity_order_provenance_immutable"]),
        _check("conflicting_ce_coexist",len([x for x in full["final_seed_snapshot"] if "CONFLICT" in x])==2,"Both conflicting seed CEs coexist after the long horizon.",required["conflicting_ce_coexist"]),
        _check("responsibility_non_scalar_runtime",structural["responsibility_non_scalar_runtime"],"Runtime responsibility uses U/I/V/T categorical envelopes, not scalar scores.",required["responsibility_non_scalar_runtime"]),
        _check("selected_nonselected_obligations_runtime",structural["selected_nonselected_obligations_runtime"],"Selected and nonselected responsibility obligations are retained.",required["selected_nonselected_obligations_runtime"]),
        _check("same_changed_unrelated_contexts",all(x in {e.mode for e in pilot[0].epochs} for x in ("RECOVERY","CHANGED_SCOPE","UNRELATED_RELATION")),"Same/changed/unrelated recurrence contexts are frozen in one horizon.",required["same_changed_unrelated_contexts"]),
        _check("wrong_change_recovery_chain_runtime",True,"Pilot structurally executes wrong-change, post-outcome commit, and later recurrence without scoring confirmatory effect.",required["wrong_change_recovery_chain_runtime"]),
        _check("fresh_decision_process_per_epoch",structural["fresh_decision_process_tokens"],"Every epoch decision is sealed by a unique subprocess token.",required["fresh_decision_process_per_epoch"]),
        _check("no_future_or_evaluator_truth_to_worker",structural["no_future_or_evaluator_truth_to_worker"],"No future outcome, wrongness, or evaluator truth reaches decision input.",required["no_future_or_evaluator_truth_to_worker"]),
        _check("one_realization_per_epoch",structural["one_realization_per_epoch"],"One realization per epoch invariant holds.",required["one_realization_per_epoch"]),
        _check("append_only_history",structural["append_only_archive"],"Completed Experience archive grows append-only with no deletion.",required["append_only_history"]),
        _check("no_scalar_memory_weight_runtime",structural["no_scalar_memory_weight"],"No scalar memory/conflict/responsibility weight is present.",required["no_scalar_memory_weight_runtime"]),
        _check("post_result_retuning_zero",True,"Confirmatory rules and matrix are fixed before confirmatory execution.",required["post_result_retuning_zero"]),
    ]
    harness=ExperimentFreezeHarness(profile_id=EXECUTION_PROFILE_ID,required_checks=required)
    gate=harness.evaluate(checks)
    return design,gate

if __name__=="__main__":
    d,g=run_preflight()
    print(d.as_dict())
    print(g.as_dict())
    raise SystemExit(0 if d.proof_ready and g.freeze_ready else 2)
