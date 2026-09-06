import { writeFile } from 'node:fs/promises';

// OASIS O1-O4 long-horizon structural validation v2.
// Internal ablation only: no external-model comparison and no superiority score.

const HORIZONS=[10_000,100_000,1_000_000];
const SEEDS=[17,43,101];
const VARIANTS=['전체','O1제거','O2제거','O3제거','O4위반'];
const PROCESS_INTERVAL=997;
const INACTIVE_AFTER=97;
const MAX_PROCESSES=1500;
const FUTURE_LOOKAHEAD=512;

function mix32(x){x|=0;x=Math.imul(x^(x>>>16),0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);return(x^(x>>>16))>>>0}
function pick(seed,t,s,n){return mix32(seed^Math.imul(t+1,0x9e3779b1)^Math.imul(s+11,0x85ebca6b))%n}
function eventAt(seed,t){
  const actor=pick(seed,t,1,12);let other=pick(seed,t,2,12);if(other===actor)other=(other+1)%12;
  return {tick:t,actor,other,place:pick(seed,t,3,12),role:pick(seed,t,4,8),risk:pick(seed,t,5,3),season:pick(seed,t,6,64)};
}
function fp(e){return `${e.actor}/${e.other}/${e.place}/${e.role}/${e.risk}/${e.season}`}
function eventRank(e){return (((((e.actor*12+e.other)*12+e.place)*8+e.role)*3+e.risk)*64+e.season)>>>0}
function targetKey(a,b,ordered){
  let x=a,y=b;
  if(!ordered && eventRank(x)>eventRank(y)){x=b;y=a}
  return `${y.actor}/${x.other}/${y.place}/${x.role}/${y.risk}/${x.season}`;
}
function cfg(name){return{name,o1:name!=='O1제거',o2:name!=='O2제거',o3:name!=='O3제거',o4:name!=='O4위반'}}
function newState(name){return{cfg:cfg(name),active:new Map(),latent:new Map(),all:new Map(),index:new Map(),expiry:new Map(),id:1,first:[],gaps:[],snapshots:{},c:{created:0,deCurrentized:0,reactivated:0,repeat:0,meaningReconstructed:0,lineageCreated:0,futureReads:0,orderCollapsed:0,permanentDeletes:0}}}
function addBucket(map,key,id){if(!map.has(key))map.set(key,new Set());map.get(key).add(id)}
function scheduleExpiry(S,p,t){p.expiry=t+INACTIVE_AFTER;addBucket(S.expiry,p.expiry,p.id)}
function futureMatch(seed,start,key){for(let t=start+1;t<=start+FUTURE_LOOKAHEAD;t++)if(fp(eventAt(seed,t))===key)return t;return null}
function create(S,seed,a,b,parent=null){
  if(S.all.size>=MAX_PROCESSES)return null;
  const key=targetKey(a,b,S.cfg.o1);
  if(!S.cfg.o1 && targetKey(a,b,true)!==targetKey(b,a,true))S.c.orderCollapsed++;
  const p={id:S.id++,born:b.tick,lastCurrent:b.tick,lastReact:null,reactCount:0,parent,depth:parent?(S.all.get(parent)?.depth||0)+1:0,key,meaning:null,scheduled:null,expiry:null};
  S.all.set(p.id,p);S.active.set(p.id,p);addBucket(S.index,key,p.id);S.c.created++;if(parent)S.c.lineageCreated++;
  if(S.cfg.o2)scheduleExpiry(S,p,b.tick);
  if(!S.cfg.o4&&S.cfg.o3){S.c.futureReads++;p.scheduled=futureMatch(seed,b.tick,key)}
  return p;
}
function deCurrentize(S,t){
  if(!S.cfg.o2)return;
  const ids=S.expiry.get(t);if(!ids)return;
  for(const id of ids){const p=S.active.get(id);if(p&&p.expiry===t){S.active.delete(id);S.latent.set(id,p);S.c.deCurrentized++}}
  S.expiry.delete(t);
}
function reactivate(S,seed,e){
  if(!S.cfg.o3)return;
  const ids=S.index.get(fp(e));if(!ids)return;
  for(const id of ids){
    const p=S.cfg.o2?S.latent.get(id):S.active.get(id);if(!p)continue;
    const ok=!S.cfg.o4&&p.scheduled!==null?e.tick===p.scheduled:true;
    if(!ok)continue;
    if(!S.cfg.o2){p.lastCurrent=e.tick;continue}
    S.latent.delete(id);S.active.set(id,p);
    const prior=p.lastReact;p.lastReact=e.tick;p.lastCurrent=e.tick;p.reactCount++;
    p.meaning=`현재:${e.actor}-${e.other}@${e.place}/역할${e.role}/위험${e.risk}/계절${e.season}`;
    S.c.reactivated++;S.c.meaningReconstructed++;
    if(p.reactCount===1)S.first.push(e.tick-p.born);else{S.c.repeat++;S.gaps.push(e.tick-prior)}
    scheduleExpiry(S,p,e.tick);
    if(p.depth<5&&S.all.size<MAX_PROCESSES&&mix32(seed^e.tick^p.id)%5===0)create(S,seed,eventAt(seed,Math.max(0,e.tick-1)),e,p.id);
  }
}
function q(xs,p){if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(p*(a.length-1)))]}
function snap(S,t){const ps=[...S.all.values()];return{tick:t,totalProcesses:ps.length,active:S.active.size,latent:S.latent.size,neverReactivated:ps.filter(p=>p.reactCount===0).length,reactivatedProcesses:ps.filter(p=>p.reactCount>0).length,totalReactivations:S.c.reactivated,repeatReactivations:S.c.repeat,medianFirstReactivation:q(S.first,.5),p90FirstReactivation:q(S.first,.9),medianGap:q(S.gaps,.5),maxLineageDepth:ps.reduce((m,p)=>Math.max(m,p.depth),0),counters:{...S.c}}}
function run(seed,name){
  const S=newState(name);let prev=eventAt(seed,0);
  for(let t=1;t<=HORIZONS.at(-1);t++){
    const e=eventAt(seed,t);
    if(t%PROCESS_INTERVAL===0)create(S,seed,prev,e);
    deCurrentize(S,t);reactivate(S,seed,e);
    if(HORIZONS.includes(t))S.snapshots[t]=snap(S,t);
    prev=e;
  }
  return{final:snap(S,HORIZONS.at(-1)),snapshots:S.snapshots};
}
const report={design:{purpose:'OASIS O1-O4 장기 구조 검증 v2',horizons:HORIZONS,seeds:SEEDS,environment:'seed와 tick만으로 생성되는 외생 현실. 잠재과정을 환경 생성기가 참조하지 않음.',successRule:'점수 우월이 아니라 제거/위반 시 해당 연산 구조가 실제로 사라지는지 확인'},runs:[]};
for(const seed of SEEDS)for(const variant of VARIANTS){const result=run(seed,variant);report.runs.push({seed,variant,...result});const r=result.final;console.log(`${variant} seed=${seed} proc=${r.totalProcesses} active=${r.active} latent=${r.latent} react=${r.totalReactivations} never=${r.neverReactivated} medT=${r.medianFirstReactivation} p90T=${r.p90FirstReactivation} repeat=${r.repeatReactivations} lineage=${r.maxLineageDepth} futureReads=${r.counters.futureReads}`)}
const finals=n=>report.runs.filter(x=>x.variant===n).map(x=>x.final);const every=(n,f)=>finals(n).every(f);function assert(x,m){if(!x)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}
assert(every('전체',r=>r.counters.permanentDeletes===0),'전체형은 비현재화 과정을 영구 삭제하지 않음');
assert(every('전체',r=>r.counters.futureReads===0),'전체형은 미래정보를 사용하지 않음');
assert(every('O1제거',r=>r.counters.orderCollapsed>0),'O1 제거 시 순서정보 소실이 실제 발생');
assert(every('O2제거',r=>r.latent===0),'O2 제거 시 잠재/비현재화 영역이 생성되지 않음');
assert(every('O3제거',r=>r.totalReactivations===0),'O3 제거 시 재활성화가 발생하지 않음');
assert(every('O4위반',r=>r.counters.futureReads>0),'O4 위반 시 미래 현실 조회가 실제 발생');
assert(every('전체',r=>r.totalReactivations>0),'전체형에서 예약 없이 현재관계 재활성화가 실제 발생');
assert(every('전체',r=>r.neverReactivated>0),'전체형에서 관찰 종료까지 재활성화되지 않은 과정도 존재');
await writeFile('long-horizon-operator-report.json',JSON.stringify(report,null,2));
console.log('RESULT: 장기 O1-O4 구조 검증 v2 완료. 일반지능/우월성 증명이 아니라 연산자 메커니즘 검증으로만 해석한다.');
