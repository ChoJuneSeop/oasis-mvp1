(function(){
// v0.2 correction layer: preserve each model's internal character while fixing two experimental omissions:
// (1) OASIS responsibility-axis response to worsening current flow, (2) generic movement into unseen space.
const DIRS=[
  ['dirN','N',480,35],['dirNE','NE',900,55],['dirE','E',925,300],['dirSE','SE',900,545],
  ['dirS','S',480,565],['dirSW','SW',60,545],['dirW','W',35,300],['dirNW','NW',60,55]
];
for(const [id,label,x,y] of DIRS){if(!NODES.some(n=>n.id===id))NODES.push({id,kind:'direction',x,y,stock:999,max:999,regen:0,label:'·'+label})}
const dirIds=new Set(DIRS.map(x=>x[0]));
const oldAffordances=affordances;
affordances=function(A,P){
  const xs=oldAffordances(A,P);
  for(const [id,label] of DIRS)xs.push({type:'move',target:id,kind:'direction',dir:label});
  return dedupeActs(xs);
};
actionKey=function(a){return a.type+(a.dir?':'+a.dir:(a.kind?':'+a.kind:''))};
ruleDecide=function(A,P,acts){
  let pick;
  if(P.self.water<38)pick=acts.find(a=>a.type==='drink')||acts.find(a=>a.type==='move'&&a.kind==='water');
  if(!pick&&P.self.energy<38)pick=acts.find(a=>a.type==='forage')||acts.find(a=>a.type==='move'&&a.kind==='food')||acts.find(a=>a.type==='rest');
  if(!pick&&P.self.warmth<34)pick=acts.find(a=>a.type==='make_fire')||acts.find(a=>a.type==='rest')||acts.find(a=>a.type==='move'&&a.kind==='shelter');
  if(!pick)pick=acts.find(a=>a.type==='craft_tool')||acts.find(a=>a.type==='make_fire');
  if(!pick)pick=acts.find(a=>a.type==='interact')||acts.find(a=>a.type==='forage')||acts.find(a=>a.type==='move'&&a.kind==='direction')||acts.find(a=>a.type==='observe')||acts[0];
  return{a:pick||acts[0],why:'내부 조건규칙이 현재 상태에서 가장 먼저 충족된 분기를 선택'};
};
expectedDelta=function(A,P,a){
  let e=0,w=0,h=0,k=0,s=0,i=0;
  if(a.type==='forage')e+=18;if(a.type==='drink')w+=25;if(a.type==='rest'){e+=12;h+=10}
  if(a.type==='gather')i+=4;if(a.type==='craft_tool'){k+=14;i+=8}if(a.type==='make_fire'){h+=20;k+=12}
  if(a.type==='hunt'){e+=24;k+=6}if(a.type==='observe')k+=6;
  if(a.type==='move'){if(a.kind==='direction')k+=5;const n=E.nodes.find(x=>x.id===a.target);if(n&&!dirIds.has(n.id)&&!A.known.has(n.id))k+=8}
  if(a.type==='interact'){s+=8;k+=2}if(a.type==='share')s+=12;
  return .9*e+1.0*w+.75*h+1.1*k+.65*s+.45*i;
};
retrievalDecide=function(A,P,acts){
  const v=contextVector(P);const candidates=A.memory.map(m=>({...m,sim:sim(v,m.ctx)})).filter(m=>m.sim>.55).sort((a,b)=>(b.sim*b.outcome)-(a.sim*a.outcome));
  for(const m of candidates){const a=acts.find(x=>actionKey(x)===m.action);if(a){A.metrics.memoryUse++;return{a,why:`유사 과거경험 검색 재사용 (유사도 ${m.sim.toFixed(2)})`}}}
  const ws=acts.filter(x=>x.type==='move'&&x.kind==='direction'),r=rng(hash(A.key+'|wander|'+E.tick));
  return{a:ws.length?ws[Math.floor(r()*ws.length)]:acts.find(x=>x.type==='observe')||acts[0],why:'재사용할 유사 경험이 없어 방향 탐색으로 첫 경험을 생성'};
};
oasisRank=function(A,P,a,active){
  const touched=[];if(a.target)touched.push(String(a.target).startsWith('agent:')?a.target:(E.agents[a.target]?'agent:'+a.target:a.target));
  const rel=active.filter(ep=>touched.includes(ep.left)||touched.includes(ep.right)||ep.context.some(x=>touched.includes(x))).length;
  const newRel=touched.reduce((n,x)=>n+(A.relations[x]?0:1),0),affordanceNovel=A.novelActions.has(actionKey(a))?0:1;
  const participation=(a.type==='interact'||a.type==='share')?P.nearAgents.length:(a.type==='move'||a.type==='gather'||a.type==='forage'||a.type==='drink'||a.type==='hunt'||a.type==='rest')?P.nearNodes.length:1;
  const prev=A.lastPerception?.self;let responsibility=0;
  if(prev){
    const fallE=Math.max(0,prev.energy-P.self.energy),fallW=Math.max(0,prev.water-P.self.water),fallT=Math.max(0,prev.warmth-P.self.warmth);
    const needE=(100-P.self.energy)/100,needW=(100-P.self.water)/100,needT=(100-P.self.warmth)/100;let fit=0;
    if(a.type==='drink'||(a.type==='move'&&a.kind==='water'))fit=needW;
    if(a.type==='forage'||a.type==='hunt'||(a.type==='move'&&a.kind==='food'))fit=Math.max(fit,needE);
    if(a.type==='rest')fit=Math.max(needE,needT);
    if(a.type==='make_fire'||(a.type==='move'&&a.kind==='shelter'))fit=Math.max(fit,needT);
    responsibility=(fallE*needE+fallW*needW+fallT*needT)*fit;
  }
  const flowChange=Math.abs((A.lastPerception?.temp??P.temp)-P.temp);
  return[responsibility,rel,newRel,affordanceNovel,participation,flowChange,-(a.type==='wait'?1:0)];
};
reset();
log('v0.2 보정 적용: 보이지 않는 공간으로의 이동 가능성과 OASIS 책임축의 흐름 반응을 복구했다.');
render();
})();
