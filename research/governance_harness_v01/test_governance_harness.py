from __future__ import annotations
import unittest
from dataclasses import replace
from research.carla_v22_harness_v11.canonical_harness import CanonicalHarnessV11, PresentObservation
from research.carla_v22_harness_v11.independent_evaluator_v1 import IndependentEvaluatorV1
from research.carla_v22_harness_v11.synthetic_dry_run import SyntheticCore, SyntheticFlow
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle
from research.governance_harness_v01.harness import *

class Gap:
    def __init__(self): self.inputs=[]
    def assess(self,flow):
        self.inputs.append(flow)
        assert not hasattr(flow,"flow_fingerprint") and not hasattr(flow,"history")
        detected=len(flow.samples)>1 and flow.samples[-1].observation.ego_speed_mps < flow.samples[-2].observation.ego_speed_mps
        return GapAssessment(detected,progress_anomalies=("slowing",) if detected else (),current_evidence_refs=(f"episode:{flow.episode_id}",))
class Reengage:
    def __init__(self): self.feedback_seen=()
    def assess(self,flow,gap,feedback):
        self.feedback_seen=feedback
        return (ExperienceReengagement("E-old-yield",True,"relevant",provenance_ref="prov:old"),
                ExperienceReengagement("E-mid-merge",False,"exclude",provenance_ref="prov:mid"))
class Catalog:
    def validate(self,e,p): return (e,p) in {("E-old-yield","prov:old"),("E-mid-merge","prov:mid")}
class Responsibility:
    def assess(self,c):
        assert c.candidate_ids
        selected="yield"
        return ResponsibilityJudgment(c.candidate_ids,selected,tuple(x for x in c.candidate_ids if x!=selected),
            DynamicResponsibilityAxes(("sensor confidence",),("collision",),("front actor",),("immediate",)),
            ("verify yield",),("record rejected alternatives",))
class Context:
    def __init__(self): self.bound=[]; self.clears=0
    def bind_governance_context(self,c): self.bound.append(c)
    def clear_governance_context(self): self.clears+=1
class Outcome:
    def observe_post(self,d,record,flow):
        return OutcomeObservation("closed",record.evidence,float(record.evidence["post_tau"]),d.realization_ref,d.realization_tau,d.after_realization_fingerprint,flow.flow_fingerprint())
class Revalidate:
    def revalidate(self,c,audit,d,o):
        return JudgmentRevalidation(RevalidationState.CONFIRMED,
            tuple((x.experience_id,RevalidationState.CONFIRMED if x.participate else RevalidationState.REVISED) for x in audit),
            RevalidationState.CONFIRMED,RevalidationState.CONFIRMED)
class MutableFlow(SyntheticFlow):
    def __init__(self): super().__init__(); self.speed=2.0; self.epoch=200
    def present_observation(self):
        d=super().present_observation(); d["ego_speed_mps"]=self.speed; d["epoch"]=self.epoch; return d
    def next_epoch(self,speed):
        self.apply_count=0; self.speed=speed; self.epoch+=1

def closed_observation(d):
    o=d.observation
    return PresentObservation(o.epoch+1,o.ego_speed_mps,False,0.0,0.0,"none",o.local_heading_error_deg,o.local_density)

class Tests(unittest.TestCase):
    def build(self,flow_gap=None):
        gap=flow_gap or Gap(); re=Reengage(); context=Context(); sidecar=GovernanceHistorySidecar()
        h=GovernanceHarnessV01(CanonicalHarnessV11(SyntheticCore()),gap_detector=gap,
            evaluator=IndependentEvaluatorV1(build_domain_bundle().closure_evaluator),outcome_observer=Outcome(),
            responsibility_operator=Responsibility(),revalidation_operator=Revalidate(),reengagement_operator=re,
            experience_catalog=Catalog(),context_port=context,history_sidecar=sidecar)
        return h,gap,re,context,sidecar
    def test_no_is_pending_has_responsibility_and_blocks_history(self):
        h,_,_,ctx,_=self.build(); flow=MutableFlow()
        p=h.execute_decision_epoch(flow,episode_id="road-1")
        self.assertEqual(p.branch,"NO"); self.assertTrue(p.pending); self.assertIsNone(p.outcome)
        self.assertEqual(p.metrics.archive_experience_reads,0); self.assertEqual(p.metrics.core_exposed_experience_count,0)
        self.assertEqual(p.decision.recorder.relation_elements,()); self.assertEqual(ctx.clears,1)
        done=h.observe_post(flow,post_observation=closed_observation(p.decision),post_tau=flow.current_tau()+.1)
        self.assertFalse(done.pending); self.assertIsNotNone(done.responsibility); self.assertIsNotNone(done.revalidation)
    def test_yes_only_participant_reaches_context_and_core_but_audit_keeps_no(self):
        h,gap,_,ctx,sidecar=self.build(); flow=MutableFlow()
        first=h.execute_decision_epoch(flow,episode_id="road")
        h.observe_post(flow,post_observation=closed_observation(first.decision),post_tau=flow.current_tau()+.1)
        flow.next_epoch(1.0)
        yes=h.execute_decision_epoch(flow,episode_id="road")
        self.assertEqual(yes.branch,"YES"); self.assertEqual([x.experience_id for x in yes.reengagement],["E-old-yield","E-mid-merge"])
        self.assertEqual([x.experience_id for x in ctx.bound[-1].participating_experiences],["E-old-yield"])
        self.assertEqual({r.experience_id for r in yes.decision.recorder.relation_elements},{"E-old-yield"})
        self.assertEqual(yes.metrics.core_exposed_experience_count,1)
        done=h.observe_post(flow,post_observation=closed_observation(yes.decision),post_tau=flow.current_tau()+.1)
        self.assertIs(sidecar.get(done.history_entry.entry_id),done.provenance)
    def test_feedback_enters_next_non_gap_responsibility_context(self):
        h,_,_,ctx,_=self.build(); flow=MutableFlow(); p=h.execute_decision_epoch(flow)
        h.observe_post(flow,post_observation=closed_observation(p.decision),post_tau=flow.current_tau()+.1)
        flow.next_epoch(2.0); h.execute_decision_epoch(flow)
        self.assertEqual(len(ctx.bound[-1].feedback),1)
    def test_duplicate_and_bad_provenance_rejected(self):
        h,_,_,_,_=self.build(); flow=MutableFlow()
        h.gap_detector.assess=lambda f: GapAssessment(True)
        h.reengagement_operator.assess=lambda *a:(ExperienceReengagement("x",True,"",provenance_ref="bad"),)*2
        with self.assertRaises(GovernanceInvariantError): h.execute_decision_epoch(flow)
    def test_open_post_stays_pending(self):
        h,_,_,_,_=self.build(); flow=MutableFlow(); p=h.execute_decision_epoch(flow)
        same=h.observe_post(flow,post_observation=p.decision.observation,post_tau=999)
        self.assertTrue(same.pending)
    def test_typed_revalidation_rejects_free_text(self):
        with self.assertRaises(ValueError): RevalidationState("maybe")

if __name__=="__main__": unittest.main()
