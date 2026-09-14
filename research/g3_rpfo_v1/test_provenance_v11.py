import unittest
from research.g3_2_sidecar.common import RelationElementRef
from research.g3_rpfo_v1.rpfo import CurrentLineageAnchor,FrontierContact,HistoricalLinkProvenance,IndexedRelationRepository,ParticipationDecision,RelationalFrontier,RelationalParticipationFoldOperator
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError,CurrentRelation,HistoricalRelationRecord,PastRelationSemanticView
class R:
    def resolve(self,**kw): return ParticipationDecision((('b','r'),),())
class T(unittest.TestCase):
    def test_forged_cross_lineage_contact_fails(self):
        repo=IndexedRelationRepository()
        for e,x in (('a','A'),('b','B')):
            rec=HistoricalRelationRecord(RelationElementRef(e,'r',1,{}),PastRelationSemanticView('s','o','r','done')); repo.register_records(((rec,(x,)),))
        op=RelationalParticipationFoldOperator(repository=repo,resolver=R()); cur=(CurrentRelation('now','s','o','r','flow'),); anc=(CurrentLineageAnchor('A','now',('ev',),10,'current flow'),)
        forged=RelationalFrontier(('now',),(FrontierContact('bad',('b','r'),'now',anchor_id='A',current_evidence_refs=('ev',),provenance_note='forged'),))
        with self.assertRaises(CoreV11InvariantError): op.step(current_tau=10,current_relations=cur,current_anchors=anc,frontier=forged)
    def test_link_provenance_cannot_be_empty(self):
        with self.assertRaises(CoreV11InvariantError): HistoricalLinkProvenance('basis',('a','b'),())
if __name__=='__main__': unittest.main()
