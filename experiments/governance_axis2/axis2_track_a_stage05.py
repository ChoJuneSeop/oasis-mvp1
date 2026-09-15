from __future__ import annotations

import argparse, hashlib, json, sys
from copy import deepcopy
from pathlib import Path

REPO_ROOT=Path(__file__).resolve().parents[2]
CARLA_RUNTIME=REPO_ROOT/".runtime/carla-py312"
if str(CARLA_RUNTIME) not in sys.path: sys.path.insert(0,str(CARLA_RUNTIME))

from research.g3_organic_flow_v1.runtime import OrganicHarness
from research.g3_rpfo_carla_01 import live_runner as rpfo_runner
from research.g3_rpfo_carla_01.live_core import RPFOCARLALiveCore
from research.g3_rpfo_carla_01.resolver import FrontProcessParticipationResolver, RPFOParticipationContributionOperator
from research.g3_organic_carla_01 import gated_runner as base_runner
from research.g3_organic_carla_01.live_runner import build_organic_core as build_legacy_core
from research.governance_reality_gap_v1.contracts import GapStatus, GapTriggeredRecallGate, MaintainCurrentFlow, RealityGapAxis, RealityGapObservation, RealityGapSignature
from research.governance_reality_gap_v1.eligibility import BroadRecallRetriever, ProvenanceRelationEligibilityGate, ReentryAuthorization
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError

PACKAGE=Path(__file__).resolve().parent
PREREG=PACKAGE/"AXIS2_STAGE5_PREREGISTRATION.json"
STAGE4=Path("runs/governance_axis2/track_a_stage04_001/stage04.json")

class GapMediatedRPFOCARLALiveCore(RPFOCARLALiveCore):
    def __init__(self, **kwargs):
        super().__init__(**kwargs); self._pending_gap_access=None; self._active_history_keys=None; self._axis2_trace={}
    def bind_gap_access(self, decision):
        if self._pending_gap_access is not None: raise CoreV11InvariantError("gap access already bound")
        if not isinstance(decision,(MaintainCurrentFlow,ReentryAuthorization)): raise CoreV11InvariantError("recall cannot authorize re-entry")
        self._pending_gap_access=deepcopy(decision)
    def open_current_epoch(self, frame):
        decision=self._pending_gap_access
        if decision is None or decision.revision!=frame.revision or decision.observed_at_tau!=float(frame.tau): raise CoreV11InvariantError("gap decision not bound to current CARLA frame")
        known={self._source_key(e.record.source) for e in super().history_envelopes()}
        requested=set() if isinstance(decision,MaintainCurrentFlow) else set(decision.authorized_source_keys)
        if not requested <= known: raise CoreV11InvariantError("unknown re-entry source")
        self._active_history_keys=frozenset(requested); self._pending_gap_access=None
        return super().open_current_epoch(frame)
    def history_records(self):
        if self._active_history_keys is None: raise CoreV11InvariantError("history view unavailable before gap gate")
        return tuple(r for r in super().history_records() if self._source_key(r.source) in self._active_history_keys)
    def set_axis2_trace(self, trace): self._axis2_trace=deepcopy(trace)
    def responsibility_record(self):
        record=super().responsibility_record(); record["axis2_gap_pipeline"]=deepcopy(self._axis2_trace); return record

def make_core(history=()):
    legacy,closure=build_legacy_core()
    core=GapMediatedRPFOCARLALiveCore(
        assessment_operator=legacy.assessment_operator, verifier=legacy.verifier,
        preference_operator=legacy.integrated_choice.preference_operator,
        resource_allocator=legacy.resource_allocator, relation_builder=legacy.relation_builder,
        candidate_provider=legacy.candidate_provider, reconstruction_operator=legacy.reconstruction_operator,
        responsibility_operator=legacy.responsibility_operator, actuation_operator=legacy.actuation_operator,
        relation_operator=RPFOParticipationContributionOperator(), participation_resolver=FrontProcessParticipationResolver(), history=tuple(history))
    return core,closure

class Axis2OrganicHarness(OrganicHarness):
    def execute_decision_epoch(self, flow, **kwargs):
        frame=flow.capture(); obs=frame.observation
        present=bool(obs.front_present and float(obs.front_closing_mps)>0.0)
        gap=RealityGapObservation(
            f"axis2-gap:{frame.revision}",RealityGapAxis.RELATION,
            GapStatus.PRESENT if present else GapStatus.ABSENT,
            ("current:front-longitudinal",), ("observation:front-present","observation:front-closing-speed") if present else (),
            "observed front relation is longitudinally closing" if present else "no evidenced closing front-relation gap",float(frame.tau))
        signature=RealityGapSignature(frame.revision,float(frame.tau),(gap,))
        decision=GapTriggeredRecallGate().evaluate(signature,relation_terms_by_axis={RealityGapAxis.RELATION:("front-interaction",)} if present else {})
        retrieved=(); authorization=None
        if isinstance(decision,MaintainCurrentFlow): self.core.bind_gap_access(decision)
        else:
            retrieved=BroadRecallRetriever().retrieve(decision,self.core.history_envelopes())
            authorization=ProvenanceRelationEligibilityGate().assess(decision,retrieved); self.core.bind_gap_access(authorization)
        self.core.set_axis2_trace({"gap_present":present,"signature":repr(signature),"recall":repr(decision),"retrieved":[x.source_key for x in retrieved],"eligibility":[] if authorization is None else [vars(x) for x in authorization.assessments],"authorized":[] if authorization is None else authorization.authorized_source_keys})
        return super().execute_decision_epoch(flow,**kwargs)

def verify_inputs(gate_path: Path):
    prereg=json.loads(PREREG.read_text(encoding="utf-8")); gate=json.loads(gate_path.read_text(encoding="utf-8")); stage4=json.loads(STAGE4.read_text(encoding="utf-8"))
    if prereg["empirical_ticks"]!=0 or prereg["post_result_retuning"] is not False: raise CoreV11InvariantError("invalid Axis2 preregistration")
    if gate.get("authorization")!="READY" or stage4.get("status")!="STAGE4_CONFIRMATORY_PASS": raise CoreV11InvariantError("Axis2 Stage5 upstream gate not ready")
    return {"prereg_sha256":hashlib.sha256(PREREG.read_bytes()).hexdigest(),"stage4_sha256":hashlib.sha256(STAGE4.read_bytes()).hexdigest(),"gate_sha256":hashlib.sha256(gate_path.read_bytes()).hexdigest()}

def run_flow(*,gate_path,**kwargs):
    verify_inputs(Path(gate_path)); saved=rpfo_runner._patch(); original_harness=base_runner.OrganicHarness
    original_verify=base_runner._verify_experiment_manifest
    try:
        def compatible_manifest():
            manifest=original_verify()
            if "experiment_source_snapshot_commit" not in manifest:
                manifest=dict(manifest)
                manifest["experiment_source_snapshot_commit"]=manifest["source_snapshot_commit"]
            return manifest
        base_runner.build_organic_core=make_core; base_runner.OrganicHarness=Axis2OrganicHarness
        base_runner._verify_experiment_manifest=compatible_manifest
        return base_runner.run_flow(**kwargs)
    finally:
        base_runner.OrganicHarness=original_harness; base_runner._verify_experiment_manifest=original_verify; rpfo_runner._restore(saved)

def main():
    p=argparse.ArgumentParser(); p.add_argument("--gate",required=True); p.add_argument("--output-root",required=True); p.add_argument("--flow",default="OF-01"); p.add_argument("--attempt",type=int,default=1); p.add_argument("--host",default="127.0.0.1"); p.add_argument("--port",type=int,default=2000); a=p.parse_args()
    run_flow(gate_path=a.gate,flow_id=a.flow,attempt=a.attempt,output_root=a.output_root,host=a.host,port=a.port)
if __name__=="__main__": main()
