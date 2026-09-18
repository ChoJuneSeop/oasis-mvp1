import unittest
from research.carla_v22_canonical.harness_v1_1 import CanonicalHarnessV11, DecisionFrame, ActuationVector, HarnessInvariantError
from research.g3_2_sidecar.common import RelationElementRef

class Port:
    def __init__(self):
        self.t=10.0; self.fp="A"; self.n=0
    def current_tau(self): return self.t
    def present_observation(self):
        return {"epoch":1,"ego_speed_mps":2.0,"front_present":False,"front_gap_m":45.0,"front_closing_mps":0.0,"front_kind":"none","local_heading_error_deg":0.0,"local_density":0}
    def flow_fingerprint(self): return self.fp
    def apply_one(self,a):
        self.n+=1; self.t+=0.05; self.fp="B"; return "r1"

class Core:
    def __init__(self):
        self.rel=RelationElementRef("E1","r1",1.0,{"relation":"approach"})
    def evaluate_current(self,o,t):
        return DecisionFrame(t,{"relation":"open"},(self.rel,),{"go":0.7,"hold":0.3},"go",ActuationVector(0.1,0.0,0.0),role_trace_by_relation={("E1","r1"):("generation",)},generated_by_relation={("E1","r1"):("go",)})
    def relation_ablation_distribution(self,f,r): return {"go":0.4,"hold":0.6}
    def relation_group_ablation_distribution(self,f,r): return {"go":0.4,"hold":0.6}

class Tests(unittest.TestCase):
    def test_read_only_prepare(self):
        p=Port(); h=CanonicalHarnessV11(p,Core()); e=h.prepare_epoch()
        self.assertEqual((p.fp,p.t,p.n),("A",10.0,0))
        self.assertEqual(len(e.recorder.participation),1)
    def test_single_realization(self):
        p=Port(); h=CanonicalHarnessV11(p,Core()); e=h.prepare_epoch(); h.realize_once(e)
        self.assertEqual(p.n,1)
        with self.assertRaises(HarnessInvariantError): h.realize_once(e)
    def test_history_after_realization(self):
        p=Port(); h=CanonicalHarnessV11(p,Core()); e=h.prepare_epoch(); r=h.realize_once(e)
        x=h.complete_history(e,r,entry_id="H1",outcome_tau=10.1,relation_end_tau=10.2,outcome_description="relation observed",closure_method="process observation",closure_evidence={"closed":True})
        self.assertEqual(x.realization_count,1)

if __name__ == "__main__": unittest.main()
