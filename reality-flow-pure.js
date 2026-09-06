(function(){
const baseMkP=mkP;
const baseMkW=mkW;
const baseTickW=tickW;
const baseOutcome=outcome;
const baseParticipants=participants;
const baseMemberRank=memberRank;
const baseHiddenReady=hiddenReady;
const baseRender=render;

function direction(a,b){return b>a?1:b<a?-1:0}
function pairKey(a,b){return[a,b].sort().join('↔')}
function ensureTopology(S){
  if(!S.realityFlowPure)S.realityFlowPure={edges:[],observations:0,lastNonZero:0};
  if(!S.c)S.c={};
  if(!Number.isFinite(S.c.pureFlowObservation))S.c.pureFlowObservation=0;
  if(!Number.isFinite(S.c.pureFlowActivation))S.c.pureFlowActivation=0;
  if(!Number.isFinite(S.c.pureRelationRecombination))S.c.pureRelationRecombination=0;
  return S.realityFlowPure;
}
function observe(S,from,to,t=E.tick,source='world'){
  const F=ensureTopology(S),dir=direction(from,to);
  F.edges.push({t,source,from,to,dir});F.observations++;
  if(dir)F.lastNonZero=dir;
  return dir;
}
function runsFrom(edges,afterTick=null){
  const out=[];
  for(const e of edges||[]){
    if(afterTick!=null&&e.t<=afterTick)continue;
    if(!e.dir)continue;
    if(out.at(-1)!==e.dir)out.push(e.dir);
  }
  return out;
}
function keyOf(runs){return(runs||[]).join('>')}
function partyRuns(S,P){return runsFrom(ensureTopology(S).edges,P._pureFlowAnchor??null)}
function partyKey(S,P){return keyOf(partyRuns(S,P))}
function ingestTrace(S,trace,source='test-trace'){
  const F=ensureTopology(S);F.edges=[];F.observations=0;F.lastNonZero=0;
  for(let i=1;i<trace.length;i++)observe(S,trace[i-1],trace[i],E.tick-trace.length+1+i,source);
  if(trace.length)S.danger=trace.at(-1);
  return F.lastNonZero;
}
function composeField(S,P,newEvents){
  if(MODELS[S.key].kind!=='oasis'||!MODELS[S.key].rel||!MODELS[S.key].fb||!newEvents.length)return[];
  const added=[];
  const all=P.relationHistory||[];
  for(const cur of newEvents){
    for(const prev of all){
      if(prev===cur||prev.npc===cur.npc)continue;
      if(prev.t>cur.t)continue;
      const from=[`${prev.t}|${prev.npc}|${prev.place}`,`${cur.t}|${cur.npc}|${cur.place}`];
      const duplicate=P.relationField.episodes.some(ep=>ep.fromKey?.[0]===from[0]&&ep.fromKey?.[1]===from[1]);
      if(duplicate)continue;
      const ep={t:E.tick,key:pairKey(prev.npc,cur.npc),a:prev.npc,b:cur.npc,places:[prev.place,cur.place],from:[prev.t,cur.t],fromKey:from};
      P.relationField.episodes.push(ep);added.push(ep);P.relationField.recombinations++;S.c.pureRelationRecombination++;
      log(S,`${P.name}: [순수 인연필드] 완결 경험 재조합 ${ep.key}`);
    }
  }
  return added;
}
function annotateAdded(S,P,episodes){
  if(!episodes.length)return;
  const runs=partyRuns(S,P),key=keyOf(runs);
  for(const ep of episodes){ep.flowTopologyRuns=[...runs];ep.flowTopologyKey=key}
  P._pureFlowAnchor=E.tick;
}
function activeEpisodes(S,P){
  if(!P.relationField||MODELS[S.key].kind!=='oasis'||!MODELS[S.key].rel)return[];
  const key=partyKey(S,P);if(!key)return[];
  return P.relationField.episodes.filter(ep=>ep.flowTopologyKey===key);
}
function relevantToPlace(S,P,id){
  const gate=places[id]?.gate;
  return activeEpisodes(S,P).some(ep=>ep.places?.includes(id)||(gate&&(ep.a===gate||ep.b===gate)));
}
function hasPair(S,P,a,b){const k=pairKey(a,b);return activeEpisodes(S,P).some(ep=>ep.key===k)}
function touchesNPC(S,P,n){return activeEpisodes(S,P).some(ep=>ep.a===n||ep.b===n)}

mkP=function(d){
  const P=baseMkP(d);
  P.relationField={episodes:[],active:[],recombinations:0,activations:0};
  P._pureFlowAnchor=null;P._lastPureActive='';
  return P;
};
mkW=function(k){
  const S=baseMkW(k);S.realityFlowPure={edges:[],observations:0,lastNonZero:0};
  Object.assign(S.c,{pureFlowObservation:0,pureFlowActivation:0,pureRelationRecombination:0});
  return S;
};
tickW=function(S,e){
  ensureTopology(S);const before=S.danger;baseTickW(S,e);const dir=observe(S,before,S.danger,E.tick,'tick');
  S.c.pureFlowObservation=(S.c.pureFlowObservation||0)+1;
  if(dir&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel){
    for(const P of S.parties){
      const active=activeEpisodes(S,P),sig=active.map(ep=>ep.key).sort().join('|');P.relationField.active=[...new Set(active.map(ep=>ep.key))];
      if(P._lastPureActive!==sig){if(sig){P.relationField.activations++;S.c.pureFlowActivation++}P._lastPureActive=sig}
    }
  }
};
outcome=function(S,P,id){
  ensureTopology(S);const beforeRel=P.relationHistory.length;baseOutcome(S,P,id);const newEvents=P.relationHistory.slice(beforeRel);
  if(newEvents.length){const added=composeField(S,P,newEvents);annotateAdded(S,P,added)}
};
participants=function(S,P,useRel=1){
  if(!(useRel&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel))return baseParticipants(S,P,useRel);
  const set=baseParticipants(S,P,0);if(activeEpisodes(S,P).length)set.add('마도사');return set;
};
memberRank=function(S,P,m,id,useRel=1){
  if(!(useRel&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel))return baseMemberRank(S,P,m,id,useRel);
  const base=baseMemberRank(S,P,m,id,0),fit=relevantToPlace(S,P,id)?1:0;
  return[base[0]??0,fit,...base.slice(1)];
};
hiddenReady=function(S,P,h){
  if(!(MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel))return baseHiddenReady(S,P,h);
  if(!P.seenNPC.has(h.npc))return false;
  if(!h.places.every(id=>P.disc.has(id)||availableOasis(S,P,1).includes(id)))return false;
  if(h.links.length)return h.links.every(n=>hasPair(S,P,h.npc,n));
  return relationExists(P,h.npc)&&touchesNPC(S,P,h.npc);
};
function ensurePanel(){
  if(document.getElementById('relationFieldCard'))return;
  const sec=document.createElement('section');sec.className='card';sec.id='relationFieldCard';
  sec.innerHTML='<h2>순수 Reality Flow 인연필드</h2><div class="note" id="pureFlowSummary"></div>';
  document.querySelector('.right')?.appendChild(sec);
}
render=function(){
  baseRender();ensurePanel();const S=E.worlds[focus],P=S.parties.find(x=>x.id===focusParty);if(!S||!P)return;
  const el=document.getElementById('pureFlowSummary');if(el)el.innerHTML=`<b>${P.name} · ${MODELS[focus].n}</b><br>재조합 ${P.relationField?.recombinations||0} · topology 활성 ${P.relationField?.activations||0}<br>현재 패턴: ${partyKey(S,P)||'없음'}<br>현재 권한 관계: ${(P.relationField?.active||[]).join(', ')||'없음'}`;
};
for(const S of Object.values(E?.worlds||{}))ensureTopology(S);
window.OASISRealityFlowPure={direction,observe,runsFrom,keyOf,ingestTrace,currentRunsForParty:partyRuns,currentKeyForParty:partyKey,activeEpisodes,relevantToPlace};
})();
