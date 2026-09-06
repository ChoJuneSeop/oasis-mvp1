(function(){
const rfMkW = mkW;
const rfTickW = tickW;
const rfOutcome = outcome;
const rfParticipants = participants;
const rfMemberRank = memberRank;
const rfHiddenReady = hiddenReady;

function orientation(from,to){
  return to>from?1:to<from?-1:0;
}

function ensureFlow(S){
  if(!S.realityFlow) S.realityFlow={edges:[],lastNonZero:0,observations:0};
  return S.realityFlow;
}

function observe(S,from,to,t=E.tick,source='world'){
  const F=ensureFlow(S);
  const dir=orientation(from,to);
  F.edges.push({t,source,from,to,dir});
  F.observations++;
  if(dir!==0) F.lastNonZero=dir;
  return dir;
}

function ingestTrace(S,trace,source='test-trace'){
  const F=ensureFlow(S);
  F.edges=[];F.lastNonZero=0;F.observations=0;
  for(let i=1;i<trace.length;i++) observe(S,trace[i-1],trace[i],(E.tick-trace.length+1)+i,source);
  if(trace.length) S.danger=trace[trace.length-1];
  return F.lastNonZero;
}

function currentOrientation(S){
  return ensureFlow(S).lastNonZero||0;
}

function annotateEpisodes(S,P){
  if(!P.relationField) return;
  const dir=currentOrientation(S);
  for(const ep of P.relationField.episodes||[]){
    if(ep.flowDir==null) ep.flowDir=dir;
  }
}

function flowActiveEpisodes(S,P){
  if(!P.relationField||MODELS[S.key].kind!=='oasis'||!MODELS[S.key].rel) return [];
  const dir=currentOrientation(S);
  if(dir===0) return [];
  return (P.relationField.episodes||[]).filter(ep=>ep.flowDir===dir);
}

function flowRelevantToPlace(S,P,id){
  const gate=places[id]?.gate;
  return flowActiveEpisodes(S,P).some(ep=>
    ep.places?.includes(id)||(gate&&(ep.a===gate||ep.b===gate))
  );
}

function flowHasPair(S,P,a,b){
  const k=[a,b].sort().join('↔');
  return flowActiveEpisodes(S,P).some(ep=>ep.key===k);
}

mkW=function(k){
  const S=rfMkW(k);
  S.realityFlow={edges:[],lastNonZero:0,observations:0};
  Object.assign(S.c,{realityFlowObservation:0,realityFlowRelationActivation:0});
  return S;
};

tickW=function(S,e){
  const before=S.danger;
  rfTickW(S,e);
  const dir=observe(S,before,S.danger,E.tick,'tick');
  S.c.realityFlowObservation++;
  if(dir!==0&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel){
    for(const P of S.parties){
      const active=flowActiveEpisodes(S,P);
      const sig=active.map(ep=>ep.key).sort().join('|');
      if(P._lastRealityFlowActive!==sig){
        if(sig) S.c.realityFlowRelationActivation++;
        P._lastRealityFlowActive=sig;
      }
    }
  }
};

outcome=function(S,P,id){
  rfOutcome(S,P,id);
  annotateEpisodes(S,P);
};

participants=function(S,P,useRel=1){
  if(!(useRel&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel)) return rfParticipants(S,P,useRel);
  const set=rfParticipants(S,P,0);
  if(flowActiveEpisodes(S,P).length) set.add('마도사');
  return set;
};

memberRank=function(S,P,m,id,useRel=1){
  if(!(useRel&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel)) return rfMemberRank(S,P,m,id,useRel);
  const base=rfMemberRank(S,P,m,id,0);
  const flowRelation=flowRelevantToPlace(S,P,id)?1:0;
  return [base[0]??0,flowRelation,...base.slice(1)];
};

hiddenReady=function(S,P,h){
  if(!(MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel)) return rfHiddenReady(S,P,h);
  if(!P.seenNPC.has(h.npc)) return false;
  if(!h.places.every(id=>P.disc.has(id)||availableOasis(S,P,1).includes(id))) return false;
  if(h.links.length) return h.links.every(n=>flowHasPair(S,P,h.npc,n));
  return relationExists(P,h.npc)&&flowActiveEpisodes(S,P).some(ep=>ep.a===h.npc||ep.b===h.npc);
};

window.OASISRealityFlow={
  orientation,
  observe,
  ingestTrace,
  currentOrientation,
  annotateEpisodes,
  flowActiveEpisodes,
  flowRelevantToPlace
};
})();
