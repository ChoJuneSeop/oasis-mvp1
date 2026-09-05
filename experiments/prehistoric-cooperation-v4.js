(function(){
// v0.4 cooperative hunting layer.
// Cooperation is an affordance, not a command: one person proposes; others independently decide whether to join.
const oldReset=reset,oldUpdateEnvironment=updateEnvironment,oldActs=acts,oldExecute=execute,oldNeedScore=needScore,oldRuleDecide=ruleDecide,oldUtilityValue=utilityValue,oldHumanDecide=humanDecide,oldRender=render;

function activeHunts(){return (E.huntCalls||[]).filter(h=>!h.resolved&&E.tick<=h.resolveAt);}
function huntById(id){return (E.huntCalls||[]).find(h=>h.id===id);}
function animalNode(id){return E.nodes.find(n=>n.id===id&&n.kind==='animal');}
function ensureCoopMetrics(A){if(A.metrics.coopPropose==null)A.metrics.coopPropose=0;if(A.metrics.coopJoin==null)A.metrics.coopJoin=0;if(A.metrics.coopSuccess==null)A.metrics.coopSuccess=0;}

reset=function(){oldReset();E.huntCalls=[];E.coopHunts=0;E.coopHuntSuccess=0;E.milestones=E.milestones||{};E.milestones.firstCoopHunt=null;E.milestones.firstCoopHuntSuccess=null;for(const A of Object.values(E.people))ensureCoopMetrics(A);log('v0.4: 자발적 협동 사냥 가능성이 세계에 추가되었다. 참여 여부는 각자가 결정한다.');};

needScore=function(P,a){let s=oldNeedScore(P,a);if(a.type==='propose_hunt'||a.type==='join_hunt'){const nE=(100-P.self.energy)/100;s+=nE*1.8;}return s;};

acts=function(A,P){
  ensureCoopMetrics(A);const xs=oldActs(A,P);
  for(const n of P.nearNodes)if(n.kind==='animal'&&n.stock>0&&n.d<=45&&!activeHunts().some(h=>h.target===n.id))xs.push({type:'propose_hunt',target:n.id,kind:'animal'});
  for(const h of activeHunts()){
    if(h.leader===A.id||h.participants.includes(A.id))continue;
    const leader=E.people[h.leader],animal=animalNode(h.target);if(!leader||!animal)continue;
    // A call can only be noticed within ordinary social/perceptual range.
    if(dist(A,leader)<=145||dist(A,animal)<=145)xs.push({type:'join_hunt',target:h.leader,huntId:h.id,kind:'cooperation'});
  }
  return dedupe(xs);
};

ruleDecide=function(A,P,as){
  let a;
  if(P.self.water<38)a=as.find(x=>x.type==='drink')||as.find(x=>x.type==='move'&&x.kind==='water');
  if(!a&&P.self.energy<45)a=as.find(x=>x.type==='join_hunt')||as.find(x=>x.type==='propose_hunt')||as.find(x=>x.type==='hunt')||as.find(x=>x.type==='forage')||as.find(x=>x.type==='move'&&x.kind==='food')||as.find(x=>x.type==='rest');
  if(!a&&P.self.warmth<34)a=as.find(x=>x.type==='fire')||as.find(x=>x.type==='rest')||as.find(x=>x.type==='move'&&x.kind==='shelter');
  if(!a)a=as.find(x=>x.type==='craft')||as.find(x=>x.type==='fire')||as.find(x=>x.type==='interact')||as.find(x=>x.type==='propose_hunt')||as.find(x=>x.type==='move'&&x.kind==='direction')||as[0];
  return{a,why:'내부 조건규칙의 첫 충족 분기'};
};

utilityValue=function(A,P,a){let v=oldUtilityValue(A,P,a);if(a.type==='propose_hunt'){const nearby=P.nearAgents.filter(x=>x.d<120).length;v+=.55+Math.min(1.2,nearby*.22);}if(a.type==='join_hunt'){const h=huntById(a.huntId),bond=h?Math.min(1,A.relations[h.leader]||0):0;v+=.7+bond*.65;}return v;};

humanDecide=function(A,P,as){
  const t=A.traits;let best=-1e9,pick=as[0];
  for(const a of as){let s=0;s+=t.safety*needScore(P,a)*3;s+=t.social*((a.type==='interact'||a.type==='share'||a.type==='join_hunt')?2:(a.type==='propose_hunt'?1.35:0));s+=t.explore*((a.type==='observe'||(a.type==='move'&&a.kind==='direction'))?1.6:0);s+=t.utility*utilityValue(A,P,a);s+=t.habit*((A.culture.actions[actionKey(a)]||0)/Math.max(1,A.actions))*3;const rel=a.target&&A.relations[a.target]||0;if(a.type==='interact'||a.type==='share'||a.type==='join_hunt')s+=rel*.6;s+=(noise('human|'+A.id+'|'+actionKey(a))-.5)*.16;if(s>best){best=s;pick=a}}
  return{a:pick,why:'개별 성향·관찰학습·현재 필요의 혼합'};
};

function registerOasisGroupEpisode(A,h,outcome){
  if(A.controller!=='oasis')return;
  const people=h.participants.filter(id=>id!==A.id).map(id=>'agent:'+id),context=['node:'+h.target,...people].sort(),sig='coop_hunt|'+context.join(',');const ep={t:E.tick,action:'coop_hunt',context,sig,outcome};const ix=A.relationEpisodes.findIndex(x=>x.sig===sig);if(ix>=0)A.relationEpisodes[ix]=ep;else A.relationEpisodes.push(ep);A.relationEpisodes=A.relationEpisodes.slice(-160);
}
function resolveHunts(){
  for(const h of (E.huntCalls||[])){
    if(h.resolved||E.tick<h.resolveAt)continue;h.resolved=true;const animal=animalNode(h.target),ps=h.participants.map(id=>E.people[id]).filter(a=>a&&a.alive&&E.tick>=a.recoveryUntil);if(!animal||animal.stock<1||!ps.length)continue;
    const tools=ps.filter(a=>a.tool).length,n=ps.length,bondPairs=[];for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)bondPairs.push(Math.min(ps[i].relations[ps[j].id]||0,ps[j].relations[ps[i].id]||0));const bond=bondPairs.length?bondPairs.reduce((a,b)=>a+b,0)/bondPairs.length:0;
    const chance=Math.min(.94,.12+n*.16+tools*.13+bond*.18),success=noise('coopresolve|'+h.id)<chance;E.coopHunts++;
    if(success){
      animal.stock--;E.coopHuntSuccess++;const portions=Math.max(n,2+Math.floor(n*.75)+tools),ids=[...ps].sort((a,b)=>a.id.localeCompare(b.id));for(let k=0;k<portions;k++){const A=ids[k%ids.length];if(A.inventory.rawMeat==null)A.inventory.rawMeat=0;A.inventory.rawMeat++;}
      for(const A of ps){ensureCoopMetrics(A);A.metrics.coopSuccess++;A.culture.actions.coop_hunt=(A.culture.actions.coop_hunt||0)+1;registerOasisGroupEpisode(A,h,1.4);}for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)relation(ps[i],ps[j],.055);
      if(!E.milestones.firstCoopHuntSuccess)E.milestones.firstCoopHuntSuccess={t:E.tick,leader:h.leader,participants:[...h.participants]};log(`${ps.length}명이 함께 움직인 사냥이 성공했고 고기가 참가자들에게 나뉘었다.`);
    }else{
      for(const A of ps){A.energy=clamp(A.energy-2.2,0,100);registerOasisGroupEpisode(A,h,-.2);}for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)relation(ps[i],ps[j],.012);log(`${ps.length}명이 함께 움직였지만 사냥은 실패했다.`);
    }
  }
  E.huntCalls=(E.huntCalls||[]).filter(h=>E.tick-h.created<240);
}

updateEnvironment=function(){oldUpdateEnvironment();resolveHunts();};

execute=function(A,P,a){
  ensureCoopMetrics(A);
  if(a.type==='propose_hunt'){
    A.actions++;A.metrics.social++;A.metrics.coopPropose++;A.culture.actions.propose_hunt=(A.culture.actions.propose_hunt||0)+1;const id='hunt:'+E.tick+':'+A.id;E.huntCalls.push({id,target:a.target,leader:A.id,participants:[A.id],created:E.tick,resolveAt:E.tick+5,resolved:false});if(!E.milestones.firstCoopHunt)E.milestones.firstCoopHunt={t:E.tick,leader:A.id};A.lastOutcome=.15;log('한 사람이 주변 사람들에게 함께 사냥할 움직임을 보였다.');return .15;
  }
  if(a.type==='join_hunt'){
    const h=huntById(a.huntId);A.actions++;A.metrics.social++;A.metrics.coopJoin++;A.culture.actions.join_hunt=(A.culture.actions.join_hunt||0)+1;if(h&&!h.resolved&&!h.participants.includes(A.id)){h.participants.push(A.id);const L=E.people[h.leader];if(L)relation(A,L,.02);A.lastOutcome=.25;return .25}return 0;
  }
  return oldExecute(A,P,a);
};

render=function(){oldRender();let box=document.getElementById('coopStatus');if(!box){box=document.createElement('div');box.id='coopStatus';box.className='foot';document.querySelector('.app')?.appendChild(box);}const m=E.milestones||{};box.textContent='협동 사냥: 제안 '+(m.firstCoopHunt?'발생':'미발생')+' · 공동 성공 '+(m.firstCoopHuntSuccess?'발생':'미발생')+' · 시도 '+(E.coopHunts||0)+' · 성공 '+(E.coopHuntSuccess||0);};

reset();render();
})();
