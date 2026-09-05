(function(){
// v0.6 neutral cooperative hunting layer.
// Cooperation is available, but no model-specific score/rule/preference is added.
const oldReset=reset,oldUpdateEnvironment=updateEnvironment,oldActs=acts,oldExecute=execute,oldRender=render;
function activeHunts(){return (E.huntCalls||[]).filter(h=>!h.resolved&&E.tick<=h.resolveAt)}
function huntById(id){return (E.huntCalls||[]).find(h=>h.id===id)}
function animalNode(id){return E.nodes.find(n=>n.id===id&&n.kind==='animal')}
function ensureM(A){if(A.metrics.coopPropose==null)A.metrics.coopPropose=0;if(A.metrics.coopJoin==null)A.metrics.coopJoin=0;if(A.metrics.coopSuccess==null)A.metrics.coopSuccess=0}
function learningState(A,P,a){return{state:typeof stateKey==='function'?stateKey(P):'',action:actionKey(a),ctx:typeof contextVector==='function'?contextVector(P):null}}
function learnGroup(A,h,outcome){
  ensureM(A);A.metrics.coopSuccess+=outcome>0?1:0;A.culture.actions.coop_hunt=(A.culture.actions.coop_hunt||0)+1;
  const ls=h.learning?.[A.id];
  if(A.controller==='q'&&ls?.state){const k=ls.state+'|'+ls.action,q=A.q[k]??0;A.q[k]=q+.22*(outcome-q)}
  if(A.controller==='retrieval'&&ls?.ctx)A.memory.push({ctx:ls.ctx,action:ls.action,outcome});
  if(A.controller==='oasis'){
    const people=h.participants.filter(id=>id!==A.id).map(id=>'agent:'+id),context=['node:'+h.target,...people].sort(),sig='coop_hunt|'+context.join(','),ep={t:E.tick,action:'coop_hunt',context,sig,outcome};
    const ix=A.relationEpisodes.findIndex(x=>x.sig===sig);if(ix>=0)A.relationEpisodes[ix]=ep;else A.relationEpisodes.push(ep);A.relationEpisodes=A.relationEpisodes.slice(-160);
  }
}
function markRawMeat(id){if(E.milestones&&!E.milestones.firstRawMeat)E.milestones.firstRawMeat={t:E.tick,id}}
function resolveCalls(){
  for(const h of E.huntCalls||[]){
    if(h.resolved||E.tick<h.resolveAt)continue;h.resolved=true;
    const animal=animalNode(h.target),ps=h.participants.map(id=>E.people[id]).filter(a=>a&&a.alive&&E.tick>=a.recoveryUntil);if(!animal||animal.stock<1||!ps.length)continue;
    if(ps.length<2){for(const A of ps)learnGroup(A,h,-.1);continue}
    const tools=ps.filter(a=>a.tool).length,pairs=[];for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)pairs.push(Math.min(ps[i].relations[ps[j].id]||0,ps[j].relations[ps[i].id]||0));
    const bond=pairs.length?pairs.reduce((a,b)=>a+b,0)/pairs.length:0,chance=Math.min(.92,.10+ps.length*.12+tools*.16+bond*.16),success=noise('coopresolve|'+h.id)<chance;E.coopHunts++;
    if(success){
      animal.stock--;E.coopHuntSuccess++;const portions=Math.max(ps.length,2+Math.floor(ps.length*.7)+tools),ids=[...ps].sort((a,b)=>a.id.localeCompare(b.id));
      for(let k=0;k<portions;k++){const A=ids[k%ids.length];if(A.inventory.rawMeat==null)A.inventory.rawMeat=0;A.inventory.rawMeat++;markRawMeat(A.id)}
      for(const A of ps)learnGroup(A,h,1);for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)relation(ps[i],ps[j],.045);
      if(!E.milestones.firstCoopHuntSuccess)E.milestones.firstCoopHuntSuccess={t:E.tick,leader:h.leader,participants:[...h.participants]};log(`${ps.length}명이 자발적으로 같은 사냥에 참여했고 먹이가 참가자들에게 나뉘었다.`)
    }else{for(const A of ps){A.energy=clamp(A.energy-2,0,100);learnGroup(A,h,-.2)}for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)relation(ps[i],ps[j],.01);log(`${ps.length}명이 함께 움직였지만 사냥은 실패했다.`)}
  }
  E.huntCalls=(E.huntCalls||[]).filter(h=>E.tick-h.created<240)
}
function observeIndependentHunt(A,a,out){
  if(a.type!=='hunt'||out<=0)return;const key=a.target+'|'+E.tick,E.sameTickHunts[key]=E.sameTickHunts[key]||[];E.sameTickHunts[key].push(A.id);
  const ids=[...new Set(E.sameTickHunts[key])];if(ids.length===2){E.coopHunts++;E.coopHuntSuccess++;const ps=ids.map(id=>E.people[id]).filter(Boolean);for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)relation(ps[i],ps[j],.03);for(const P of ps){ensureM(P);P.metrics.coopSuccess++;P.culture.actions.coop_hunt=(P.culture.actions.coop_hunt||0)+1}if(!E.milestones.firstCoopHuntSuccess)E.milestones.firstCoopHuntSuccess={t:E.tick,leader:ids[0],participants:ids};log('서로 독립적으로 같은 먹이를 쫓던 두 사람이 결과적으로 협동 사냥을 이루었다.')}
}
reset=function(){oldReset();E.huntCalls=[];E.sameTickHunts={};E.coopHunts=0;E.coopHuntSuccess=0;E.milestones=E.milestones||{};E.milestones.firstCoopHunt=null;E.milestones.firstCoopHuntSuccess=null;for(const A of Object.values(E.people))ensureM(A);log('v0.6: 협동 사냥은 행동가능성으로만 제공되며 선택 보너스는 없다.')}
acts=function(A,P){ensureM(A);const xs=oldActs(A,P);for(const n of P.nearNodes)if(n.kind==='animal'&&n.stock>0&&n.d<=45&&!activeHunts().some(h=>h.target===n.id))xs.push({type:'propose_hunt',target:n.id,kind:'animal'});for(const h of activeHunts()){if(h.leader===A.id||h.participants.includes(A.id))continue;const L=E.people[h.leader],animal=animalNode(h.target);if(L&&animal&&(dist(A,L)<=145||dist(A,animal)<=145))xs.push({type:'join_hunt',target:h.leader,huntId:h.id,kind:'cooperation'})}return dedupe(xs)}
updateEnvironment=function(){E.sameTickHunts={};oldUpdateEnvironment();resolveCalls()}
execute=function(A,P,a){ensureM(A);if(a.type==='propose_hunt'){A.actions++;A.metrics.social++;A.metrics.coopPropose++;A.culture.actions.propose_hunt=(A.culture.actions.propose_hunt||0)+1;const id='hunt:'+E.tick+':'+A.id;E.huntCalls.push({id,target:a.target,leader:A.id,participants:[A.id],learning:{[A.id]:learningState(A,P,a)},created:E.tick,resolveAt:E.tick+5,resolved:false});if(!E.milestones.firstCoopHunt)E.milestones.firstCoopHunt={t:E.tick,leader:A.id};A.lastOutcome=0;return 0}if(a.type==='join_hunt'){const h=huntById(a.huntId);A.actions++;A.metrics.social++;A.metrics.coopJoin++;A.culture.actions.join_hunt=(A.culture.actions.join_hunt||0)+1;if(h&&!h.resolved&&!h.participants.includes(A.id)){h.participants.push(A.id);h.learning[A.id]=learningState(A,P,a);A.lastOutcome=0;return 0}return 0}const out=oldExecute(A,P,a);observeIndependentHunt(A,a,out);return out}
render=function(){oldRender();let box=document.getElementById('coopStatus');if(!box){box=document.createElement('div');box.id='coopStatus';box.className='foot';document.querySelector('.app')?.appendChild(box)}const m=E.milestones||{};box.textContent='협동 사냥(무보너스): 제안 '+(m.firstCoopHunt?'발생':'미발생')+' · 공동 성공 '+(m.firstCoopHuntSuccess?'발생':'미발생')+' · 시도 '+(E.coopHunts||0)+' · 성공 '+(E.coopHuntSuccess||0)}
reset();render();
})();
