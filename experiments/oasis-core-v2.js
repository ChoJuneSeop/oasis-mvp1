(function(){
// OASIS core v2
// Purpose: implement current-flow-triggered structural reactivation, lazy relational
// combination generation, integrated choice/responsibility interaction, single realization,
// and append-only relational-process history.
// This layer intentionally does not change comparator models.

const oldExecuteOasisV2=execute;

function o2Ensure(A){
  if(!A.oasisV2)A.oasisV2={sequence:0,intentSeq:0,generatedUses:{},relationGraph:{},lastIntent:null};
  return A.oasisV2;
}
function o2NormKind(kind){
  if(!kind)return null;
  if(kind==='natural_fire'||kind==='hearth'||kind==='fire')return'fire';
  if(kind==='sharp_stone'||kind==='quality_stone'||kind==='stone')return'stone';
  if(kind==='food')return'food';if(kind==='water')return'water';if(kind==='shelter')return'shelter';
  if(kind==='animal')return'animal';if(kind==='wood')return'wood';if(kind==='pigment')return'pigment';
  if(kind==='mark_site'||kind==='mark')return'mark';return kind;
}
function o2LegacyKind(ref,ep){
  const s=String(ref||'').toLowerCase();
  const id=s.startsWith('node:')?s.slice(5):s;
  const live=E.nodes?.find(n=>String(n.id).toLowerCase()===id);if(live)return o2NormKind(live.kind);
  if(s.includes('fire')||s.includes('hearth'))return'fire';if(s.includes('river')||s.includes('water'))return'water';
  if(s.includes('stone')||s.includes('flake'))return'stone';if(s.includes('cave')||s.includes('shelter'))return'shelter';
  if(s.includes('meat')||s.includes('food')||s.includes('berr'))return'food';if(s.includes('wood'))return'wood';
  if(s.includes('animal')||s.includes('meadow'))return'animal';if(s.includes('pigment')||s.includes('ochre'))return'pigment';
  if(s.includes('mark'))return'mark';
  const a=String(ep?.action||'');if(a.includes('fire'))return'fire';if(a.includes('hunt'))return'animal';
  return null;
}
function o2EpisodeRoles(ep){
  if(Array.isArray(ep.roles)&&ep.roles.length)return new Set(ep.roles);
  const roles=new Set();
  for(const c of ep.context||[]){
    if(String(c).startsWith('agent:')){roles.add('agent:any');roles.add(c);continue;}
    if(String(c).startsWith('node:')){const k=o2LegacyKind(c,ep);if(k)roles.add('nodekind:'+k);roles.add(c);}
  }
  return roles;
}
function o2CurrentRoles(P){
  const roles=new Set();
  for(const n of P.nearNodes||[]){roles.add('node:'+n.id);roles.add('nodekind:'+o2NormKind(n.kind));}
  for(const b of P.nearAgents||[]){roles.add('agent:'+b.id);roles.add('agent:any');}
  return roles;
}
function o2IntersectCount(a,b){let n=0;for(const x of a)if(b.has(x))n++;return n;}
function o2ActionRoles(a,P){
  const roles=new Set();
  if(a?.relationRoles)for(const r of a.relationRoles)roles.add(r);
  const steps=Array.isArray(a?.steps)?a.steps:[a];
  for(const s of steps){
    if(!s)continue;
    const t=s.target;
    if(t){
      if(String(t).startsWith('agent:')){roles.add(String(t));roles.add('agent:any');}
      else if(E.people?.[t]){roles.add('agent:'+t);roles.add('agent:any');}
      else if(!String(t).startsWith('dir:')){
        roles.add('node:'+t);const node=E.nodes?.find(n=>n.id===t);if(node)roles.add('nodekind:'+o2NormKind(node.kind));
      }
    }
    if(s.kind&&s.kind!=='direction'&&s.kind!=='agent')roles.add('nodekind:'+o2NormKind(s.kind));
  }
  return roles;
}
function o2Relevance(ep,current){
  const roles=o2EpisodeRoles(ep);let exact=0,structural=0;
  for(const r of roles)if(current.has(r)){if(r.startsWith('node:')||r.startsWith('agent:')&&r!=='agent:any')exact++;else structural++;}
  // No hard age cutoff: current relational fit is primary. Outcome and sequence are secondary evidence only.
  const causal=Math.min(.75,Math.abs(Number(ep.outcome)||0)*.2);
  return exact*2.4+structural*1.15+causal;
}
activeRelations=function(A,P){
  const current=o2CurrentRoles(P),act=[];
  for(const ep of A.relationEpisodes||[]){const relevance=o2Relevance(ep,current);if(relevance>0)act.push(Object.assign({},ep,{_relevance:relevance,_roles:[...o2EpisodeRoles(ep)]}));}
  act.sort((x,y)=>y._relevance-x._relevance||((y.sequence||0)-(x.sequence||0)));
  A.activeRelations=act;return act;
};

function o2CombinationPotential(active){
  const n=active.length;if(n<2)return 0;
  const pairs=n*(n-1)/2,triples=n>=3?n*(n-1)*(n-2)/6:0;
  return Math.log2(1+pairs+Math.sqrt(triples));
}
function o2FlowState(A,P){
  const vals=[P.self.energy,P.self.water,P.self.warmth,P.self.health].map(v=>clamp(v/100,0,1));
  const stability=vals.reduce((a,b)=>a+b,0)/vals.length;
  const prev=A.lastPerception?.self;let fall=0;
  if(prev)fall=(Math.max(0,prev.water-P.self.water)+Math.max(0,prev.energy-P.self.energy)+Math.max(0,prev.warmth-P.self.warmth)+Math.max(0,prev.health-P.self.health))/100;
  return{stability,stress:1-stability,fall};
}
function o2ActionSupport(a,active,P){
  const ar=o2ActionRoles(a,P);let s=0;
  for(const ep of active){const er=new Set(ep._roles||o2EpisodeRoles(ep));const overlap=o2IntersectCount(ar,er);if(overlap)s+=(ep._relevance||1)*(1+.35*(overlap-1));}
  if(a?.sourceEpisodes?.length)s+=Math.log2(1+a.sourceEpisodes.length);
  return s;
}
function o2Novelty(A,a){
  const v=o2Ensure(A);if(a?.generated)return 1/(1+(v.generatedUses[a.comboSig]||0));
  return 1/(1+(A.culture.actions[actionKey(a)]||0));
}
function o2Responsibility(P,a){
  const steps=Array.isArray(a?.steps)&&a.steps.length?a.steps:[a];let r=0;
  for(const s of steps)r=Math.max(r,needScore(P,s));return r;
}
function oasisRank(A,P,a,active){
  const flow=o2FlowState(A,P),responsibility=o2Responsibility(P,a)*(1+flow.fall*2.2);
  const relationSupport=o2ActionSupport(a,active,P),combination=o2CombinationPotential(active);
  const generatedSynergy=a?.generated?(Math.log2(1+(a.sourceEpisodes?.length||1))+.28*(a.steps?.length||1)):0;
  const novelty=o2Novelty(A,a),participation=(a?.type==='interact'||a?.type==='share'||a?.generated)?(P.nearAgents?.length||0):(P.nearNodes?.length||0);
  // Axes interact through current flow rather than strict priority slots. When bodily flow worsens,
  // responsibility gains influence; when flow is stable, relational recombination has more room.
  const responsibilityGain=.72+1.5*flow.stress+1.1*flow.fall;
  const relationGain=.75+1.15*flow.stability;
  const combinationGain=.30+1.05*flow.stability;
  const coupling=Math.sqrt(Math.max(0,relationSupport)*(1+combination))-Math.sqrt(Math.max(0,relationSupport));
  const waitPenalty=a?.type==='wait'?.25:0;
  const total=responsibility*responsibilityGain+relationSupport*relationGain+combination*combinationGain+coupling*.85+generatedSynergy*(.65+.6*flow.stability)+novelty*.18+participation*.025-waitPenalty;
  // [integrated score, responsibility, combination, relation support, generated synergy, novelty, participation]
  return[total,responsibility,combination,relationSupport,generatedSynergy,novelty,participation];
}
cmpTuple=function(a,b){const x=a?.[0]??0,y=b?.[0]??0;if(x!==y)return y-x;for(let i=1;i<Math.max(a.length,b.length);i++){const p=a[i]??0,q=b[i]??0;if(p!==q)return q-p}return 0;};

function o2PrimitiveIdentity(a){return actionKey(a)+'|'+(a.target||'');}
function o2RelationAnchoredPrimitives(P,as,active){
  const rows=[];
  for(const a of as){if(a.type==='wait'||(a.type==='move'&&a.kind==='direction'))continue;const s=o2ActionSupport(a,active,P);if(s>0||a.type==='observe')rows.push({a,s});}
  rows.sort((x,y)=>y.s-x.s||o2PrimitiveIdentity(x.a).localeCompare(o2PrimitiveIdentity(y.a)));
  const seen=new Set(),out=[];for(const r of rows){const k=o2PrimitiveIdentity(r.a);if(!seen.has(k)){seen.add(k);out.push(r.a);}if(out.length>=5)break;}return out;
}
function o2GenerateCandidates(A,P,as,active){
  if(!active.length)return[];
  const pool=o2RelationAnchoredPrimitives(P,as,active);if(pool.length<2)return[];
  const sourceEpisodes=active.slice(0,Math.min(8,active.length)).map(ep=>ep.sequence||ep.sig||ep.t);
  const relationRoles=[...new Set(active.slice(0,8).flatMap(ep=>ep._roles||[...o2EpisodeRoles(ep)]))];
  const out=[];
  function add(steps){
    if(steps.length<2)return;const comboSig=steps.map(o2PrimitiveIdentity).join('=>');
    out.push({type:'relational_sequence',kind:'relation',generated:true,steps:steps.map(s=>Object.assign({},s)),comboSig,sourceEpisodes:[...sourceEpisodes],relationRoles:[...relationRoles]});
  }
  // Lazy combination generation: possibility combinations are generated from currently relevant
  // relational components, not by enumerating every physically impossible global combination.
  for(let i=0;i<pool.length;i++)for(let j=i+1;j<pool.length;j++){add([pool[i],pool[j]]);if(out.length>=6)return out;}
  if(pool.length>=3)add([pool[0],pool[1],pool[2]]);
  return out;
}

oasisDecide=function(A,P,as){
  o2Ensure(A);const active=activeRelations(A,P),generated=o2GenerateCandidates(A,P,as,active),candidates=[...as,...generated];
  const sortRows=rs=>rs.sort((x,y)=>cmpTuple(x.r,y.r)||((noise('o2tie|'+A.id+'|'+o2PrimitiveIdentity(x.a))-noise('o2tie|'+A.id+'|'+o2PrimitiveIdentity(y.a)))));
  const rows=sortRows(candidates.map(a=>({a,r:oasisRank(A,P,a,active)})));
  const counterfactual=sortRows(as.map(a=>({a,r:oasisRank(A,P,a,[])})));
  const pick=rows[0],noRel=counterfactual[0];if(actionKey(pick.a)!==actionKey(noRel.a)||pick.a.generated)A.metrics.relationUse++;
  return{a:pick.a,why:`OASIS-v2 현재흐름·구조활성 ${active.length}·생성후보 ${generated.length}·관계제거 반사실 ${actionKey(noRel.a)}·통합점수 ${pick.r[0].toFixed(3)}`};
};

function o2ContextForAction(a,P){
  const context=[];const steps=Array.isArray(a?.steps)&&a.steps.length?a.steps:[a];
  for(const s of steps){if(!s)continue;const t=s.target;if(t){if(String(t).startsWith('agent:'))context.push(String(t));else if(E.people?.[t])context.push('agent:'+t);else if(!String(t).startsWith('dir:'))context.push('node:'+t);}}
  return[...new Set(context)];
}
function o2RewriteGraph(A,roles,outcome,sequence){
  const V=o2Ensure(A),rs=[...new Set(roles)].sort();
  for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++){const k=rs[i]+'<->'+rs[j],g=V.relationGraph[k]||{count:0,outcomeSum:0,lastSequence:0};g.count++;g.outcomeSum+=Number(outcome)||0;g.lastSequence=sequence;V.relationGraph[k]=g;}
}
execute=function(A,P,a){
  if(A.controller!=='oasis')return oldExecuteOasisV2(A,P,a);
  const V=o2Ensure(A),composite=a?.type==='relational_sequence'&&Array.isArray(a.steps)&&a.steps.length;
  const realized=composite?a.steps[0]:a;
  if(composite){V.intentSeq++;V.lastIntent={id:V.intentSeq,created:E.tick,comboSig:a.comboSig,steps:a.steps.map(s=>Object.assign({},s)),sourceEpisodes:[...(a.sourceEpisodes||[])],realizedIndex:0};V.generatedUses[a.comboSig]=(V.generatedUses[a.comboSig]||0)+1;}
  // Prevent the legacy OASIS recorder from overwriting/slicing history while preserving physical consequences.
  const controller=A.controller;A.controller='oasis-v2-shadow';const out=oldExecuteOasisV2(A,P,realized);A.controller=controller;
  const context=o2ContextForAction(composite?a:realized,P),roles=[...o2ActionRoles(composite?a:realized,P)];
  V.sequence++;
  const prev=A.relationEpisodes?.length?A.relationEpisodes[A.relationEpisodes.length-1]:null;
  const ep={t:E.tick,sequence:V.sequence,previousSequence:prev?.sequence??null,action:composite?'relational_sequence':actionKey(realized),realizedAction:actionKey(realized),context,roles,outcome:out,intentId:composite?V.intentSeq:null,sourceEpisodes:composite?[...(a.sourceEpisodes||[])]:[],flowBefore:{energy:P.self.energy,water:P.self.water,warmth:P.self.warmth,health:P.self.health},flowAfter:{energy:A.energy,water:A.water,warmth:A.warmth,health:A.health}};
  if(!A.relationEpisodes)A.relationEpisodes=[];A.relationEpisodes.push(ep);o2RewriteGraph(A,roles,out,V.sequence);
  A.lastOutcome=out;return out;
};

// Expose only for audit/observer instrumentation; agents never receive these labels or functions.
globalThis.__OASIS_CORE_V2__={episodeRoles:o2EpisodeRoles,currentRoles:o2CurrentRoles,generateCandidates:o2GenerateCandidates,combinationPotential:o2CombinationPotential};
})();
