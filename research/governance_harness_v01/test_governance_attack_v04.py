from __future__ import annotations

import unittest
from dataclasses import replace

from research.carla_v22_harness_v11.canonical_harness import (
    CoreEpochView, PresentObservation, Realization, VehicleActuation,
)
from research.governance_harness_v01.harness import (
    DynamicResponsibilityAxes, ExperienceReengagement, GapAssessment,
    GovernanceInvariantError, JudgmentRevalidation, ResponsibilityJudgment,
    RevalidationState,
)
from research.governance_harness_v01.harness_v04 import (
    AdmissionState, AtomicFlowSnapshot, CompletedExperience, CurrentFlowGapRule,
    GovernanceHarnessV04, GovernanceState, HistoryAccessPort,
)


class Flow:
    def __init__(self):
        self.tau=10.0; self.version=1; self.speed=2.0; self.front=True
        self.apply_count=0; self.torn=False; self.route="A"; self.last_ref=None
    def atomic_current_snapshot(self):
        version=self.version
        snapshot=AtomicFlowSnapshot(self.tau, self.observation(),
            {"phase":"approach","route":self.route}, version,
            f"v{version}:t{self.tau}:s{self.speed}:f{self.front}",self.route,self.last_ref)
        if self.torn: self.version += 1
        return snapshot
    def current_flow_version(self): return self.version
    def observation(self):
        return PresentObservation(200+self.version,self.speed,self.front,12.0 if self.front else 0.0,
            .8 if self.front else 0.0,"vehicle" if self.front else "none",.2,2)
    def apply_single_actuation(self, actuation):
        self.apply_count += 1; self.tau += .05; self.version += 1
        self.last_ref=f"real:{self.apply_count}"; return self.last_ref
    def advance(self, *, speed=None, front=None):
        if speed is not None: self.speed=speed
        if front is not None: self.front=front
        self.tau += .1; self.version += 1


class History(HistoryAccessPort):
    def __init__(self):
        super().__init__((
            CompletedExperience("E1","A","p:E1",1.0,{"advice":"yield"},120),
            CompletedExperience("E2","A","p:E2",2.0,{"advice":"ignore"},130),
            CompletedExperience("E3","B","p:E3",3.0,{"advice":"other"},90),
        ))


class Core:
    experimental_contract={"history_port_only":True,"present_only":True,"no_future":True,
        "pure_probes":True,"single_realization":True,"closure":True,"atomic_capture":True}
    def __init__(self): self.last=None; self.views=[]; self.fail=False
    def open_epoch(self, observation, tau, participating):
        self.last=tau; self.views.append(participating)
        return CoreEpochView((),{"proceed":.6,"yield":.4})
    def ablate_relation(self,*a): return {"proceed":.6,"yield":.4}
    def ablate_relation_group(self,*a): return {"proceed":.6,"yield":.4}
    def realize_selected(self, observation, tau, selected):
        if self.fail: raise RuntimeError("core failure")
        return Realization(selected,VehicleActuation(.1,0,0))


class Reengage:
    def assess(self, evidence, gap, candidates, feedback):
        return tuple(ExperienceReengagement(x.experience_id,x.experience_id=="E1","r",
            provenance_ref=x.provenance_ref) for x in candidates)


class Responsibility:
    def assess(self, context):
        selected="yield" if "yield" in context.candidate_ids else context.candidate_ids[0]
        return ResponsibilityJudgment(context.candidate_ids,selected,
            tuple(x for x in context.candidate_ids if x!=selected),
            DynamicResponsibilityAxes(("uncertain",),("impact",),("vulnerable",),("now",)),
            ("bind selected",),("retain alternatives",))


class Revalidate:
    def __init__(self, overrides=None): self.overrides=overrides or {}
    def revalidate(self, context, audit, decision, outcome):
        states=tuple((x.experience_id,self.overrides.get(x.experience_id,RevalidationState.CONFIRMED)) for x in audit)
        return JudgmentRevalidation(RevalidationState.CONFIRMED,states,
            RevalidationState.CONFIRMED,RevalidationState.CONFIRMED)


class Context:
    def __init__(self): self.value=None; self.clears=0
    def bind_governance_context(self,value): self.value=value
    def clear_governance_context(self): self.value=None; self.clears+=1


class AttackV04(unittest.TestCase):
    def build(self, **kw):
        history=kw.pop("history",History()); core=kw.pop("core",Core()); context=kw.pop("context",Context())
        harness=GovernanceHarnessV04(core=core,history_port=history,
            gap_rule=kw.pop("gap_rule",CurrentFlowGapRule(speed_drop_threshold=.5)),
            reengagement_operator=kw.pop("reengagement_operator",Reengage()),
            responsibility_operator=kw.pop("responsibility_operator",Responsibility()),
            revalidation_operator=kw.pop("revalidation_operator",Revalidate()),context_port=context,**kw)
        return harness,history,core,context
    def execute_no(self,h,flow,episode="A"):
        return h.execute_decision_epoch(flow,relation_id=episode)
    def execute_yes(self,h,flow,episode="A"):
        h.capture_current(flow,episode); flow.advance(speed=.5)
        return h.execute_decision_epoch(flow,relation_id=episode)
    def close(self,h,flow): flow.advance(front=False); return h.observe_post(flow)

    def test_atk_01_fake_outcome_injection(self):
        h,_,_,_=self.build(); f=Flow(); self.execute_no(h,f); f.advance(front=False); f.last_ref="forged"
        with self.assertRaises(GovernanceInvariantError): h.observe_post(f)
        self.assertEqual(h.state,GovernanceState.RECOVERY_PENDING)
        with self.assertRaises(TypeError): h.observe_post(f,post_observation=f.observation())
    def test_atk_02_false_closure(self):
        h,_,_,_=self.build(); f=Flow(); self.execute_no(h,f); f.advance(front=True)
        self.assertTrue(h.observe_post(f).pending); self.assertEqual(h.state,GovernanceState.OUTCOME_PENDING)
    def test_atk_03_closure_commit_failure_recovery(self):
        class FailOnce:
            def __init__(self): self.n=0
            def before_commit(self,*a): self.n+=1; (_ for _ in ()).throw(RuntimeError("commit")) if self.n==1 else None
        hook=FailOnce(); h,_,_,_=self.build(commit_hook=hook); f=Flow(); self.execute_no(h,f); f.advance(front=False)
        with self.assertRaises(RuntimeError): h.observe_post(f)
        self.assertEqual(h.state,GovernanceState.RECOVERY_PENDING); self.assertEqual(f.apply_count,1)
        done=h.retry_finalization(); self.assertFalse(done.pending); self.assertEqual(f.apply_count,1)
        class PostActuationReadFailure(Flow):
            def atomic_current_snapshot(self):
                if self.apply_count: raise RuntimeError("post-actuation host read failed")
                return super().atomic_current_snapshot()
        broken=PostActuationReadFailure(); h2,_,_,_=self.build()
        with self.assertRaises(RuntimeError): self.execute_no(h2,broken)
        self.assertEqual(h2.state,GovernanceState.RECOVERY_PENDING)
        with self.assertRaises(GovernanceInvariantError): self.execute_no(h2,broken)
        self.assertEqual(broken.apply_count,1)
    def test_atk_04_sidecar_failure_atomicity(self):
        class BrokenSidecar:
            def __init__(self): self.records=[]
            def prepare(self,*a): return a
            def snapshot(self): return list(self.records)
            def restore(self,state): self.records=list(state)
            def commit(self,*a): self.records.append("orphan"); raise RuntimeError("sidecar")
        h,history,_,_=self.build(history_sidecar=BrokenSidecar()); f=Flow(); self.execute_no(h,f); f.advance(front=False)
        with self.assertRaises(RuntimeError): h.observe_post(f)
        self.assertEqual(history.committed_count,0); self.assertEqual(h.history_sidecar.records,[])
        self.assertEqual(h.state,GovernanceState.RECOVERY_PENDING)
    def test_atk_05_responsibility_causality(self):
        h,_,core,_=self.build(); f=Flow(); p=self.execute_no(h,f)
        self.assertEqual(p.decision.realization.selected_possibility_id,"yield"); self.assertEqual(core.views[-1].items,())
    def test_atk_06_hidden_archive_core(self):
        class Hidden(Core):
            secret_archive=("old",)
        h,_,_,_=self.build(core=Hidden())
        self.assertEqual(h.admission.state,AdmissionState.BLOCKED)
        with self.assertRaises(GovernanceInvariantError): self.execute_no(h,Flow())
    def test_atk_07_no_archive_canary(self):
        h,history,_,_=self.build(); p=self.execute_no(h,Flow())
        self.assertEqual((history.archive_access_count,history.records_scanned),(0,0)); self.assertEqual(p.metrics.archive_bytes_read,0)
    def test_atk_08_nonparticipant_canary(self):
        h,_,core,_=self.build(); f=Flow(); p=self.execute_yes(h,f)
        self.assertEqual(tuple(x.experience_id for x in core.views[-1].items),("E1",))
        self.assertEqual(tuple(x.experience_id for x in p.reengagement),("E1","E2"))
    def test_atk_09_detector_capability_attacks(self):
        archive=History()
        class AliasRule:
            x=archive
        for attack in (AliasRule(), lambda payload: archive.search("A",10)):
            with self.assertRaises(GovernanceInvariantError): GovernanceHarnessV04.validate_gap_rule(attack)
    def test_atk_10_feedback_cross_relation_pollution(self):
        h,history,core,_=self.build(); f=Flow(); self.execute_no(h,f,"A"); done=self.close(h,f)
        self.assertIn(done.history_entry.entry_id,tuple(x.experience_id for x in history.search("A",1000)))
        f.route="B"; f.advance(front=True,speed=2); self.execute_no(h,f,"B")
        self.assertEqual(core.views[-1].feedback,())
    def test_atk_11_wrong_participation_recovery(self):
        h,_,_,_=self.build(revalidation_operator=Revalidate({"E1":RevalidationState.REVISED})); f=Flow(); self.execute_yes(h,f); d=self.close(h,f)
        self.assertEqual(dict(d.revalidation.reengagement_judgments)["E1"],RevalidationState.REVISED)
        self.assertTrue(d.provenance.original_reengagement[0].participate)
    def test_atk_12_wrong_nonparticipation_recovery(self):
        h,_,_,_=self.build(revalidation_operator=Revalidate({"E2":RevalidationState.REVISED})); f=Flow(); self.execute_yes(h,f); d=self.close(h,f)
        self.assertEqual(dict(d.provenance.revalidation.reengagement_judgments)["E2"],RevalidationState.REVISED)
        self.assertFalse(d.provenance.original_reengagement[1].participate)
    def test_atk_13_repeated_closure_commit(self):
        h,history,_,_=self.build(); f=Flow(); self.execute_no(h,f); done=self.close(h,f)
        with self.assertRaises(GovernanceInvariantError): h.commit_closure(done.history_entry.entry_id)
        self.assertEqual(history.committed_count,1)
    def test_atk_14_context_leakage_after_exception(self):
        core=Core(); core.fail=True; h,_,_,ctx=self.build(core=core)
        with self.assertRaises(RuntimeError): self.execute_no(h,Flow())
        self.assertIsNone(ctx.value); self.assertEqual(h.state,GovernanceState.ABORTED_PRE_REALIZATION)
    def test_atk_15_torn_current_snapshot(self):
        h,_,_,_=self.build(); f=Flow(); f.torn=True
        with self.assertRaises(GovernanceInvariantError): h.capture_current(f,"A")
        f.torn=False; f.route="B"
        with self.assertRaises(GovernanceInvariantError): h.capture_current(f,"A")
        self.assertNotIn("A",h.samples)
    def test_atk_16_flow_driven_lifecycle(self):
        h,_,_,_=self.build(); f=Flow(); branches=[]
        branches.append(self.execute_no(h,f).branch); self.close(h,f)
        f.advance(speed=2,front=True); h.capture_current(f,"A"); f.advance(speed=.5); branches.append(h.execute_decision_epoch(f,relation_id="A").branch); self.close(h,f)
        f.advance(speed=2,front=True); branches.append(self.execute_no(h,f).branch); self.close(h,f)
        f.advance(speed=2,front=True); branches.append(self.execute_no(h,f).branch); self.close(h,f)
        f.advance(speed=2,front=True); h.capture_current(f,"A"); f.advance(speed=.4); branches.append(h.execute_decision_epoch(f,relation_id="A").branch)
        self.assertEqual(branches,["NO","YES","NO","NO","YES"])


if __name__ == "__main__": unittest.main()
