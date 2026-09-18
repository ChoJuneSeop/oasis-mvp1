from __future__ import annotations
from dataclasses import dataclass
from enum import Enum

from research.governance_cbra_v1.models import AttributionKind, EvidenceDirection, TargetKind


class FailureClass(str, Enum):
    PARTICIPATION_COMMISSION="participation_commission"
    PARTICIPATION_OMISSION="participation_omission"
    RESPONSIBILITY_AXIS="responsibility_axis"
    EXOGENOUS="exogenous"
    DELAYED="delayed"


class ReentryContext(str, Enum):
    SAME_SCOPE="same_scope"
    CHANGED_SCOPE="changed_scope"
    UNRELATED="unrelated"


@dataclass(frozen=True)
class RuntimeCase:
    case_id:str
    failure_class:FailureClass
    reentry_context:ReentryContext
    family:str
    initial_relation:str
    reentry_relation:str
    initial_scope:int
    reentry_scope:int
    initial_participate:bool
    evidence_target_kind:TargetKind
    evidence_target_id:str
    evidence_direction:EvidenceDirection
    attribution:AttributionKind
    delayed:bool


@dataclass(frozen=True)
class TruthCase:
    case_id:str
    should_change_same_scope:bool
    should_allow_contextual_reentry:bool
    exogenous_only:bool
    no_provenance_should_be_revisable:bool
    responsibility_axis_should_be_revisable:bool


@dataclass(frozen=True)
class ScenarioCase:
    runtime:RuntimeCase
    truth:TruthCase


FAMILY_SCOPES={"F1":1,"F2":2,"F3":3,"F4":4}


def _case(fc:FailureClass, ctx:ReentryContext, family:str, idx:int)->ScenarioCase:
    initial_scope=FAMILY_SCOPES.get(family,2)
    relation="REL-A"
    re_rel="REL-B" if ctx is ReentryContext.UNRELATED else relation
    re_scope=initial_scope if ctx is ReentryContext.SAME_SCOPE else (initial_scope+1 if ctx is ReentryContext.CHANGED_SCOPE else initial_scope)

    if fc is FailureClass.PARTICIPATION_COMMISSION:
        initial=True; kind=TargetKind.PARTICIPATION; target="CE-FAIL"
        direction=EvidenceDirection.CONTRADICTS; attribution=AttributionKind.DECISION_LINKED
    elif fc is FailureClass.PARTICIPATION_OMISSION:
        initial=False; kind=TargetKind.PARTICIPATION; target="CE-FAIL"
        direction=EvidenceDirection.CONTRADICTS; attribution=AttributionKind.DECISION_LINKED
    elif fc is FailureClass.RESPONSIBILITY_AXIS:
        initial=True; kind=TargetKind.RESPONSIBILITY_OBLIGATION; target="U:u-risk"
        direction=EvidenceDirection.CONTRADICTS; attribution=AttributionKind.DECISION_LINKED
    elif fc is FailureClass.EXOGENOUS:
        initial=True; kind=TargetKind.SELECTED_CHOICE; target="continue-flow"
        direction=EvidenceDirection.CONTRADICTS; attribution=AttributionKind.EXOGENOUS
    else:
        initial=True; kind=TargetKind.PARTICIPATION; target="CE-FAIL"
        direction=EvidenceDirection.CONTRADICTS; attribution=AttributionKind.DECISION_LINKED

    cid=f"{idx:03d}:{fc.value}:{ctx.value}:{family}:s{initial_scope}"
    truth=TruthCase(
        cid,
        should_change_same_scope=fc in {FailureClass.PARTICIPATION_COMMISSION,FailureClass.PARTICIPATION_OMISSION,FailureClass.RESPONSIBILITY_AXIS,FailureClass.DELAYED},
        should_allow_contextual_reentry=fc in {FailureClass.PARTICIPATION_COMMISSION,FailureClass.RESPONSIBILITY_AXIS,FailureClass.DELAYED},
        exogenous_only=fc is FailureClass.EXOGENOUS,
        no_provenance_should_be_revisable=fc is FailureClass.PARTICIPATION_OMISSION,
        responsibility_axis_should_be_revisable=fc is FailureClass.RESPONSIBILITY_AXIS,
    )
    runtime=RuntimeCase(cid,fc,ctx,family,relation,re_rel,initial_scope,re_scope,initial,kind,target,direction,attribution,fc is FailureClass.DELAYED)
    return ScenarioCase(runtime,truth)


def build_pilot_world()->tuple[ScenarioCase,...]:
    out=[]; i=0
    for fc in FailureClass:
        for ctx in ReentryContext:
            i+=1; out.append(_case(fc,ctx,"P",i))
    return tuple(out)


def build_confirmatory_world()->tuple[ScenarioCase,...]:
    out=[]; i=0
    for family in FAMILY_SCOPES:
        for fc in FailureClass:
            for ctx in ReentryContext:
                i+=1; out.append(_case(fc,ctx,family,i))
    return tuple(out)
