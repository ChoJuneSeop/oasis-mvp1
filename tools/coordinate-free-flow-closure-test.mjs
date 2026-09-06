import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4180','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:4180/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Dual Comparison Laboratory'),null,{timeout:60000});

  const report=await page.evaluate(()=>{
    const HOLDOUT_OFFSETS=[5003,6011,7027,8081,9103,10133,11239,12347,13457,14591,15727,16883];
    const TOTAL=6000,WARM=840,LOOKBACK=120,ANCHOR_STEP=120;
    const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
    const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
    const norm=v=>Math.hypot(v[0],v[1]);
    const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
    const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
    const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
    const mul=(a,s)=>[a[0]*s,a[1]*s];
    const rot=(v,a)=>[Math.cos(a)*v[0]-Math.sin(a)*v[1],Math.sin(a)*v[0]+Math.cos(a)*v[1]];
    const rank=xs=>{const order=xs.map((v,i)=>[v,i]).sort((a,b)=>a[0]-b[0]);const r=Array(xs.length);let i=0;while(i<order.length){let j=i;while(j+1<order.length&&order[j+1][0]===order[i][0])j++;const rr=(i+j)/2+1;for(let k=i;k<=j;k++)r[order[k][1]]=rr;i=j+1}return r};
    const pearson=(a,b)=>{if(a.length<2)return null;const ma=mean(a),mb=mean(b),da=a.map(x=>x-ma),db=b.map(x=>x-mb),den=Math.sqrt(da.reduce((n,x)=>n+x*x,0)*db.reduce((n,x)=>n+x*x,0));return den?da.reduce((n,x,i)=>n+x*db[i],0)/den:null};
    const spearman=(a,b)=>pearson(rank(a),rank(b));

    function makeWorld(offset){
      const phaseA=2*Math.PI*noise('closure-holdout-phase-a',offset);
      const phaseC=2*Math.PI*noise('closure-holdout-phase-c',offset);
      let x=[.34,.41],center=[.34,.41];
      const states=[],centers=[],gains=[],speeds=[];
      for(let t=0;t<TOTAL;t++){
        const nextCenter=[
          .34+.13*Math.sin(2*Math.PI*t/1300+phaseC)+.025*Math.sin(2*Math.PI*t/271+phaseA),
          .41+.11*Math.cos(2*Math.PI*t/1510+phaseC*.73)+.022*Math.sin(2*Math.PI*t/319+phaseA*.41)
        ];
        // Near the moving attractor, gain<1 contracts and gain>1 expands. It changes smoothly; there are no injected events or labels.
        const smooth=.5+.5*Math.sin(2*Math.PI*t/930+phaseA);
        const drift=.5+.5*Math.sin(2*Math.PI*t/2170+phaseC);
        const gain=clamp(.72+.31*smooth+.07*drift,.70,1.075);
        const theta=.045*Math.sin(2*Math.PI*t/377+phaseC);
        const d=rot(sub(x,center),theta);
        const radial=mul(d,gain/(1+.55*norm(d)*norm(d)));
        const nx=(noise('closure-holdout-nx',offset,t)-.5)*.010;
        const ny=(noise('closure-holdout-ny',offset,t)-.5)*.010;
        const next=add(nextCenter,add(radial,[nx,ny]));
        speeds.push(norm(sub(next,x)));
        x=next;center=nextCenter;
        states.push(x);centers.push(center);gains.push(gain);
      }
      return {states,centers,gains,speeds};
    }

    function currentFastSlow(states){
      let fast=null,slow=null,last=null,vol=.02,need=0;const out=[];
      for(const x of states){
        if(!last){fast=[...x];slow=[...x];last=[...x];out.push(0);continue}
        const velocity=sub(x,last);fast=add(mul(fast,.72),mul(x,.28));slow=add(mul(slow,.985),mul(x,.015));vol=.94*vol+.06*norm(velocity);
        const u=norm(sub(fast,slow)),scale=.02+2*vol,instant=u/(u+scale),alpha=instant>need?.035:.12;need=(1-alpha)*need+alpha*instant;out.push(need);last=[...x];
      }return out;
    }

    function adaptiveContextDebtV1(states){
      let last=null,context=null,vol=.02,debt=0;const out=[];
      for(const x of states){
        if(!last){last=[...x];context=[...x];out.push(0);continue}
        const velocity=sub(x,last),delta=norm(velocity);vol=.95*vol+.05*delta;const error=sub(x,context),e=norm(error),scale=.018+2.2*vol,raw=e/(e+scale);
        const returning=dot(error,velocity)<0?Math.min(1,delta/(e+scale)):0;
        if(raw>debt)debt+=.012*(raw-debt);else debt+=.18*(raw-debt);
        debt*=1-.28*returning;const contextRate=.0007+.014*Math.pow(1-debt,3);context=add(context,mul(error,contextRate));debt=clamp(debt,0,1);out.push(debt);last=[...x];
      }return out;
    }

    // Frozen before holdout execution. Temporary reduction in deviation is not enough to erase debt;
    // relief must accumulate as continuous evidence that motion is actually resolving toward the moving context.
    function resolutionGatedDebtV2(states){
      let last=null,context=null,vol=.02,debt=0,relief=0;const out=[];
      for(const x of states){
        if(!last){last=[...x];context=[...x];out.push(0);continue}
        const velocity=sub(x,last),speed=norm(velocity);vol=.95*vol+.05*speed;const error=sub(x,context),e=norm(error),scale=.018+2.2*vol,raw=e/(e+scale);
        const toward=(e>1e-9&&speed>1e-9)?Math.max(0,-dot(error,velocity)/(e*speed)):0;
        const proximity=1-raw;
        const instantRelief=toward*proximity;
        relief=.97*relief+.03*instantRelief;
        if(raw>debt)debt+=.012*(raw-debt);else debt+=.020*(raw-debt);
        debt*=1-.055*relief;
        const contextRate=.0007+.014*Math.pow(1-debt,3);context=add(context,mul(error,contextRate));debt=clamp(debt,0,1);out.push(debt);last=[...x];
      }return out;
    }

    function magnitudeOnly(states){
      let context=null,last=null,vol=.02;const out=[];
      for(const x of states){
        if(!context){context=[...x];last=[...x];out.push(0);continue}
        const speed=norm(sub(x,last));vol=.95*vol+.05*speed;context=add(mul(context,.985),mul(x,.015));const e=norm(sub(x,context)),scale=.018+2.2*vol;out.push(e/(e+scale));last=[...x];
      }return out;
    }

    const EST={currentFastSlow,adaptiveContextDebtV1,resolutionGatedDebtV2,magnitudeOnly};
    const trials=[];
    for(const offset of HOLDOUT_OFFSETS){
      const world=makeWorld(offset),traces=Object.fromEntries(Object.entries(EST).map(([k,f])=>[k,f(world.states)]));
      const anchors=[];
      for(let t=WARM;t<TOTAL;t+=ANCHOR_STEP){
        const lg=world.gains.slice(t-LOOKBACK+1,t+1).map(g=>Math.log(g));
        anchors.push({t,structuralLogGain:mean(lg),scores:Object.fromEntries(Object.keys(EST).map(k=>[k,traces[k][t]]))});
      }
      const ordered=anchors.slice().sort((a,b)=>a.structuralLogGain-b.structuralLogGain),n=Math.max(4,Math.floor(ordered.length*.30));
      const contracting=new Set(ordered.slice(0,n).map(a=>a.t)),noncontracting=new Set(ordered.slice(-n).map(a=>a.t));
      for(const a of anchors)a.flowClass=contracting.has(a.t)?'self-closing':noncontracting.has(a.t)?'unresolved-dynamics':'middle';
      const estimator={};
      for(const k of Object.keys(EST)){
        const low=anchors.filter(a=>a.flowClass==='self-closing').map(a=>a.scores[k]);
        const high=anchors.filter(a=>a.flowClass==='unresolved-dynamics').map(a=>a.scores[k]);
        const all=anchors.map(a=>a.scores[k]),truth=anchors.map(a=>a.structuralLogGain);
        estimator[k]={selfClosingMean:mean(low),unresolvedMean:mean(high),difference:mean(high)-mean(low),spearman:spearman(all,truth)};
      }
      trials.push({offset,anchors:anchors.length,classSize:n,structural:{selfClosingMean:mean(anchors.filter(a=>a.flowClass==='self-closing').map(a=>a.structuralLogGain)),unresolvedMean:mean(anchors.filter(a=>a.flowClass==='unresolved-dynamics').map(a=>a.structuralLogGain))},estimator});
    }

    const summary={};
    for(const k of Object.keys(EST)){
      const rows=trials.map(t=>t.estimator[k]);
      summary[k]={holdoutSeeds:rows.length,unresolvedHigherIn:rows.filter(r=>r.difference>0).length,meanDifference:mean(rows.map(r=>r.difference)),medianDifference:(()=>{const a=rows.map(r=>r.difference).sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2})(),meanSpearman:mean(rows.map(r=>r.spearman).filter(Number.isFinite)),positiveSpearmanIn:rows.filter(r=>Number.isFinite(r.spearman)&&r.spearman>0).length};
    }
    return {design:{koreanQuestion:'고정 위험 좌표나 원래 상태로의 복귀를 정답으로 쓰지 않을 때, 현재 흐름의 국소 동역학이 스스로 수축하는 구간과 계속 퍼지는 구간에 연속 책임량을 다르게 배정할 수 있는가?',englishTermNote:'Local contraction = 시스템의 위치가 아니라 현재 동역학이 인접 궤적 차이를 줄이는 성질. Resolution-gated debt = 단순 편차 감소가 아니라 실제 해소 방향의 연속 운동 증거가 누적될 때 책임량을 낮추는 값.',scope:'관계기억·행동·보상은 제외한다. 이동하는 2차원 중심과 연속적으로 변하는 수축/팽창 동역학만 사용한다. 이전 9개 시드는 사용하지 않고 12개 고정 holdout 시드만 평가한다.',groundTruth:'각 위치 좌표가 아니라 최근 120틱의 숨겨진 국소 gain의 평균 log값을 구조적 수축성으로 사용하고, 시드 내부 하위/상위 30%만 self-closing/unresolved-dynamics로 사후 평가한다. 이 값은 계측기에는 제공되지 않는다.',nonCircularity:'resolutionGatedDebtV2의 수식과 12개 holdout offset은 holdout 결과를 보기 전에 고정했다. 원하는 성능 방향을 CI 성공조건으로 사용하지 않는다.',holdoutOffsets:HOLDOUT_OFFSETS,totalTicks:TOTAL,lookback:LOOKBACK,anchorStep:ANCHOR_STEP,estimators:Object.keys(EST)},trials,summary};
  });

  console.log('\nOASIS COORDINATE-FREE FLOW-CLOSURE HOLDOUT VALIDATION');
  for(const[k,r]of Object.entries(report.summary))console.log(`${k}: unresolved>closing=${r.unresolvedHigherIn}/${r.holdoutSeeds} meanDiff=${r.meanDifference.toFixed(4)} medianDiff=${r.medianDifference.toFixed(4)} meanSpearman=${r.meanSpearman.toFixed(4)} positiveRho=${r.positiveSpearmanIn}/${r.holdoutSeeds}`);
  console.log('RESULT: holdout completed without a performance-success assertion; coordinates and return-to-baseline labels were not used as the target.');
  await writeFile('coordinate-free-flow-closure-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
