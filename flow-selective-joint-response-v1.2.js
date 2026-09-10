(function(){
const oldMkP=mkP;
const oldOutcome=outcome;
const oldChoose=choose;

function addSet(map,key,id){
  if(key==null||key==='')return;
  if(!map.has(key))map.set(key,new Set());
  map.get(key).add(id);
}

function ensureFlowSelective(P){
  if(P.flowSelective)return P.flowSelective;
  P.flowSelective={
    index:{byId:new Map(),byPlace:new Map(),byChoice:new Map(),byLeader:new Map(),byNpc:new Map()},
    indexedExperienceIds:new Set(),
    indexedRelationFactKeys:new Set(),
    counters:{indexWrites:0,relationFactWrites:0,lookupCalls:0,keyLookups:0,candidateIdsTouched:0},
    lastRecall:null,
    lastJointFrame:null
  };
  return P.flowSelective;
}

function indexExperience(P,e){
  if(!e?.id)return;
  const F=ensureFlowSelective(P);
  if(F.indexedExperienceIds.has(e.id))return;
  F.indexedExperienceIds.add(e.id);
  F.index.byId.set(e.id,e);
  addSet(F.index.byPlace,e.place,e.id);
  addSet(F.index.byChoice,e.choice,e.id);
  addSet(F.index.byLeader,e.leader,e.id);
  F.counters.indexWrites++;
}

function indexRelationFact(P,f){
  if(!f?.experienceId)return;
  const F=ensureFlowSelective(P);
  const k=`${f.experienceId}|${f.t}|${f.npc}|${f.place}`;
  if(F.indexedRelationFactKeys.has(k))return;
  F.indexedRelationFactKeys.add(k);
  addSet(F.index.byNpc,f.npc,f.experienceId);
  F.counters.relationFactWrites++;
}

function rebuildExisting(P){
  const PRS=globalThis.ensurePastRelationalStructure?.(P);
  if(!PRS)return;
  for(const e of PRS.realizedExperiences||[])indexExperience(P,e);
  for(const f of PRS.relationFacts||[])indexRelationFact(P,f);
}

function currentRelationalKeys(S,P){
  const here=currentPlace(P);
  const target=P.target;
  const keys=[];
  if(here)keys.push(['place',here]);
  if(target){keys.push(['place',target]);keys.push(['choice',target]);}
  if(P.leader)keys.push(['leader',P.leader]);
  const gate=target?places[target]?.gate:null;
  if(gate)keys.push(['npc',gate]);
  for(const [npc,place] of npcs)if(place===here)keys.push(['npc',npc]);
  const seen=new Set();
  return keys.filter(([type,value])=>{const k=`${type}:${value}`;if(seen.has(k))return false;seen.add(k);return true;});
}

function setFor(F,type,value){
  if(type==='place')return F.index.byPlace.get(value);
  if(type==='choice')return F.index.byChoice.get(value);
  if(type==='leader')return F.index.byLeader.get(value);
  if(type==='npc')return F.index.byNpc.get(value);
  return null;
}

function selectiveRecall(S,P){
  const F=ensureFlowSelective(P);
  const keys=currentRelationalKeys(S,P);
  const ids=new Set();
  F.counters.lookupCalls++;
  for(const [type,value] of keys){
    F.counters.keyLookups++;
    const bucket=setFor(F,type,value);
    if(bucket)for(const id of bucket)ids.add(id);
  }
  F.counters.candidateIdsTouched+=ids.size;
  const experiences=[...ids].map(id=>F.index.byId.get(id)).filter(Boolean).sort((a,b)=>(a.t-b.t)||String(a.id).localeCompare(String(b.id)));
  F.lastRecall={tick:E.tick,keys:keys.map(([t,v])=>`${t}:${v}`),experienceIds:experiences.map(e=>e.id),totalPast:F.index.byId.size,accessed:experiences.length};
  return {keys:F.lastRecall.keys,experiences,totalPast:F.index.byId.size,accessed:experiences.length};
}

function fullScanReference(S,P){
  const PRS=ensurePastRelationalStructure(P);
  const keys=currentRelationalKeys(S,P);
  const keySet=new Set(keys.map(([t,v])=>`${t}:${v}`));
  const npcByExperience=new Map();
  for(const f of PRS.relationFacts||[]){
    if(!npcByExperience.has(f.experienceId))npcByExperience.set(f.experienceId,new Set());
    npcByExperience.get(f.experienceId).add(f.npc);
  }
  const ids=[];
  for(const e of PRS.realizedExperiences||[]){
    let match=false;
    if(keySet.has(`place:${e.place}`))match=true;
    if(keySet.has(`choice:${e.choice}`))match=true;
    if(e.leader&&keySet.has(`leader:${e.leader}`))match=true;
    if(!match){
      for(const npc of npcByExperience.get(e.id)||[])if(keySet.has(`npc:${npc}`)){match=true;break;}
    }
    if(match)ids.push(e.id);
  }
  return ids.sort();
}

function jointInputFrame(S,P){
  const recall=selectiveRecall(S,P);
  const possibility=sig(evalP(S,P,1));
  const frame={
    realityVersion:E.tick,
    relationalKeys:[...recall.keys],
    recalledExperienceIds:recall.experiences.map(e=>e.id),
    possibility:{choice:possibility.choice||null,candidates:possibility.cands||'',leader:possibility.leader||''},
    responsibility:{U:null,I:null,V:null,T:null,status:'NOT_OPERATIONALIZED_STAGE_A'},
    actionAuthority:'OBSERVE_ONLY_STAGE_A'
  };
  ensureFlowSelective(P).lastJointFrame=frame;
  return frame;
}

mkP=function(d){
  const P=oldMkP(d);
  ensureFlowSelective(P);
  rebuildExisting(P);
  return P;
};

outcome=function(S,P,id){
  const beforeExp=ensurePastRelationalStructure(P).realizedExperiences.length;
  const beforeFact=ensurePastRelationalStructure(P).relationFacts.length;
  oldOutcome(S,P,id);
  if(MODELS[S.key].kind!=='oasis'||!MODELS[S.key].fb)return;
  const PRS=ensurePastRelationalStructure(P);
  for(const e of PRS.realizedExperiences.slice(beforeExp))indexExperience(P,e);
  for(const f of PRS.relationFacts.slice(beforeFact))indexRelationFact(P,f);
};

choose=function(S,P){
  if(MODELS[S.key].kind==='oasis'&&MODELS[S.key].fb)jointInputFrame(S,P);
  return oldChoose(S,P);
};

for(const S of Object.values(E?.worlds||{}))for(const P of S.parties||[]){ensureFlowSelective(P);rebuildExisting(P);}

globalThis.oasisFlowSelectiveV12={
  ensureFlowSelective,
  currentRelationalKeys,
  selectiveRecall,
  fullScanReference,
  jointInputFrame,
  version:'1.2-r1-stageA'
};
})();
