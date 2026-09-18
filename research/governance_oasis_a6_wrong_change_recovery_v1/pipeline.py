from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import uuid
from dataclasses import asdict, dataclass
from typing import Any

from .scenario import Arm, Attribution, CompletedExperience, RecoveryContext, RuntimeCase, build_pilot_world, build_confirmatory_world

T_PRIOR_CE=0
T_INITIAL_DECISION=10
T_INITIAL_REALIZATION=11
T_OUTCOME=20
T_CLOSURE=21
T_REVALIDATION_COMMIT=22
T_LATER_DECISION=30
T_LATER_REALIZATION=31

@dataclass(frozen=True)
class InitialRow:
    case_id:str
    arm:str
    ce_visible:bool
    ce_participated:bool
    participation_reason:str
    participation_provenance:str
    selected:str
    realized:str
    realization_count:int
    decision_tau:int
    realization_tau:int
    worker_received_wrongness:bool
    worker_received_future_outcome:bool

@dataclass(frozen=True)
class OutcomeObservation:
    case_id:str
    arm:str
    impact_code:str
    source_attribution:str
    observed_tau:int
    based_on_realized_action:str

@dataclass(frozen=True)
class Evaluation:
    case_id:str
    arm:str
    adverse:bool
    attribution:str
    evaluator_tau:int
    worker_sealed_before_evaluation:bool

@dataclass(frozen=True)
class RevalidationCommit:
    case_id:str
    arm:str
    ce_id:str
    relation_id:str
    scope_id:str
    state:str
    attribution:str
    outcome_ref:str
    closure_tau:int
    commit_tau:int

@dataclass(frozen=True)
class LaterRow:
    case_id:str
    arm:str
    recovery_context:str
    ce_base_eligible:bool
    revalidation_visible:bool
    revalidation_applied:bool
    ce_participated:bool
    participation_reason:str
    participation_provenance:str
    selected:str
    realized:str
    realization_count:int
    decision_tau:int
    realization_tau:int
    worker_received_evaluator_truth:bool

def _initial_ce_visible(arm:Arm)->bool:
    return arm is not Arm.INITIAL_EXPERIENCE_HIDDEN

def _commit_required(arm:Arm)->bool:
    return arm in {
        Arm.REVALIDATION_EXPOSED,
        Arm.REVALIDATION_RECORD_ONLY,
        Arm.EXOGENOUS_ATTRIBUTION_CONTROL,
    }

def _feedback_visible_later(arm:Arm)->bool:
    return arm in {Arm.REVALIDATION_EXPOSED,Arm.EXOGENOUS_ATTRIBUTION_CONTROL}

def initial_decision(arm:Arm,case:RuntimeCase)->InitialRow:
    visible=_initial_ce_visible(arm)
    eligible=case.prior_ce.semantic_tag==case.current_semantic_tag
    participated=bool(visible and eligible)
    selected=case.prior_ce.supported_action if participated else "yield-space"
    return InitialRow(
        case_id=case.case_id,
        arm=arm.value,
        ce_visible=visible,
        ce_participated=participated,
        participation_reason="prior CE exposed and semantically eligible" if participated else "prior CE hidden from initial decision",
        participation_provenance=f"{case.prior_ce.ce_id}|initial_relation={case.initial_relation_id}|scope={case.initial_scope_id}",
        selected=selected,
        realized=selected,
        realization_count=1,
        decision_tau=T_INITIAL_DECISION,
        realization_tau=T_INITIAL_REALIZATION,
        worker_received_wrongness=False,
        worker_received_future_outcome=False,
    )

def authoritative_observation(row:InitialRow)->OutcomeObservation:
    impact="constraint_breach" if row.realized=="continue-flow" else "stable"
    attribution=(
        Attribution.EXOGENOUS.value
        if row.arm==Arm.EXOGENOUS_ATTRIBUTION_CONTROL.value
        else Attribution.DECISION_LINKED.value
    )
    return OutcomeObservation(
        case_id=row.case_id,
        arm=row.arm,
        impact_code=impact,
        source_attribution=attribution,
        observed_tau=T_OUTCOME,
        based_on_realized_action=row.realized,
    )

def independent_evaluate(observation:OutcomeObservation)->Evaluation:
    adverse=observation.impact_code=="constraint_breach"
    return Evaluation(
        case_id=observation.case_id,
        arm=observation.arm,
        adverse=adverse,
        attribution=observation.source_attribution,
        evaluator_tau=T_OUTCOME,
        worker_sealed_before_evaluation=True,
    )

def make_commit(arm:Arm,case:RuntimeCase,observation:OutcomeObservation,evaluation:Evaluation)->RevalidationCommit|None:
    if not _commit_required(arm):
        return None
    if evaluation.adverse and evaluation.attribution==Attribution.DECISION_LINKED.value:
        state="REVISED"
    elif evaluation.adverse and evaluation.attribution==Attribution.EXOGENOUS.value:
        state="INCONCLUSIVE"
    else:
        state="CONFIRMED"
    return RevalidationCommit(
        case_id=case.case_id,
        arm=arm.value,
        ce_id=case.prior_ce.ce_id,
        relation_id=case.initial_relation_id,
        scope_id=case.initial_scope_id,
        state=state,
        attribution=evaluation.attribution,
        outcome_ref=f"OBS:{case.case_id}:{observation.impact_code}",
        closure_tau=T_CLOSURE,
        commit_tau=T_REVALIDATION_COMMIT,
    )

def later_decision(arm:Arm,case:RuntimeCase,commit:RevalidationCommit|None)->LaterRow:
    base_eligible=case.prior_ce.semantic_tag==case.current_semantic_tag
    visible=bool(commit is not None and _feedback_visible_later(arm))
    relation_match=bool(commit is not None and commit.relation_id==case.later_relation_id)
    scope_match=bool(commit is not None and commit.scope_id==case.later_scope_id)
    applied=bool(
        visible
        and commit is not None
        and commit.state=="REVISED"
        and commit.attribution==Attribution.DECISION_LINKED.value
        and relation_match
        and scope_match
    )
    participated=bool(base_eligible and not applied)
    selected=case.prior_ce.supported_action if participated else "yield-space"
    reason=(
        "NO: decision-linked REVISED feedback applies to this same relation/scope"
        if applied
        else "YES: CE remains currently eligible; no applicable decision-linked REVISED feedback"
    )
    prov=(
        f"{case.prior_ce.ce_id}|later_relation={case.later_relation_id}|later_scope={case.later_scope_id}|"
        + ("feedback="+commit.state+"|"+commit.attribution if commit is not None else "feedback=NONE")
    )
    return LaterRow(
        case_id=case.case_id,
        arm=arm.value,
        recovery_context=case.recovery_context.value,
        ce_base_eligible=base_eligible,
        revalidation_visible=visible,
        revalidation_applied=applied,
        ce_participated=participated,
        participation_reason=reason,
        participation_provenance=prov,
        selected=selected,
        realized=selected,
        realization_count=1,
        decision_tau=T_LATER_DECISION,
        realization_tau=T_LATER_REALIZATION,
        worker_received_evaluator_truth=False,
    )

def _decode_case(raw:dict[str,Any])->RuntimeCase:
    return RuntimeCase(
        case_id=str(raw["case_id"]),
        family=str(raw["family"]),
        recovery_context=RecoveryContext(raw["recovery_context"]),
        initial_relation_id=str(raw["initial_relation_id"]),
        later_relation_id=str(raw["later_relation_id"]),
        initial_scope_id=str(raw["initial_scope_id"]),
        later_scope_id=str(raw["later_scope_id"]),
        current_semantic_tag=str(raw["current_semantic_tag"]),
        possibility_set=tuple(raw["possibility_set"]),
        prior_ce=CompletedExperience(**raw["prior_ce"]),
    )

def _initial_worker()->None:
    payload=json.load(sys.stdin)
    arm=Arm(payload["arm"])
    cases=tuple(_decode_case(x) for x in payload["cases"])
    rows=[asdict(initial_decision(arm,c)) for c in cases]
    json.dump({"phase":"initial","arm":arm.value,"pid":os.getpid(),"token":str(uuid.uuid4()),"rows":rows},sys.stdout)

def _later_worker()->None:
    payload=json.load(sys.stdin)
    arm=Arm(payload["arm"])
    cases={c.case_id:c for c in (_decode_case(x) for x in payload["cases"])}
    commits={x["case_id"]:RevalidationCommit(**x) for x in payload.get("commits",())}
    rows=[asdict(later_decision(arm,cases[cid],commits.get(cid))) for cid in sorted(cases)]
    json.dump({"phase":"later","arm":arm.value,"pid":os.getpid(),"token":str(uuid.uuid4()),"rows":rows},sys.stdout)

def _run_worker(mode:str,arm:Arm,cases,commits=()):
    runtime=[asdict(c) for c in cases]
    payload={"arm":arm.value,"cases":runtime,"commits":[asdict(x) for x in commits if x is not None]}
    p=subprocess.run(
        [sys.executable,"-m","research.governance_oasis_a6_wrong_change_recovery_v1.pipeline","--worker",mode],
        input=json.dumps(payload),text=True,capture_output=True,check=True,
    )
    return json.loads(p.stdout)

def run_pipeline(cases):
    initial_workers=tuple(_run_worker("initial",arm,cases) for arm in Arm)

    # All initial worker outputs are complete before any outcome/evaluator processing.
    initial_by_arm={w["arm"]:w for w in initial_workers}
    observations={}
    evaluations={}
    commits={}
    for arm in Arm:
        observations[arm.value]={}
        evaluations[arm.value]={}
        commits[arm.value]={}
        for raw in initial_by_arm[arm.value]["rows"]:
            row=InitialRow(**raw)
            obs=authoritative_observation(row)
            ev=independent_evaluate(obs)
            case=next(c for c in cases if c.case_id==row.case_id)
            commit=make_commit(arm,case,obs,ev)
            observations[arm.value][row.case_id]=obs
            evaluations[arm.value][row.case_id]=ev
            commits[arm.value][row.case_id]=commit

    later_workers=[]
    for arm in Arm:
        arm_commits=tuple(x for x in commits[arm.value].values() if x is not None)
        later_workers.append(_run_worker("later",arm,cases,arm_commits))

    return {
        "initial_workers":initial_workers,
        "observations":observations,
        "evaluations":evaluations,
        "commits":commits,
        "later_workers":tuple(later_workers),
    }

def _jsonable_pipeline(result):
    return {
        "initial_workers":result["initial_workers"],
        "observations":{
            arm:{cid:asdict(x) for cid,x in rows.items()} for arm,rows in result["observations"].items()
        },
        "evaluations":{
            arm:{cid:asdict(x) for cid,x in rows.items()} for arm,rows in result["evaluations"].items()
        },
        "commits":{
            arm:{cid:(None if x is None else asdict(x)) for cid,x in rows.items()} for arm,rows in result["commits"].items()
        },
        "later_workers":result["later_workers"],
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--worker",choices=("initial","later"))
    ap.add_argument("--stage",choices=("pilot","confirmatory"),default="pilot")
    args=ap.parse_args()
    if args.worker=="initial":
        _initial_worker(); return
    if args.worker=="later":
        _later_worker(); return
    from .evaluator import evaluate
    world=build_pilot_world() if args.stage=="pilot" else build_confirmatory_world()
    pipeline=run_pipeline(world)
    evaluation=evaluate(world,pipeline,scientific=args.stage=="confirmatory")
    print(json.dumps({"evaluation":evaluation,"pipeline":_jsonable_pipeline(pipeline)},ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
