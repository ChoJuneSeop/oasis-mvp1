from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import uuid
from dataclasses import asdict, dataclass
from enum import Enum

from .scenario import CaseMode, CompletedExperience, RuntimeCase, build_pilot_world, build_confirmatory_world

class Arm(str,Enum):
    PROVENANCE_PRESERVING_CONTEXTUAL="PROVENANCE_PRESERVING_CONTEXTUAL"
    ORDER_ERASED="ORDER_ERASED"
    RELATION_PROVENANCE_PERMUTED="RELATION_PROVENANCE_PERMUTED"
    LATEST_ONLY="LATEST_ONLY"

ARMS=tuple(x.value for x in Arm)

@dataclass(frozen=True)
class Participation:
    ce_id:str
    participated:bool
    provenance_ref:str
    reason:str

def _choose_contextual(case:RuntimeCase, *, erase_order:bool=False, permute_relation:bool=False):
    ces=case.ce_archive
    if case.mode is CaseMode.RELATION:
        tags={ce.ce_id:ce.relation_tag for ce in ces}
        if permute_relation:
            ids=[ce.ce_id for ce in ces]
            vals=[tags[i] for i in ids][1:]+[tags[i] for i in ids][:1]
            tags=dict(zip(ids,vals))
        matches=[ce for ce in ces if tags[ce.ce_id]==case.current_relation_tag]
        return tuple(matches)
    if erase_order:
        return tuple(ces)
    if case.current_phase=="EARLY":
        idx=min(ce.order_index for ce in ces)
    elif case.current_phase=="LATE":
        idx=max(ce.order_index for ce in ces)
    else:
        return tuple()
    return tuple(ce for ce in ces if ce.order_index==idx)

def run_case(arm:Arm,case:RuntimeCase)->dict:
    if arm is Arm.PROVENANCE_PRESERVING_CONTEXTUAL:
        selected_ces=_choose_contextual(case)
    elif arm is Arm.ORDER_ERASED:
        selected_ces=_choose_contextual(case,erase_order=True)
    elif arm is Arm.RELATION_PROVENANCE_PERMUTED:
        selected_ces=_choose_contextual(case,permute_relation=True)
    elif arm is Arm.LATEST_ONLY:
        latest=max(case.ce_archive,key=lambda x:x.order_index)
        selected_ces=(latest,)
    else:
        raise ValueError(arm)

    selected_ids={ce.ce_id for ce in selected_ces}
    participation=tuple(
        Participation(
            ce_id=ce.ce_id,
            participated=ce.ce_id in selected_ids,
            provenance_ref=f"{ce.ce_id}|relation={ce.relation_tag}|order={ce.order_index}",
            reason="contextually admitted" if ce.ce_id in selected_ids else "NO: preserved but not admitted in current relation/order context",
        )
        for ce in case.ce_archive
    )

    if len(selected_ces)==1:
        selected=selected_ces[0].supported_action
    else:
        # Ambiguous conflict under ablation falls back to the frozen current distribution baseline.
        selected="continue-flow"

    return {
        "arm":arm.value,
        "case_id":case.case_id,
        "mode":case.mode.value,
        "archive_ids":[ce.ce_id for ce in case.ce_archive],
        "archive_actions":[ce.supported_action for ce in case.ce_archive],
        "archive_relation_tags":[ce.relation_tag for ce in case.ce_archive],
        "archive_order":[ce.order_index for ce in case.ce_archive],
        "participation":[asdict(x) for x in participation],
        "scalar_memory_score":None,
        "latest_wins_rule":arm is Arm.LATEST_ONLY,
        "selected":selected,
        "realized":selected,
        "realization_count":1,
    }

def _decode_case(raw)->RuntimeCase:
    return RuntimeCase(
        case_id=str(raw["case_id"]),
        family=str(raw["family"]),
        mode=CaseMode(raw["mode"]),
        current_relation_tag=str(raw["current_relation_tag"]),
        current_phase=str(raw["current_phase"]),
        possibility_set=tuple(raw["possibility_set"]),
        ce_archive=tuple(CompletedExperience(**x) for x in raw["ce_archive"]),
    )

def _worker():
    payload=json.load(sys.stdin)
    arm=Arm(payload["arm"])
    cases=tuple(_decode_case(x) for x in payload["cases"])
    rows=[run_case(arm,c) for c in cases]
    json.dump({"arm":arm.value,"pid":os.getpid(),"worker_token":str(uuid.uuid4()),"rows":rows},sys.stdout)

def run_workers(cases)->tuple[dict,...]:
    runtime=[asdict(x.runtime) for x in cases]
    workers=[]
    for arm in Arm:
        p=subprocess.run(
            [sys.executable,"-m","research.governance_oasis_a5_conflict_handling_v1.runner","--worker"],
            input=json.dumps({"arm":arm.value,"cases":runtime}),
            text=True,capture_output=True,check=True,
        )
        workers.append(json.loads(p.stdout))
    return tuple(workers)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--worker",action="store_true")
    ap.add_argument("--stage",choices=("pilot","confirmatory"),default="pilot")
    args=ap.parse_args()
    if args.worker:
        _worker(); return
    from .evaluator import evaluate
    world=build_pilot_world() if args.stage=="pilot" else build_confirmatory_world()
    result=evaluate(world,run_workers(world),scientific=args.stage=="confirmatory")
    print(json.dumps(result,ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
