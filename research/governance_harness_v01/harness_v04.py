"""Governance v0.4 additive sidecar over the unchanged Canonical Harness."""
from __future__ import annotations

import time
import tracemalloc
from copy import deepcopy
from dataclasses import dataclass, field, replace
from enum import Enum
from typing import Any, Mapping

from research.carla_v22_harness_v11.canonical_harness import (
    APPROVED_OBSERVATION_FIELDS, CanonicalHarnessV11, CoreEpochView,
    DecisionExecution, PresentObservation,
)
from research.g3_2_sidecar.history import HistoryEntry
from research.governance_harness_v01.harness import (
    DynamicResponsibilityAxes, ExperienceReengagement, GapAssessment,
    GovernanceInvariantError, JudgmentRevalidation, ResponsibilityJudgment,
    RevalidationState,
)
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle


class GovernanceState(str, Enum):
    EPISODE_OPEN="EPISODE_OPEN"; GAP_ASSESSED="GAP_ASSESSED"
    CURRENT_ONLY="CURRENT_ONLY"; REENGAGEMENT_ASSESSED="REENGAGEMENT_ASSESSED"
    POSSIBILITIES_READY="POSSIBILITIES_READY"; RESPONSIBILITY_BOUND="RESPONSIBILITY_BOUND"
    REALIZED="REALIZED"; OUTCOME_PENDING="OUTCOME_PENDING"
    CLOSURE_PREPARED="CLOSURE_PREPARED"; REVALIDATED="REVALIDATED"
    COMMITTED="COMMITTED"; EPISODE_CLOSED="EPISODE_CLOSED"
    ABORTED_PRE_REALIZATION="ABORTED_PRE_REALIZATION"; RECOVERY_PENDING="RECOVERY_PENDING"


class AdmissionState(str, Enum):
    ADMITTED="ADMITTED"; BLOCKED="BLOCKED"


@dataclass(frozen=True)
class AdmissionResult:
    state: AdmissionState
    reasons: tuple[str,...]
    real_experiment: str


@dataclass(frozen=True)
class AtomicFlowSnapshot:
    tau: float
    observation: PresentObservation
    current_reality: Mapping[str,Any]
    version: int
    fingerprint: str
    relation_id: str
    realization_ref: str|None = None


@dataclass(frozen=True)
class PresentSample:
    tau: float
    observation: PresentObservation
    current_reality: Mapping[str,Any]


@dataclass(frozen=True)
class PresentFlowEvidence:
    samples: tuple[PresentSample,...]


@dataclass(frozen=True)
class CurrentFlowGapRule:
    """Declarative rule: no user callable executes inside the gap boundary."""
    speed_drop_threshold: float = .5


@dataclass(frozen=True)
class CompletedExperience:
    experience_id: str
    relation_id: str
    provenance_ref: str
    completed_tau: float
    content: Mapping[str,Any]
    byte_size: int


@dataclass(frozen=True)
class ParticipatingExperienceView:
    items: tuple[CompletedExperience,...]
    feedback: tuple[GovernanceFeedbackV04,...] = ()


@dataclass(frozen=True)
class GovernanceFeedbackV04:
    prior_entry_id: str
    relation_id: str
    provenance_refs: tuple[str,...]
    gap_state: RevalidationState
    choice_state: RevalidationState
    responsibility_state: RevalidationState
    experience_states: tuple[tuple[str,RevalidationState],...]


@dataclass(frozen=True)
class GovernanceMetricsV04:
    archive_access_count:int=0; records_scanned:int=0; archive_bytes_read:int=0
    reengagement_candidate_count:int=0; participating_count:int=0; core_exposed_count:int=0
    stored_experience_count:int=0; active_experience_count:int=0
    gap_op_calls:int=0; reengagement_op_calls:int=0; responsibility_op_calls:int=0
    core_op_calls:int=0; total_op_calls:int=0
    cpu_time_seconds:float=0.0; wall_time_seconds:float=0.0; peak_memory_bytes:int=0


@dataclass(frozen=True)
class DecisionContextV04:
    relation_id:str; flow:PresentFlowEvidence; gap:GapAssessment
    participating_experiences:tuple[ExperienceReengagement,...]
    feedback:tuple[GovernanceFeedbackV04,...]
    candidate_ids:tuple[str,...]; responsibility:ResponsibilityJudgment


@dataclass(frozen=True)
class AuthoritativeOutcome:
    relation_id:str; realization_ref:str; selected_candidate_id:str
    decision_tau:float; realization_tau:float; post_tau:float
    pre_version:int; realization_version:int; post_version:int
    pre_fingerprint:str; realization_fingerprint:str; post_fingerprint:str
    post_observation:PresentObservation; closure_method:str
    closure_evidence:Mapping[str,Any]


@dataclass(frozen=True)
class PreparedClosure:
    entry_id:str; post:AtomicFlowSnapshot; outcome:AuthoritativeOutcome
    closure_method:str; closure_evidence:Mapping[str,Any]


@dataclass(frozen=True)
class GovernanceProvenanceV04:
    entry_id:str; relation_id:str; branch:str; original_gap:GapAssessment
    original_reengagement:tuple[ExperienceReengagement,...]
    original_responsibility:ResponsibilityJudgment
    revalidation:JudgmentRevalidation; outcome:AuthoritativeOutcome
    metrics:GovernanceMetricsV04; prior_provenance_refs:tuple[str,...]


@dataclass(frozen=True)
class GovernanceExecutionV04:
    relation_id:str; branch:str; flow:PresentFlowEvidence; gap:GapAssessment
    decision:DecisionExecution; responsibility:ResponsibilityJudgment
    reengagement:tuple[ExperienceReengagement,...]; metrics:GovernanceMetricsV04
    pending:bool=True; outcome:AuthoritativeOutcome|None=None
    revalidation:JudgmentRevalidation|None=None; history_entry:HistoryEntry|None=None
    provenance:GovernanceProvenanceV04|None=None


class HistoryAccessPort:
    """The only archive owner visible to v0.4 Governance; every read is metered."""
    def __init__(self, experiences=()):
        self._experiences=list(experiences); self._history:dict[str,HistoryEntry]={}
        ids=[x.experience_id for x in self._experiences]
        if len(ids)!=len(set(ids)): raise GovernanceInvariantError("duplicate completed experience")
        if any(not x.provenance_ref for x in self._experiences): raise GovernanceInvariantError("invalid experience provenance")
        self._provenance={x.experience_id:x.provenance_ref for x in self._experiences}
        self._feedback:list[GovernanceFeedbackV04]=[]
        self.archive_access_count=0; self.records_scanned=0; self.bytes_read=0
        self.committed_count=0
    @property
    def stored_experience_count(self): return len(self._experiences)+len(self._history)
    def search(self, relation_id:str, decision_tau:float):
        self.archive_access_count+=1; self.records_scanned+=len(self._experiences)
        found=tuple(x for x in self._experiences if x.relation_id==relation_id and x.completed_tau<decision_tau)
        self.bytes_read+=sum(x.byte_size for x in self._experiences)
        return deepcopy(found)
    def validate(self,experience:CompletedExperience):
        return self._provenance.get(experience.experience_id)==experience.provenance_ref
    def contextual_feedback(self,relation_id:str):
        return tuple(deepcopy(x) for x in self._feedback if x.relation_id==relation_id)
    def atomic_commit(self,history,completed,feedback,sidecar,prepared_sidecar):
        if history.entry_id in self._history: raise GovernanceInvariantError("closure already committed")
        old_history=dict(self._history); old_feedback=list(self._feedback); old_count=self.committed_count
        if not callable(getattr(sidecar,"snapshot",None)) or not callable(getattr(sidecar,"restore",None)):
            raise GovernanceInvariantError("sidecar lacks transactional snapshot/restore")
        sidecar_state=sidecar.snapshot(); old_experiences=list(self._experiences); old_provenance=dict(self._provenance)
        try:
            sidecar.commit(prepared_sidecar)
            self._history[history.entry_id]=history; self._experiences.append(completed)
            self._provenance[completed.experience_id]=completed.provenance_ref
            self._feedback.append(feedback); self.committed_count+=1
        except Exception:
            self._history=old_history; self._feedback=old_feedback; self.committed_count=old_count
            self._experiences=old_experiences; self._provenance=old_provenance; sidecar.restore(sidecar_state)
            raise


class TransactionalGovernanceSidecar:
    def __init__(self): self._records={}
    def prepare(self,history,provenance):
        if history.entry_id!=provenance.entry_id or history.entry_id in self._records:
            raise GovernanceInvariantError("invalid sidecar preparation")
        return (history.entry_id,deepcopy(provenance))
    def commit(self,prepared): self._records[prepared[0]]=prepared[1]
    def snapshot(self): return dict(self._records)
    def restore(self,state): self._records=dict(state)
    def get(self,entry_id): return self._records[entry_id]


class _SnapshotFlow:
    def __init__(self,host,snapshot): self.host=host; self.snapshot=snapshot; self.applied=False; self.realization_ref=None
    def current_tau(self): return self.snapshot.tau if not self.applied else self.host.atomic_current_snapshot().tau
    def present_observation(self):
        o=self.snapshot.observation
        return {name:getattr(o,name) for name in APPROVED_OBSERVATION_FIELDS}
    def current_reality(self): return deepcopy(dict(self.snapshot.current_reality))
    def flow_fingerprint(self): return self.snapshot.fingerprint if not self.applied else self.host.atomic_current_snapshot().fingerprint
    def apply_single_actuation(self,actuation):
        if self.applied: raise GovernanceInvariantError("more than one real actuation")
        self.applied=True; self.realization_ref=self.host.apply_single_actuation(actuation); return self.realization_ref


class _CoreBoundary:
    def __init__(self,harness,core,view): self.h=harness; self.core=core; self.view=view
    def open_epoch(self,observation,tau):
        result=self.core.open_epoch(observation,tau,self.view)
        if not isinstance(result,CoreEpochView): raise GovernanceInvariantError("invalid Core epoch view")
        self.h.state=GovernanceState.POSSIBILITIES_READY
        ids=tuple(result.possibility_distribution)
        empty=ResponsibilityJudgment(ids,None,ids,DynamicResponsibilityAxes(),(),())
        provisional=replace(self.h._context,candidate_ids=ids,responsibility=empty)
        self.h._op("responsibility")
        judgment=deepcopy(self.h.responsibility_operator.assess(deepcopy(provisional)))
        if not isinstance(judgment,ResponsibilityJudgment) or judgment.candidate_ids!=ids or judgment.selected_candidate_id is None:
            raise GovernanceInvariantError("responsibility is not bound to actual possibilities")
        self.h._context=replace(provisional,responsibility=judgment)
        self.h.state=GovernanceState.RESPONSIBILITY_BOUND
        if self.h.context_port: self.h.context_port.bind_governance_context(deepcopy(self.h._context))
        return result
    def ablate_relation(self,*args): self.h._op("core"); return self.core.ablate_relation(*args)
    def ablate_relation_group(self,*args): self.h._op("core"); return self.core.ablate_relation_group(*args)
    def realize(self,observation,tau):
        selected=self.h._context.responsibility.selected_candidate_id; self.h._op("core")
        result=self.core.realize_selected(observation,tau,selected)
        if result.selected_possibility_id!=selected: raise GovernanceInvariantError("selected port violated causal binding")
        return result


class GovernanceHarnessV04:
    REQUIRED_CONTRACT=frozenset({"history_port_only","present_only","no_future","pure_probes","single_realization","closure","atomic_capture"})
    def __init__(self,*,core,history_port:HistoryAccessPort,gap_rule:CurrentFlowGapRule,
        reengagement_operator,responsibility_operator,revalidation_operator,context_port=None,
        history_sidecar=None,commit_hook=None):
        self.core=core; self.history_port=history_port; self.gap_rule=gap_rule
        self.reengagement_operator=reengagement_operator; self.responsibility_operator=responsibility_operator
        self.revalidation_operator=revalidation_operator; self.context_port=context_port
        self.history_sidecar=history_sidecar or TransactionalGovernanceSidecar()
        self.closure_evaluator=build_domain_bundle().closure_evaluator
        self.commit_hook=commit_hook; self.samples={}; self.pending=None; self._context=None
        self._prepared=None; self._closed_ids=set(); self.state=GovernanceState.EPISODE_OPEN
        self._real_actuation_latched=False; self._actuation_orphaned=False
        self.metrics=GovernanceMetricsV04(); self.validate_gap_rule(gap_rule)
        self.admission=self._admit(core)
    @classmethod
    def validate_gap_rule(cls,rule):
        if type(rule) is not CurrentFlowGapRule:
            raise GovernanceInvariantError("experimental gap boundary accepts only declarative CurrentFlowGapRule")
        if rule.speed_drop_threshold<0: raise GovernanceInvariantError("invalid gap threshold")
        return True
    @classmethod
    def _admit(cls,core):
        reasons=[]; contract=getattr(core,"experimental_contract",{})
        reasons.extend(sorted(x for x in cls.REQUIRED_CONTRACT if contract.get(x) is not True))
        if not callable(getattr(core,"realize_selected",None)): reasons.append("missing realize_selected")
        forbidden=("archive","history","catalog","future","scenario","seed")
        for owner in (core,type(core)):
            for name in vars(owner):
                if any(token in name.lower() for token in forbidden): reasons.append(f"Core owns forbidden capability: {name}")
        state=AdmissionState.BLOCKED if reasons else AdmissionState.ADMITTED
        # This repository contains no frozen live-runtime proof. Contract admission
        # never promotes a synthetic component to real experimental evidence.
        real="BLOCKED"; reasons.append("live Core/runtime evidence not verified")
        return AdmissionResult(state,tuple(dict.fromkeys(reasons)),real)
    def _op(self,kind):
        key={"gap":"gap_op_calls","reengagement":"reengagement_op_calls","responsibility":"responsibility_op_calls","core":"core_op_calls"}[kind]
        self.metrics=replace(self.metrics,**{key:getattr(self.metrics,key)+1,"total_op_calls":self.metrics.total_op_calls+1})
    @staticmethod
    def _semantic_reality(value,path="current_reality"):
        forbidden=("archive","history","catalog","reengagement","integrity","fingerprint","seed","scenario","future","actor","topology","label","ground_truth")
        if isinstance(value,Mapping):
            for k,v in value.items():
                if not isinstance(k,str) or any(t in k.lower() for t in forbidden): raise GovernanceInvariantError(f"forbidden gap semantic: {path}.{k}")
                GovernanceHarnessV04._semantic_reality(v,f"{path}.{k}")
        elif isinstance(value,(list,tuple)):
            for i,v in enumerate(value): GovernanceHarnessV04._semantic_reality(v,f"{path}[{i}]")
        elif value is not None and not isinstance(value,(str,int,float,bool)):
            raise GovernanceInvariantError(f"non-data gap semantic: {path}")
    def _snapshot(self,flow):
        snap=flow.atomic_current_snapshot()
        if not isinstance(snap,AtomicFlowSnapshot): raise GovernanceInvariantError("host must return AtomicFlowSnapshot")
        self._semantic_reality(snap.current_reality)
        if flow.current_flow_version()!=snap.version: raise GovernanceInvariantError("torn current-flow snapshot")
        if not snap.relation_id: raise GovernanceInvariantError("snapshot lacks relation identity")
        return deepcopy(snap)
    def capture_current(self,flow,relation_id):
        snap=self._snapshot(flow)
        if snap.relation_id!=relation_id: raise GovernanceInvariantError("host relation mismatch")
        sample=PresentSample(snap.tau,snap.observation,deepcopy(dict(snap.current_reality)))
        self.samples.setdefault(relation_id,[]).append(sample); self.state=GovernanceState.EPISODE_OPEN
        return PresentFlowEvidence(tuple(deepcopy(self.samples[relation_id]))),snap
    def _gap(self,evidence):
        self._op("gap"); samples=evidence.samples; detected=False
        if len(samples)>1:
            detected=samples[-2].observation.ego_speed_mps-samples[-1].observation.ego_speed_mps>=self.gap_rule.speed_drop_threshold
        return GapAssessment(detected,progress_anomalies=("speed-drop",) if detected else (),current_evidence_refs=(f"sample:{len(samples)}",))
    def execute_decision_epoch(self,flow,*,relation_id):
        if self.admission.state is AdmissionState.BLOCKED: raise GovernanceInvariantError("Core experiment admission blocked")
        if self._real_actuation_latched: raise GovernanceInvariantError("real actuation already occurred; only recovery/finalization is allowed")
        if self.pending is not None: raise GovernanceInvariantError("result pending closure")
        cpu=time.process_time(); wall=time.perf_counter(); tracemalloc.start()
        start_access=self.history_port.archive_access_count; start_scan=self.history_port.records_scanned; start_bytes=self.history_port.bytes_read
        self.metrics=GovernanceMetricsV04(stored_experience_count=self.history_port.stored_experience_count)
        try:
            evidence,pre=self.capture_current(flow,relation_id)
            gap=self._gap(evidence); self.state=GovernanceState.GAP_ASSESSED
            audit=(); participating_records=(); feedback=self.history_port.contextual_feedback(relation_id)
            if gap.detected:
                self.state=GovernanceState.REENGAGEMENT_ASSESSED; candidates=self.history_port.search(relation_id,pre.tau); self._op("reengagement")
                raw=tuple(deepcopy(self.reengagement_operator.assess(deepcopy(evidence),deepcopy(gap),deepcopy(candidates),deepcopy(feedback))))
                candidate_ids=[x.experience_id for x in candidates]
                if len(candidate_ids)!=len(set(candidate_ids)) or any(not self.history_port.validate(x) for x in candidates):
                    raise GovernanceInvariantError("archive returned invalid completed experience")
                by_id={x.experience_id:x for x in candidates}; ids=[x.experience_id for x in raw]
                if len(ids)!=len(set(ids)): raise GovernanceInvariantError("duplicate reengagement candidate")
                if set(ids)!=set(candidate_ids): raise GovernanceInvariantError("every candidate requires a participation decision")
                if any(x.experience_id not in by_id or not x.provenance_ref or by_id[x.experience_id].provenance_ref!=x.provenance_ref or by_id[x.experience_id].completed_tau>=pre.tau for x in raw):
                    raise GovernanceInvariantError("invalid completed-experience provenance")
                audit=raw; participating_records=tuple(by_id[x.experience_id] for x in audit if x.participate)
            else: self.state=GovernanceState.CURRENT_ONLY
            participating=tuple(x for x in audit if x.participate)
            empty=ResponsibilityJudgment((),None,(),DynamicResponsibilityAxes(),(),())
            self._context=DecisionContextV04(relation_id,evidence,gap,participating,feedback,(),empty)
            view=ParticipatingExperienceView(deepcopy(participating_records),deepcopy(feedback))
            canonical=CanonicalHarnessV11(_CoreBoundary(self,self.core,view)); adapter=_SnapshotFlow(flow,pre); self._op("core")
            try: decision=canonical.execute_decision_epoch(adapter)
            except Exception:
                if adapter.applied:
                    self.state=GovernanceState.RECOVERY_PENDING; self._actuation_orphaned=True; self._real_actuation_latched=True
                raise
            self.state=GovernanceState.REALIZED; self._real_actuation_latched=True; self._pre_snapshot=pre
            preliminary=GovernanceExecutionV04(relation_id,"YES" if gap.detected else "NO",evidence,gap,decision,
                self._context.responsibility,audit,self.metrics)
            self.pending=preliminary
            try: realization=self._snapshot(flow)
            except Exception:
                self.state=GovernanceState.RECOVERY_PENDING
                raise
            if (not decision.realization_ref or decision.tau!=pre.tau or decision.before_fingerprint!=pre.fingerprint
                or realization.version<=pre.version or decision.after_realization_fingerprint!=realization.fingerprint
                or realization.relation_id!=relation_id or realization.realization_ref!=decision.realization_ref):
                raise GovernanceInvariantError("unbound realization")
            self.metrics=replace(self.metrics,
                archive_access_count=self.history_port.archive_access_count-start_access,
                records_scanned=self.history_port.records_scanned-start_scan,
                archive_bytes_read=self.history_port.bytes_read-start_bytes,
                reengagement_candidate_count=len(audit),participating_count=len(participating),
                core_exposed_count=len(view.items),active_experience_count=len(view.items))
            _,peak=tracemalloc.get_traced_memory()
            self.metrics=replace(self.metrics,cpu_time_seconds=time.process_time()-cpu,
                wall_time_seconds=time.perf_counter()-wall,peak_memory_bytes=peak)
            result=GovernanceExecutionV04(relation_id,"YES" if gap.detected else "NO",evidence,gap,decision,
                self._context.responsibility,audit,self.metrics)
            self.pending=result; self._realization_snapshot=realization
            self.state=GovernanceState.OUTCOME_PENDING
            return result
        except Exception:
            self.state=GovernanceState.RECOVERY_PENDING if self._real_actuation_latched else GovernanceState.ABORTED_PRE_REALIZATION
            raise
        finally:
            tracemalloc.stop()
            if self.context_port: self.context_port.clear_governance_context()
            if self.pending is None: self._context=None
    def prepare_closure(self,flow):
        if self.pending is None: raise GovernanceInvariantError("nothing pending")
        post=self._snapshot(flow); d=self.pending.decision
        if (post.tau<d.realization_tau or post.version<=self._realization_snapshot.version
            or post.relation_id!=self.pending.relation_id or post.realization_ref!=d.realization_ref):
            raise GovernanceInvariantError("post observation is not after realization")
        closure=self.closure_evaluator.evaluate(realized_observation=d.observation,post_observation=post.observation,
            selected_possibility_id=d.realization.selected_possibility_id)
        if not closure.closed: return None
        outcome=AuthoritativeOutcome(self.pending.relation_id,d.realization_ref,d.realization.selected_possibility_id,
            d.tau,d.realization_tau,post.tau,self._pre_snapshot.version,self._realization_snapshot.version,post.version,
            d.before_fingerprint,d.after_realization_fingerprint,post.fingerprint,post.observation,closure.method,deepcopy(dict(closure.evidence)))
        if outcome.realization_fingerprint!=self._realization_snapshot.fingerprint or outcome.selected_candidate_id!=self.pending.responsibility.selected_candidate_id:
            raise GovernanceInvariantError("outcome authenticity mismatch")
        prepared=PreparedClosure(f"CE:{self.pending.relation_id}:{d.observation.epoch}:{d.tau}",post,outcome,closure.method,deepcopy(dict(closure.evidence)))
        self._prepared=prepared; self.state=GovernanceState.CLOSURE_PREPARED; return prepared
    def observe_post(self,flow):
        try:
            prepared=self.prepare_closure(flow)
            if prepared is None: return self.pending
            return self._finalize_prepared()
        except Exception: self.state=GovernanceState.RECOVERY_PENDING; raise
    def _validate_revalidation(self,rv):
        if not isinstance(rv,JudgmentRevalidation): raise GovernanceInvariantError("invalid revalidation")
        expected=tuple(x.experience_id for x in self.pending.reengagement)
        actual=tuple(x[0] for x in rv.reengagement_judgments)
        if actual!=expected: raise GovernanceInvariantError("incomplete participation/nonparticipation revalidation")
    def _finalize_prepared(self):
        if self._prepared is None or self.pending is None: raise GovernanceInvariantError("no prepared closure")
        p=self._prepared; d=self.pending.decision
        rv=deepcopy(self.revalidation_operator.revalidate(deepcopy(self._context),deepcopy(self.pending.reengagement),deepcopy(d),deepcopy(p.outcome)))
        self._validate_revalidation(rv); self.state=GovernanceState.REVALIDATED
        history=d.recorder.complete_history_entry(entry_id=p.entry_id,realized_tau=d.realization_tau,outcome_tau=p.post.tau,
            relation_end_tau=p.post.tau,selected_possibility_id=d.realization.selected_possibility_id,
            realization_ref=d.realization_ref,realization_count=1,outcome_description="authoritative relation-process closure",
            closure_method=p.closure_method,closure_evidence=p.closure_evidence)
        prior=tuple(x.prior_entry_id for x in self._context.feedback)
        provenance=GovernanceProvenanceV04(history.entry_id,self.pending.relation_id,self.pending.branch,self.pending.gap,
            self.pending.reengagement,self.pending.responsibility,rv,p.outcome,self.pending.metrics,prior)
        feedback=GovernanceFeedbackV04(history.entry_id,self.pending.relation_id,
            tuple(x.provenance_ref for x in self.pending.reengagement),rv.gap_judgment,rv.choice_judgment,
            rv.responsibility_judgment,rv.reengagement_judgments)
        prepared_sidecar=self.history_sidecar.prepare(history,provenance)
        if self.commit_hook: self.commit_hook.before_commit(history,provenance)
        completed=CompletedExperience(history.entry_id,self.pending.relation_id,f"gov:{history.entry_id}",history.relation_end_tau,
            {"history_entry_id":history.entry_id,"selected":history.selected_possibility_id},len(repr(history).encode("utf-8")))
        self.history_port.atomic_commit(history,completed,feedback,self.history_sidecar,prepared_sidecar)
        done=replace(self.pending,pending=False,outcome=p.outcome,revalidation=rv,history_entry=history,provenance=provenance)
        self._closed_ids.add(history.entry_id); self.state=GovernanceState.COMMITTED
        self.samples.pop(done.relation_id,None); self.pending=None; self._prepared=None; self._context=None
        self._real_actuation_latched=False; self._actuation_orphaned=False
        self.state=GovernanceState.EPISODE_CLOSED
        return done
    def retry_finalization(self):
        if self.state is not GovernanceState.RECOVERY_PENDING: raise GovernanceInvariantError("not recovery pending")
        try: return self._finalize_prepared()
        except Exception: self.state=GovernanceState.RECOVERY_PENDING; raise
    def commit_closure(self,entry_id):
        if entry_id in self._closed_ids: raise GovernanceInvariantError("closure already committed")
        if self._prepared is None or self._prepared.entry_id!=entry_id: raise GovernanceInvariantError("closure is not prepared")
        try: return self._finalize_prepared()
        except Exception: self.state=GovernanceState.RECOVERY_PENDING; raise
