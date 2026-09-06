(function(){
const baseActionableIds=actionableIds;

function currentRelationAuthorityForPlace(S,P,id){
  if(!(MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel))return true;
  const gate=places[id]?.gate;
  if(!gate)return true;
  const T=window.OASISRealityFlowTopology;
  if(!T)return false;
  return T.relevantToPlace(S,P,id);
}

actionableIds=function(S,P,use=1){
  const ids=baseActionableIds(S,P,use);
  if(!(use&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel))return ids;
  const filtered=ids.filter(id=>currentRelationAuthorityForPlace(S,P,id));
  return filtered.length?filtered:ids.filter(id=>!places[id]?.gate);
};

window.OASISExecutionAuthority={currentRelationAuthorityForPlace};
})();
