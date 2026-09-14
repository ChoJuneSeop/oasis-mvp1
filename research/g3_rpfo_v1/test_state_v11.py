import unittest
from research.g3_2_sidecar.common import RelationElementRef
from research.g3_rpfo_v1.rpfo import CurrentLineageAnchor,IndexedRelationRepository,ParticipationDecision,RelationalParticipationFoldOperator
from research.oasis_core_v11.current_relational_core import CurrentRelation,HistoricalRelationRecord,PastRelationSemanticView

def rec(e):
    return HistoricalRelationRecord(RelationElementRef(e,"r",1,{}),PastRelationSemanticView("s","o","r","done"))
class Resolver:
    def resolve(self,*,frontier_records,active_records,**kw):
        keys=tuple(dict.fromkeys((*active_records,*frontier_records)))
        return ParticipationDecision(keys,())
class T(unittest.TestCase):
    def test_lineage_frontier_is_local(self):
        a,b=("a","r"),("b","r"); repo=IndexedRelationRepository()
        repo.register_records(((rec("a"),("lineage:a",)),(rec("b"),("lineage:b",))))
        op=RelationalParticipationFoldOperator(repository=repo,resolver=Resolver())
        current=(CurrentRelation("now","s","o","r","flow"),)
        anchor=(CurrentLineageAnchor("lineage:a","now",("ev",),10,"current flow"),)
        frontier=op.seed_frontier(current_tau=10,current_relations=current,current_anchors=anchor)
        snap=op.step(current_tau=10,current_relations=current,current_anchors=anchor,frontier=frontier)
        self.assertEqual(snap.opened_keys,(a,)); self.assertNotIn(b,snap.opened_keys)
if __name__=="__main__": unittest.main()
