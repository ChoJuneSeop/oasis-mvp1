from __future__ import annotations

import unittest
from contextlib import contextmanager
from dataclasses import replace

from research.carla_v22_harness_v11.canonical_harness import CanonicalHarnessV11, CoreEpochView, PresentObservation, Realization, VehicleActuation
from research.carla_v22_harness_v11.independent_evaluator_v1 import IndependentEvaluatorV1
from research.carla_v22_harness_v11.synthetic_dry_run import SyntheticCore
from research.governance_harness_v01.harness import *
from research.governance_harness_v01.test_governance_harness import Catalog, Context, Gap, MutableFlow, Outcome, Reengage, Responsibility, Revalidate, closed_observation
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle


class CanaryCore(SyntheticCore):
    """Records semantic history access before an output can be filtered."""
    def __init__(self):
        super().__init__(); self.allowed = None; self.history_reads = []
    def open_epoch(self, observation, tau):
        self.history_reads.append(self.allowed)
        if self.allowed is None:
            raise AssertionError("core received unrestricted history capability")
        raw = super().open_epoch(observation, tau)
        keep = frozenset(self.allowed)
        rels = tuple(x for x in raw.relation_elements if x.experience_id in keep)
        keys = {(x.experience_id, x.relation_element_id) for x in rels}
        return CoreEpochView(rels, raw.possibility_distribution,
            {k:v for k,v in raw.role_trace_by_relation.items() if k in keys},
            {k:v for k,v in raw.generated_by_relation.items() if k in keys}, ())
    @contextmanager
    def governance_history_scope(self, allowed):
        old=self.allowed; self.allowed=frozenset(allowed)
        try: yield
        finally: self.allowed=old


class AttackTests(unittest.TestCase):
    def build(self, *, core=None, gap=None, reengage=None, responsibility=None, revalidate=None):
        context=Context(); sidecar=GovernanceHistorySidecar()
        h=GovernanceHarnessV02(CanonicalHarnessV11(core or SyntheticCore()),gap_detector=gap or Gap(),
            evaluator=IndependentEvaluatorV1(build_domain_bundle().closure_evaluator),outcome_observer=Outcome(),
            responsibility_operator=responsibility or Responsibility(),revalidation_operator=revalidate or Revalidate(),
            reengagement_operator=reengage or Reengage(),experience_catalog=Catalog(),context_port=context,history_sidecar=sidecar)
        return h,context,sidecar

    def close(self,h,p,flow): return h.observe_post(flow,post_observation=closed_observation(p.decision),post_tau=flow.current_tau()+.1)

    def test_inv_01_02_03_gap_gets_only_full_semantic_trace(self):
        class Detector:
            def __init__(self): self.seen=[]
            def assess(self,e):
                self.seen.append(e)
                forbidden=("archive","history","seed","scenario","actor_id","fingerprint","flow_fingerprint")
                self.assert_clean=all(not hasattr(e,x) for x in forbidden)
                return GapAssessment(len(e.samples)>1 and e.samples[-1].observation.ego_speed_mps<e.samples[-2].observation.ego_speed_mps)
        d=Detector(); h,_,_=self.build(gap=d); f=MutableFlow(); h.capture(f,"x")
        f.next_epoch(1.0); p=h.execute_decision_epoch(f,episode_id="x")
        self.assertTrue(d.assert_clean); self.assertEqual(len(d.seen[-1].samples),2); self.assertTrue(p.gap.detected)

    def test_inv_04_real_flow_change_causes_no_to_yes(self):
        h,_,_=self.build(); f=MutableFlow(); h.capture(f,"r")
        f.next_epoch(.5); yes=h.execute_decision_epoch(f,episode_id="r"); self.assertEqual(yes.branch,"YES")

    def test_inv_05_06_no_never_calls_archive_operator(self):
        class Bomb:
            def assess(self,*a): raise AssertionError("archive touched on NO")
        h,_,_=self.build(reengage=Bomb()); p=h.execute_decision_epoch(MutableFlow()); self.assertEqual(p.metrics.archive_experience_reads,0)

    def test_inv_05_07_core_history_capability_is_narrowed_before_open(self):
        core=CanaryCore(); h,_,_=self.build(core=core); p=h.execute_decision_epoch(MutableFlow())
        self.assertEqual(core.history_reads,[frozenset()]); self.assertEqual(p.metrics.core_exposed_experience_count,0)

    def test_inv_07_08_nonparticipant_never_reaches_core_but_audit_keeps_it(self):
        core=CanaryCore(); h,ctx,_=self.build(core=core); f=MutableFlow(); h.capture(f,"r"); f.next_epoch(1)
        p=h.execute_decision_epoch(f,episode_id="r"); self.assertEqual(core.history_reads[-1],frozenset({"E-old-yield"})); self.assertEqual(len(p.reengagement),2); self.assertEqual(len(ctx.bound[-1].participating_experiences),1)

    def test_inv_09_responsibility_after_distribution(self):
        order=[]
        class C(SyntheticCore):
            def open_epoch(self,*a): order.append("possibility"); return super().open_epoch(*a)
        class R(Responsibility):
            def assess(self,c): order.append("responsibility"); self.assertTrue=bool(c.candidate_ids); return super().assess(c)
        h,_,_=self.build(core=C(),responsibility=R()); h.execute_decision_epoch(MutableFlow()); self.assertEqual(order[:2],["possibility","responsibility"])

    def test_inv_10_scalar_or_empty_uvit_is_rejected(self):
        class R:
            def assess(self,c): return ResponsibilityJudgment(c.candidate_ids,"yield",tuple(x for x in c.candidate_ids if x!="yield"),DynamicResponsibilityAxes(),(),())
        h,_,_=self.build(responsibility=R());
        with self.assertRaises(GovernanceInvariantError): h.execute_decision_epoch(MutableFlow())

    def test_inv_11_single_realization(self):
        h,_,_=self.build(); f=MutableFlow(); h.execute_decision_epoch(f); self.assertEqual(f.apply_count,1)
        with self.assertRaises(GovernanceInvariantError): h.execute_decision_epoch(f)

    def test_inv_12_14_pending_has_no_revalidation_or_history(self):
        class RV(Revalidate):
            def __init__(self): self.calls=0
            def revalidate(self,*a): self.calls+=1; return super().revalidate(*a)
        rv=RV(); h,_,_=self.build(revalidate=rv); p=h.execute_decision_epoch(MutableFlow()); self.assertEqual(rv.calls,0); self.assertIsNone(p.history_entry)

    def test_inv_13_mismatched_outcome_is_rejected(self):
        class Bad(Outcome):
            def observe_post(self,d,r,f): return replace(super().observe_post(d,r,f),realization_ref="wrong")
        h,_,_=self.build(); h.outcome_observer=Bad(); f=MutableFlow(); p=h.execute_decision_epoch(f)
        with self.assertRaises(GovernanceInvariantError): self.close(h,p,f)

    def test_inv_15_requires_exact_complete_revalidation(self):
        class RV(Revalidate):
            def revalidate(self,*a): return JudgmentRevalidation(RevalidationState.CONFIRMED,(),RevalidationState.CONFIRMED,RevalidationState.CONFIRMED)
        h,_,_=self.build(revalidate=RV()); f=MutableFlow(); h.capture(f,"r"); f.next_epoch(1); p=h.execute_decision_epoch(f,episode_id="r")
        with self.assertRaises(GovernanceInvariantError): self.close(h,p,f)

    def test_inv_16_original_judgments_retained_in_sidecar(self):
        h,_,s=self.build(); f=MutableFlow(); p=h.execute_decision_epoch(f); original=p.gap; done=self.close(h,p,f); self.assertEqual(s.get(done.history_entry.entry_id).gap,original)

    def test_inv_17_feedback_reaches_later_related_epoch(self):
        h,ctx,_=self.build(); f=MutableFlow(); p=h.execute_decision_epoch(f); self.close(h,p,f); f.next_epoch(2); h.execute_decision_epoch(f); self.assertEqual(len(ctx.bound[-1].feedback),1)

    def test_inv_18_context_cleared_on_core_failure(self):
        class C(SyntheticCore):
            def realize(self,*a): raise RuntimeError("boom")
        h,ctx,_=self.build(core=C());
        with self.assertRaises(RuntimeError): h.execute_decision_epoch(MutableFlow())
        self.assertIsNone(h.context); self.assertEqual(ctx.clears,1)

    def test_inv_19_yes_all_no_is_valid_current_only(self):
        class AllNo(Reengage):
            def assess(self,*a): return (ExperienceReengagement("E-mid-merge",False,"no",provenance_ref="prov:mid"),)
        core=CanaryCore(); h,_,_=self.build(core=core,reengage=AllNo()); f=MutableFlow(); h.capture(f,"r"); f.next_epoch(1); p=h.execute_decision_epoch(f,episode_id="r"); self.assertEqual(core.history_reads[-1],frozenset())

    def test_inv_20_complete_metrics(self):
        h,_,_=self.build(); f=MutableFlow(); h.capture(f,"r"); f.next_epoch(1); p=h.execute_decision_epoch(f,episode_id="r")
        self.assertEqual(p.metrics.reengagement_candidate_count,2); self.assertEqual(p.metrics.participating_experience_count,1); self.assertGreaterEqual(p.metrics.operation_calls,4)

    def test_reengagement_ids_must_exist_even_when_catalog_accepts_unknown(self):
        h,_,_=self.build(); h.gap_detector.assess=lambda _:GapAssessment(True); h.experience_catalog.exists=lambda _:False; h.experience_catalog.validate=lambda *a:True; h.reengagement_operator.assess=lambda *a:(ExperienceReengagement("missing",True,"x",provenance_ref="p"),)
        with self.assertRaises(GovernanceInvariantError): h.execute_decision_epoch(MutableFlow())

    def test_revalidation_rejects_untyped_dataclass_values(self):
        class RV(Revalidate):
            def revalidate(self,*a): return JudgmentRevalidation("maybe",(),RevalidationState.CONFIRMED,RevalidationState.CONFIRMED)
        rv=RV(); h,_,_=self.build(revalidate=rv); f=MutableFlow(); p=h.execute_decision_epoch(f)
        with self.assertRaises(GovernanceInvariantError): self.close(h,p,f)

    def test_p0_responsibility_mismatch_fails_before_actuation(self):
        class ProceedResponsibility(Responsibility):
            def assess(self, context):
                return ResponsibilityJudgment(
                    context.candidate_ids,
                    "proceed",
                    tuple(x for x in context.candidate_ids if x != "proceed"),
                    DynamicResponsibilityAxes(("uncertain",), ("impact",), ("vulnerable",), ("now",)),
                    ("realize proceed",),
                    ("retain rejected alternatives",),
                )

        flow=MutableFlow(); h,_,_=self.build(responsibility=ProceedResponsibility())
        with self.assertRaises(GovernanceInvariantError):
            h.execute_decision_epoch(flow)
        self.assertEqual(flow.apply_count,0)

    def test_p0_gap_detector_cannot_own_archive_capability(self):
        class ArchiveCanary:
            def read(self): raise AssertionError("archive capability was reachable")
        class Detector:
            def __init__(self): self.archive=ArchiveCanary()
            def assess(self, evidence):
                self.archive.read()
                return GapAssessment(False)

        h,_,_=self.build(gap=Detector()); flow=MutableFlow()
        with self.assertRaises(GovernanceInvariantError):
            h.execute_decision_epoch(flow)
        self.assertEqual(flow.apply_count,0)

    def test_p0_gap_evidence_rejects_nested_semantic_leakage(self):
        class LeakingFlow(MutableFlow):
            def current_reality(self):
                return {"phase":"approach","scenario_seed":7,"raw_actor_id":42,"future_route":"left","integrity_fingerprint":"secret"}
        class Detector(Gap):
            def assess(self, evidence):
                raise AssertionError("leaking evidence reached detector")

        h,_,_=self.build(gap=Detector()); flow=LeakingFlow()
        with self.assertRaises(GovernanceInvariantError):
            h.execute_decision_epoch(flow)
        self.assertEqual(flow.apply_count,0)

    def test_p1_closed_episode_trace_rotates_without_losing_feedback(self):
        class RecordingGap(Gap):
            def __init__(self): super().__init__(); self.sample_counts=[]
            def assess(self, evidence):
                self.sample_counts.append(len(evidence.samples))
                return super().assess(evidence)

        detector=RecordingGap(); h,_,_=self.build(gap=detector); flow=MutableFlow()
        first=h.execute_decision_epoch(flow,episode_id="route-A")
        done=self.close(h,first,flow)
        self.assertNotIn("route-A",h.samples)
        self.assertEqual(len(h.feedback),1)
        flow.next_epoch(1.0)
        second=h.execute_decision_epoch(flow,episode_id="route-A")
        self.assertEqual(detector.sample_counts,[1,1])
        self.assertEqual(len(second.flow.samples),1)
        self.assertEqual(len(h._pending_context.feedback),1)
        self.assertNotEqual(done.history_entry.entry_id,"")

    def test_p1_open_episode_capture_keeps_continuous_trace(self):
        h,_,_=self.build(); flow=MutableFlow()
        first,_=h.capture(flow,"route-open")
        flow.next_epoch(1.5)
        second,_=h.capture(flow,"route-open")
        self.assertEqual(len(first.samples),1)
        self.assertEqual(len(second.samples),2)


if __name__ == "__main__": unittest.main()
