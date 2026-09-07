(function(){
// Shared human substrate for the personality experiment.
// These are dynamic species-level pressures/opportunities, not assigned goals and not model labels.
const oldReset=reset,oldActs=acts,oldExecute=execute,oldUpdateEnvironment=updateEnvironment,oldHumanDecide=humanDecide,oldUtilityValue=utilityValue,oldOasisRank=oasisRank,oldRender=render;

function ensureHuman(A){
  if(A.human)return A.human;
  const r=rng(hash('human-substrate|'+A.id));
  A.human={prestige:0,dominance:0,antiDominance:.42+r()*.28,possession:.35+r()*.35,kinCare:.45+r()*.35,statusSensitivity:.30+r()*.35,lastCoopSuccess:0,claims:0};
  return A.human;
}
function isKin(A,B){if(!A||!B)return false;if(A.parents.includes(B.id)||B.parents.includes(A.id))return true;if(A.parents.some(p=>B.parents.includes(p)))return true;return Object.values(E.people).some(C=>C.parents?.includes(A.id)&&C.parents?.includes(B.id));}
function dependents(A){return living().filter(B=>B.parents?.includes(A.id)&&(E.tick-B.age)<520);}
function scarcity(P){const food=P.nearNodes.filter(n=>n.kind==='food'||n.kind==='animal').reduce((s,n)=>s+Math.min(10,n.stock),0);return clamp(1-food/18,0,1);}
function possessionLoad(A){return (A.inventory.food||0)+(A.inventory.rawMeat||0)*1.2+(A.inventory.cookedMeat||0)*1.5+(A.inventory.wood||0)*.3+(A.inventory.stone||0)*.3+(A.tool?2:0);}
function commonPressure(A,P,a){
  const H=ensureHuman(A),sc=scarcity(P),load=possessionLoad(A);let s=0;
  if(a.type==='care_kin')s+=H.kinCare*(1+sc);
  if(a.type==='protect_possession')s+=H.possession*sc*Math.min(2,load/2);
  if(a.type==='share'&&load>0)s-=H.possession*sc*.7;
  if(a.type==='join_hunt'||a.type==='propose_hunt')s+=H.statusSensitivity*.18;
  if(a.type==='challenge_claim')s+=H.statusSensitivity*.15-H.antiDominance*.08;
  return s;
}

reset=function(){oldReset();for(const A of Object.values(E.people))ensureHuman(A);E.claims={};E.humanEvents={kinCare:0,possessionDefense:0,claims:0,challenges:0,antiDominance:0};log('v0.4: 생존·번식 위에 친족보호·점유·위신·지배/반지배의 공통 인간 사회기질을 추가했다.');};

acts=function(A,P){
  ensureHuman(A);const xs=oldActs(A,P),sc=scarcity(P),load=possessionLoad(A);
  for(const Bp of P.nearAgents){const B=E.people[Bp.id];if(!B)continue;if(isKin(A,B)&&Bp.d<=32&&(B.energy<36||B.water<36))xs.push({type:'care_kin',target:B.id,kind:'kin'});}
  if(load>0&&sc>.35&&P.nearAgents.some(x=>x.d<=34))xs.push({type:'protect_possession',kind:'possession'});
  for(const n of P.nearNodes){if(n.d<=32&&(n.kind==='food'||n.kind==='animal'||n.kind==='water')){const c=E.claims[n.id];if(!c||c.until<E.tick||c.owner===A.id)xs.push({type:'assert_claim',target:n.id,kind:'claim'});else xs.push({type:'challenge_claim',target:c.owner,node:n.id,kind:'claim'});}}
  return dedupe(xs);
};

utilityValue=function(A,P,a){return oldUtilityValue(A,P,a)+commonPressure(A,P,a);};
humanDecide=function(A,P,as){
  const t=A.traits,H=ensureHuman(A);let best=-1e9,pick=as[0];
  for(const a of as){let s=0;s+=t.safety*needScore(P,a)*3;s+=t.social*((a.type==='interact'||a.type==='share'||a.type==='join_hunt'||a.type==='care_kin')?2:(a.type==='propose_hunt'?1.35:0));s+=t.explore*((a.type==='observe'||(a.type==='move'&&a.kind==='direction'))?1.6:0);s+=t.utility*utilityValue(A,P,a);s+=t.habit*((A.culture.actions[actionKey(a)]||0)/Math.max(1,A.actions))*3;s+=commonPressure(A,P,a);const rel=a.target&&A.relations[a.target]||0;if(a.type==='interact'||a.type==='share'||a.type==='join_hunt'||a.type==='care_kin')s+=rel*.6;if(a.type==='join_hunt'){const h=(E.huntCalls||[]).find(h=>h.id===a.huntId),L=h&&E.people[h.leader];if(L)s+=ensureHuman(L).prestige*.35;}if(a.type==='challenge_claim'){const O=E.people[a.target];if(O)s+=Math.max(0,ensureHuman(O).dominance-H.antiDominance)*-.25;}s+=(noise('human|'+A.id+'|'+actionKey(a))-.5)*.16;if(s>best){best=s;pick=a}}
  return{a:pick,why:'개별 성향·문화·현재 필요 + 공통 인간 사회기질'};
};

oasisRank=function(A,P,a,active){const r=oldOasisRank(A,P,a,active);const H=ensureHuman(A),cp=commonPressure(A,P,a);return[r[0],r[1],r[2],r[3],cp,r[4],r[5],r[6]];};

function witnessed(A,radius=120){return living().filter(B=>B.id!==A.id&&dist(A,B)<=radius);}
function prestige(A,d){ensureHuman(A).prestige=clamp(ensureHuman(A).prestige+d,0,5);}
function dominance(A,d){ensureHuman(A).dominance=clamp(ensureHuman(A).dominance+d,0,5);}
function antiDominanceResponse(A){const H=ensureHuman(A);if(H.dominance<1.4)return;for(const B of living())if(B.id!==A.id&&dist(A,B)<120){const BH=ensureHuman(B);if(BH.antiDominance>.5){B.relations[A.id]=clamp((B.relations[A.id]||0)-.025,0,1);E.humanEvents.antiDominance++;}}}

execute=function(A,P,a){
  ensureHuman(A);
  if(a.type==='care_kin'){
    const B=E.people[a.target];A.actions++;A.metrics.social++;A.culture.actions.care_kin=(A.culture.actions.care_kin||0)+1;if(B&&B.alive&&isKin(A,B)){if(B.water<36&&A.water>48){A.water-=8;B.water=clamp(B.water+10,0,100)}else if(B.energy<36){if((A.inventory.cookedMeat||0)>0){A.inventory.cookedMeat--;B.inventory.cookedMeat=(B.inventory.cookedMeat||0)+1}else if(A.inventory.food>0){A.inventory.food--;B.inventory.food++}}relation(A,B,.06);prestige(A,.01);E.humanEvents.kinCare++;A.lastOutcome=.7;return .7}return 0;
  }
  if(a.type==='protect_possession'){
    A.actions++;A.metrics.social++;A.culture.actions.protect_possession=(A.culture.actions.protect_possession||0)+1;E.humanEvents.possessionDefense++;A.lastOutcome=.1;return .1;
  }
  if(a.type==='assert_claim'){
    A.actions++;A.metrics.social++;A.culture.actions.assert_claim=(A.culture.actions.assert_claim||0)+1;E.claims[a.target]={owner:A.id,until:E.tick+180};ensureHuman(A).claims++;dominance(A,.035);E.humanEvents.claims++;antiDominanceResponse(A);A.lastOutcome=.12;return .12;
  }
  if(a.type==='challenge_claim'){
    const O=E.people[a.target];A.actions++;A.metrics.social++;A.culture.actions.challenge_claim=(A.culture.actions.challenge_claim||0)+1;E.humanEvents.challenges++;if(O&&E.claims[a.node]?.owner===O.id){const ah=ensureHuman(A),oh=ensureHuman(O),chance=clamp(.45+ah.antiDominance*.18-oh.dominance*.06+(A.relations[O.id]||0)*-.1,.12,.82);if(noise('challenge|'+A.id+'|'+O.id+'|'+a.node)<chance){delete E.claims[a.node];dominance(O,-.06);prestige(A,.015);A.lastOutcome=.35;return .35}dominance(O,.025);A.energy=clamp(A.energy-1.2,0,100);A.lastOutcome=-.1;return -.1}return 0;
  }
  const beforeCoop=A.metrics.coopSuccess||0,out=oldExecute(A,P,a);
  if(a.type==='share'){prestige(A,.018);for(const B of witnessed(A,100))if(B.id!==a.target)B.relations[A.id]=clamp((B.relations[A.id]||0)+.004,0,1);}
  if(a.type==='preserve_fire'||a.type==='cook_meat'||(a.type==='gather'&&a.kind==='sharp_stone')){const ws=witnessed(A,130);prestige(A,.02+Math.min(.04,ws.length*.003));}
  return out;
};

updateEnvironment=function(){oldUpdateEnvironment();for(const A of living()){ensureHuman(A);const now=A.metrics.coopSuccess||0;if(now>ensureHuman(A).lastCoopSuccess){prestige(A,.035*(now-ensureHuman(A).lastCoopSuccess));ensureHuman(A).lastCoopSuccess=now;}ensureHuman(A).prestige*=.9997;ensureHuman(A).dominance*=.9995;}for(const [k,c] of Object.entries(E.claims||{}))if(c.until<E.tick)delete E.claims[k];};

render=function(){oldRender();let box=document.getElementById('humanSubstrate');if(!box){box=document.createElement('div');box.id='humanSubstrate';box.className='foot';document.querySelector('.app')?.appendChild(box);}const pop=living(),avg=k=>pop.length?(pop.reduce((s,a)=>s+ensureHuman(a)[k],0)/pop.length).toFixed(2):'0';box.textContent='공통 인간기질: 평균 위신 '+avg('prestige')+' · 평균 지배 '+avg('dominance')+' · 친족돌봄 '+(E.humanEvents?.kinCare||0)+' · 점유방어 '+(E.humanEvents?.possessionDefense||0)+' · 자원주장 '+(E.humanEvents?.claims||0)+' · 반지배 반응 '+(E.humanEvents?.antiDominance||0);};

reset();render();
})();
