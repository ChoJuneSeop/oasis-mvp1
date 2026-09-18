from __future__ import annotations

import json
import sys
from dataclasses import asdict, dataclass
from typing import Any

from .scenario import Arm, CE, Epoch

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

def _decode_ce(x:dict[str,Any])->CE:
    return CE(**x)

def _decode_epoch(x:dict[str,Any])->Epoch:
    r=tuple((str(a),tuple((str(k),str(v)) for k,v in pairs)) for a,pairs in x["responsibility_envelopes"])
    return Epoch(
        index=int(x["index"]),epoch_id=str(x["epoch_id"]),mode=str(x["mode"]),
        current_relation=str(x["current_relation"]),current_scope=str(x["current_scope"]),
        semantic_tag=str(x["semantic_tag"]),history_needed=bool(x["history_needed"]),
        current_default=str(x["current_default"]),possibility_set=tuple(x["possibility_set"]),
        required_identity_tag=str(x.get("required_identity_tag","")),
        order_phase=str(x.get("order_phase","")),
        responsibility_envelopes=r,
    )

def _responsibility_map(epoch:Epoch,arm:Arm):
    base={a:dict(pairs) for a,pairs in epoch.responsibility_envelopes}
    if epoch.mode=="RESPONSIBILITY" and arm is Arm.RESPONSIBILITY_PERMUTED:
        return {
            "continue-flow":dict(base["yield-space"]),
            "yield-space":dict(base["continue-flow"]),
        }
    return base

def _responsibility_choice(resp:dict[str,dict[str,str]],default:str)->str:
    # Frozen categorical policy; no scalar score is computed.
    for action in ("yield-space","continue-flow"):
        x=resp.get(action,{})
        if x.get("U")=="LOW" and x.get("I")=="SUPPORTED" and x.get("V")=="VERIFIED" and x.get("T")=="NOW":
            return action
    return default

def decide(payload:dict[str,Any])->dict[str,Any]:
    arm=Arm(payload["arm"])
    epoch=_decode_epoch(payload["epoch"])
    archive=tuple(_decode_ce(x) for x in payload["archive"])
    revalidations=tuple(Revalidation(**x) for x in payload["revalidations"])

    # Worker input contract intentionally contains no future outcome/evaluator truth.
    future_keys={"future_outcome","expected_label","evaluator_truth","wrongness"}
    received_forbidden=bool(future_keys.intersection(payload))

    if not epoch.history_needed:
        semantic_candidates=()
    else:
        semantic_candidates=tuple(ce for ce in archive if ce.semantic_tag==epoch.semantic_tag)

    candidate_ids=tuple(ce.ce_id for ce in semantic_candidates)
    participation={ce.ce_id:True for ce in semantic_candidates}
    reasons={ce.ce_id:"YES: semantic candidate admitted" for ce in semantic_candidates}

    # Initial CE hidden only at the wrong-change epoch.
    if arm is Arm.INITIAL_EXPERIENCE_HIDDEN and epoch.mode=="WRONG_CHANGE":
        for ce in semantic_candidates:
            participation[ce.ce_id]=False
            reasons[ce.ce_id]="NO: initial experience visibility ablated"

    # Identity-specific control.
    if epoch.mode=="IDENTITY":
        tags={ce.ce_id:ce.identity_tag for ce in semantic_candidates}
        if arm is Arm.IDENTITY_PERMUTED and len(semantic_candidates)==2:
            a,b=semantic_candidates
            tags={a.ce_id:b.identity_tag,b.ce_id:a.identity_tag}
        for ce in semantic_candidates:
            ok=tags[ce.ce_id]==epoch.required_identity_tag
            participation[ce.ce_id]=bool(ok)
            reasons[ce.ce_id]="YES: identity binding matches" if ok else "NO: identity binding does not match"

    # Relation-specific traceability.
    if epoch.mode=="RELATION" and arm is not Arm.RELATION_ABLATED:
        for ce in semantic_candidates:
            ok=ce.relation_tag==epoch.current_relation
            participation[ce.ce_id]=bool(ok)
            reasons[ce.ce_id]="YES: relation provenance matches" if ok else "NO: relation provenance mismatch"
    elif epoch.mode=="RELATION" and arm is Arm.RELATION_ABLATED:
        for ce in semantic_candidates:
            participation[ce.ce_id]=True
            reasons[ce.ce_id]="YES: relation provenance read-time ablated"

    # Order-specific traceability.
    if epoch.mode=="ORDER" and arm is not Arm.ORDER_ABLATED and semantic_candidates:
        target=min(x.order_index for x in semantic_candidates) if epoch.order_phase=="EARLY" else max(x.order_index for x in semantic_candidates)
        for ce in semantic_candidates:
            ok=ce.order_index==target
            participation[ce.ce_id]=bool(ok)
            reasons[ce.ce_id]="YES: order provenance matches" if ok else "NO: order provenance mismatch"
    elif epoch.mode=="ORDER" and arm is Arm.ORDER_ABLATED:
        for ce in semantic_candidates:
            participation[ce.ce_id]=True
            reasons[ce.ce_id]="YES: order provenance read-time ablated"

    # Contextual conflict handling.
    if epoch.mode=="CONFLICT" and semantic_candidates:
        if arm is Arm.CONFLICT_LATEST_ONLY:
            target=max(x.order_index for x in semantic_candidates)
            for ce in semantic_candidates:
                ok=ce.order_index==target
                participation[ce.ce_id]=bool(ok)
                reasons[ce.ce_id]="YES: latest-only conflict ablation" if ok else "NO: latest-only conflict ablation"
        else:
            for ce in semantic_candidates:
                ok=ce.relation_tag==epoch.current_relation
                participation[ce.ce_id]=bool(ok)
                reasons[ce.ce_id]="YES: contextual conflict relation matches" if ok else "NO: conflicting CE preserved but current relation differs"

    # Provenance-bound revalidation. Record-only hides it; scope guard ablation applies it globally.
    if arm is not Arm.REVALIDATION_RECORD_ONLY:
        for ce in semantic_candidates:
            relevant=[r for r in revalidations if r.ce_id==ce.ce_id and r.state=="REVISED" and r.attribution=="DECISION_LINKED"]
            if relevant:
                latest=max(relevant,key=lambda x:x.source_epoch)
                if arm is Arm.SCOPE_GUARD_ABLATED:
                    applies=True
                else:
                    applies=latest.relation_id==epoch.current_relation and latest.scope_id==epoch.current_scope
                if applies:
                    participation[ce.ce_id]=False
                    reasons[ce.ce_id]="NO: provenance-bound REVISED feedback applies"

    participants=tuple(ce for ce in semantic_candidates if participation.get(ce.ce_id,False))
    participant_ids=tuple(ce.ce_id for ce in participants)
    possibility_ids=tuple(sorted(set(epoch.possibility_set)))

    responsibility=_responsibility_map(epoch,arm)
    responsibility_record_only=(epoch.mode=="RESPONSIBILITY" and arm is Arm.RESPONSIBILITY_RECORD_ONLY)

    if epoch.mode=="RESPONSIBILITY":
        selected=_responsibility_choice(responsibility,epoch.current_default) if not responsibility_record_only else epoch.current_default
    elif len(participants)==1:
        selected=participants[0].action
    elif len(participants)>1:
        selected=epoch.current_default
    else:
        selected=epoch.current_default

    selected_obligation=dict(responsibility.get(selected,{}))
    nonselected_obligations={
        a:dict(v) for a,v in responsibility.items() if a!=selected
    }

    participation_rows=[]
    for ce in semantic_candidates:
        participation_rows.append({
            "ce_id":ce.ce_id,
            "participated":bool(participation.get(ce.ce_id,False)),
            "reason":reasons.get(ce.ce_id,"NO: not admitted"),
            "provenance":f"{ce.ce_id}|relation={ce.relation_tag}|scope={ce.scope_tag}|order={ce.order_index}|origin={ce.origin_epoch}",
        })

    return {
        "epoch_id":epoch.epoch_id,
        "epoch_index":epoch.index,
        "mode":epoch.mode,
        "arm":arm.value,
        "current_relation":epoch.current_relation,
        "current_scope":epoch.current_scope,
        "history_needed":epoch.history_needed,
        "history_access_count":len(semantic_candidates),
        "candidate_ids":list(candidate_ids),
        "participation":participation_rows,
        "participant_ids":list(participant_ids),
        "possibility_ids":list(possibility_ids),
        "responsibility":responsibility,
        "responsibility_record_only":responsibility_record_only,
        "responsibility_scalar_score":None,
        "selected_obligation":selected_obligation,
        "nonselected_obligations":nonselected_obligations,
        "selected":selected,
        "realized":selected,
        "realization_count":1,
        "received_forbidden_future_or_evaluator_truth":received_forbidden,
        "pre_realization_stages":[
            "CURRENT_FLOW","RELATION_PROCESS","HISTORY_NEED_GATE","PARTICIPATION",
            "POSSIBILITY_DISTRIBUTION","RESPONSIBILITY","DECISION","SINGLE_REALIZATION",
        ],
    }

def main():
    payload=json.load(sys.stdin)
    json.dump(decide(payload),sys.stdout,ensure_ascii=False)

if __name__=="__main__":
    main()
