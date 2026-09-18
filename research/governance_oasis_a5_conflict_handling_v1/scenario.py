from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

class CaseMode(str,Enum):
    RELATION="RELATION_DISCRIMINATIVE"
    ORDER="ORDER_DISCRIMINATIVE"

@dataclass(frozen=True)
class CompletedExperience:
    ce_id:str
    supported_action:str
    relation_tag:str
    order_index:int
    payload:str

@dataclass(frozen=True)
class RuntimeCase:
    case_id:str
    family:str
    mode:CaseMode
    current_relation_tag:str
    current_phase:str
    possibility_set:tuple[str,...]
    ce_archive:tuple[CompletedExperience,...]

@dataclass(frozen=True)
class TruthCase:
    case_id:str
    expected_ce_id:str
    expected_action:str
    relevant_ablation:str

@dataclass(frozen=True)
class ScenarioCase:
    runtime:RuntimeCase
    truth:TruthCase

def _family(family:str)->tuple[ScenarioCase,...]:
    ce_continue=CompletedExperience(
        ce_id=f"{family}-CE-CONTINUE",
        supported_action="continue-flow",
        relation_tag="REL-C",
        order_index=1,
        payload="same-conflict-payload",
    )
    ce_yield=CompletedExperience(
        ce_id=f"{family}-CE-YIELD",
        supported_action="yield-space",
        relation_tag="REL-Y",
        order_index=2,
        payload="same-conflict-payload",
    )
    archive=(ce_continue,ce_yield)
    poss=("continue-flow","yield-space")
    return (
        ScenarioCase(
            RuntimeCase(f"{family}-REL-C",family,CaseMode.RELATION,"REL-C","RELATION_MATCH",poss,archive),
            TruthCase(f"{family}-REL-C",ce_continue.ce_id,"continue-flow","RELATION_PROVENANCE_PERMUTED"),
        ),
        ScenarioCase(
            RuntimeCase(f"{family}-REL-Y",family,CaseMode.RELATION,"REL-Y","RELATION_MATCH",poss,archive),
            TruthCase(f"{family}-REL-Y",ce_yield.ce_id,"yield-space","RELATION_PROVENANCE_PERMUTED"),
        ),
        ScenarioCase(
            RuntimeCase(f"{family}-ORD-EARLY",family,CaseMode.ORDER,"REL-SHARED","EARLY",poss,archive),
            TruthCase(f"{family}-ORD-EARLY",ce_continue.ce_id,"continue-flow","ORDER_ERASED"),
        ),
        ScenarioCase(
            RuntimeCase(f"{family}-ORD-LATE",family,CaseMode.ORDER,"REL-SHARED","LATE",poss,archive),
            TruthCase(f"{family}-ORD-LATE",ce_yield.ce_id,"yield-space","ORDER_ERASED"),
        ),
    )

def build_pilot_world()->tuple[ScenarioCase,...]:
    return _family("P")

def build_confirmatory_world()->tuple[ScenarioCase,...]:
    out=[]
    for family in ("F1","F2","F3"):
        out.extend(_family(family))
    return tuple(out)
