import unittest
from research.g3_2_sidecar.common import RelationElementRef
from research.g3_rpfo_v1.rpfo import CurrentLineageAnchor,IndexedRelationRepository,ParticipationDecision,RelationalParticipationFoldOperator
from research.oasis_core_v11.current_relational_core import CurrentRelation,HistoricalRelationRecord,PastRelationSemanticView
class R:
    def resolve(self,**kw): return ParticipationDecision((("a","r"),("b","r")),(),joint_participations=((('a','r'),('b','r')),))
class T(unittest.TestCase):
    def test_combo(self):
        repo=IndexedRelationRepository()
        for e in ('a','b'):
            rec=HistoricalRelationRecord(RelationElementRef(e,'r',1,{}),PastRelationSemanticView('s','o','r','done'))
            repo.register_records(((rec,('x',)),))
        op=RelationalParticipationFoldOperator(repository=repo,resolver=R())
        cur=(CurrentRelation('now','s','o','r','flow'),); anc=(CurrentLineageAnchor('x','now',('ev',),10,'current flow'),)
        front=op.seed_frontier(current_tau=10,current_relations=cur,current_anchors=anc)
        snap=op.step(current_tau=10,current_relations=cur,current_anchors=anc,frontier=front)
        self.assertEqual(len(snap.joint_participations[0]),2)
if __name__=='__main__': unittest.main()
