(function(){
const rfOldMkP=mkP, rfOldMkW=mkW, rfOldOutcome=outcome, rfOldParticipants=participants, rfOldMemberRank=memberRank, rfOldHiddenReady=hiddenReady, rfOldChoose=choose, rfOldRender=render;

function latentEnabled(){return globalThis.OASIS_LATENT_RELATION_STORE===true&&globalThis.__OASIS_LATENT_DIAGNOSTIC_DISABLE!==true}
function ensureLatent(P){
  const F=P.relationField;
  if(!F.latent)F.latent={byId:new Map(),byClue:new Map(),activeIds:[],seq:0,audit:[],cacheKey:null,cacheEpisodes:[]};
  return F.latent;
}
function epId(ep){return `${ep.t}|${ep.key}|${ep.from?.[0]}|${ep.from?.[1]}`}
function clueAdd(L,k,id){if(!L.byClue.has(k))L.byClue.set(k,new Set());L.byClue.get(k).add(id)}
function audit(P,type,data={}){
  if(!latentEnabled()||globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT===true)return;
  const L=ensureLatent(P);
  L.audit.push({seq:++L.seq,tick:E.tick,type,party:P.id,...data});
}
function indexLatent(P,ep,reason){
  const L=ensureLatent(P),id=epId(ep);
  if(L.byId.has(id))return;
  L.byId.set(id,ep);L.cacheKey=null;L.cacheEpisodes=[];
  clueAdd(L,`npc:${ep.a}`,id);clueAdd(L,`npc:${ep.b}`,id);
  for(const p of ep.places){
    clueAdd(L,`place:${p}`,id);
    const r=places[p]?.r;
    if(Number.isFinite(r))clueAdd(L,`risk:${Math.round(r*100)}`,id);
  }
  audit(P,'latentize',{episodeId:id,key:ep.key,createdTick:ep.t,age:E.tick-ep.t,reason,from:[...(ep.from||[])],places:[...ep.places]});
}
function moveOverflowToLatent(P){
  if(!latentEnabled()){P.relationField.episodes=P.relationField.episodes.slice(-80);return}
  const F=P.relationField;
  if(F.episodes.length<=80)return;
  const moved=F.episodes.slice(0,-80);F.episodes=F.episodes.slice(-80);
  for(const ep of moved)indexLatent(P,ep,'episode-window');
}
function moveAgedToLatent(P){
  if(!latentEnabled())return;
  const keep=[];
  for(const ep of P.relationField.episodes){
    if(E.tick-ep.t>1200)indexLatent(P,ep,'age-window');else keep.push(ep);
  }
  P.relationField.episodes=keep;
}
function relevantReasons(S,P,ep){
  const here=currentPlace(P),target=P.target,reasons=[];
  if(ep.places.includes(here))reasons.push(`here:${here}`);
  if(ep.places.includes(target))reasons.push(`target:${target}`);
  for(const id of ep.places)if(Math.abs((places[id]?.r||0)-S.danger)<=0.18)reasons.push(`danger:${id}`);
  const gate=places[target]?.gate;
  if(gate&&(ep.a===gate||ep.b===gate))reasons.push(`gate:${gate}`);
  return [...new Set(reasons)];
}
function latentCandidates(S,P){
  const L=ensureLatent(P),ids=new Set(),here=currentPlace(P),target=P.target,gate=places[target]?.gate;
  const add=k=>{const b=L.byClue.get(k);if(b)for(const id of b)ids.add(id)};
  add(`place:${here}`);add(`place:${target}`);if(gate)add(`npc:${gate}`);
  const center=Math.round(S.danger*100);
  for(let b=Math.max(0,center-18);b<=Math.min(100,center+18);b++)add(`risk:${b}`);
  return [...ids].map(id=>[id,L.byId.get(id)]).filter(x=>x[1]);
}
function latentActive(S,P){
  if(!latentEnabled())return [];
  moveAgedToLatent(P);
  const L=ensureLatent(P),cacheKey=`${E.tick}|${currentPlace(P)}|${P.target}|${Math.round(S.danger*1000)}|${L.byId.size}`;
  if(L.cacheKey===cacheKey)return L.cacheEpisodes;
  const active=[];
  for(const [id,ep] of latentCandidates(S,P)){
    const reasons=relevantReasons(S,P,ep);
    if(reasons.length)active.push({id,ep,reasons});
  }
  const prev=new Set(L.activeIds||[]),now=new Set(active.map(x=>x.id));
  for(const x of active)if(!prev.has(x.id))audit(P,'reactivate',{episodeId:x.id,key:x.ep.key,createdTick:x.ep.t,age:E.tick-x.ep.t,reasons:x.reasons,from:[...(x.ep.from||[])],places:[...x.ep.places]});
  for(const id of prev)if(!now.has(id)){
    const ep=L.byId.get(id);audit(P,'noncurrent',{episodeId:id,key:ep?.key||null,createdTick:ep?.t??null,age:ep?E.tick-ep.t:null});
  }
  L.activeIds=[...now];
  L.cacheKey=cacheKey;
  L.cacheEpisodes=active.map(x=>x.ep);
  return L.cacheEpisodes;
}

mkP=function(d){
  const P=rfOldMkP(d);
  P.relationField={episodes:[],active:[],activations:0,recombinations:0,spirals:0,lastActivationTick:null};
  P.pendingFieldChoice=null;
  P.pendingFieldLatentIds=[];
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
      const L=latentEnabled()?ensureLatent(P):null;
      const duplicate=P.relationField.episodes.some(x=>x.key===ep.key&&x.from[0]===ep.from[0]&&x.from[1]===ep.from[1])||(L&&L.byId.has(epId(ep)));
      if(!duplicate){
        P.relationField.episodes.push(ep);
        P.relationField.recombinations++;
        S.c.relationRecombination++;
        audit(P,'compose',{episodeId:epId(ep),key:ep.key,from:[...ep.from],places:[...ep.places]});
        log(S,`${P.name}: [인연필드] 완결 경험 재조합 ${ep.key}`);
      }
    }
  }
  moveOverflowToLatent(P);
}

function activeField(S,P){
  if(!P.relationField||MODELS[S.key].kind!=='oasis'||!MODELS[S.key].rel)return [];
  const here=currentPlace(P), target=P.target;
  const recent=P.relationField.episodes.filter(ep=>{
    if(E.tick-ep.t>1200)return false;
    if(ep.places.includes(here)||ep.places.includes(target))return true;
    if(ep.places.some(id=>Math.abs((places[id]?.r||0)-S.danger)<=0.18))return true;
    const gate=places[target]?.gate;
    return !!gate&&(ep.a===gate||ep.b===gate);
  });
  const latent=latentActive(S,P);
  const active=latent.length?[...recent,...latent]:recent;
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
  const pendingLatent=[...(P.pendingFieldLatentIds||[])];
  rfOldOutcome(S,P,id);
  audit(P,'outcome',{choice:id,latentEpisodeIds:pendingLatent,relationHistoryBefore:beforeRel,relationHistoryAfter:P.relationHistory.length});
  const newEvents=P.relationHistory.slice(beforeRel);
  if(newEvents.length)composeField(S,P,newEvents);
  const active=activeField(S,P);
  if(active.length&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel)refreshHidden(S,P);
  const afterSig=sig(evalP(S,P,1));
  if(P.pendingFieldChoice===id&&changedSig(beforeSig,afterSig)){
    P.relationField.spirals++;
    S.c.relationFieldSpiral++;
    S.c.relationSpiral++;
    audit(P,'field-spiral',{choice:id,beforeSig,afterSig,latentEpisodeIds:pendingLatent});
    P.pendingFieldChoice=null;
    log(S,`${P.name}: [인연필드] 관계 재조합 선택의 결과가 다음 판단조건을 변경`);
  }
  P.pendingFieldLatentIds=[];
};

choose=function(S,P){
  if(MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel)activeField(S,P);
  rfOldChoose(S,P);
  if(MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel&&fieldRelevantToPlace(S,P,P.target)){
    P.pendingFieldChoice=P.target;
    if(latentEnabled()){
      const L=ensureLatent(P),gate=places[P.target]?.gate;
      const ids=(L.activeIds||[]).filter(id=>{const ep=L.byId.get(id);return ep&&(ep.places.includes(P.target)||(gate&&(ep.a===gate||ep.b===gate)))});
      P.pendingFieldLatentIds=ids;
      audit(P,'select-participation',{choice:P.target,choiceName:places[P.target]?.n||P.target,latentEpisodeIds:ids,activeKeys:[...(P.relationField.active||[])]});
    }
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
  const latentCount=F?.latent?.byId?.size||0;
  document.getElementById('relationFieldSummary').innerHTML=`<b>${P.name} · ${MODELS[focus].n}</b><br>경험 재조합 ${F?.recombinations||0} · 현재흐름 활성 ${F?.activations||0} · 필드나선 ${F?.spirals||0}${latentEnabled()?` · 잠재과정 ${latentCount}`:''}<br>활성 관계: ${active}`;
};

reset();
})();
