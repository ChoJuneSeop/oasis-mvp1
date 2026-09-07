(function(){
// OASIS core v2.2 stability layer.
// A relational combination is generated only when at least two currently relevant
// relational-process groups intersect. Once a structural/current-flow combination is
// realized, the unchanged structure is not relabeled as a brand-new possibility every tick.

const core=globalThis.__OASIS_CORE_V2__;
if(!core)throw new Error('OASIS core v2 must load before stability layer');
const previousExecute=execute;

function ensureV(A){
  if(!A.oasisV2)A.oasisV2={sequence:0,intentSeq:0,generatedUses:{},relationGraph:{},lastIntent:null};
  if(A.oasisV2.lastGenerationSnapshot===undefined)A.oasisV2.lastGenerationSnapshot=null;
  return A.oasisV2;
}
function primitiveIdentity(a){return actionKey(a)+'|'+(a.target||'');}
function trend(v,prev){if(prev==null)return'unknown';return v>prev?'up':v<prev?'down':'flat';}
function flowSignature(A,P){
  const prev=A.lastPerception?.self;
  return ['energy','water','warmth','health'].map(k=>k+':'+trend(P.self[k],prev?.[k])).join('|');
}
function structureSignature(A,P,active){
  const groups=active.map(ep=>ep._groupKey||core.groupKey?.(ep)||String(ep.action||'event')).sort();
  const nodeKinds=[...new Set((P.nearNodes||[]).map(n=>n.kind))].sort();
  const agents=(P.nearAgents||[]).map(b=>b.id).sort();
  return 'groups='+groups.join('&')+'|nodes='+nodeKinds.join('&')+'|agents='+agents.join('&')+'|flow='+flowSignature(A,P);
}
function normalizedComboSig(candidate,active){
  const groups=active.map(ep=>ep._groupKey||core.groupKey?.(ep)||String(ep.action||'event')).sort();
  return candidate.steps.map(primitiveIdentity).join('=>')+'|groups:'+groups.join('&');
}
function stabilizedGenerated(A,P,as,active){
  if(active.length<2)return[];
  const V=ensureV(A),snapshot=structureSignature(A,P,active);
  if(V.lastGenerationSnapshot===snapshot)return[];
  const generated=core.generateCandidates(A,P,as,active)||[];
  for(const g of generated){g.comboSig=normalizedComboSig(g,active);g.snapshotSig=snapshot;g.sourceGroupKeys=active.map(ep=>ep._groupKey||core.groupKey?.(ep)||String(ep.action||'event')).sort();}
  return generated;
}

oasisDecide=function(A,P,as){
  const V=ensureV(A),active=activeRelations(A,P),generated=stabilizedGenerated(A,P,as,active),candidates=[...as,...generated];
  const sortRows=rs=>rs.sort((x,y)=>cmpTuple(x.r,y.r)||((noise('o22tie|'+A.id+'|'+primitiveIdentity(x.a))-noise('o22tie|'+A.id+'|'+primitiveIdentity(y.a)))));
  const rows=sortRows(candidates.map(a=>({a,r:oasisRank(A,P,a,active)}))),counterfactual=sortRows(as.map(a=>({a,r:oasisRank(A,P,a,[])})));
  const pick=rows[0],noRel=counterfactual[0];
  if(actionKey(pick.a)!==actionKey(noRel.a)||pick.a.generated)A.metrics.relationUse++;
  return{a:pick.a,why:`OASIS-v2.2 현재흐름·구조활성 ${active.length}·새조합 ${generated.length}·관계제거 반사실 ${actionKey(noRel.a)}·통합점수 ${pick.r[0].toFixed(3)}`};
};

execute=function(A,P,a){
  const out=previousExecute(A,P,a);
  if(A.controller==='oasis'&&a?.generated&&a.snapshotSig)ensureV(A).lastGenerationSnapshot=a.snapshotSig;
  return out;
};

globalThis.__OASIS_CORE_V22__={structureSignature,normalizedComboSig,stabilizedGenerated};
})();
