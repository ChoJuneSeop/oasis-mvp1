(function(){
const realityOldMkP=mkP;
const realityOldOutcome=outcome;

function clonePlain(x){return x==null?x:JSON.parse(JSON.stringify(x));}

mkP=function(d){
  const P=realityOldMkP(d);
  P.realizationSeq=0;
  P.realizedExperienceHistory=[];
  P.realityContinuity={
    version:0,
    completedExperienceIds:[],
    lastExperienceId:null
  };
  return P;
};

outcome=function(S,P,id){
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
})();
