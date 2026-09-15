from __future__ import annotations
from copy import deepcopy
from dataclasses import dataclass, field, replace
from enum import Enum
from typing import Any, Mapping, Protocol
from research.carla_v22_harness_v11.canonical_harness import CanonicalHarnessV11, CoreEpochView, DecisionExecution, PresentFlowPort, PresentObservation
from research.carla_v22_harness_v11.independent_evaluator_v1 import IndependentEvaluatorV1, EvaluatorRecord
from research.g3_2_sidecar.history import HistoryEntry

class GovernanceInvariantError(RuntimeError): pass

class ResponsibilitySelectionPort(Protocol):
    """Optional Core port that binds realization to governance's selected candidate."""
    def realize_selected(self, observation: PresentObservation, tau: float, selected_candidate_id: str): ...

class PureGapDetector(Protocol):
    """Gap detectors receive only episode-local present-flow evidence."""
    def assess(self, evidence: CurrentFlowEvidence) -> GapAssessment: ...
class RevalidationState(str, Enum):
    CONFIRMED="confirmed"; REVISED="revised"; INCONCLUSIVE="inconclusive"

@dataclass(frozen=True)
class CurrentFlowSample:
    tau: float; observation: PresentObservation; current_reality: Mapping[str,Any]
@dataclass(frozen=True)
class CurrentFlowEvidence:
    episode_id: str; samples: tuple[CurrentFlowSample,...]
    @property
    def latest(self): return self.samples[-1]
@dataclass(frozen=True)
class FlowIntegrityGuard: tau: float; fingerprint: str
@dataclass(frozen=True)
class GapAssessment:
    detected: bool; abnormal_outputs: tuple[str,...]=(); relation_changes: tuple[str,...]=(); progress_anomalies: tuple[str,...]=(); current_evidence_refs: tuple[str,...]=(); rationale: str=""
@dataclass(frozen=True)
class ExperienceReengagement:
    experience_id: str; participate: bool; rationale: str; evidence_refs: tuple[str,...]=(); provenance_ref: str=""
@dataclass(frozen=True)
class DynamicResponsibilityAxes:
    uncertainty: tuple[str,...]=(); impact: tuple[str,...]=(); vulnerability: tuple[str,...]=(); temporality: tuple[str,...]=()
@dataclass(frozen=True)
class ResponsibilityJudgment:
    candidate_ids: tuple[str,...]; selected_candidate_id: str|None; nonselected_candidate_ids: tuple[str,...]; axes: DynamicResponsibilityAxes
    selected_obligations: tuple[str,...]; nonselected_obligations: tuple[str,...]; unresolved_obligations: tuple[str,...]=(); rationale: str=""
    def __post_init__(self):
        if self.selected_candidate_id is not None and self.selected_candidate_id not in self.candidate_ids: raise GovernanceInvariantError("selection outside candidates")
        if tuple(x for x in self.candidate_ids if x != self.selected_candidate_id)!=self.nonselected_candidate_ids: raise GovernanceInvariantError("nonselection not linked to candidates")
        axes=(self.axes.uncertainty,self.axes.impact,self.axes.vulnerability,self.axes.temporality)
        if self.selected_candidate_id is not None and (any(not x for x in axes) or not self.selected_obligations or (self.nonselected_candidate_ids and not self.nonselected_obligations)):
            raise GovernanceInvariantError("responsibility requires dynamic U/I/V/T and selection/nonselection obligations")
@dataclass(frozen=True)
class GovernanceFeedback:
    prior_entry_id: str; gap_state: RevalidationState; choice_state: RevalidationState; responsibility_state: RevalidationState
@dataclass(frozen=True)
class GovernanceDecisionContext:
    flow: CurrentFlowEvidence; gap: GapAssessment; participating_experiences: tuple[ExperienceReengagement,...]; feedback: tuple[GovernanceFeedback,...]
    candidate_ids: tuple[str,...]; responsibility: ResponsibilityJudgment
@dataclass(frozen=True)
class OutcomeObservation:
    description: str; evidence: Mapping[str,Any]; observed_tau: float; realization_ref: str; realization_tau: float; realization_fingerprint: str; post_fingerprint: str
@dataclass(frozen=True)
class JudgmentRevalidation:
    gap_judgment: RevalidationState; reengagement_judgments: tuple[tuple[str,RevalidationState],...]; choice_judgment: RevalidationState; responsibility_judgment: RevalidationState; rationale: str=""
    def __post_init__(self):
        values=(self.gap_judgment,self.choice_judgment,self.responsibility_judgment)+tuple(x[1] for x in self.reengagement_judgments)
        if any(not isinstance(x,RevalidationState) for x in values): raise GovernanceInvariantError("revalidation states must be typed")
@dataclass(frozen=True)
class GovernanceMetrics:
    active_experience_reads:int=0; archive_experience_reads:int=0; candidate_count:int=0; core_exposed_experience_count:int=0
    gap_calls:int=0; reengagement_calls:int=0; responsibility_calls:int=0; core_calls:int=0
    reengagement_candidate_count:int=0; participating_experience_count:int=0; operation_calls:int=0
@dataclass(frozen=True)
class GovernanceProvenance:
    entry_id:str; branch:str; gap:GapAssessment; reengagement_audit:tuple[ExperienceReengagement,...]; responsibility:ResponsibilityJudgment
    revalidation:JudgmentRevalidation; outcome:OutcomeObservation; metrics:GovernanceMetrics
@dataclass(frozen=True)
class GovernanceEpochExecution:
    branch:str; flow:CurrentFlowEvidence; gap:GapAssessment; decision:DecisionExecution; responsibility:ResponsibilityJudgment
    reengagement:tuple[ExperienceReengagement,...]=(); pending:bool=True; outcome:OutcomeObservation|None=None
    revalidation:JudgmentRevalidation|None=None; history_entry:HistoryEntry|None=None; provenance:GovernanceProvenance|None=None; metrics:GovernanceMetrics=field(default_factory=GovernanceMetrics)

class GovernanceHistorySidecar:
    def __init__(self): self._records={}
    def attach(self,h,p):
        if h.entry_id!=p.entry_id or h.entry_id in self._records: raise GovernanceInvariantError("invalid history attachment")
        self._records[h.entry_id]=p
    def get(self,entry_id): return self._records[entry_id]

class _CoreBoundary:
    def __init__(self,owner,branch,allowed): self.o=owner; self.inner=owner.canonical_harness.core; self.branch=branch; self.allowed=allowed
    def open_epoch(self,obs,tau):
        raw=self.inner.open_epoch(obs,tau); self.o.bump(core_calls=1,operation_calls=1,candidate_count=len(raw.possibility_distribution))
        allowed=self.allowed if self.branch=="YES" else frozenset()
        rels=tuple(r for r in raw.relation_elements if r.experience_id in allowed); keys={(r.experience_id,r.relation_element_id) for r in rels}
        recs=tuple(r for r in raw.reconstructions if all((x.source.experience_id,x.source.relation_element_id) in keys for x in r.source_links))
        view=CoreEpochView(rels,raw.possibility_distribution,{k:v for k,v in raw.role_trace_by_relation.items() if k in keys},{k:v for k,v in raw.generated_by_relation.items() if k in keys},recs)
        self.o.bump(core_exposed_experience_count=len({r.experience_id for r in rels})); self.o.after_candidates(view); return view
    def ablate_relation(self,*a): self.o.bump(core_calls=1,operation_calls=1); return self.inner.ablate_relation(*a)
    def ablate_relation_group(self,*a): self.o.bump(core_calls=1,operation_calls=1); return self.inner.ablate_relation_group(*a)
    def realize(self,observation,tau):
        self.o.bump(core_calls=1,operation_calls=1)
        selected=self.o.context.responsibility.selected_candidate_id
        if selected is None: raise GovernanceInvariantError("responsibility did not select a candidate")
        if hasattr(self.inner,"realize_selected"):
            realization=self.inner.realize_selected(observation,tau,selected)
        else:
            realization=self.inner.realize(observation,tau)
        if realization.selected_possibility_id!=selected:
            raise GovernanceInvariantError("responsibility selection mismatch before actuation")
        return realization

class GovernanceHarnessV02:
    def __init__(self,canonical_harness:CanonicalHarnessV11,*,gap_detector,evaluator:IndependentEvaluatorV1,outcome_observer,responsibility_operator,revalidation_operator,reengagement_operator=None,experience_catalog=None,context_port=None,history_sidecar=None):
        self.canonical_harness=canonical_harness; self.gap_detector=gap_detector; self.evaluator=evaluator; self.outcome_observer=outcome_observer
        self.responsibility_operator=responsibility_operator; self.revalidation_operator=revalidation_operator; self.reengagement_operator=reengagement_operator
        self.experience_catalog=experience_catalog; self.context_port=context_port; self.history_sidecar=history_sidecar or GovernanceHistorySidecar()
        self.samples={}; self.feedback=[]; self.pending=None; self.context=None; self._pending_context=None; self.metrics=GovernanceMetrics()
    def bump(self,**kw): self.metrics=replace(self.metrics,**{k:getattr(self.metrics,k)+v for k,v in kw.items()})
    @staticmethod
    def _validate_gap_semantics(value,path="current_reality"):
        forbidden=("archive","history","catalog","reengagement","integrity","fingerprint","seed","scenario","future","raw_actor_id","actor_id")
        if isinstance(value,Mapping):
            for key,item in value.items():
                if not isinstance(key,str): raise GovernanceInvariantError(f"non-text semantic key at {path}")
                if any(token in key.lower() for token in forbidden): raise GovernanceInvariantError(f"forbidden gap semantic at {path}.{key}")
                GovernanceHarnessV02._validate_gap_semantics(item,f"{path}.{key}")
        elif isinstance(value,(tuple,list)):
            for index,item in enumerate(value): GovernanceHarnessV02._validate_gap_semantics(item,f"{path}[{index}]")
        elif value is not None and not isinstance(value,(str,int,float,bool)):
            raise GovernanceInvariantError(f"non-data gap semantic capability at {path}")
    def capture(self,flow,episode):
        tau=float(flow.current_tau()); fp=flow.flow_fingerprint(); reality=deepcopy(dict(flow.current_reality())); self._validate_gap_semantics(reality)
        s=CurrentFlowSample(tau,PresentObservation.from_mapping(flow.present_observation()),reality)
        if float(flow.current_tau())!=tau or flow.flow_fingerprint()!=fp: raise GovernanceInvariantError("flow changed during capture")
        self.samples.setdefault(episode,[]).append(s); return CurrentFlowEvidence(episode,tuple(deepcopy(self.samples[episode]))),FlowIntegrityGuard(tau,fp)
    @staticmethod
    def _assess_gap(detector:PureGapDetector,evidence:CurrentFlowEvidence):
        forbidden=("archive","history","catalog","reengagement","integrity","fingerprint","seed","scenario","future","actor")
        owned=vars(detector) if hasattr(detector,"__dict__") else {}
        leaked=tuple(name for name in owned if any(token in name.lower() for token in forbidden))
        if leaked: raise GovernanceInvariantError(f"gap detector owns forbidden capability: {leaked}")
        assess=getattr(detector,"assess",None)
        if not callable(assess): raise GovernanceInvariantError("gap detector must implement pure assess(evidence)")
        return deepcopy(assess(deepcopy(evidence)))
    @staticmethod
    def integrity(flow,g):
        if float(flow.current_tau())!=g.tau or flow.flow_fingerprint()!=g.fingerprint: raise GovernanceInvariantError("governance mutated real flow")
    def after_candidates(self,view):
        ids=tuple(view.possibility_distribution); empty=ResponsibilityJudgment(ids,None,ids,DynamicResponsibilityAxes(),(),())
        provisional=replace(self.context,candidate_ids=ids,responsibility=empty); self.bump(responsibility_calls=1,operation_calls=1)
        r=deepcopy(self.responsibility_operator.assess(deepcopy(provisional)))
        if not isinstance(r,ResponsibilityJudgment) or r.candidate_ids!=ids: raise GovernanceInvariantError("responsibility not linked to actual candidates")
        self.context=replace(provisional,responsibility=r)
        if self.context_port: self.context_port.bind_governance_context(deepcopy(self.context))
    def execute_decision_epoch(self,flow:PresentFlowPort,*,episode_id="default"):
        if self.pending or self.evaluator.has_pending_relation: raise GovernanceInvariantError("result pending closure")
        self.metrics=GovernanceMetrics(); evidence,guard=self.capture(flow,episode_id); self.bump(gap_calls=1,operation_calls=1)
        gap=self._assess_gap(self.gap_detector,evidence)
        if not isinstance(gap,GapAssessment): raise GovernanceInvariantError("invalid gap")
        self.integrity(flow,guard); audit=()
        if gap.detected:
            if not self.reengagement_operator: raise GovernanceInvariantError("YES requires reengagement")
            self.bump(reengagement_calls=1,archive_experience_reads=1,operation_calls=1); audit=tuple(deepcopy(self.reengagement_operator.assess(deepcopy(evidence),deepcopy(gap),tuple(self.feedback))))
            ids=[x.experience_id for x in audit]
            if len(ids)!=len(set(ids)): raise GovernanceInvariantError("duplicate experience id")
            if audit and not self.experience_catalog: raise GovernanceInvariantError("catalog required")
            if any(not x.experience_id or not x.provenance_ref or (hasattr(self.experience_catalog,"exists") and not self.experience_catalog.exists(x.experience_id)) or not self.experience_catalog.validate(x.experience_id,x.provenance_ref) for x in audit): raise GovernanceInvariantError("invalid experience provenance")
        participating=tuple(x for x in audit if x.participate); self.metrics=replace(self.metrics,active_experience_reads=len(participating),reengagement_candidate_count=len(audit),participating_experience_count=len(participating))
        empty=ResponsibilityJudgment((),None,(),DynamicResponsibilityAxes(),(),())
        self.context=GovernanceDecisionContext(evidence,gap,participating,tuple(self.feedback),(),empty)
        allowed=frozenset(x.experience_id for x in participating)
        boundary=_CoreBoundary(self,"YES" if gap.detected else "NO",allowed); original=self.canonical_harness.core; self.canonical_harness.core=boundary
        if not hasattr(original,"governance_history_scope"):
            self.context=None
            if self.context_port: self.context_port.clear_governance_context()
            raise GovernanceInvariantError("core lacks governance history-capability boundary")
        scope=original.governance_history_scope(allowed)
        try:
            self.integrity(flow,guard)
            with scope: decision=self.canonical_harness.execute_decision_epoch(flow)
            self.evaluator.begin(decision)
        except Exception:
            self.context=None
            raise
        finally:
            self.canonical_harness.core=original
            if self.context_port: self.context_port.clear_governance_context()
        result=GovernanceEpochExecution("YES" if gap.detected else "NO",evidence,gap,decision,self.context.responsibility,audit,metrics=self.metrics)
        self._pending_context=self.context; self.context=None; self.pending=result; return result
    def observe_post(self,flow,*,post_observation=None,post_tau=None):
        if not self.pending: raise GovernanceInvariantError("nothing pending")
        obs=post_observation or PresentObservation.from_mapping(flow.present_observation()); tau=float(flow.current_tau()) if post_tau is None else float(post_tau)
        record=self.evaluator.observe_post(post_observation=obs,post_tau=tau)
        if not record.closed: return self.pending
        outcome=deepcopy(self.outcome_observer.observe_post(self.pending.decision,record,flow)); d=self.pending.decision
        if outcome.realization_ref!=d.realization_ref or outcome.realization_tau!=d.realization_tau or outcome.realization_fingerprint!=d.after_realization_fingerprint or outcome.observed_tau<d.realization_tau or outcome.post_fingerprint!=flow.flow_fingerprint(): raise GovernanceInvariantError("outcome realization mismatch")
        rv=deepcopy(self.revalidation_operator.revalidate(deepcopy(self._pending_context),deepcopy(self.pending.reengagement),deepcopy(d),deepcopy(outcome)))
        if not isinstance(rv,JudgmentRevalidation): raise GovernanceInvariantError("invalid revalidation")
        if tuple(x[0] for x in rv.reengagement_judgments)!=tuple(x.experience_id for x in self.pending.reengagement): raise GovernanceInvariantError("incomplete reengagement revalidation")
        h=record.history_entry; p=GovernanceProvenance(h.entry_id,self.pending.branch,self.pending.gap,self.pending.reengagement,self.pending.responsibility,rv,outcome,self.pending.metrics)
        self.history_sidecar.attach(h,p); self.feedback.append(GovernanceFeedback(h.entry_id,rv.gap_judgment,rv.choice_judgment,rv.responsibility_judgment))
        done=replace(self.pending,pending=False,outcome=outcome,revalidation=rv,history_entry=h,provenance=p)
        self.samples.pop(done.flow.episode_id,None)
        self.pending=None; self.context=None; self._pending_context=None; return done

# Compatibility names for callers of the v0.1/v0.2 package. Semantics are v0.3.
GovernanceHarnessV03 = GovernanceHarnessV02
GovernanceHarnessV01 = GovernanceHarnessV02
