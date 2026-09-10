(function(){
const oldMkP=mkP;
const oldOutcome=outcome;
const oldChoose=choose;

function addSet(map,key,id){
  if(key==null||key==='')return;
  if(!map.has(key))map.set(key,new Set());
  map.get(key).add(id);
}
function direction(from,to){
  if(!Number.isFinite(from)||!Number.isFinite(to))return null;
  return to>from?'up':to<from?'down':'same';
}
function ensureFlowSelective(P){
  if(P.flowSelective)return P.flowSelective;
  P.flowSelective={
    index:{
      byId:new Map(),byPlace:new Map(),byChoice:new Map(),byLeader:new Map(),byNpc:new Map(),
      byPlaceTransition:new Map(),byChoiceTransition:new Map(),byLeaderTransition:new Map(),byDangerDirection:new Map()
    },
    indexedExperienceIds:new Set(),indexedRelationFactKeys:new Set(),lastIndexedExperienceId:null,
    counters:{indexWrites:0,relationFactWrites:0,transitionWrites:0,lookupCalls:0,keyLookups:0,candidateIdsTouched:0},
    lastRecall:null,lastJointFrame:null
  };
  return P.flowSelective;
}
function indexExperience(P,e){
  if(!e?.id)return;
  const F=ensureFlowSelective(P);
  if(F.indexedExperienceIds.has(e.id))return;
  const prev=F.lastIndexedExperienceId?F.index.byId.get(F.lastIndexedExperienceId):null;
  F.indexedExperienceIds.add(e.id);
  F.index.byId.set(e.id,e);
  addSet(F.index.byPlace,e.place,e.id);
  addSet(F.index.byChoice,e.choice,e.id);
  addSet(F.index.byLeader,e.leader,e.id);
  if(prev){
    if(prev.place&&e.place)addSet(F.index.byPlaceTransition,`${prev.place}->${e.place}`,e.id);
    if(prev.choice&&e.choice)addSet(F.index.byChoiceTransition,`${prev.choice}->${e.choice}`,e.id);
    if(prev.leader&&e.leader)addSet(F.index.byLeaderTransition,`${prev.leader}->${e.leader}`,e.id);
    const d=direction(prev.danger,e.danger);if(d)addSet(F.index.byDangerDirection,d,e.id);
    F.counters.transitionWrites++;
  }
  F.lastIndexedExperienceId=e.id;
  F.counters.indexWrites++;
}
function indexRelationFact(P,f){
  if(!f?.experienceId)return;
  const F=ensureFlowSelective(P),k=`${f.experienceId}|${f.t}|${f.npc}|${f.place}`;
  if(F.indexedRelationFactKeys.has(k))return;
  F.indexedRelationFactKeys.add(k);addSet(F.index.byNpc,f.npc,f.experienceId);F.counters.relationFactWrites++;
}
function rebuildExisting(P){
  const PRS=globalThis.ensurePastRelationalStructure?.(P);if(!PRS)return;
  for(const e of PRS.realizedExperiences||[])indexExperience(P,e);
  for(const f of PRS.relationFacts||[])indexRelationFact(P,f);
}
function currentRelationalKeys(S,P){
  const F=ensureFlowSelective(P),here=currentPlace(P),target=P.target,keys=[];
  if(here)keys.push(['place',here]);
  if(target){keys.push(['place',target]);keys.push(['choice',target]);}
  if(P.leader)keys.push(['leader',P.leader]);
  const gate=target?places[target]?.gate:null;if(gate)keys.push(['npc',gate]);
  for(const [npc,place] of npcs)if(place===here)keys.push(['npc',npc]);
  const prev=F.lastIndexedExperienceId?F.index.byId.get(F.lastIndexedExperienceId):null;
  if(prev){
    if(prev.place&&here)keys.push(['placeTransition',`${prev.place}->${here}`]);
    if(prev.choice&&target)keys.push(['choiceTransition',`${prev.choice}->${target}`]);
    if(prev.leader&&P.leader)keys.push(['leaderTransition',`${prev.leader}->${P.leader}`]);
    const d=direction(prev.danger,S.danger);if(d)keys.push(['dangerDirection',d]);
  }
  const seen=new Set();return keys.filter(([type,value])=>{const k=`${type}:${value}`;if(seen.has(k))return false;seen.add(k);return true;});
}
function setFor(F,type,value){
  const m={place:'byPlace',choice:'byChoice',leader:'byLeader',npc:'byNpc',placeTransition:'byPlaceTransition',choiceTransition:'byChoiceTransition',leaderTransition:'byLeaderTransition',dangerDirection:'byDangerDirection'}[type];
  return m?F.index[m].get(value):null;
}
function selectiveRecall(S,P){
  const F=ensureFlowSelective(P),keys=currentRelationalKeys(S,P),ids=new Set();F.counters.lookupCalls++;
  for(const [type,value] of keys){F.counters.keyLookups++;const bucket=setFor(F,type,value);if(bucket)for(const id of bucket)ids.add(id);}
  F.counters.candidateIdsTouched+=ids.size;
  const experiences=[...ids].map(id=>F.index.byId.get(id)).filter(Boolean).sort((a,b)=>(a.t-b.t)||String(a.id).localeCompare(String(b.id)));
  const named=keys.map(([t,v])=>`${t}:${v}`),flowKeyCount=keys.filter(([t])=>t.endsWith('Transition')||t==='dangerDirection').length;
  F.lastRecall={tick:E.tick,keys:named,flowKeyCount,experienceIds:experiences.map(e=>e.id),totalPast:F.index.byId.size,accessed:experiences.length};
  return {keys:named,flowKeyCount,experiences,totalPast:F.index.byId.size,accessed:experiences.length};
}
function fullScanReference(S,P){
  const PRS=ensurePastRelationalStructure(P),keys=currentRelationalKeys(S,P),keySet=new Set(keys.map(([t,v])=>`${t}:${v}`)),npcByExperience=new Map();
  for(const f of PRS.relationFacts||[]){if(!npcByExperience.has(f.experienceId))npcByExperience.set(f.experienceId,new Set());npcByExperience.get(f.experienceId).add(f.npc);}
  const ids=[],rows=PRS.realizedExperiences||[];
  for(let i=0;i<rows.length;i++){
    const e=rows[i],prev=i?rows[i-1]:null;let match=false;
    if(keySet.has(`place:${e.place}`)||keySet.has(`choice:${e.choice}`)||(e.leader&&keySet.has(`leader:${e.leader}`)))match=true;
    if(!match&&prev){
      if(prev.place&&e.place&&keySet.has(`placeTransition:${prev.place}->${e.place}`))match=true;
      if(prev.choice&&e.choice&&keySet.has(`choiceTransition:${prev.choice}->${e.choice}`))match=true;
      if(prev.leader&&e.leader&&keySet.has(`leaderTransition:${prev.leader}->${e.leader}`))match=true;
      const d=direction(prev.danger,e.danger);if(d&&keySet.has(`dangerDirection:${d}`))match=true;
    }
    if(!match)for(const npc of npcByExperience.get(e.id)||[])if(keySet.has(`npc:${npc}`)){match=true;break;}
    if(match)ids.push(e.id);
  }
  return ids.sort();
}
function jointInputFrame(S,P){
  const recall=selectiveRecall(S,P),frame={realityVersion:E.tick,relationalKeys:[...recall.keys],flowKeyCount:recall.flowKeyCount,recalledExperienceIds:recall.experiences.map(e=>e.id),possibility:{status:'NOT_OPERATIONALIZED_STAGE_A'},responsibility:{U:null,I:null,V:null,T:null,status:'NOT_OPERATIONALIZED_STAGE_A'},actionAuthority:'OBSERVE_ONLY_STAGE_A'};
  ensureFlowSelective(P).lastJointFrame=frame;return frame;
}
mkP=function(d){const P=oldMkP(d);ensureFlowSelective(P);rebuildExisting(P);return P;};
outcome=function(S,P,id){
  const PRS0=ensurePastRelationalStructure(P),beforeExp=PRS0.realizedExperiences.length,beforeFact=PRS0.relationFacts.length;oldOutcome(S,P,id);
  if(MODELS[S.key].kind!=='oasis'||!MODELS[S.key].fb)return;
  const PRS=ensurePastRelationalStructure(P);for(const e of PRS.realizedExperiences.slice(beforeExp))indexExperience(P,e);for(const f of PRS.relationFacts.slice(beforeFact))indexRelationFact(P,f);
};
choose=function(S,P){if(MODELS[S.key].kind==='oasis'&&MODELS[S.key].fb)jointInputFrame(S,P);return oldChoose(S,P);};
for(const S of Object.values(E?.worlds||{}))for(const P of S.parties||[]){ensureFlowSelective(P);rebuildExisting(P);}
globalThis.oasisFlowSelectiveV12={ensureFlowSelective,currentRelationalKeys,selectiveRecall,fullScanReference,jointInputFrame,direction,version:'1.2-r3-stageA'};
})();
