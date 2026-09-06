(function(){
const baseMkW=mkW;
const baseTickW=tickW;
const baseOutcome=outcome;
const baseParticipants=participants;
const baseMemberRank=memberRank;
const baseHiddenReady=hiddenReady;

function direction(a,b){return b>a?1:b<a?-1:0}
function ensure(S){
  if(!S.realityFlowTopology)S.realityFlowTopology={edges:[],observations:0,lastNonZero:0};
  if(!S.c)S.c={};
  if(!Number.isFinite(S.c.realityFlowTopologyObservation))S.c.realityFlowTopologyObservation=0;
  if(!Number.isFinite(S.c.realityFlowTopologyActivation))S.c.realityFlowTopologyActivation=0;
  return S.realityFlowTopology;
}
function observe(S,from,to,t=E.tick,source='world'){
  const F=ensure(S),dir=direction(from,to);
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
function partyRuns(S,P){return runsFrom(ensure(S).edges,P._realityFlowTopologyAnchor??null)}
function partyKey(S,P){return keyOf(partyRuns(S,P))}
function ingestTrace(S,trace,source='test-trace'){
  const F=ensure(S);F.edges=[];F.observations=0;F.lastNonZero=0;
  for(let i=1;i<trace.length;i++)observe(S,trace[i-1],trace[i],E.tick-trace.length+1+i,source);
  if(trace.length)S.danger=trace.at(-1);
  return partyKey(S,{_realityFlowTopologyAnchor:null});
}
function annotate(S,P){
  if(!P.relationField)return;
  const runs=partyRuns(S,P),key=keyOf(runs);
  for(const ep of P.relationField.episodes||[]){
    if(ep.flowTopologyKey==null){ep.flowTopologyRuns=[...runs];ep.flowTopologyKey=key}
  }
  P._realityFlowTopologyAnchor=E.tick;
}
function activeEpisodes(S,P){
  if(!P.relationField||MODELS[S.key].kind!=='oasis'||!MODELS[S.key].rel)return[];
  const key=partyKey(S,P);if(!key)return[];
  return(P.relationField.episodes||[]).filter(ep=>ep.flowTopologyKey===key);
}
function relevantToPlace(S,P,id){
  const gate=places[id]?.gate;
  return activeEpisodes(S,P).some(ep=>ep.places?.includes(id)||(gate&&(ep.a===gate||ep.b===gate)));
}
function hasPair(S,P,a,b){
  const k=[a,b].sort().join('↔');return activeEpisodes(S,P).some(ep=>ep.key===k);
}

mkW=function(k){
  const S=baseMkW(k);S.realityFlowTopology={edges:[],observations:0,lastNonZero:0};
  Object.assign(S.c,{realityFlowTopologyObservation:0,realityFlowTopologyActivation:0});
  for(const P of S.parties)P._realityFlowTopologyAnchor=null;
  return S;
};
tickW=function(S,e){
  ensure(S);const before=S.danger;baseTickW(S,e);const dir=observe(S,before,S.danger,E.tick,'tick');
  S.c.realityFlowTopologyObservation=(S.c.realityFlowTopologyObservation||0)+1;
  if(dir&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel){
    for(const P of S.parties){
      const sig=activeEpisodes(S,P).map(ep=>ep.key).sort().join('|');
      if(P._lastRealityFlowTopologyActive!==sig){
        if(sig)S.c.realityFlowTopologyActivation=(S.c.realityFlowTopologyActivation||0)+1;
        P._lastRealityFlowTopologyActive=sig;
      }
    }
  }
};
outcome=function(S,P,id){ensure(S);baseOutcome(S,P,id);annotate(S,P)};
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
  return relationExists(P,h.npc)&&activeEpisodes(S,P).some(ep=>ep.a===h.npc||ep.b===h.npc);
};
for(const S of Object.values(E?.worlds||{})){
  ensure(S);for(const P of S.parties||[])if(P._realityFlowTopologyAnchor===undefined)P._realityFlowTopologyAnchor=null;
}
window.OASISRealityFlowTopology={direction,observe,runsFrom,keyOf,ingestTrace,currentRunsForParty:partyRuns,currentKeyForParty:partyKey,annotate,activeEpisodes,relevantToPlace};
})();
