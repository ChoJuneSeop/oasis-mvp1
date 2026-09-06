(function(){
const rfOldMkP=mkP, rfOldMkW=mkW, rfOldOutcome=outcome, rfOldParticipants=participants, rfOldMemberRank=memberRank, rfOldHiddenReady=hiddenReady, rfOldChoose=choose, rfOldRender=render;

mkP=function(d){
  const P=rfOldMkP(d);
  P.relationField={
    episodes:[],active:[],activations:0,recombinations:0,spirals:0,lastActivationTick:null,
    flow:{lastTick:null,lastDanger:null,fast:null,slow:null,volatility:.02,need:0,budget:0,lastBudget:0}
  };
  P.pendingFieldChoice=null;
  return P;
};

mkW=function(k){
  const S=rfOldMkW(k);
  Object.assign(S.c,{
    relationFieldActivation:0,relationRecombination:0,relationFieldSpiral:0,
    relationFieldBudgetChange:0,relationFieldBudgetPeak:0
  });
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

// 흐름 책임량(flow responsibility): 이질성 사건을 판정하지 않는다.
// 빠른 흐름과 느린 흐름 사이의 미해소 간격을 최근 변동성으로 정규화해 연속값 need로 누적한다.
// need는 관계 탐색 예산만 조절하며, 정상/이상 라벨이나 고정 위험 임계값은 만들지 않는다.
function updateFlowNeed(S,P){
  const F=P.relationField, X=F.flow;
  if(!F||!X)return 0;
  if(X.lastTick===E.tick)return X.need;
  const x=S.danger;
  if(X.lastDanger==null){
    X.lastDanger=x;X.fast=x;X.slow=x;X.lastTick=E.tick;X.need=0;X.budget=0;return 0;
  }
  const delta=Math.abs(x-X.lastDanger);
  X.fast=.72*X.fast+.28*x;
  X.slow=.985*X.slow+.015*x;
  X.volatility=.94*X.volatility+.06*delta;
  const unresolved=Math.abs(X.fast-X.slow);
  const scale=.035+3*X.volatility;
  const raw=unresolved/(unresolved+scale);
  const targetNeed=raw*raw;
  X.need=.95*X.need+.05*targetNeed;
  X.lastDanger=x;
  X.lastTick=E.tick;

  const maxBudget=Math.min(8,F.episodes.length);
  const nextBudget=Math.min(maxBudget,Math.floor(X.need*(maxBudget+1)));
  if(nextBudget!==X.budget){
    X.lastBudget=X.budget;
    X.budget=nextBudget;
    S.c.relationFieldBudgetChange++;
    S.c.relationFieldBudgetPeak=Math.max(S.c.relationFieldBudgetPeak||0,nextBudget);
    log(S,`${P.name}: [인연필드] 흐름 책임량 ${X.need.toFixed(3)} → 관계 탐색예산 ${nextBudget}`);
  }
  return X.need;
}

function episodeScore(S,P,ep){
  const here=currentPlace(P),target=P.target,age=Math.max(0,E.tick-ep.t);
  const recency=Math.exp(-age/900);
  const placeFit=(ep.places.includes(here)||ep.places.includes(target))?1:0;
  const riskFit=ep.places.reduce((best,id)=>Math.max(best,Math.max(0,1-Math.abs((places[id]?.r||0)-S.danger))),0);
  const gate=places[target]?.gate;
  const gateFit=gate&&(ep.a===gate||ep.b===gate)?1:0;
  return recency*Math.max(placeFit,riskFit,gateFit);
}

function activeField(S,P){
  if(!P.relationField||MODELS[S.key].kind!=='oasis'||!MODELS[S.key].rel)return [];
  updateFlowNeed(S,P);
  const F=P.relationField,budget=F.flow.budget;
  if(!budget){
    const had=(F.active||[]).length>0;
    F.active=[];
    if(had)log(S,`${P.name}: [인연필드] 현재 흐름이 스스로 해소되어 관계 탐색예산 0`);
    return [];
  }
  const active=F.episodes
    .filter(ep=>E.tick-ep.t<=1200)
    .map(ep=>({ep,score:episodeScore(S,P,ep)}))
    .sort((a,b)=>b.score-a.score)
    .slice(0,budget)
    .map(x=>x.ep);
  const keys=[...new Set(active.map(x=>x.key))];
  const prev=(F.active||[]).join('|');
  F.active=keys;
  if(keys.length&&keys.join('|')!==prev){
    F.activations++;
    F.lastActivationTick=E.tick;
    S.c.relationFieldActivation++;
    log(S,`${P.name}: [인연필드] 현재 흐름 책임량에 따라 ${keys.length}개 관계 재활성화`);
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
  const active=activeField(S,P);
  if(!active.length)return 0;
  const matches=active.filter(ep=>ep.places.includes(id)||(gate&&(ep.a===gate||ep.b===gate)));
  if(!matches.length)return 0;
  return Math.max(...matches.map(ep=>episodeScore(S,P,ep)))*(P.relationField.flow.need||0);
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
  // 관계필드가 실제 탐색예산을 얻은 경우에만 관계 해석 주체가 참여한다.
  set.add('마도사');
  return set;
};

memberRank=function(S,P,m,id,useRel=1){
  if(!(useRel&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel))return rfOldMemberRank(S,P,m,id,useRel);
  const base=rfOldMemberRank(S,P,m,id,0);
  const fieldFit=fieldRelevantToPlace(S,P,id);
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
  if(MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel&&fieldRelevantToPlace(S,P,P.target)>0){
    P.pendingFieldChoice=P.target;
    log(S,`${P.name}: [인연필드] 흐름 책임량으로 재활성된 관계가 실제 선택 ${places[P.target]?.n||P.target}에 참여`);
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
  const need=F?.flow?.need||0,budget=F?.flow?.budget||0;
  document.getElementById('relationFieldSummary').innerHTML=`<b>${P.name} · ${MODELS[focus].n}</b><br>경험 재조합 ${F?.recombinations||0} · 현재흐름 활성 ${F?.activations||0} · 필드나선 ${F?.spirals||0}<br>흐름 책임량 ${need.toFixed(3)} · 관계 탐색예산 ${budget}<br>활성 관계: ${active}`;
};

reset();
})();
