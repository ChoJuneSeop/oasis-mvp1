from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

class Arm(str,Enum):
    FULL_FLOW="FULL_FLOW"
    INITIAL_EXPERIENCE_HIDDEN="INITIAL_EXPERIENCE_HIDDEN"
    IDENTITY_PERMUTED="IDENTITY_PERMUTED"
    RELATION_ABLATED="RELATION_ABLATED"
    ORDER_ABLATED="ORDER_ABLATED"
    RESPONSIBILITY_RECORD_ONLY="RESPONSIBILITY_RECORD_ONLY"
    RESPONSIBILITY_PERMUTED="RESPONSIBILITY_PERMUTED"
    SCOPE_GUARD_ABLATED="SCOPE_GUARD_ABLATED"
    CONFLICT_LATEST_ONLY="CONFLICT_LATEST_ONLY"
    REVALIDATION_RECORD_ONLY="REVALIDATION_RECORD_ONLY"
    EXOGENOUS_ATTRIBUTION_CONTROL="EXOGENOUS_ATTRIBUTION_CONTROL"

ARMS=tuple(Arm)

@dataclass(frozen=True)
class CE:
    ce_id:str
    action:str
    semantic_tag:str
    relation_tag:str
    scope_tag:str
    order_index:int
    identity_tag:str
    payload:str
    origin_epoch:int

@dataclass(frozen=True)
class Epoch:
    index:int
    epoch_id:str
    mode:str
    current_relation:str
    current_scope:str
    semantic_tag:str
    history_needed:bool
    current_default:str
    possibility_set:tuple[str,...]
    required_identity_tag:str=""
    order_phase:str=""
    responsibility_envelopes:tuple[tuple[str,tuple[tuple[str,str],...]],...]=()

@dataclass(frozen=True)
class Family:
    family_id:str
    seed_archive:tuple[CE,...]
    epochs:tuple[Epoch,...]

def _neutral_responsibility():
    return (
        ("continue-flow",( ("U","NEUTRAL"),("I","OPEN"),("V","OBSERVED"),("T","CURRENT") )),
        ("yield-space",( ("U","NEUTRAL"),("I","OPEN"),("V","OBSERVED"),("T","CURRENT") )),
    )

def _decision_responsibility():
    return (
        ("continue-flow",( ("U","HIGH"),("I","UNRESOLVED"),("V","UNVERIFIED"),("T","DEFER") )),
        ("yield-space",( ("U","LOW"),("I","SUPPORTED"),("V","VERIFIED"),("T","NOW") )),
    )

def _seeds(f:str)->tuple[CE,...]:
    scope=f"{f}-SCOPE"
    return (
        CE(f"{f}-CE-BASE-TEMPT","continue-flow","baseline","REL-A",scope,1,"BASE","seed", -11),
        CE(f"{f}-CE-WRONG","continue-flow","wrong","REL-A",scope,2,"WRONG","seed", -10),
        CE(f"{f}-CE-ID-A","continue-flow","identity","REL-ID",scope,3,"TARGET","same-identity-payload",-9),
        CE(f"{f}-CE-ID-B","yield-space","identity","REL-ID",scope,3,"OTHER","same-identity-payload",-8),
        CE(f"{f}-CE-REL-C","continue-flow","relation","REL-C",scope,4,"REL-C","same-relation-payload",-7),
        CE(f"{f}-CE-REL-Y","yield-space","relation","REL-Y",scope,4,"REL-Y","same-relation-payload",-6),
        CE(f"{f}-CE-ORD-OLD","continue-flow","order","REL-ORDER",scope,5,"ORDER","same-order-payload",-5),
        CE(f"{f}-CE-ORD-NEW","yield-space","order","REL-ORDER",scope,6,"ORDER","same-order-payload",-4),
        CE(f"{f}-CE-CONFLICT-OLD","continue-flow","conflict","REL-C",scope,7,"CONFLICT","same-conflict-payload",-3),
        CE(f"{f}-CE-CONFLICT-NEW","yield-space","conflict","REL-Y",scope,8,"CONFLICT","same-conflict-payload",-2),
        CE(f"{f}-CE-RESP-C","continue-flow","responsibility","REL-R",scope,9,"RESP","same-resp-payload",-1),
        CE(f"{f}-CE-RESP-Y","yield-space","responsibility","REL-R",scope,10,"RESP","same-resp-payload",-1),
    )

def _epochs(f:str)->tuple[Epoch,...]:
    scope=f"{f}-SCOPE"
    n=_neutral_responsibility()
    return (
        Epoch(0,"E0-CURRENT-FIRST","BASELINE","REL-A",scope,"baseline",False,"yield-space",
              ("continue-flow","yield-space"),responsibility_envelopes=n),
        Epoch(1,"E1-WRONG-CHANGE","WRONG_CHANGE","REL-A",scope,"wrong",True,"yield-space",
              ("continue-flow","yield-space"),responsibility_envelopes=n),
        Epoch(2,"E2-SAME-SCOPE-RECOVERY","RECOVERY","REL-A",scope,"wrong",True,"yield-space",
              ("continue-flow","yield-space"),responsibility_envelopes=n),
        Epoch(3,"E3-CHANGED-SCOPE","CHANGED_SCOPE","REL-A",f"{scope}-CHANGED","wrong",True,"yield-space",
              ("continue-flow","yield-space"),responsibility_envelopes=n),
        Epoch(4,"E4-UNRELATED-RELATION","UNRELATED_RELATION","REL-B",f"{scope}-UNRELATED","wrong",True,"yield-space",
              ("continue-flow","yield-space"),responsibility_envelopes=n),
        Epoch(5,"E5-IDENTITY","IDENTITY","REL-ID",scope,"identity",True,"yield-space",
              ("continue-flow","yield-space"),required_identity_tag="TARGET",responsibility_envelopes=n),
        Epoch(6,"E6-RELATION","RELATION","REL-Y",scope,"relation",True,"continue-flow",
              ("continue-flow","yield-space"),responsibility_envelopes=n),
        Epoch(7,"E7-ORDER-EARLY","ORDER","REL-ORDER",scope,"order",True,"yield-space",
              ("continue-flow","yield-space"),order_phase="EARLY",responsibility_envelopes=n),
        Epoch(8,"E8-ORDER-LATE","ORDER","REL-ORDER",scope,"order",True,"continue-flow",
              ("continue-flow","yield-space"),order_phase="LATE",responsibility_envelopes=n),
        Epoch(9,"E9-CONFLICT","CONFLICT","REL-C",scope,"conflict",True,"yield-space",
              ("continue-flow","yield-space"),responsibility_envelopes=n),
        Epoch(10,"E10-RESPONSIBILITY","RESPONSIBILITY","REL-R",scope,"responsibility",True,"continue-flow",
              ("continue-flow","yield-space"),responsibility_envelopes=_decision_responsibility()),
    )

def build_family(family_id:str)->Family:
    return Family(family_id,_seeds(family_id),_epochs(family_id))

def build_pilot()->tuple[Family,...]:
    return (build_family("P"),)

def build_confirmatory()->tuple[Family,...]:
    return tuple(build_family(x) for x in ("F1","F2","F3"))
