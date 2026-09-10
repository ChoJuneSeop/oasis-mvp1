(function(){
const prsOldMkP=mkP;
const prsOldOutcome=outcome;
const prsOldRelationExists=relationExists;

function ensurePastRelationalStructure(P){
  if(!P.pastRelationalStructure){
    P.pastRelationalStructure={seq:0,realizedExperiences:[],relationFacts:[]};
  }
  return P.pastRelationalStructure;
}

globalThis.ensurePastRelationalStructure=ensurePastRelationalStructure;

mkP=function(d){
  const P=prsOldMkP(d);
  ensurePastRelationalStructure(P);
  return P;
};

relationExists=function(P,n){
  const PRS=ensurePastRelationalStructure(P);
  return PRS.relationFacts.some(e=>e.npc===n)||prsOldRelationExists(P,n);
};

outcome=function(S,P,id){
  const PRS=ensurePastRelationalStructure(P);
  const relationBefore=P.relationHistory.length;
  const realizationContext={
    choice:P.target,
    leader:P.leader,
    candidates:P.last,
    danger:S.danger,
    place:id
  };

  prsOldOutcome(S,P,id);

  if(MODELS[S.key].kind==='oasis'&&MODELS[S.key].fb){
    const experienceId=`${P.id}|R${++PRS.seq}`;
    const experience={
      id:experienceId,
      t:E.tick,
      place:id,
      choice:realizationContext.choice,
      leader:realizationContext.leader,
      candidates:realizationContext.candidates,
      danger:realizationContext.danger,
      kind:'realized_experience'
    };
    PRS.realizedExperiences.push(experience);
    P.lastRealizedExperienceId=experienceId;

    const newRelationFacts=P.relationHistory.slice(relationBefore);
    for(const e of newRelationFacts){
      PRS.relationFacts.push({
        experienceId,
        t:e.t,
        npc:e.npc,
        place:e.place,
        kind:'npc_relation_fact'
      });
    }
  }
};

for(const S of Object.values(E?.worlds||{})){
  for(const P of S.parties||[])ensurePastRelationalStructure(P);
}
})();
