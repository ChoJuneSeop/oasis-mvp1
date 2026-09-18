from __future__ import annotations

import json
import subprocess
import sys
from dataclasses import asdict, dataclass
from typing import Any

from .scenario import Arm, ARMS, CE, Epoch, Family, build_pilot, build_confirmatory


@dataclass(frozen=True)
class Revalidation:
    revalidation_id:str
    ce_id:str
    relation_id:str
    scope_id:str
    state:str
    attribution:str
    source_epoch:int
    source_outcome_ref:str


def _epoch_tau(epoch_index:int, offset:int)->int:
    return epoch_index*100+offset


def _run_decision(arm:Arm, epoch:Epoch, archive:list[CE], revalidations:list[Revalidation])->dict[str,Any]:
    payload={
        "arm":arm.value,
        "epoch":asdict(epoch),
        "archive":[asdict(x) for x in archive],
        "revalidations":[asdict(x) for x in revalidations],
    }
    p=subprocess.run(
        [sys.executable,"-m","research.governance_oasis_gh4_integrated_v1.decision_worker"],
        input=json.dumps(payload),text=True,capture_output=True,check=True,
    )
    return json.loads(p.stdout)


def _authoritative_observation(epoch:Epoch, realized:str)->dict[str,Any]:
    if epoch.mode in {"WRONG_CHANGE","RECOVERY"}:
        impact="constraint_breach" if realized=="continue-flow" else "stable"
    elif epoch.mode=="RESPONSIBILITY":
        impact="constraint_breach" if realized=="continue-flow" else "stable"
    else:
        impact="stable"
    return {
        "impact_code":impact,
        "observed_tau":_epoch_tau(epoch.index,8),
        "based_on_realized_action":realized,
        "authoritative":True,
    }


def _attribution(arm:Arm, epoch:Epoch, adverse:bool)->str:
    if adverse and arm is Arm.EXOGENOUS_ATTRIBUTION_CONTROL and epoch.mode in {"WRONG_CHANGE","RECOVERY"}:
        return "EXOGENOUS"
    return "DECISION_LINKED"


def _selected_contributor(row:dict[str,Any], archive:list[CE])->CE|None:
    participated={x["ce_id"] for x in row["participation"] if x["participated"]}
    matches=[ce for ce in archive if ce.ce_id in participated and ce.action==row["realized"]]
    if not matches:
        return None
    return sorted(matches,key=lambda x:(x.order_index,x.ce_id))[0]


def _make_revalidation(
    family_id:str, arm:Arm, epoch:Epoch, row:dict[str,Any],
    observation:dict[str,Any], contributor:CE|None,
)->Revalidation|None:
    if contributor is None:
        return None
    adverse=observation["impact_code"]=="constraint_breach"
    attribution=_attribution(arm,epoch,adverse)
    if adverse and attribution=="DECISION_LINKED":
        state="REVISED"
    elif adverse and attribution=="EXOGENOUS":
        state="INCONCLUSIVE"
    else:
        state="CONFIRMED"
    return Revalidation(
        revalidation_id=f"{family_id}:{arm.value}:{epoch.epoch_id}:{contributor.ce_id}",
        ce_id=contributor.ce_id,
        relation_id=epoch.current_relation,
        scope_id=epoch.current_scope,
        state=state,
        attribution=attribution,
        source_epoch=epoch.index,
        source_outcome_ref=f"OBS:{family_id}:{arm.value}:{epoch.epoch_id}:{observation['impact_code']}",
    )


def _generated_ce(family_id:str, arm:Arm, epoch:Epoch, row:dict[str,Any], order_index:int)->CE:
    return CE(
        ce_id=f"{family_id}:{arm.value}:GEN:{epoch.epoch_id}",
        action=row["realized"],
        semantic_tag=f"generated:{epoch.epoch_id}",
        relation_tag=epoch.current_relation,
        scope_tag=epoch.current_scope,
        order_index=order_index,
        identity_tag="GENERATED",
        payload="append-only-realized-experience",
        origin_epoch=epoch.index,
    )


def run_arm(family:Family, arm:Arm)->dict[str,Any]:
    archive=list(family.seed_archive)
    seed_snapshot={x.ce_id:asdict(x) for x in family.seed_archive}
    revalidations:list[Revalidation]=[]
    rows=[]
    event_trace=[]
    worker_pids=[]
    worker_tokens=[]
    next_order=max(x.order_index for x in archive)+1

    for epoch in family.epochs:
        before=len(archive)
        row=_run_decision(arm,epoch,archive,revalidations)
        worker_pids.append(row["worker_pid"])
        worker_tokens.append(row["worker_seal_token"])

        stage_taus={
            "CURRENT_FLOW":_epoch_tau(epoch.index,1),
            "RELATION_PROCESS":_epoch_tau(epoch.index,2),
            "HISTORY_NEED_GATE":_epoch_tau(epoch.index,3),
            "PARTICIPATION":_epoch_tau(epoch.index,4),
            "POSSIBILITY_DISTRIBUTION":_epoch_tau(epoch.index,5),
            "RESPONSIBILITY":_epoch_tau(epoch.index,6),
            "DECISION":_epoch_tau(epoch.index,7),
            "SINGLE_REALIZATION":_epoch_tau(epoch.index,8),
            "POST_OUTCOME_OBSERVATION":_epoch_tau(epoch.index,9),
            "CLOSURE":_epoch_tau(epoch.index,10),
            "REVALIDATION":_epoch_tau(epoch.index,11),
            "COMMIT":_epoch_tau(epoch.index,12),
        }

        observation=_authoritative_observation(epoch,row["realized"])
        adverse=observation["impact_code"]=="constraint_breach"
        contributor=_selected_contributor(row,archive)
        commit=_make_revalidation(family.family_id,arm,epoch,row,observation,contributor)
        if commit is not None:
            revalidations.append(commit)

        generated=_generated_ce(family.family_id,arm,epoch,row,next_order)
        next_order+=1
        archive.append(generated)

        seed_integrity=all(asdict(next(x for x in archive if x.ce_id==cid))==snap for cid,snap in seed_snapshot.items())
        after=len(archive)

        post={
            "authoritative_observation":observation,
            "adverse":adverse,
            "attribution":_attribution(arm,epoch,adverse),
            "revalidation_commit":None if commit is None else asdict(commit),
            "closure_tau":stage_taus["CLOSURE"],
            "commit_tau":stage_taus["COMMIT"],
            "archive_size_before":before,
            "archive_size_after":after,
            "seed_integrity":seed_integrity,
            "generated_ce_id":generated.ce_id,
            "stage_taus":stage_taus,
            "post_realization_stages":["POST_OUTCOME_OBSERVATION","CLOSURE","REVALIDATION","COMMIT"],
        }
        row.update(post)
        rows.append(row)

        for name,tau in stage_taus.items():
            event_trace.append({"epoch_index":epoch.index,"stage":name,"tau":tau})

    return {
        "family_id":family.family_id,
        "arm":arm.value,
        "seed_archive_size":len(family.seed_archive),
        "final_archive_size":len(archive),
        "rows":rows,
        "event_trace":event_trace,
        "worker_pids":worker_pids,
        "worker_seal_tokens":worker_tokens,
        "final_seed_snapshot":{x.ce_id:asdict(x) for x in archive if x.ce_id in seed_snapshot},
        "revalidations":[asdict(x) for x in revalidations],
        "scalar_memory_weight":None,
    }


def run_families(families:tuple[Family,...])->dict[str,Any]:
    runs=[]
    for family in families:
        for arm in ARMS:
            runs.append(run_arm(family,arm))
    return {"runs":runs}


def main():
    import argparse
    ap=argparse.ArgumentParser()
    ap.add_argument("--stage",choices=("pilot","confirmatory"),default="pilot")
    args=ap.parse_args()
    from .evaluator import evaluate
    families=build_pilot() if args.stage=="pilot" else build_confirmatory()
    bundle=run_families(families)
    result=evaluate(families,bundle,scientific=args.stage=="confirmatory")
    print(json.dumps({"evaluation":result,"runs":bundle["runs"]},ensure_ascii=False,indent=2))


if __name__=="__main__":
    main()
