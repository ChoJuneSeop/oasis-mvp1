(function(){
const baseAvailableOasis=availableOasis;
const baseActionableIds=actionableIds;
const baseRender=render;

function knownOasis(S,P,useRel=1){
  if(!(useRel&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel)){
    return Object.keys(places).filter(id=>places[id].pub);
  }
  return Object.keys(places).filter(id=>places[id].pub||(
    places[id].gate&&relationExists(P,places[id].gate)
  ));
}

function currentGateAuthority(S,P,id,useRel=1){
  const d=places[id];
  if(!d)return false;
  if(d.pub)return true;
  if(!(useRel&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel))return false;
  if(!d.gate||!relationExists(P,d.gate))return false;
  if(!window.OASISRealityFlowTopology)return false;
  return OASISRealityFlowTopology.activeEpisodes(S,P).some(ep=>ep.a===d.gate||ep.b===d.gate);
}

availableOasis=function(S,P,useRel=1){
  if(MODELS[S.key].kind!=='oasis')return baseAvailableOasis(S,P,useRel);
  return Object.keys(places).filter(id=>places[id].pub||currentGateAuthority(S,P,id,useRel));
};

actionableIds=function(S,P,useRel=1){
  if(MODELS[S.key].kind!=='oasis')return baseActionableIds(S,P,useRel);
  const ids=availableOasis(S,P,useRel),here=currentPlace(P),other=ids.filter(id=>id!==here);
  return other.length?other:ids;
};

function authoritySnapshot(S,P){
  const known=knownOasis(S,P,1);
  const authorized=availableOasis(S,P,1);
  return {
    known,
    authorized,
    knownButDormant:known.filter(id=>!authorized.includes(id))
  };
}

function ensurePanel(){
  if(document.getElementById('relationAuthorityCard'))return;
  const sec=document.createElement('section');sec.className='card';sec.id='relationAuthorityCard';
  sec.innerHTML='<h2>관계 증거 / 현재 실행권 분리</h2><div class="note" id="relationAuthoritySummary"></div>';
  document.querySelector('.right')?.appendChild(sec);
}

render=function(){
  baseRender();ensurePanel();
  const S=E.worlds[focus],P=S?.parties?.find(x=>x.id===focusParty);if(!S||!P)return;
  const x=authoritySnapshot(S,P),fmt=ids=>ids.map(id=>places[id]?.n||id).join(', ')||'없음';
  const el=document.getElementById('relationAuthoritySummary');
  if(el)el.innerHTML=`<b>${P.name} · ${MODELS[focus].n}</b><br>기억/지식: ${fmt(x.known)}<br>현재 실행권: ${fmt(x.authorized)}<br>기억되지만 현재 비활성: ${fmt(x.knownButDormant)}`;
};

window.OASISRelationAuthority={
  knownOasis,
  currentGateAuthority,
  authoritySnapshot,
  principle:'stored relationship evidence does not itself grant current execution authority'
};
})();
