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
      byPlaceTransition:new Map(),byChoiceTransition:new Map(),byLeaderTransition:new Map(),byDangerDirection:new Map(),
      predecessorById:new Map()
    },
    indexedExperienceIds:new Set(),indexedRelationFactKeys:new Set(),
    previousIndexedExperienceId:null,lastIndexedExperienceId:null,
    counters:{
      indexWrites:0,relationFactWrites:0,transitionWrites:0,
      lookupCalls:0,keyLookups:0,candidateIdsTouched:0,
      entryLookupCalls:0,entryKeyLookups:0,contextChecks:0
    },
    lastEntry:null,lastJointFrame:null
  };
  return P.flowSelective;
}
function indexExperience(P,e){
  if(!e?.id)return;
  const F=ensureFlowSelective(P);
  if(F.indexedExperienceIds.has(e.id))return;
  const prevId=F.lastIndexedExperienceId;
  const prev=prevId?F.index.byId.get(prevId):null;
  F.indexedExperienceIds.add(e.id);
  F.index.byId.set(e.id,e);
  F.index.predecessorById.set(e.id,prevId||null);
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
  F.previousIndexedExperienceId=prevId;
  F.lastIndexedExperienceId=e.id;
  F.counters.indexWrites++;
}
function indexRelationFact(P,f){
  if(!f?.experienceId)return;
  const F=ensureFlowSelective(P),k=`${f.experienceId}|${f.t}|${f.npc}|${f.place}`;
  if(F.indexedRelationFactKeys.has(k))return;
  F.indexedRelationFactKeys.add(k);
  addSet(F.index.byNpc,f.npc,f.experienceId);
  F.counters.relationFactWrites++;
}
function rebuildExisting(P){
  const PRS=globalThis.ensurePastRelationalStructure?.(P);if(!PRS)return;
  for(const e of PRS.realizedExperiences||[])indexExperience(P,e);
  for(const f of PRS.relationFacts||[])indexRelationFact(P,f);
}
function completedFlowPair(P){
  const F=ensureFlowSelective(P);
  const from=F.previousIndexedExperienceId?F.index.byId.get(F.previousIndexedExperienceId):null;
  const to=F.lastIndexedExperienceId?F.index.byId.get(F.lastIndexedExperienceId):null;
  return {from,to};
}

// Stage-A domain operationalization:
// concrete reality contacts open an entry candidate set; broader flow descriptors
// contextualize those entries but do not independently summon past experiences.
// This split is not asserted as a universal OASIS variable taxonomy.
function currentRelationalFrame(S,P){
  const here=currentPlace(P),target=P.target,entryKeys=[],contextKeys=[];
  if(here)entryKeys.push(['place',here]);
  if(target){entryKeys.push(['place',target]);entryKeys.push(['choice',target]);}
  const gate=target?places[target]?.gate:null;if(gate)entryKeys.push(['npc',gate]);
  for(const [npc,place] of npcs)if(place===here)entryKeys.push(['npc',npc]);

  if(P.leader)contextKeys.push(['leader',P.leader]);
  const {from,to}=completedFlowPair(P);
  if(from&&to){
    if(from.place&&to.place)contextKeys.push(['placeTransition',`${from.place}->${to.place}`]);
    if(from.choice&&to.choice)contextKeys.push(['choiceTransition',`${from.choice}->${to.choice}`]);
    if(from.leader&&to.leader)contextKeys.push(['leaderTransition',`${from.leader}->${to.leader}`]);
    const d=direction(from.danger,to.danger);if(d)contextKeys.push(['dangerDirection',d]);
  }
  const unique=rows=>{const seen=new Set();return rows.filter(([type,value])=>{const k=`${type}:${value}`;if(seen.has(k))return false;seen.add(k);return true;});};
  return {entryKeys:unique(entryKeys),contextKeys:unique(contextKeys),here,target};
}
function currentRelationalKeys(S,P){
  const f=currentRelationalFrame(S,P);return [...f.entryKeys,...f.contextKeys];
}
function setFor(F,type,value){
  const m={place:'byPlace',choice:'byChoice',leader:'byLeader',npc:'byNpc',placeTransition:'byPlaceTransition',choiceTransition:'byChoiceTransition',leaderTransition:'byLeaderTransition',dangerDirection:'byDangerDirection'}[type];
  return m?F.index[m].get(value):null;
}
function experienceContextKeys(P,e){
  const F=ensureFlowSelective(P),keys=[];
  if(e?.leader)keys.push(['leader',e.leader]);
  const prevId=e?.id?F.index.predecessorById.get(e.id):null;
  const prev=prevId?F.index.byId.get(prevId):null;
  if(prev&&e){
    if(prev.place&&e.place)keys.push(['placeTransition',`${prev.place}->${e.place}`]);
    if(prev.choice&&e.choice)keys.push(['choiceTransition',`${prev.choice}->${e.choice}`]);
    if(prev.leader&&e.leader)keys.push(['leaderTransition',`${prev.leader}->${e.leader}`]);
    const d=direction(prev.danger,e.danger);if(d)keys.push(['dangerDirection',d]);
  }
  return keys;
}
function entryCandidates(S,P){
  const F=ensureFlowSelective(P),frame=currentRelationalFrame(S,P),ids=new Set();
  F.counters.lookupCalls++;F.counters.entryLookupCalls++;
  for(const [type,value] of frame.entryKeys){
    F.counters.keyLookups++;F.counters.entryKeyLookups++;
    const bucket=setFor(F,type,value);if(bucket)for(const id of bucket)ids.add(id);
  }
  F.counters.candidateIdsTouched+=ids.size;
  const experiences=[...ids].map(id=>F.index.byId.get(id)).filter(Boolean).sort((a,b)=>(a.t-b.t)||String(a.id).localeCompare(String(b.id)));
  const out={
    status:'ENTRY_CANDIDATES_ONLY_NOT_FINAL_RECALL',
    entryKeys:frame.entryKeys.map(([t,v])=>`${t}:${v}`),
    contextKeys:frame.contextKeys.map(([t,v])=>`${t}:${v}`),
    experiences,totalPast:F.index.byId.size,accessed:experiences.length
  };
  F.lastEntry={tick:E.tick,...out,experienceIds:experiences.map(e=>e.id)};
  return out;
}
function contextualizeEntries(S,P,entry=null){
  const F=ensureFlowSelective(P),base=entry||entryCandidates(S,P),frame=currentRelationalFrame(S,P),current=new Set(frame.contextKeys.map(([t,v])=>`${t}:${v}`));
  const rows=base.experiences.map(e=>{
    F.counters.contextChecks++;
    const matched=experienceContextKeys(P,e).map(([t,v])=>`${t}:${v}`).filter(k=>current.has(k));
    return {experience:e,matchedContextKeys:matched};
  });
  return {status:'CONTEXTUALIZED_ENTRY_CANDIDATES_NOT_FINAL_COMPOSITION',rows,contextKeys:[...current]};
}
function selectiveRecall(S,P){
  // Compatibility alias for diagnostic scripts. Semantically this is Entry(), not final recall.
  const e=entryCandidates(S,P);
  return {keys:e.entryKeys,contextKeys:e.contextKeys,flowKeyCount:e.contextKeys.filter(k=>k.startsWith('placeTransition:')||k.startsWith('choiceTransition:')||k.startsWith('leaderTransition:')||k.startsWith('dangerDirection:')).length,experiences:e.experiences,totalPast:e.totalPast,accessed:e.accessed,status:e.status};
}
function fullScanReference(S,P){
  // Independent full-scan oracle for Entry() semantics only.
  const PRS=ensurePastRelationalStructure(P),frame=currentRelationalFrame(S,P),keySet=new Set(frame.entryKeys.map(([t,v])=>`${t}:${v}`)),npcByExperience=new Map();
  for(const f of PRS.relationFacts||[]){if(!npcByExperience.has(f.experienceId))npcByExperience.set(f.experienceId,new Set());npcByExperience.get(f.experienceId).add(f.npc);}
  const ids=[];
  for(const e of PRS.realizedExperiences||[]){
    let match=keySet.has(`place:${e.place}`)||keySet.has(`choice:${e.choice}`);
    if(!match)for(const npc of npcByExperience.get(e.id)||[])if(keySet.has(`npc:${npc}`)){match=true;break;}
    if(match)ids.push(e.id);
  }
  return ids.sort();
}
function jointInputFrame(S,P){
  const entry=entryCandidates(S,P),context=contextualizeEntries(S,P,entry),frame={
    realityVersion:E.tick,
    entryStatus:entry.status,
    entryKeys:[...entry.entryKeys],contextKeys:[...entry.contextKeys],
    entryCandidateExperienceIds:entry.experiences.map(e=>e.id),
    contextualizedEntryCount:context.rows.filter(r=>r.matchedContextKeys.length).length,
    expansion:{status:'NOT_OPERATIONALIZED_STAGE_A'},
    composition:{status:'NOT_OPERATIONALIZED_STAGE_A'},
    possibility:{status:'NOT_OPERATIONALIZED_STAGE_A'},
    responsibility:{U:null,I:null,V:null,T:null,status:'NOT_OPERATIONALIZED_STAGE_A'},
    actionAuthority:'OBSERVE_ONLY_STAGE_A'
  };
  ensureFlowSelective(P).lastJointFrame=frame;return frame;
}
mkP=function(d){const P=oldMkP(d);ensureFlowSelective(P);rebuildExisting(P);return P;};
outcome=function(S,P,id){
  const PRS0=ensurePastRelationalStructure(P),beforeExp=PRS0.realizedExperiences.length,beforeFact=PRS0.relationFacts.length;
  oldOutcome(S,P,id);
  if(MODELS[S.key].kind!=='oasis'||!MODELS[S.key].fb)return;
  const PRS=ensurePastRelationalStructure(P);
  for(const e of PRS.realizedExperiences.slice(beforeExp))indexExperience(P,e);
  for(const f of PRS.relationFacts.slice(beforeFact))indexRelationFact(P,f);
};
choose=function(S,P){if(MODELS[S.key].kind==='oasis'&&MODELS[S.key].fb)jointInputFrame(S,P);return oldChoose(S,P);};
for(const S of Object.values(E?.worlds||{}))for(const P of S.parties||[]){ensureFlowSelective(P);rebuildExisting(P);}
globalThis.oasisFlowSelectiveV12={
  ensureFlowSelective,indexExperience,indexRelationFact,currentRelationalFrame,currentRelationalKeys,
  entryCandidates,contextualizeEntries,experienceContextKeys,selectiveRecall,fullScanReference,
  jointInputFrame,direction,completedFlowPair,version:'1.2-r9-stageA'
};
})();
