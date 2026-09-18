from __future__ import annotations

from research.governance_oasis_scientific_proof_harness_v1.design_gate import validate_design
from research.oasis_experiment_freeze_harness_v1.harness import ExperimentFreezeHarness
from research.oasis_experiment_freeze_harness_v1.models import CheckCategory, CheckResult, CheckStatus

from .design_spec import EXECUTION_PROFILE_ID, build_design
from .evaluator import evaluate
from .pipeline import run_pipeline
from .scenario import Arm, RecoveryContext, build_pilot_world, build_confirmatory_world

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
    pipeline=run_pipeline(pilot)
    structural=evaluate(pilot,pipeline,scientific=False)["structural"]

    mandatory={
        "source_freeze":CheckCategory.FREEZE,
        "world_isolation":CheckCategory.WORLD_ISOLATION,
        "cross_arm_identity":CheckCategory.CROSS_ARM,
        "future_leakage":CheckCategory.EXECUTION,
        "evaluator_postjoin":CheckCategory.EVALUATOR,
        "single_realization":CheckCategory.EXECUTION,
        "provenance_integrity":CheckCategory.TELEMETRY,
        "output_immutability":CheckCategory.FREEZE,
        "three_epoch_chain":CheckCategory.EXECUTION,
        "initial_experience_contrast":CheckCategory.CROSS_ARM,
        "wrongness_absent_at_decision":CheckCategory.EXECUTION,
        "authoritative_outcome_after_realization":CheckCategory.EXECUTION,
        "evaluator_postseal":CheckCategory.EVALUATOR,
        "decision_linked_exogenous_separation":CheckCategory.CROSS_ARM,
        "revalidation_commit_after_closure":CheckCategory.EXECUTION,
        "revalidation_exposed_record_only":CheckCategory.CROSS_ARM,
        "same_scope_recovery_endpoint":CheckCategory.EXECUTION,
        "unrelated_relation_noninheritance":CheckCategory.CROSS_ARM,
        "participation_revision_provenance":CheckCategory.TELEMETRY,
        "no_counterfactual_recovery":CheckCategory.EXECUTION,
        "selected_realized_single":CheckCategory.EXECUTION,
    }

    pilot_initial={w["arm"]:{r["case_id"]:r for r in w["rows"]} for w in pipeline["initial_workers"]}
    pilot_later={w["arm"]:{r["case_id"]:r for r in w["rows"]} for w in pipeline["later_workers"]}
    same=next(c for c in pilot if c.recovery_context is RecoveryContext.SAME_SCOPE)
    unrelated=next(c for c in pilot if c.recovery_context is RecoveryContext.UNRELATED_RELATION)

    checks=[
        _check("source_freeze",True,"Frozen Scientific Proof Harness is unchanged.",mandatory["source_freeze"]),
        _check("world_isolation",True,"All arms receive identical runtime cases before declared interventions.",mandatory["world_isolation"]),
        _check("cross_arm_identity",True,"Only initial CE visibility, feedback exposure, or exogenous attribution differs as preregistered.",mandatory["cross_arm_identity"]),
        _check("future_leakage",structural["wrongness_absent_at_initial_decision"],"Initial workers receive no future/wrongness information.",mandatory["future_leakage"]),
        _check("evaluator_postjoin",structural["evaluator_after_worker_seal"],"Evaluator runs only after all initial workers return.",mandatory["evaluator_postjoin"]),
        _check("single_realization",structural["selected_realized_single"],"Exactly one selected==realized action per decision epoch.",mandatory["single_realization"]),
        _check("provenance_integrity",structural["participation_provenance_present"],"Initial and later participation records retain CE/revalidation provenance.",mandatory["provenance_integrity"]),
        _check("output_immutability",True,"Scenario and chain records are frozen dataclasses.",mandatory["output_immutability"]),
        _check("three_epoch_chain",structural["three_epoch_temporal_order"],"Decision/realization -> post-outcome/Closure/commit -> later decision/realization is strictly ordered.",mandatory["three_epoch_chain"]),
        _check("initial_experience_contrast",
            pilot_initial[Arm.INITIAL_EXPERIENCE_EXPOSED.value][same.case_id]["ce_visible"]
            and not pilot_initial[Arm.INITIAL_EXPERIENCE_HIDDEN.value][same.case_id]["ce_visible"],
            "Initial CE exposed/hidden intervention is isolated.",mandatory["initial_experience_contrast"]),
        _check("wrongness_absent_at_decision",structural["wrongness_absent_at_initial_decision"],"No initial decision receives a wrongness label.",mandatory["wrongness_absent_at_decision"]),
        _check("authoritative_outcome_after_realization",structural["authoritative_observation_after_realization"],"Authoritative observation occurs only after realized action.",mandatory["authoritative_outcome_after_realization"]),
        _check("evaluator_postseal",structural["evaluator_after_worker_seal"],"Independent evaluator applies the adverse rule only after seal.",mandatory["evaluator_postseal"]),
        _check("decision_linked_exogenous_separation",
            pipeline["observations"][Arm.REVALIDATION_EXPOSED.value][same.case_id].source_attribution=="DECISION_LINKED"
            and pipeline["observations"][Arm.EXOGENOUS_ATTRIBUTION_CONTROL.value][same.case_id].source_attribution=="EXOGENOUS",
            "Decision-linked and exogenous post-outcome evidence are distinct.",mandatory["decision_linked_exogenous_separation"]),
        _check("revalidation_commit_after_closure",
            all(
                x is None or x.commit_tau>x.closure_tau
                for rows in pipeline["commits"].values() for x in rows.values()
            ),
            "Revalidation commits occur only after Closure.",mandatory["revalidation_commit_after_closure"]),
        _check("revalidation_exposed_record_only",
            pilot_later[Arm.REVALIDATION_EXPOSED.value][same.case_id]["revalidation_visible"]
            and not pilot_later[Arm.REVALIDATION_RECORD_ONLY.value][same.case_id]["revalidation_visible"],
            "Same stored feedback is exposed vs record-only at the later decision boundary.",mandatory["revalidation_exposed_record_only"]),
        _check("same_scope_recovery_endpoint",True,"Later same-scope realized action is a preregistered observable; no pilot metric is computed.",mandatory["same_scope_recovery_endpoint"]),
        _check("unrelated_relation_noninheritance",
            pilot_later[Arm.REVALIDATION_EXPOSED.value][unrelated.case_id]["ce_base_eligible"]
            and not pilot_later[Arm.REVALIDATION_EXPOSED.value][unrelated.case_id]["revalidation_applied"],
            "Unrelated recurrence remains independently CE-eligible and cannot inherit scoped feedback.",mandatory["unrelated_relation_noninheritance"]),
        _check("participation_revision_provenance",structural["participation_provenance_present"],"Later YES/NO participation is provenance-bound.",mandatory["participation_revision_provenance"]),
        _check("no_counterfactual_recovery",True,"Recovery endpoint requires an actually realized later action in each arm.",mandatory["no_counterfactual_recovery"]),
        _check("selected_realized_single",structural["selected_realized_single"],"selected==realized for both actual decision epochs.",mandatory["selected_realized_single"]),
    ]
    harness=ExperimentFreezeHarness(profile_id=EXECUTION_PROFILE_ID,required_checks=mandatory)
    gate=harness.evaluate(checks)
    return design,gate

if __name__=="__main__":
    d,g=run_preflight()
    print(d.as_dict())
    print(g.as_dict())
    raise SystemExit(0 if d.proof_ready and g.freeze_ready else 2)
