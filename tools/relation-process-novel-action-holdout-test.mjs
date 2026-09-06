import { writeFile } from 'node:fs/promises';

// Frozen before the first holdout execution.
const TRAIN_SEEDS=[211,487,823,1291,1747,2239,2713,3259,3821,4409,5023,5651];
const HOLDOUT_SEEDS=[19001,19319,19727,20143,20507,20983,21419,21881,22349,22807,23291,23761,24203,24671,25121,25601];
const ACTION_LEVELS=[-1,0,1];
const MEMORY_PER_SEED=30;
const QUERIES_PER_SEED=14;
const BASE_K=18, EXTRA_K=10;
const RIDGE=0.08;
const EPS=1e-9;

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const median=xs=>{if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const norm=a=>Math.sqrt(dot(a,a));
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const mul=(a,s)=>a.map(x=>x*s);
const angle=v=>Math.atan2(v[1],v[0]);
const wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
const rot=(v,a)=>[Math.cos(a)*v[0]-Math.sin(a)*v[1],Math.sin(a)*v[0]+Math.cos(a)*v[1]];
const actionKey=a=>`${a[0]},${a[1]}`;
const actions=ACTION_LEVELS.flatMap(a=>ACTION_LEVELS.map(b=>[a,b]));

function hash32(...xs){let h=2166136261>>>0;const s=xs.join('|');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;h=Math.imul(h,0x846ca68b)>>>0;h^=h>>>16;return h>>>0;}
function rand(...xs){return hash32(...xs)/4294967296;}

function context(seed,i,kind='mem'){
  const th=2*Math.PI*rand('th',seed,i,kind),drift=2*rand('drift',seed,i,kind)-1,swirl=2*rand('swirl',seed,i,kind)-1,asym=2*rand('asym',seed,i,kind)-1;
  const mag=.045+.055*rand('mag',seed,i,kind),before=mul([Math.cos(th),Math.sin(th)],mag);
  const process=[Math.cos(th),Math.sin(th),drift,swirl,asym,mag/.10];
  const baseGain=1.035+.075*(.5+.5*Math.sin(1.17*th+.61*drift-.37*swirl))+.018*Math.abs(asym);
  const commonFlowLoad=clamp((baseGain-1.0)/.13,0,1);
  return {th,drift,swirl,asym,mag,before,process,baseGain,commonFlowLoad};
}

function trueDynamics(ctx,action,seedTag){
  const [a1,a2]=action;
  const b1=.076*Math.tanh(1.18*ctx.process[0]+.72*ctx.drift-.43*ctx.swirl+.22*ctx.asym);
  const b2=.073*Math.tanh(-.82*ctx.process[1]+.31*ctx.drift+1.04*ctx.swirl-.28*ctx.asym);
  const synergy=.034*a1*a2*Math.sin(1.61*ctx.th+.77*ctx.asym-.34*ctx.drift);
  const interventionCost=.011*(a1*a1+a2*a2);
  const gain=clamp(ctx.baseGain-a1*b1-a2*b2-synergy+interventionCost,.74,1.24);
  const turn=.19*ctx.swirl+.105*a1-.092*a2+.074*a1*a2*ctx.asym;
  const deterministic=mul(rot(ctx.before,turn),gain),noiseMag=.0018;
  const noise=[(rand('nx',seedTag)-.5)*2*noiseMag,(rand('ny',seedTag)-.5)*2*noiseMag],after=add(deterministic,noise);
  const observedGain=norm(after)/(norm(ctx.before)+EPS),logGain=Math.log(Math.max(EPS,observedGain)),resolution=-logGain;
  const centerShift=[.10*a1+.028*ctx.drift,.10*a2+.028*ctx.swirl];
  return {gain,after,logGain,resolution,turn,centerShift};
}

function makeMemory(){const rows=[];for(const seed of TRAIN_SEEDS)for(let i=0;i<MEMORY_PER_SEED;i++){const ctx=context(seed,i,'memory'),action=actions[Math.floor(rand('action',seed,i)*actions.length)],dyn=trueDynamics(ctx,action,`m:${seed}:${i}:${actionKey(action)}`);rows.push({id:`m-${seed}-${i}`,ctx,action,...dyn});}return rows;}
function processDistance(a,b){const w=[1,1,.72,.72,.55,.45];return Math.sqrt(a.reduce((s,x,i)=>s+w[i]*(x-b[i])**2,0));}
function activate(memory,ctx){const k=BASE_K+Math.round(EXTRA_K*ctx.commonFlowLoad),rows=memory.map(ep=>({...ep,d:processDistance(ep.ctx.process,ctx.process)})).sort((a,b)=>a.d-b.d).slice(0,k),scale=median(rows.map(x=>x.d))||1;for(const r of rows)r.w=Math.exp(-r.d/(scale+EPS));return rows;}
function weightedMean(rows,value){let s=0,w=0;for(const r of rows){if(r.w<=0)continue;s+=r.w*value(r);w+=r.w;}return w?s/w:null;}

function nearestCase(active){let best=null,bestScore=-Infinity;for(const r of active){const score=r.w*(.035+Math.max(0,r.resolution));if(score>bestScore){bestScore=score;best=r;}}return best?.action||[0,0];}
function caseAdapt(active){const good=active.filter(r=>r.resolution>0),rows=good.length>=4?good:active;let sw=0,x=0,y=0;for(const r of rows){const q=r.w*(.05+Math.max(0,r.resolution));sw+=q;x+=q*r.action[0];y+=q*r.action[1];}const snap=v=>ACTION_LEVELS.reduce((best,z)=>Math.abs(z-v)<Math.abs(best-v)?z:best,ACTION_LEVELS[0]);return sw?[snap(x/sw),snap(y/sw)]:[0,0];}
function componentValue(active){const out=[];for(let dim=0;dim<2;dim++){let best=0,bv=-Infinity;for(const level of ACTION_LEVELS){const rows=active.filter(r=>r.action[dim]===level);if(!rows.length)continue;const v=weightedMean(rows,r=>r.resolution);if(v>bv){bv=v;best=level;}}out.push(best);}return out;}

function solveLinear(A,b,lambda=RIDGE){const n=A[0].length,M=Array.from({length:n},(_,i)=>Array.from({length:n+1},(_,j)=>j<n?(A.reduce((s,row)=>s+row[i]*row[j],0)+(i===j?lambda:0)):A.reduce((s,row,k)=>s+row[i]*b[k],0)));for(let col=0;col<n;col++){let pivot=col;for(let r=col+1;r<n;r++)if(Math.abs(M[r][col])>Math.abs(M[pivot][col]))pivot=r;[M[col],M[pivot]]=[M[pivot],M[col]];const d=M[col][col];if(Math.abs(d)<1e-10)continue;for(let j=col;j<=n;j++)M[col][j]/=d;for(let r=0;r<n;r++){if(r===col)continue;const f=M[r][col];for(let j=col;j<=n;j++)M[r][j]-=f*M[col][j];}}return M.map(r=>r[n]);}
function rewardFeatures(ctx,action){const [a,b]=action,p=ctx.process;return [1,a,b,a*b,a*p[0],a*p[2],a*p[4],b*p[1],b*p[3],b*p[4],a*b*p[2],a*b*p[4]];}
function localRewardRidge(active,ctx){const A=[],b=[];for(const r of active){const f=rewardFeatures(r.ctx,r.action),s=Math.sqrt(r.w);A.push(f.map(x=>x*s));b.push(r.resolution*s);}const beta=solveLinear(A,b);let best=actions[0],bv=-Infinity;for(const a of actions){const v=dot(rewardFeatures(ctx,a),beta);if(v>bv){bv=v;best=a;}}return best;}

function relationProcess(active,ctx){
  const localMean=weightedMean(active,r=>r.logGain)??0,comp=[new Map(),new Map()];
  for(let dim=0;dim<2;dim++)for(const level of ACTION_LEVELS){const rows=active.filter(r=>r.action[dim]===level);comp[dim].set(level,rows.length?(weightedMean(rows,r=>r.logGain)??localMean)-localMean:0);}
  const pairResidual=new Map();
  for(const a of actions){const rows=active.filter(r=>r.action[0]===a[0]&&r.action[1]===a[1]);if(rows.length>=2){const m=weightedMean(rows,r=>r.logGain)??localMean,additive=localMean+(comp[0].get(a[0])||0)+(comp[1].get(a[1])||0),reliability=Math.min(.55,rows.length/8);pairResidual.set(actionKey(a),(m-additive)*reliability);}else pairResidual.set(actionKey(a),0);}
  const currentAng=angle(ctx.before),orient=[new Map(),new Map()];
  for(let dim=0;dim<2;dim++)for(const level of ACTION_LEVELS){const rows=active.filter(r=>r.action[dim]===level);orient[dim].set(level,rows.length?(weightedMean(rows,r=>Math.cos(wrap(angle(r.ctx.before)-currentAng))*Math.max(-.2,Math.min(.2,r.resolution)))??0):0);}
  let best=actions[0],bv=Infinity;
  for(const a of actions){let pred=localMean+(comp[0].get(a[0])||0)+(comp[1].get(a[1])||0)+(pairResidual.get(actionKey(a))||0);pred-=.10*((orient[0].get(a[0])||0)+(orient[1].get(a[1])||0));if(pred<bv){bv=pred;best=a;}}
  return best;
}

const MODELS={nearestCase,caseAdapt,componentValue,localRewardRidge,relationProcess};
function oracle(ctx,seed,i){let best=actions[0],bestDyn=null,bestResolution=-Infinity;for(const a of actions){const d=trueDynamics(ctx,a,`q:${seed}:${i}:${actionKey(a)}`);if(d.resolution>bestResolution){bestResolution=d.resolution;best=a;bestDyn=d;}}return {action:best,dyn:bestDyn,resolution:bestResolution};}

const memory=makeMemory(),trials=[];
for(const seed of HOLDOUT_SEEDS){let accepted=0,attempt=0;while(accepted<QUERIES_PER_SEED&&attempt<QUERIES_PER_SEED*12){const i=attempt++,ctx=context(seed,i,'query'),orc=oracle(ctx,seed,i);if(ctx.baseGain<1.025||orc.dyn.gain>=.995)continue;const active=activate(memory,ctx),activeKeys=new Set(active.map(r=>actionKey(r.action)));const reusableActions=actions.filter(a=>activeKeys.has(actionKey(a))),bestReusable=Math.max(...reusableActions.map(a=>trueDynamics(ctx,a,`q:${seed}:${i}:${actionKey(a)}`).resolution)),reusableRegret=orc.resolution-bestReusable,flowClass=reusableRegret<=.012?'reuse-sufficient':reusableRegret>=.032?'recombination-needed':'middle',chosen={},bestRetrieved=nearestCase(active);for(const [name,fn] of Object.entries(MODELS)){const action=fn(active,ctx),dyn=trueDynamics(ctx,action,`q:${seed}:${i}:${actionKey(action)}`);chosen[name]={action,gain:dyn.gain,resolution:dyn.resolution,regret:orc.resolution-dyn.resolution,stable:dyn.gain<1,localNovel:!activeKeys.has(actionKey(action)),differentFromRetrieved:actionKey(action)!==actionKey(bestRetrieved),centerShift:norm(dyn.centerShift)};}trials.push({seed,i,flowClass,commonFlowLoad:ctx.commonFlowLoad,activated:active.length,activeActionCount:activeKeys.size,oracleAction:orc.action,oracleGain:orc.dyn.gain,oracleResolution:orc.resolution,reusableRegret,chosen});accepted++;}}

function summarize(rows,name){const xs=rows.map(r=>r.chosen[name]);return {n:xs.length,stableRate:mean(xs.map(x=>x.stable?1:0)),meanRegret:mean(xs.map(x=>x.regret)),medianRegret:median(xs.map(x=>x.regret)),oracleActionRate:mean(rows.map((r,j)=>actionKey(xs[j].action)===actionKey(r.oracleAction)?1:0)),localNovelRate:mean(xs.map(x=>x.localNovel?1:0)),differentFromRetrievedRate:mean(xs.map(x=>x.differentFromRetrieved?1:0)),stableShiftMean:mean(xs.filter(x=>x.stable).map(x=>x.centerShift))};}
const classes=['reuse-sufficient','recombination-needed','middle'],byClass={};for(const cls of classes){const rows=trials.filter(r=>r.flowClass===cls);byClass[cls]=Object.fromEntries(Object.keys(MODELS).map(k=>[k,summarize(rows,k)]));}
const overall=Object.fromEntries(Object.keys(MODELS).map(k=>[k,summarize(trials,k)]));
const report={design:{koreanQuestion:'동일한 중립 흐름신호와 동일한 활성 경험집합을 모든 모델에 제공할 때, 과거 완결 경험의 before→참여/행동→after 관계변환을 현재 흐름에서 재조합하는 방식이 과거 행동의 단순 재사용을 넘어 새로운 행동을 만들고 새로운 국소 안정 흐름을 형성하는가?',englishTermNote:'Relation-process recombination = completed before→action/participant→after transformations are reactivated only for the current flow and decomposed/recombined without permanent action weights. Local contraction = post-action nearby-flow separation shrinks; it does not mean returning to an old coordinate.',scope:'탐지 성능은 검증하지 않는다. 모든 모델은 같은 commonFlowLoad와 같은 top-K activated completed experiences를 사용한다. 절대 좌표나 원래 상태 복귀는 성과 기준에 사용하지 않는다.',nonCircularity:'수식, train/holdout seeds, memory size, action space, activation K, reuse/recombination class cutoffs, ridge strength are frozen before the first holdout execution. CI success must not depend on a model winning.',trainSeeds:TRAIN_SEEDS,holdoutSeeds:HOLDOUT_SEEDS,memoryEpisodes:memory.length,queriesPerSeed:QUERIES_PER_SEED,actionSpace:actions,baseK:BASE_K,extraK:EXTRA_K,classRule:'oracle regret of best whole action already present in the identical activated field: <=0.012 reuse-sufficient, >=0.032 recombination-needed, otherwise middle',models:Object.keys(MODELS)},counts:{trials:trials.length,byClass:Object.fromEntries(classes.map(c=>[c,trials.filter(r=>r.flowClass===c).length]))},overall,byClass,trials};
console.log('\nOASIS RELATION-PROCESS NOVEL-ACTION HOLDOUT VALIDATION');console.log(`trials=${report.counts.trials} classes=${JSON.stringify(report.counts.byClass)} memory=${memory.length}`);for(const [name,r] of Object.entries(overall))console.log(`${name}: stable=${r.stableRate.toFixed(3)} regret=${r.meanRegret.toFixed(4)} oracle=${r.oracleActionRate.toFixed(3)} localNovel=${r.localNovelRate.toFixed(3)} diffFromRetrieval=${r.differentFromRetrievedRate.toFixed(3)}`);for(const cls of ['reuse-sufficient','recombination-needed']){console.log(`CLASS ${cls}`);for(const [name,r] of Object.entries(byClass[cls]))console.log(`  ${name}: n=${r.n} stable=${r.stableRate?.toFixed(3)} regret=${r.meanRegret?.toFixed(4)} localNovel=${r.localNovelRate?.toFixed(3)}`);}console.log('RESULT: holdout completed without a performance-success assertion; interpret advantages, nulls, and adverse results by flow class.');
await writeFile('relation-process-novel-action-holdout-report.json',JSON.stringify(report,null,2));
