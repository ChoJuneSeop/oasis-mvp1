(function(){
const rfOldMkP=mkP, rfOldMkW=mkW, rfOldOutcome=outcome, rfOldParticipants=participants, rfOldMemberRank=memberRank, rfOldHiddenReady=hiddenReady, rfOldChoose=choose, rfOldRender=render;

mkP=function(d){
  const P=rfOldMkP(d);
  P.relationField={episodes:[],active:[],activations:0,recombinations:0,spirals:0,lastActivationTick:null};
  P.pendingFieldChoice=null;
  return P;
};

mkW=function(k){
  const S=rfOldMkW(k);
  Object.assign(S.c,{relationFieldActivation:0,relationRecombination:0,relationFieldSpiral:0});
  return S;
};

function pairKey(a,b){return [a,b].sort().join('↔')}
function recentRelations(P){return P.relationHistory.slice(-18)}
function composeField(S,P,newEvents){
  if(MODELS[S.key].kind!=='oasis'||!MODELS[S.key].rel||!MODELS[S.key].fb)return;
  const prior=recentRelations(P);
  for(const cur of newEvents){
    for(const prev of prior){
      if(prev===cur||prev.npc===cur.npc)continue;
      const ep={t:E.tick,key:pairKey(prev.npc,cur.npc),a:prev.npc,b:cur.npc,places:[prev.place,cur.place],from:[prev.t,cur.t]};
      const duplicate=P.relationField.episodes.some(x=>x.key===ep.key&&x.from[0]===ep.from[0]&&x.from[1]===ep.from[1]);
      if(!duplicate){
        P.relationField.episodes.push(ep);
        P.relationField.recombinations++;
        S.c.relationRecombination++;
        log(S,`${P.name}: [인연필드] 완결 경험 재조합 ${ep.key}`);
      }
    }
  }
  P.relationField.episodes=P.relationField.episodes.slice(-80);
}

function activeField(S,P){
  if(!P.relationField||MODELS[S.key].kind!=='oasis'||!MODELS[S.key].rel)return [];
  const here=currentPlace(P), target=P.target;
  const active=P.relationField.episodes.filter(ep=>{
    if(E.tick-ep.t>1200)return false;
    if(ep.places.includes(here)||ep.places.includes(target))return true;
    if(ep.places.some(id=>Math.abs((places[id]?.r||0)-S.danger)<=0.18))return true;
    const gate=places[target]?.gate;
    return !!gate&&(ep.a===gate||ep.b===gate);
  });
  const keys=[...new Set(active.map(x=>x.key))];
  const prev=(P.relationField.active||[]).join('|');
  P.relationField.active=keys;
  if(keys.length&&keys.join('|')!==prev){
    P.relationField.activations++;
    P.relationField.lastActivationTick=E.tick;
    S.c.relationFieldActivation++;
    log(S,`${P.name}: [인연필드] 현재 흐름에서 ${keys.length}개 관계 재활성화`);
  }
  return active;
}

function fieldHasPair(S,P,a,b){
  const k=pairKey(a,b);
  return activeField(S,P).some(ep=>ep.key===k);
}
function fieldTouchesNPC(S,P,n){return activeField(S,P).some(ep=>ep.a===n||ep.b===n)}
function fieldRelevantToPlace(S,P,id){
  const gate=places[id]?.gate;
  return activeField(S,P).some(ep=>ep.places.includes(id)||(gate&&(ep.a===gate||ep.b===gate)));
}

hiddenReady=function(S,P,h){
  if(MODELS[S.key].kind!=='oasis'||!MODELS[S.key].rel)return rfOldHiddenReady(S,P,h);
  if(!P.seenNPC.has(h.npc))return false;
  if(!h.places.every(id=>P.disc.has(id)||availableOasis(S,P,1).includes(id)))return false;
  if(h.links.length){
    return h.links.every(n=>fieldHasPair(S,P,h.npc,n));
  }
  return relationExists(P,h.npc)&&fieldTouchesNPC(S,P,h.npc);
};

participants=function(S,P,useRel=1){
  if(!(useRel&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel))return rfOldParticipants(S,P,useRel);
  const set=rfOldParticipants(S,P,0);
  const active=activeField(S,P);
  if(!active.length)return set;
  if(S.danger>=0.38){set.add('전사');set.add('치유사')}else set.add('정찰자');
  if(active.some(ep=>ep.a===places[P.target]?.gate||ep.b===places[P.target]?.gate||ep.places.includes(P.target)))set.add('마도사');
  return set;
};

memberRank=function(S,P,m,id,useRel=1){
  if(!(useRel&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel))return rfOldMemberRank(S,P,m,id,useRel);
  const base=rfOldMemberRank(S,P,m,id,0);
  const fieldFit=fieldRelevantToPlace(S,P,id)?1:0;
  return [base[0]??0,fieldFit,...base.slice(1)];
};

outcome=function(S,P,id){
  const beforeRel=P.relationHistory.length;
  const beforeSig=sig(evalP(S,P,1));
  rfOldOutcome(S,P,id);
  const newEvents=P.relationHistory.slice(beforeRel);
  if(newEvents.length)composeField(S,P,newEvents);
  const active=activeField(S,P);
  if(active.length&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel)refreshHidden(S,P);
  const afterSig=sig(evalP(S,P,1));
  if(P.pendingFieldChoice===id&&changedSig(beforeSig,afterSig)){
    P.relationField.spirals++;
    S.c.relationFieldSpiral++;
    S.c.relationSpiral++;
    P.pendingFieldChoice=null;
    log(S,`${P.name}: [인연필드] 관계 재조합 선택의 결과가 다음 판단조건을 변경`);
  }
};

choose=function(S,P){
  if(MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel)activeField(S,P);
  rfOldChoose(S,P);
  if(MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel&&fieldRelevantToPlace(S,P,P.target)){
    P.pendingFieldChoice=P.target;
    log(S,`${P.name}: [인연필드] 재활성 관계가 실제 선택 ${places[P.target]?.n||P.target}에 참여`);
  }
};

function ensureRelationFieldPanel(){
  if(document.getElementById('relationFieldCard'))return;
  const sec=document.createElement('section');sec.className='card';sec.id='relationFieldCard';
  sec.innerHTML='<h2>인연필드 활성 관측</h2><div class="note" id="relationFieldSummary"></div>';
  document.querySelector('.right').appendChild(sec);
}
render=function(){
  rfOldRender();ensureRelationFieldPanel();
  const S=E.worlds[focus],P=S.parties.find(x=>x.id===focusParty),F=P.relationField;
  const active=(F?.active||[]).join(', ')||'현재 재활성 관계 없음';
  document.getElementById('relationFieldSummary').innerHTML=`<b>${P.name} · ${MODELS[focus].n}</b><br>경험 재조합 ${F?.recombinations||0} · 현재흐름 활성 ${F?.activations||0} · 필드나선 ${F?.spirals||0}<br>활성 관계: ${active}`;
};

reset();
})();
