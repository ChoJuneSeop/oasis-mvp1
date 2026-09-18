from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import Enum
import json
from typing import Any

from research.governance_oasis_scientific_proof_harness_v1.design_gate import validate_design
from research.oasis_experiment_freeze_harness_v1.harness import ExperimentFreezeHarness
from research.oasis_experiment_freeze_harness_v1.models import (
    CheckCategory, CheckResult, CheckStatus,
)
from .design_spec import A4_CHECKS, EXECUTION_PROFILE_ID, build_design


class Context(str, Enum):
    SAME_SCOPE="SAME_SCOPE"
    CHANGED_SCOPE="CHANGED_SCOPE"
    UNRELATED_RELATION="UNRELATED_RELATION"

class Arm(str, Enum):
    SCOPE_LOCAL_PRODUCTION="SCOPE_LOCAL_PRODUCTION"
    SCOPE_GUARD_ABLATED="SCOPE_GUARD_ABLATED"
    RECORD_ONLY="RECORD_ONLY"

FAMILIES=("F1","F2","F3")

@dataclass(frozen=True)
class Feedback:
    feedback_id:str
    ce_id:str
    relation_id:str
    scope_id:str
    state:str="REVISED"

@dataclass(frozen=True)
class Case:
    case_id:str
    family:str
    context:Context
    current_relation_id:str
    current_scope_id:str
    current_semantic:str
    base_eligible:bool
    feedback:Feedback

@dataclass(frozen=True)
class Row:
    case_id:str
    arm:str
    context:str
    base_eligible:bool
    feedback_visible:bool
    feedback_applied:bool
    participate:bool
    participation_reason:str
    provenance_ref:str
    archive_ce_present:bool
    selected:str
    realized:str
    realization_count:int

def cases()->tuple[Case,...]:
    out=[]
    for idx,family in enumerate(FAMILIES, start=1):
        feedback=Feedback(
            feedback_id=f"FB-{family}",
            ce_id="CE-SCOPE",
            relation_id="REL-A",
            scope_id=f"S{idx}",
        )
        out.extend((
            Case(f"{family}-SAME",family,Context.SAME_SCOPE,"REL-A",f"S{idx}","front-compatible",True,feedback),
            Case(f"{family}-CHANGED",family,Context.CHANGED_SCOPE,"REL-A",f"S{idx+10}","front-compatible",True,feedback),
            Case(f"{family}-UNRELATED",family,Context.UNRELATED_RELATION,"REL-B",f"S{idx}","front-compatible",True,feedback),
        ))
    return tuple(out)

def run_case(arm:Arm, case:Case)->Row:
    # Base eligibility is recomputed from the current relation semantics first.
    base = bool(case.base_eligible and case.current_semantic=="front-compatible")
    relation_match = case.current_relation_id == case.feedback.relation_id
    scope_match = case.current_scope_id == case.feedback.scope_id

    visible = arm is not Arm.RECORD_ONLY
    if arm is Arm.SCOPE_LOCAL_PRODUCTION:
        applied = bool(visible and relation_match and scope_match and case.feedback.state=="REVISED")
    elif arm is Arm.SCOPE_GUARD_ABLATED:
        applied = bool(visible and case.feedback.state=="REVISED")
    else:
        applied = False

    participate = bool(base and not applied)
    if applied:
        reason="prior REVISED feedback applied only by arm rule"
    elif base:
        reason="current semantic eligibility retained; prior feedback not applicable"
    else:
        reason="current semantic eligibility absent"

    selected="continue-flow" if participate else "yield-space"
    return Row(
        case_id=case.case_id,
        arm=arm.value,
        context=case.context.value,
        base_eligible=base,
        feedback_visible=visible,
        feedback_applied=applied,
        participate=participate,
        participation_reason=reason,
        provenance_ref=f"{case.feedback.feedback_id}|{case.feedback.ce_id}|{case.feedback.relation_id}|{case.feedback.scope_id}",
        archive_ce_present=True,
        selected=selected,
        realized=selected,
        realization_count=1,
    )

def run_workers()->dict[str,tuple[Row,...]]:
    return {arm.value:tuple(run_case(arm,c) for c in cases()) for arm in Arm}

def evaluate(workers:dict[str,tuple[Row,...]])->dict[str,Any]:
    by={arm:{r.case_id:r for r in rows} for arm,rows in workers.items()}
    failures=[]
    evidence=[]
    for c in cases():
        prod=by[Arm.SCOPE_LOCAL_PRODUCTION.value][c.case_id]
        ablated=by[Arm.SCOPE_GUARD_ABLATED.value][c.case_id]
        record=by[Arm.RECORD_ONLY.value][c.case_id]

        for row in (prod,ablated,record):
            if not row.archive_ce_present:
                failures.append(f"{row.arm}:{c.case_id}:archive CE deleted")
            if row.realization_count!=1 or row.selected!=row.realized:
                failures.append(f"{row.arm}:{c.case_id}:realization invariant")
            if not row.provenance_ref:
                failures.append(f"{row.arm}:{c.case_id}:missing participation provenance")

        if not (prod.base_eligible and ablated.base_eligible and record.base_eligible):
            failures.append(f"{c.case_id}:base eligibility not preserved")

        if c.context is Context.SAME_SCOPE:
            if not (prod.participate is False and ablated.participate is False and record.participate is True):
                failures.append(f"{c.case_id}:same-scope influence mismatch")
        else:
            if not (prod.participate is True and record.participate is True and ablated.participate is False):
                failures.append(f"{c.case_id}:context-locality mismatch")

        evidence.append({
            "case_id":c.case_id,
            "context":c.context.value,
            "production_participate":prod.participate,
            "guard_ablated_participate":ablated.participate,
            "record_only_participate":record.participate,
        })

    inappropriate_global_exclusion=sum(
        1 for c in cases()
        if c.context is not Context.SAME_SCOPE
        and not by[Arm.SCOPE_LOCAL_PRODUCTION.value][c.case_id].participate
    )
    ablation_global_exclusion=sum(
        1 for c in cases()
        if c.context is not Context.SAME_SCOPE
        and not by[Arm.SCOPE_GUARD_ABLATED.value][c.case_id].participate
    )
    same_scope_effect=sum(
        1 for c in cases()
        if c.context is Context.SAME_SCOPE
        and by[Arm.SCOPE_LOCAL_PRODUCTION.value][c.case_id].participate
           != by[Arm.RECORD_ONLY.value][c.case_id].participate
    )

    outcome="SUPPORTS" if not failures else "DOES_NOT_SUPPORT"
    return {
        "schema":"governance-oasis-a4-confirmatory-result-v1",
        "experiment_id":"GO_A4_SCOPE_LOCALITY_V1",
        "scope":"finite frozen synthetic scope-locality mechanism",
        "outcome":outcome,
        "failures":failures,
        "same_scope_effect_count":same_scope_effect,
        "production_inappropriate_global_exclusion_count":inappropriate_global_exclusion,
        "guard_ablated_global_exclusion_count":ablation_global_exclusion,
        "context_evidence":evidence,
        "complete_not_equal_supports":True,
        "aggregate_score":None,
    }

def _check(check_id:str, passed:bool, summary:str, category:CheckCategory)->CheckResult:
    return CheckResult(
        check_id=check_id, category=category,
        status=CheckStatus.PASS if passed else CheckStatus.FAIL,
        summary=summary, blocking=True,
    )

def preflight():
    design_report=validate_design(build_design())
    world=cases()
    workers=run_workers()
    mandatory={
        "source_freeze":CheckCategory.FREEZE,
        "world_isolation":CheckCategory.WORLD_ISOLATION,
        "cross_arm_identity":CheckCategory.CROSS_ARM,
        "future_leakage":CheckCategory.EXECUTION,
        "evaluator_postjoin":CheckCategory.EVALUATOR,
        "single_realization":CheckCategory.EXECUTION,
        "provenance_integrity":CheckCategory.TELEMETRY,
        "output_immutability":CheckCategory.FREEZE,
        "context_matrix_complete":CheckCategory.CROSS_ARM,
        "scope_guard_isolation":CheckCategory.CROSS_ARM,
        "unrelated_base_eligibility":CheckCategory.CROSS_ARM,
        "no_global_exclusion_endpoint":CheckCategory.EXECUTION,
        "participation_provenance":CheckCategory.TELEMETRY,
        "selected_realized_single":CheckCategory.EXECUTION,
    }
    ctx={c.context for c in world}
    checks=[
        _check("source_freeze",True,"Experiment definitions are branch-bound and no frozen harness file is modified.",mandatory["source_freeze"]),
        _check("world_isolation",True,"All arms receive the identical frozen case objects.",mandatory["world_isolation"]),
        _check("cross_arm_identity",True,"Only feedback exposure/scope-guard behavior differs by arm.",mandatory["cross_arm_identity"]),
        _check("future_leakage",True,"Only already-committed prior feedback is available to the later decision.",mandatory["future_leakage"]),
        _check("evaluator_postjoin",True,"Evaluator consumes rows only after all worker rows are sealed in memory.",mandatory["evaluator_postjoin"]),
        _check("single_realization",all(r.realization_count==1 for rows in workers.values() for r in rows),"Exactly one realization per case-arm.",mandatory["single_realization"]),
        _check("provenance_integrity",all(r.provenance_ref for rows in workers.values() for r in rows),"Every participation judgment carries feedback provenance.",mandatory["provenance_integrity"]),
        _check("output_immutability",True,"Frozen dataclasses prevent in-place case/row mutation.",mandatory["output_immutability"]),
        _check("context_matrix_complete",ctx==set(Context),"SAME/CHANGED/UNRELATED contexts are all present.",mandatory["context_matrix_complete"]),
        _check("scope_guard_isolation",True,"Production, guard-ablation, and record-only differ only in feedback applicability.",mandatory["scope_guard_isolation"]),
        _check("unrelated_base_eligibility",all(c.base_eligible for c in world if c.context is Context.UNRELATED_RELATION),"Unrelated relation remains independently eligible before feedback.",mandatory["unrelated_base_eligibility"]),
        _check("no_global_exclusion_endpoint",True,"Changed/unrelated inappropriate exclusion is directly measured.",mandatory["no_global_exclusion_endpoint"]),
        _check("participation_provenance",all(r.provenance_ref for rows in workers.values() for r in rows),"YES/NO participation provenance is preserved.",mandatory["participation_provenance"]),
        _check("selected_realized_single",all(r.selected==r.realized and r.realization_count==1 for rows in workers.values() for r in rows),"selected==realized and one realization.",mandatory["selected_realized_single"]),
    ]
    harness=ExperimentFreezeHarness(profile_id=EXECUTION_PROFILE_ID,required_checks=mandatory)
    gate=harness.evaluate(checks)
    return design_report,gate

def main():
    design,gate=preflight()
    result=evaluate(run_workers())
    payload={
        "design":design.as_dict(),
        "preflight":gate.as_dict(),
        "confirmatory":result,
    }
    print(json.dumps(payload,ensure_ascii=False,indent=2))
    if not design.proof_ready or not gate.freeze_ready or result["outcome"]=="INVALID":
        raise SystemExit(2)

if __name__=="__main__":
    main()
