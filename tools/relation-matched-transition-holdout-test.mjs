import { writeFile } from 'node:fs/promises';

// Frozen before the first execution of this matched-relational-transition holdout.
// Previous LOCO holdout seeds are deliberately not reused.
const TRAIN_SEEDS=[307,661,991,1429,1871,2357,2909,3473,4051,4639,5261,5903];
const HOLDOUT_SEEDS=[41011,41507,42043,42571,43103,43613,44159,44701,45233,45767,46301,46831];
const LEVELS=[-1,0,1], ACTIONS=LEVELS.flatMap(a=>LEVELS.map(b=>[a,b]));
const MEMORY_PER_SEED=40, QUERIES_PER_SEED=10, BASE_K=36, EXTRA_K=12, RIDGE=.08, EPS=1e-9;
const MIN_PAIR_SUPPORT=2, MAX_ANCHORS=14, PAIR_CALIPER_FACTOR=.90, OTHER_MISMATCH_PENALTY=.55;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const median=xs=>{if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0), norm=a=>Math.hypot(...a), mul=(a,s)=>a.map(x=>x*s), add=(a,b)=>a.map((x,i)=>x+b[i]);
const rot=(v,a)=>[Math.cos(a)*v[0]-Math.sin(a)*v[1],Math.sin(a)*v[0]+Math.cos(a)*v[1]], ang=v=>Math.atan2(v[1],v[0]);
const wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a}, key=a=>`${a[0]},${a[1]}`;
function hash32(...xs){let h=2166136261>>>0,s=xs.join('|');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;h=Math.imul(h,0x846ca68b)>>>0;h^=h>>>16;return h>>>0}
const rand=(...xs)=>hash32(...xs)/4294967296;
function context(seed,i,kind){const th=2*Math.PI*rand('th',seed,i,kind),drift=2*rand('drift',seed,i,kind)-1,swirl=2*rand('swirl',seed,i,kind)-1,asym=2*rand('asym',seed,i,kind)-1,mag=.045+.055*rand('mag',seed,i,kind),before=mul([Math.cos(th),Math.sin(th)],mag),process=[Math.cos(th),Math.sin(th),drift,swirl,asym,mag/.10],baseGain=1.035+.075*(.5+.5*Math.sin(1.17*th+.61*drift-.37*swirl))+.018*Math.abs(asym),commonFlowLoad=clamp((baseGain-1)/.13,0,1);return{th,drift,swirl,asym,mag,before,process,baseGain,commonFlowLoad}}
function dynamics(ctx,action,tag){const[a1,a2]=action,b1=.076*Math.tanh(1.18*ctx.process[0]+.72*ctx.drift-.43*ctx.swirl+.22*ctx.asym),b2=.073*Math.tanh(-.82*ctx.process[1]+.31*ctx.drift+1.04*ctx.swirl-.28*ctx.asym),synergy=.034*a1*a2*Math.sin(1.61*ctx.th+.77*ctx.asym-.34*ctx.drift),cost=.011*(a1*a1+a2*a2),gain=clamp(ctx.baseGain-a1*b1-a2*b2-synergy+cost,.74,1.24),turn=.19*ctx.swirl+.105*a1-.092*a2+.074*a1*a2*ctx.asym,det=mul(rot(ctx.before,turn),gain),nm=.0018,after=add(det,[(rand('nx',tag)-.5)*2*nm,(rand('ny',tag)-.5)*2*nm]),logGain=Math.log(Math.max(EPS,norm(after)/(norm(ctx.before)+EPS))),observedTurn=wrap(ang(after)-ang(ctx.before));return{gain,after,logGain,resolution:-logGain,observedTurn,centerShift:norm([.10*a1+.028*ctx.drift,.10*a2+.028*ctx.swirl])}}
function makeMemory(){const out=[];for(const s of TRAIN_SEEDS)for(let i=0;i<MEMORY_PER_SEED;i++){const ctx=context(s,i,'memory'),action=ACTIONS[Math.floor(rand('action',s,i)*ACTIONS.length)],d=dynamics(ctx,action,`m:${s}:${i}:${key(action)}`);out.push({ctx,action,...d})}return out}
function dist(a,b){const w=[1,1,.72,.72,.55,.45];return Math.sqrt(a.reduce((s,x,i)=>s+w[i]*(x-b[i])**2,0))}
function activate(memory,ctx){const k=BASE_K+Math.round(EXTRA_K*ctx.commonFlowLoad),rows=memory.map(r=>({...r,d:dist(r.ctx.process,ctx.process)})).sort((a,b)=>a.d-b.d).slice(0,k),scale=median(rows.map(r=>r.d))||1;for(const r of rows)r.w=Math.exp(-r.d/(scale+EPS));return rows}
function wmean(rows,fn){let s=0,w=0;for(const r of rows){s+=r.w*fn(r);w+=r.w}return w?s/w:null}
function nearestCase(active){let b=null,z=-Infinity;for(const r of active){const q=r.w*(.035+Math.max(0,r.resolution));if(q>z){z=q;b=r}}return b?.action||[0,0]}
function caseAdapt(active){const good=active.filter(r=>r.resolution>0),rows=good.length>=4?good:active;let sw=0,x=0,y=0;for(const r of rows){const q=r.w*(.05+Math.max(0,r.resolution));sw+=q;x+=q*r.action[0];y+=q*r.action[1]}const snap=v=>LEVELS.reduce((b,z)=>Math.abs(z-v)<Math.abs(b-v)?z:b,LEVELS[0]);return sw?[snap(x/sw),snap(y/sw)]:[0,0]}
function componentValue(active){const out=[];for(let d=0;d<2;d++){let best=0,bv=-Infinity;for(const l of LEVELS){const rows=active.filter(r=>r.action[d]===l);if(!rows.length)continue;const v=wmean(rows,r=>r.resolution);if(v>bv){bv=v;best=l}}out.push(best)}return out}
function solve(A,b,lambda=RIDGE){const n=A[0].length,M=Array.from({length:n},(_,i)=>Array.from({length:n+1},(_,j)=>j<n?(A.reduce((s,row)=>s+row[i]*row[j],0)+(i===j?lambda:0)):A.reduce((s,row,k)=>s+row[i]*b[k],0)));for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;[M[c],M[p]]=[M[p],M[c]];const d=M[c][c];if(Math.abs(d)<1e-10)continue;for(let j=c;j<=n;j++)M[c][j]/=d;for(let r=0;r<n;r++){if(r===c)continue;const f=M[r][c];for(let j=c;j<=n;j++)M[r][j]-=f*M[c][j]}}return M.map(r=>r[n])}
function feat(ctx,a){const[x,y]=a,p=ctx.process;return[1,x,y,x*y,x*p[0],x*p[2],x*p[4],y*p[1],y*p[3],y*p[4],x*y*p[2],x*y*p[4]]}
function localRewardRidge(active,ctx){const A=[],b=[];for(const r of active){const f=feat(r.ctx,r.action),s=Math.sqrt(r.w);A.push(f.map(x=>x*s));b.push(r.resolution*s)}const beta=solve(A,b);let best=ACTIONS[0],bv=-Infinity;for(const a of ACTIONS){const v=dot(feat(ctx,a),beta);if(v>bv){bv=v;best=a}}return best}
function relationProcess(active,ctx){const base=wmean(active,r=>r.logGain)??0,comp=[new Map(),new Map()];for(let d=0;d<2;d++)for(const l of LEVELS){const rows=active.filter(r=>r.action[d]===l);comp[d].set(l,rows.length?(wmean(rows,r=>r.logGain)??base)-base:0)}const pair=new Map;for(const a of ACTIONS){const rows=active.filter(r=>key(r.action)===key(a));if(rows.length>=2){const m=wmean(rows,r=>r.logGain)??base,additive=base+(comp[0].get(a[0])||0)+(comp[1].get(a[1])||0),rel=Math.min(.55,rows.length/8);pair.set(key(a),(m-additive)*rel)}else pair.set(key(a),0)}const ca=ang(ctx.before),orient=[new Map(),new Map()];for(let d=0;d<2;d++)for(const l of LEVELS){const rows=active.filter(r=>r.action[d]===l);orient[d].set(l,rows.length?(wmean(rows,r=>Math.cos(wrap(ang(r.ctx.before)-ca))*Math.max(-.2,Math.min(.2,r.resolution)))??0):0)}let best=ACTIONS[0],bv=Infinity;for(const a of ACTIONS){let pred=base+(comp[0].get(a[0])||0)+(comp[1].get(a[1])||0)+(pair.get(key(a))||0);pred-=.10*((orient[0].get(a[0])||0)+(orient[1].get(a[1])||0));if(pred<bv){bv=pred;best=a}}return best}

function matchedPairs(active,dim,from,to,otherLevel,ctx){
  if(from===to)return[];
  const left=active.filter(r=>r.action[dim]===from&&r.action[1-dim]===otherLevel);
  const right=active.filter(r=>r.action[dim]===to&&r.action[1-dim]===otherLevel);
  if(!left.length||!right.length)return[];
  const localScale=median(active.map(r=>r.d))||1,caliper=PAIR_CALIPER_FACTOR*localScale;
  const pairs=[];
  for(const a of left){
    let b=null,bd=Infinity;
    for(const x of right){const z=dist(a.ctx.process,x.ctx.process);if(z<bd){bd=z;b=x}}
    if(!b||bd>caliper)continue;
    const mid=a.ctx.process.map((x,i)=>(x+b.ctx.process[i])/2),queryDist=dist(mid,ctx.process);
    const w=Math.sqrt(a.w*b.w)*Math.exp(-bd/(localScale+EPS))*Math.exp(-queryDist/(localScale+EPS));
    pairs.push({a,b,pairDist:bd,queryDist,w,deltaLog:b.logGain-a.logGain,deltaTurn:wrap(b.observedTurn-a.observedTurn)});
  }
  return pairs;
}
function stepEffect(active,ctx,dim,from,to,otherLevel){
  if(from===to)return{ok:true,deltaLog:0,deltaTurn:0,support:999,weight:1,pairDist:0};
  let rows=matchedPairs(active,dim,from,to,otherLevel,ctx),penalty=1;
  if(rows.length<MIN_PAIR_SUPPORT){
    const alt=[];
    for(const o of LEVELS){if(o===otherLevel)continue;for(const p of matchedPairs(active,dim,from,to,o,ctx))alt.push({...p,w:p.w*OTHER_MISMATCH_PENALTY})}
    rows=rows.concat(alt);penalty=OTHER_MISMATCH_PENALTY;
  }
  if(rows.length<MIN_PAIR_SUPPORT)return{ok:false,deltaLog:0,deltaTurn:0,support:rows.length,weight:0,pairDist:null};
  rows.sort((x,y)=>y.w-x.w);const use=rows.slice(0,6),sw=use.reduce((s,r)=>s+r.w,0);
  return{ok:true,deltaLog:use.reduce((s,r)=>s+r.w*r.deltaLog,0)/(sw+EPS),deltaTurn:use.reduce((s,r)=>s+r.w*r.deltaTurn,0)/(sw+EPS),support:use.length,weight:sw,penalty,pairDist:mean(use.map(r=>r.pairDist))};
}
function transformPath(active,ctx,anchor,target,order){
  let cur=[...anchor.action],predLog=anchor.logGain,predTurn=anchor.observedTurn,support=0,weight=1,pairDist=[];
  for(const dim of order){
    if(cur[dim]===target[dim])continue;
    const e=stepEffect(active,ctx,dim,cur[dim],target[dim],cur[1-dim]);
    if(!e.ok)return{ok:false,predLog:null,predTurn:null,support,pairDist:pairDist.length?mean(pairDist):null};
    predLog+=e.deltaLog;predTurn=wrap(predTurn+e.deltaTurn);support+=e.support;weight*=Math.max(EPS,e.weight);if(e.pairDist!=null)pairDist.push(e.pairDist);cur[dim]=target[dim];
  }
  return{ok:true,predLog,predTurn,support,weight,pairDist:pairDist.length?mean(pairDist):0};
}
function matchedTransition(active,ctx){
  const anchors=[...active].sort((a,b)=>a.d-b.d).slice(0,MAX_ANCHORS),candidates=[];
  for(const target of ACTIONS){
    const preds=[];
    for(const anchor of anchors){
      const p01=transformPath(active,ctx,anchor,target,[0,1]),p10=transformPath(active,ctx,anchor,target,[1,0]);
      const paths=[p01,p10].filter(p=>p.ok);
      if(!paths.length)continue;
      const predLog=mean(paths.map(p=>p.predLog)),predTurn=mean(paths.map(p=>p.predTurn)),agreement=paths.length===2?Math.abs(p01.predLog-p10.predLog):null;
      const support=paths.reduce((s,p)=>s+p.support,0),pairDist=mean(paths.map(p=>p.pairDist).filter(x=>x!=null));
      const confidence=anchor.w*(1+Math.min(12,support)/12)*(agreement==null?0.72:Math.exp(-agreement/.035));
      preds.push({predLog,predTurn,support,pairDist,confidence,pathCount:paths.length,agreement});
    }
    if(!preds.length){candidates.push({action:target,ok:false,predLog:Infinity,support:0,pathAgreement:null,anchorSupport:0});continue}
    const sw=preds.reduce((s,p)=>s+p.confidence,0),predLog=preds.reduce((s,p)=>s+p.confidence*p.predLog,0)/(sw+EPS),predTurn=preds.reduce((s,p)=>s+p.confidence*p.predTurn,0)/(sw+EPS);
    candidates.push({action:target,ok:true,predLog,predTurn,support:Math.round(mean(preds.map(p=>p.support))),pathAgreement:mean(preds.map(p=>p.agreement).filter(x=>x!=null)),anchorSupport:preds.length,pairDist:mean(preds.map(p=>p.pairDist).filter(x=>x!=null))});
  }
  const valid=candidates.filter(c=>c.ok&&c.anchorSupport>=3).sort((a,b)=>a.predLog-b.predLog);
  const chosen=valid[0]||{action:[0,0],ok:false,predLog:null,support:0,pathAgreement:null,anchorSupport:0,pairDist:null};
  return{action:chosen.action,diag:{candidateCoverage:valid.length/9,support:chosen.support,pathAgreement:chosen.pathAgreement,anchorSupport:chosen.anchorSupport,pairDist:chosen.pairDist,predLog:chosen.predLog}};
}

const MODELS={nearestCase,caseAdapt,componentValue,localRewardRidge,relationProcess};
function oracle(ctx,seed,i){let a=ACTIONS[0],d=null,z=-Infinity;for(const x of ACTIONS){const q=dynamics(ctx,x,`q:${seed}:${i}:${key(x)}`);if(q.resolution>z){z=q.resolution;a=x;d=q}}return{action:a,dyn:d,resolution:z}}
function evalAction(a,active,ctx,orc,seed,i,diag=null){const d=dynamics(ctx,a,`q:${seed}:${i}:${key(a)}`);return{action:a,stable:d.gain<1,regret:orc.resolution-d.resolution,oracle:key(a)===key(orc.action),localNovel:!active.some(r=>key(r.action)===key(a)),centerShift:d.centerShift,diag}}
function evaluate(active,ctx,orc,seed,i){const out={};for(const[n,fn]of Object.entries(MODELS)){const a=fn(active,ctx);out[n]=evalAction(a,active,ctx,orc,seed,i)}const mt=matchedTransition(active,ctx);out.matchedTransition=evalAction(mt.action,active,ctx,orc,seed,i,mt.diag);return out}
const memory=makeMemory(),trials=[];
for(const seed of HOLDOUT_SEEDS){let accepted=0,attempt=0;while(accepted<QUERIES_PER_SEED&&attempt<QUERIES_PER_SEED*100){const i=attempt++,ctx=context(seed,i,'query'),orc=oracle(ctx,seed,i);if(ctx.baseGain<1.025||orc.dyn.gain>=.995)continue;const full=activate(memory,ctx),ok=key(orc.action),oracleRows=full.filter(r=>key(r.action)===ok);if(!oracleRows.length)continue;const loco=full.filter(r=>key(r.action)!==ok);const c0=loco.filter(r=>r.action[0]===orc.action[0]).length,c1=loco.filter(r=>r.action[1]===orc.action[1]).length;if(loco.length<20||c0<3||c1<3)continue;trials.push({seed,i,commonFlowLoad:ctx.commonFlowLoad,oracleAction:orc.action,fullN:full.length,locoN:loco.length,oracleRowsRemoved:oracleRows.length,componentSupport:[c0,c1],full:evaluate(full,ctx,orc,seed,i),loco:evaluate(loco,ctx,orc,seed,i)});accepted++}}
const MODEL_NAMES=[...Object.keys(MODELS),'matchedTransition'];
function sum(mode,name){const xs=trials.map(t=>t[mode][name]);const ds=xs.map(x=>x.diag).filter(Boolean);return{n:xs.length,stableRate:mean(xs.map(x=>x.stable?1:0)),meanRegret:mean(xs.map(x=>x.regret)),oracleActionRate:mean(xs.map(x=>x.oracle?1:0)),localNovelRate:mean(xs.map(x=>x.localNovel?1:0)),stableShiftMean:mean(xs.filter(x=>x.stable).map(x=>x.centerShift)),diagnostics:ds.length?{candidateCoverage:mean(ds.map(d=>d.candidateCoverage)),support:mean(ds.map(d=>d.support)),anchorSupport:mean(ds.map(d=>d.anchorSupport)),pathAgreement:mean(ds.map(d=>d.pathAgreement).filter(x=>x!=null)),pairDist:mean(ds.map(d=>d.pairDist).filter(x=>x!=null))}:null}}
const summary={};for(const n of MODEL_NAMES){const full=sum('full',n),loco=sum('loco',n);summary[n]={full,loco,deltaStable:loco.stableRate-full.stableRate,deltaRegret:loco.meanRegret-full.meanRegret}}
const report={design:{koreanQuestion:'현재 흐름과 비슷한 완결경험들을 다중 매칭한 뒤, 다른 조건을 가능한 한 유지하면서 한 행동요소만 달라진 before→after 관계변환을 추출·합성하면, 정확한 과거 행동쌍이 없는 LOCO 조건에서도 새로운 안정 흐름을 만들 수 있는가?',englishTermNote:'Matched relational transition = similar completed trajectories are paired so that one action/participation component changes while the other is held fixed when possible; the observed before→after transition difference is then reused as a relational transformation rather than as a stored action score. Caliper = pairs farther apart than a fixed local-distance bound are rejected.',scope:'신규성 실험이 아니라 OASIS 내부 메커니즘 진단이다. 모든 모델은 같은 active memory와 같은 LOCO 제거를 받는다. localRewardRidge는 강한 compositional baseline으로 유지한다. 절대 좌표 복귀가 아니라 action 후 local gain<1을 새 국소 안정 흐름으로 정의한다.',nonCircularity:'기존 LOCO 결과를 본 뒤 설계했기 때문에 그 holdout seeds는 재사용하지 않는다. 새 holdout seeds, pair caliper, minimum pair support, anchor count, fallback 규칙은 첫 실행 전에 고정한다. CI에는 OASIS 우승 조건이 없다.',trainSeeds:TRAIN_SEEDS,holdoutSeeds:HOLDOUT_SEEDS,memoryEpisodes:memory.length,queriesPerSeed:QUERIES_PER_SEED,models:MODEL_NAMES},counts:{trials:trials.length},summary,trials};
console.log('\nOASIS MATCHED RELATIONAL TRANSITION HOLDOUT');console.log(`trials=${trials.length} memory=${memory.length}`);for(const[n,r]of Object.entries(summary)){const d=r.loco.diagnostics;console.log(`${n}: fullStable=${r.full.stableRate.toFixed(3)} locoStable=${r.loco.stableRate.toFixed(3)} fullRegret=${r.full.meanRegret.toFixed(4)} locoRegret=${r.loco.meanRegret.toFixed(4)} locoOracle=${r.loco.oracleActionRate.toFixed(3)} locoNovel=${r.loco.localNovelRate.toFixed(3)}${d?` coverage=${d.candidateCoverage.toFixed(3)} support=${d.support.toFixed(2)} agree=${d.pathAgreement==null?'na':d.pathAgreement.toFixed(4)}`:''}`)}console.log('RESULT: fresh matched-transition holdout completed without a model-winning assertion.');
await writeFile('relation-matched-transition-holdout-report.json',JSON.stringify(report,null,2));
