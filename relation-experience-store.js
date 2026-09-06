(function(){
const baseMkP=mkP;
const baseMkW=mkW;
const baseOutcome=outcome;

function ensureField(P){
  if(!P.relationField) P.relationField={episodes:[],active:[],activations:0,recombinations:0,spirals:0,lastActivationTick:null};
  if(!Array.isArray(P.relationField.episodes)) P.relationField.episodes=[];
  return P.relationField;
}
function pairKey(a,b){return[a,b].sort().join('↔')}
function recentRelations(P){return P.relationHistory.slice(-18)}
function composeField(S,P,newEvents){
  if(MODELS[S.key].kind!=='oasis'||!MODELS[S.key].rel||!MODELS[S.key].fb)return;
  const F=ensureField(P),prior=recentRelations(P);
  for(const cur of newEvents){
    for(const prev of prior){
      if(prev===cur||prev.npc===cur.npc)continue;
      const ep={t:E.tick,key:pairKey(prev.npc,cur.npc),a:prev.npc,b:cur.npc,places:[prev.place,cur.place],from:[prev.t,cur.t]};
      const duplicate=F.episodes.some(x=>x.key===ep.key&&x.from[0]===ep.from[0]&&x.from[1]===ep.from[1]);
      if(!duplicate){
        F.episodes.push(ep);F.recombinations++;
        S.c.relationRecombination=(S.c.relationRecombination||0)+1;
        log(S,`${P.name}: [인연경험저장] 완결 경험 재조합 ${ep.key}`);
      }
    }
  }
  F.episodes=F.episodes.slice(-80);
}

mkP=function(d){const P=baseMkP(d);ensureField(P);return P};
mkW=function(k){
  const S=baseMkW(k);if(!S.c)S.c={};
  if(!Number.isFinite(S.c.relationRecombination))S.c.relationRecombination=0;
  return S;
};
outcome=function(S,P,id){
  ensureField(P);
  const before=P.relationHistory.length;
  baseOutcome(S,P,id);
  const newEvents=P.relationHistory.slice(before);
  if(newEvents.length)composeField(S,P,newEvents);
};

for(const S of Object.values(E?.worlds||{})){
  if(!S.c)S.c={};
  if(!Number.isFinite(S.c.relationRecombination))S.c.relationRecombination=0;
  for(const P of S.parties||[])ensureField(P);
}

window.OASISRelationExperienceStore={ensureField,composeField,pairKey};
})();
