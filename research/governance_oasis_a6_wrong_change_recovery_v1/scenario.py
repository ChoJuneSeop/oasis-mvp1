from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

class RecoveryContext(str,Enum):
    SAME_SCOPE="SAME_SCOPE"
    UNRELATED_RELATION="UNRELATED_RELATION"

class Arm(str,Enum):
    INITIAL_EXPERIENCE_EXPOSED="INITIAL_EXPERIENCE_EXPOSED"
    INITIAL_EXPERIENCE_HIDDEN="INITIAL_EXPERIENCE_HIDDEN"
    REVALIDATION_EXPOSED="REVALIDATION_EXPOSED"
    REVALIDATION_RECORD_ONLY="REVALIDATION_RECORD_ONLY"
    EXOGENOUS_ATTRIBUTION_CONTROL="EXOGENOUS_ATTRIBUTION_CONTROL"

class Attribution(str,Enum):
    DECISION_LINKED="DECISION_LINKED"
    EXOGENOUS="EXOGENOUS"

@dataclass(frozen=True)
class CompletedExperience:
    ce_id:str
    supported_action:str
    semantic_tag:str
    origin_relation_id:str
    origin_scope_id:str

@dataclass(frozen=True)
class RuntimeCase:
    case_id:str
    family:str
    recovery_context:RecoveryContext
    initial_relation_id:str
    later_relation_id:str
    initial_scope_id:str
    later_scope_id:str
    current_semantic_tag:str
    possibility_set:tuple[str,...]
    prior_ce:CompletedExperience

FAMILIES=("F1","F2","F3")

def _family(family:str)->tuple[RuntimeCase,...]:
    ce=CompletedExperience(
        ce_id=f"{family}-CE-PRIOR",
        supported_action="continue-flow",
        semantic_tag="front-compatible",
        origin_relation_id="REL-A",
        origin_scope_id=f"{family}-SCOPE",
    )
    common=dict(
        family=family,
        initial_relation_id="REL-A",
        initial_scope_id=f"{family}-SCOPE",
        current_semantic_tag="front-compatible",
        possibility_set=("continue-flow","yield-space"),
        prior_ce=ce,
    )
    return (
        RuntimeCase(
            case_id=f"{family}-SAME",
            recovery_context=RecoveryContext.SAME_SCOPE,
            later_relation_id="REL-A",
            later_scope_id=f"{family}-SCOPE",
            **common,
        ),
        RuntimeCase(
            case_id=f"{family}-UNRELATED",
            recovery_context=RecoveryContext.UNRELATED_RELATION,
            later_relation_id="REL-B",
            later_scope_id=f"{family}-OTHER-SCOPE",
            **common,
        ),
    )

def build_pilot_world()->tuple[RuntimeCase,...]:
    ce=CompletedExperience(
        ce_id="P-CE-PRIOR",
        supported_action="continue-flow",
        semantic_tag="front-compatible",
        origin_relation_id="REL-A",
        origin_scope_id="P-SCOPE",
    )
    return (
        RuntimeCase("P-SAME","P",RecoveryContext.SAME_SCOPE,"REL-A","REL-A","P-SCOPE","P-SCOPE","front-compatible",("continue-flow","yield-space"),ce),
        RuntimeCase("P-UNRELATED","P",RecoveryContext.UNRELATED_RELATION,"REL-A","REL-B","P-SCOPE","P-OTHER-SCOPE","front-compatible",("continue-flow","yield-space"),ce),
    )

def build_confirmatory_world()->tuple[RuntimeCase,...]:
    out=[]
    for family in FAMILIES:
        out.extend(_family(family))
    return tuple(out)
