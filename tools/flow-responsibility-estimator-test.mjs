import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4179','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:4179/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Dual Comparison Laboratory'),null,{timeout:60000});

  const report=await page.evaluate(()=>{
    const OFFSETS=[0,137,311,733,1201,1777,2473,3251,4099];
    const TOTAL_TICKS=5200,ANALYSIS_START=700,BASELINE=.28,NATURAL_RETURN=.006;
    const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
    const median=xs=>{if(!xs.length)return null;const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
    const quantile=(xs,q)=>{if(!xs.length)return null;const a=xs.slice().sort((x,y)=>x-y),p=(a.length-1)*q,lo=Math.floor(p),hi=Math.ceil(p);return lo===hi?a[lo]:a[lo]*(hi-p)+a[hi]*(p-lo)};

    function makeEnvironment(offset){
      let latent=0,prev=BASELINE;const drive=[],reference=[];
      const phase=2*Math.PI*noise('hetero-phase-v2',offset);
      for(let t=0;t<TOTAL_TICKS;t++){
        const persistence=.45+.52*(.5+.5*Math.sin(2*Math.PI*t/840+phase));
        const u=noise('hetero-innov-v2',offset,t),small=(u-.5)*.045;
        const heavy=Math.sign(u-.5)*Math.pow(Math.abs(u-.5)*2,5)*.025;
        latent=persistence*latent+small+heavy;
        const desired=BASELINE+.17*Math.tanh(latent*4.2);
        const pulse=desired-prev-NATURAL_RETURN*(BASELINE-prev);
        drive.push(pulse);reference.push(desired);prev=desired;
      }
      return {drive,reference};
    }

    function recoverTick(series,start,threshold,horizonEnd){let calm=0;for(let t=start;t<=horizonEnd;t++){if(Math.abs(series[t]-BASELINE)<=threshold)calm++;else calm=0;if(calm>=30)return t-29}return null}
    function segment(reference){
      const dev=reference.map(x=>Math.abs(x-BASELINE)),tail=dev.slice(ANALYSIS_START),q75=quantile(tail,.75)||.01,q90=quantile(tail,.90)||q75,windows=[];
      let i=ANALYSIS_START;
      while(i<reference.length){
        if(dev[i]<q90){i++;continue}
        let start=i;while(start>ANALYSIS_START&&dev[start-1]>q75)start--;
        let j=i,calm=0;while(j<reference.length){if(dev[j]<=q75)calm++;else calm=0;if(calm>=30)break;j++}
        const end=Math.min(reference.length-1,j),h=Math.min(reference.length-1,end+240),rt=recoverTick(reference,start,q75,h),slice=dev.slice(start,end+1);
        windows.push({start,end,recoveryTick:rt,referenceRecoveryLag:rt==null?h-start+1:rt-start,integratedDeviation:slice.reduce((a,b)=>a+b,0)});i=end+1;
      }
      if(windows.length<6)return {valid:false,reason:'fewer-than-6-windows',q75,q90,windows};
      const ranked=windows.slice().sort((a,b)=>a.referenceRecoveryLag-b.referenceRecoveryLag),n=Math.max(2,Math.floor(ranked.length*.35));
      const quick=new Set(ranked.slice(0,n).map(x=>x.start)),long=new Set(ranked.slice(-n).map(x=>x.start));
      for(const w of windows)w.flowClass=quick.has(w.start)?'quick-return':long.has(w.start)?'long-lasting':'middle';
      const q=windows.filter(w=>w.flowClass==='quick-return').map(w=>w.referenceRecoveryLag),l=windows.filter(w=>w.flowClass==='long-lasting').map(w=>w.referenceRecoveryLag);
      return {valid:q.length>=2&&l.length>=2&&median(l)>median(q)&&q90>q75,reason:null,q75,q90,quickMedian:median(q),longMedian:median(l),windows};
    }

    function currentFastSlowTrace(xs){
      const out=[],X={last:null,fast:null,slow:null,vol:.02,need:0};
      for(const x of xs){
        if(X.last==null){X.last=x;X.fast=x;X.slow=x;out.push(0);continue}
        const delta=Math.abs(x-X.last);X.fast=.72*X.fast+.28*x;X.slow=.985*X.slow+.015*x;X.vol=.94*X.vol+.06*delta;
        const unresolved=Math.abs(X.fast-X.slow),scale=.02+2*X.vol,instant=unresolved/(unresolved+scale),alpha=instant>X.need?.035:.12;
        X.need=(1-alpha)*X.need+alpha*instant;X.last=x;out.push(X.need);
      }
      return out;
    }

    // Candidate: adaptive moving context + slowly accumulated unresolved debt.
    // The context is not a fixed danger coordinate. It keeps moving while flow resolves, but its update rate slows continuously as unresolved debt grows.
    function adaptiveContextDebtTrace(xs){
      const out=[],X={last:null,context:null,vol:.02,debt:0};
      for(const x of xs){
        if(X.last==null){X.last=x;X.context=x;out.push(0);continue}
        const velocity=x-X.last,delta=Math.abs(velocity);X.vol=.95*X.vol+.05*delta;
        const error=x-X.context,scale=.018+2.2*X.vol,raw=Math.abs(error)/(Math.abs(error)+scale);
        const returning=(error*velocity<0)?Math.min(1,Math.abs(velocity)/(Math.abs(error)+scale)):0;
        if(raw>X.debt)X.debt+=.012*(raw-X.debt);else X.debt+=.18*(raw-X.debt);
        X.debt*=1-.28*returning;
        const contextRate=.0007+.014*Math.pow(1-X.debt,3);
        X.context+=contextRate*error;
        X.debt=Math.max(0,Math.min(1,X.debt));X.last=x;out.push(X.debt);
      }
      return out;
    }

    // Control estimator: magnitude-only adaptive deviation. It has no persistence debt.
    function magnitudeOnlyTrace(xs){
      const out=[];let context=null,last=null,vol=.02;
      for(const x of xs){
        if(context==null){context=x;last=x;out.push(0);continue}
        const delta=Math.abs(x-last);vol=.95*vol+.05*delta;context=.985*context+.015*x;
        const e=Math.abs(x-context),scale=.018+2.2*vol;out.push(e/(e+scale));last=x;
      }
      return out;
    }

    const ESTIMATORS={currentFastSlow:currentFastSlowTrace,adaptiveContextDebt:adaptiveContextDebtTrace,magnitudeOnly:magnitudeOnlyTrace};
    const environments=OFFSETS.map(offset=>{const e=makeEnvironment(offset),seg=segment(e.reference);return {offset,...e,seg}});
    const invalid=environments.filter(x=>!x.seg.valid).map(x=>({offset:x.offset,reason:x.seg.reason,windows:x.seg.windows.length}));

    function sampleWindow(trace,w){
      const at=h=>trace[Math.min(trace.length-1,w.start+h)];
      const first=(n)=>trace.slice(w.start,Math.min(trace.length,w.start+n));
      const post=w.recoveryTick==null?[]:trace.slice(w.recoveryTick,Math.min(trace.length,w.recoveryTick+60));
      return {need30:at(30),need60:at(60),need120:at(120),meanFirst60:mean(first(60)),meanFirst120:mean(first(120)),peakFirst120:Math.max(...first(120)),postRecoveryMean60:mean(post)};
    }

    const trials=invalid.length?[]:environments.map(env=>{
      const traces=Object.fromEntries(Object.entries(ESTIMATORS).map(([k,f])=>[k,f(env.reference)]));
      const windows=env.seg.windows.filter(w=>w.flowClass!=='middle').map(w=>({flowClass:w.flowClass,start:w.start,referenceRecoveryLag:w.referenceRecoveryLag,estimators:Object.fromEntries(Object.keys(ESTIMATORS).map(k=>[k,sampleWindow(traces[k],w)]))}));
      return {offset:env.offset,quickMedian:env.seg.quickMedian,longMedian:env.seg.longMedian,windows};
    });

    function classMean(trial,est,c,field){return mean(trial.windows.filter(w=>w.flowClass===c).map(w=>w.estimators[est][field]).filter(Number.isFinite))}
    const paired={};
    for(const est of Object.keys(ESTIMATORS)){
      paired[est]=trials.map(tr=>{const fields=['need30','need60','need120','meanFirst60','meanFirst120','peakFirst120','postRecoveryMean60'],row={offset:tr.offset};for(const f of fields){const q=classMean(tr,est,'quick-return',f),l=classMean(tr,est,'long-lasting',f);row[f]={quick:q,long:l,diff:(q==null||l==null)?null:l-q}}return row});
    }
    const diffs=(est,f)=>paired[est].map(x=>x[f].diff).filter(Number.isFinite);
    const summary={};
    for(const est of Object.keys(ESTIMATORS))summary[est]={seeds:trials.length,longHigherNeed30:diffs(est,'need30').filter(x=>x>0).length,longHigherNeed60:diffs(est,'need60').filter(x=>x>0).length,longHigherNeed120:diffs(est,'need120').filter(x=>x>0).length,longHigherMeanFirst120:diffs(est,'meanFirst120').filter(x=>x>0).length,meanPairedNeed30Diff:mean(diffs(est,'need30')),meanPairedNeed60Diff:mean(diffs(est,'need60')),meanPairedNeed120Diff:mean(diffs(est,'need120')),meanPairedFirst120Diff:mean(diffs(est,'meanFirst120')),meanQuickPostRecoveryLoad:mean(paired[est].map(x=>x.postRecoveryMean60.quick).filter(Number.isFinite))};

    return {design:{koreanQuestion:'이질성을 사건으로 고정하지 않고 현재까지의 흐름만 볼 때, 빠르게 자연복귀하는 이탈보다 오래 지속되는 이탈에 더 큰 연속 책임량을 배정하는 계측기는 무엇인가?',englishTermNote:'Adaptive context debt = 고정 기준점 대신 계속 움직이는 최근 흐름 맥락(context)을 두고, 그 맥락에서 벗어난 상태가 스스로 해소되지 않는 동안 책임 부채(debt)를 천천히 누적하고 복귀 시 빠르게 해소하는 연속 계측.',scope:'관계기억·행동·보상은 완전히 제외한다. 동일한 9개 사전 시드 reference 흐름만 사용하며 quick/long 라벨은 분석 후에만 붙는다.',nonCircularity:'세 후보 계측기를 사전에 동시에 선언하고 모두 보고한다. 원하는 방향의 차이를 성공조건으로 assert하지 않는다.',estimators:Object.keys(ESTIMATORS),offsets:OFFSETS,totalTicks:TOTAL_TICKS},environmentValidation:{allSeedsValid:invalid.length===0,invalid,seeds:environments.map(x=>({offset:x.offset,valid:x.seg.valid,windows:x.seg.windows.length,quickMedian:x.seg.quickMedian,longMedian:x.seg.longMedian}))},trials,paired,summary};
  });

  console.log('\nOASIS FLOW-RESPONSIBILITY ESTIMATOR VALIDATION');
  console.log(`environment valid=${report.environmentValidation.allSeedsValid} invalid=${report.environmentValidation.invalid.length}`);
  for(const [k,r] of Object.entries(report.summary))console.log(`${k}: seed=${r.seeds} long>quick@30=${r.longHigherNeed30}/${r.seeds} @60=${r.longHigherNeed60}/${r.seeds} @120=${r.longHigherNeed120}/${r.seeds} first120=${r.longHigherMeanFirst120}/${r.seeds} diff30=${r.meanPairedNeed30Diff?.toFixed(4)} diff60=${r.meanPairedNeed60Diff?.toFixed(4)} diff120=${r.meanPairedNeed120Diff?.toFixed(4)} quickPostLoad=${r.meanQuickPostRecoveryLoad?.toFixed(4)}`);
  if(!report.environmentValidation.allSeedsValid)throw new Error('FAIL - predeclared reference environment invalid; estimator comparison blocked');
  console.log('RESULT: estimator comparison completed without an OASIS-success assertion.');
  await writeFile('flow-responsibility-estimator-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
