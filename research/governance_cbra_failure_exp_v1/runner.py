from __future__ import annotations
import argparse, json, os, subprocess, sys, uuid
from dataclasses import asdict

from research.governance_cbra_v1.axis import ContinuousBidirectionalRevalidationAxis
from research.governance_cbra_v1.models import (
    AttributionKind, DecisionProvenanceSnapshot, ParticipationProvenance,
    ResponsibilityProvenance, TargetEvidence, TargetKind,
)
from research.governance_harness_v01.harness import RevalidationState
from .scenario import build_pilot_world, build_confirmatory_world, RuntimeCase, FailureClass, ReentryContext

ARMS=("GOV_CBRA","GOV_RECORD_ONLY","GENERAL_HARNESS")


def _snapshot(case:RuntimeCase):
    return DecisionProvenanceSnapshot(
        entry_id=f"ENTRY:{case.case_id}", relation_id=case.initial_relation,
        decision_tau=10.0, closure_tau=11.0,
        participation=(ParticipationProvenance("CE-FAIL",case.initial_participate,"frozen initial participation","prov:CE-FAIL"),),
        responsibility=ResponsibilityProvenance(
            "continue-flow",("yield-space",),
            ("u-risk",),("i-impact",),("v-exposure",),("t-window",),
            ("selected:continue-flow",),("nonselected:yield-space",),
            (("U",("u-risk",)),("I",("i-impact",)),("V",("v-exposure",)),("T",("t-window",))),
        ),
    )


def _cbra_checkpoint(case:RuntimeCase):
    axis=ContinuousBidirectionalRevalidationAxis(_snapshot(case))
    tau=13.0 if case.delayed else 12.0
    evidence=TargetEvidence(
        relation_id=case.initial_relation,event_id=f"EV:{case.case_id}",
        target_kind=case.evidence_target_kind,target_id=case.evidence_target_id,
        direction=case.evidence_direction,attribution=case.attribution,
        evidence_refs=(f"OBS:{case.case_id}",),
    )
    cp=axis.observe(observed_tau=tau,evidence=(evidence,))
    return axis,cp


def _participation_state(cp):
    return cp.participation_findings[0].state


def _obligation_state(cp,target):
    for x in cp.responsibility_obligation_findings:
        if x.target_id==target: return x.state
    return RevalidationState.INCONCLUSIVE


def run_case(arm:str,case:RuntimeCase)->dict:
    axis,cp=_cbra_checkpoint(case)
    relation_match=case.reentry_relation==case.initial_relation
    same_scope=relation_match and case.reentry_scope==case.initial_scope
    changed_scope=relation_match and case.reentry_scope!=case.initial_scope

    if arm=="GOV_CBRA":
        visible=axis.history_as_of(20.0)
        assert visible==(cp,)
        participate=case.initial_participate if relation_match else False
        selected="continue-flow"
        pstate=_participation_state(cp)
        if same_scope and pstate is RevalidationState.REVISED:
            participate=not case.initial_participate
        elif changed_scope:
            participate=True
        if same_scope and _obligation_state(cp,"U:u-risk") is RevalidationState.REVISED:
            selected="yield-space"
        exogenous_error=False
    elif arm=="GOV_RECORD_ONLY":
        participate=case.initial_participate if relation_match else False
        if changed_scope and case.initial_participate:
            participate=True
        selected="continue-flow"
        exogenous_error=False
    elif arm=="GENERAL_HARNESS":
        # Matched conventional comparator: stores the same failure event but has
        # no target-level provenance or causal attribution. A relation-level
        # failure label suppresses the failed memory and switches the prior choice.
        failure_label=case.evidence_direction.value=="contradicts"
        participate=(case.initial_participate and relation_match and not failure_label)
        selected="yield-space" if relation_match and failure_label else "continue-flow"
        exogenous_error=bool(failure_label and case.attribution is AttributionKind.EXOGENOUS and relation_match)
    else:
        raise ValueError(arm)

    return {
        "arm":arm,"case_id":case.case_id,"failure_class":case.failure_class.value,
        "reentry_context":case.reentry_context.value,"family":case.family,
        "initial_participate":case.initial_participate,
        "reentry_participate":participate,"reentry_selected":selected,
        "participation_state":_participation_state(cp).value,
        "u_obligation_state":_obligation_state(cp,"U:u-risk").value,
        "overall_attribution":cp.overall_attribution.value,
        "checkpoint_count":len(axis.history()),"as_of_count":len(axis.history_as_of(20.0)),
        "exogenous_attribution_error":exogenous_error,
        "counterfactual_claimed":False,
    }


def _decode_runtime(x):
    return RuntimeCase(
        case_id=str(x["case_id"]),
        failure_class=FailureClass(x["failure_class"]),
        reentry_context=ReentryContext(x["reentry_context"]),
        family=str(x["family"]),
        initial_relation=str(x["initial_relation"]),
        reentry_relation=str(x["reentry_relation"]),
        initial_scope=int(x["initial_scope"]),
        reentry_scope=int(x["reentry_scope"]),
        initial_participate=bool(x["initial_participate"]),
        evidence_target_kind=TargetKind(x["evidence_target_kind"]),
        evidence_target_id=str(x["evidence_target_id"]),
        evidence_direction=EvidenceDirection(x["evidence_direction"]),
        attribution=AttributionKind(x["attribution"]),
        delayed=bool(x["delayed"]),
    )


def _worker():
    payload=json.load(sys.stdin); arm=payload["arm"]
    cases=[_decode_runtime(x) for x in payload["cases"]]
    rows=[run_case(arm,c) for c in cases]
    json.dump({"arm":arm,"pid":os.getpid(),"worker_token":str(uuid.uuid4()),"rows":rows},sys.stdout)


def run_runtime(cases):
    workers=[]
    runtime=[asdict(x.runtime) for x in cases]
    for arm in ARMS:
        p=subprocess.run([sys.executable,"-m","research.governance_cbra_failure_exp_v1.runner","--worker"],
            input=json.dumps({"arm":arm,"cases":runtime}),text=True,capture_output=True,check=True)
        workers.append(json.loads(p.stdout))
    return workers


def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--worker",action="store_true"); ap.add_argument("--stage",choices=("pilot","confirmatory"),default="pilot")
    args=ap.parse_args()
    if args.worker: _worker(); return
    from .evaluator import evaluate
    cases=build_pilot_world() if args.stage=="pilot" else build_confirmatory_world()
    workers=run_runtime(cases)
    result=evaluate(cases,workers,scientific=(args.stage=="confirmatory"))
    print(json.dumps(result,indent=2,ensure_ascii=False))

if __name__=="__main__": main()
