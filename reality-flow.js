(function(){
const realityOldMkP=mkP;
const realityOldOutcome=outcome;

function clonePlain(x){return x==null?x:JSON.parse(JSON.stringify(x));}
function ensureRealityFields(P){
  if(!Number.isInteger(P.realizationSeq))P.realizationSeq=0;
  if(!Array.isArray(P.realizedExperienceHistory))P.realizedExperienceHistory=[];
  if(!P.realityContinuity||typeof P.realityContinuity!=='object'){
    P.realityContinuity={version:0,completedExperienceIds:[],lastExperienceId:null};
  }
  if(!Array.isArray(P.realityContinuity.completedExperienceIds))P.realityContinuity.completedExperienceIds=[];
  if(!Number.isInteger(P.realityContinuity.version))P.realityContinuity.version=P.realityContinuity.completedExperienceIds.length;
  if(!('lastExperienceId' in P.realityContinuity))P.realityContinuity.lastExperienceId=P.realityContinuity.completedExperienceIds.at(-1)||null;
  return P;
}

mkP=function(d){
  return ensureRealityFields(realityOldMkP(d));
};

outcome=function(S,P,id){
  ensureRealityFields(P);
  const beforeRelationLen=P.relationHistory?.length||0;
  const beforeDisc=P.disc?new Set(P.disc):new Set();
  const beforeSeen=P.seenNPC?new Set(P.seenNPC):new Set();
  const beforeVis={...(P.vis||{})};
  const sourceChoice=P.choiceHistory?.length?P.choiceHistory[P.choiceHistory.length-1]:null;
  const pre={
    tick:E.tick,
    danger:S.danger,
    target:P.target,
    leader:P.leader,
    currentPlace:typeof currentPlace==='function'?currentPlace(P):null,
    sourceChoice:clonePlain(sourceChoice)
  };

  realityOldOutcome(S,P,id);

  const experienceId=`${P.id}:E${++P.realizationSeq}`;
  const newRelationRows=(P.relationHistory||[]).slice(beforeRelationLen);
  for(const row of newRelationRows)row.sourceExperienceId=experienceId;

  const experience={
    id:experienceId,
    tick:E.tick,
    realizedTarget:id,
    realizedPlace:id,
    pre,
    post:{
      danger:S.danger,
      target:P.target,
      leader:P.leader,
      currentPlace:typeof currentPlace==='function'?currentPlace(P):null
    },
    stateChanges:{
      discoveredAdded:P.disc?[...P.disc].filter(x=>!beforeDisc.has(x)):[],
      seenNPCAdded:P.seenNPC?[...P.seenNPC].filter(x=>!beforeSeen.has(x)):[],
      visitCountBefore:Number(beforeVis[id]||0),
      visitCountAfter:Number(P.vis?.[id]||0),
      relationEntriesAdded:newRelationRows.length
    }
  };

  P.realizedExperienceHistory.push(experience);
  P.realityContinuity.version++;
  P.realityContinuity.completedExperienceIds.push(experienceId);
  P.realityContinuity.lastExperienceId=experienceId;
};

if(globalThis.E?.worlds){
  for(const S of Object.values(E.worlds||{}))for(const P of S.parties||[])ensureRealityFields(P);
}
})();
