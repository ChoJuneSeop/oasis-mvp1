import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server = spawn('python3', ['-m', 'http.server', '4177', '--bind', '127.0.0.1'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let browser;
try {
  await sleep(700);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.title.includes('Dual Comparison Laboratory') && document.getElementById('relationFieldCard'), null, { timeout: 60000 });

  const report = await page.evaluate(() => {
    const originalE = E;
    const originalActionable = actionableIds;
    const originalMemberRank = memberRank;
    const originalChoose = choose;
    const originalOutcome = outcome;
    const originalTickW = tickW;
    const originalFullRel = MODELS.full.rel;

    const MODEL_KEYS = ['full','norel','rule','utility','qlite','retrieval'];
    const OFFSETS = [0,137,311,733,1201,1777,2473];
    const TOTAL_TICKS = 4200;
    const ANALYSIS_START = 700;
    const BASELINE_DANGER = 0.28;
    const ACTION_FEEDBACK = 0.007;
    const NATURAL_RETURN = 0.006;

    const mean = xs => xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : null;
    const median = xs => { if(!xs.length)return null; const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; };
    const quantile = (xs,q) => { if(!xs.length)return null; const a=xs.slice().sort((x,y)=>x-y),p=(a.length-1)*q,lo=Math.floor(p),hi=Math.ceil(p); return lo===hi?a[lo]:a[lo]*(hi-p)+a[hi]*(p-lo); };
    const mad = xs => { const m=median(xs); return m==null?null:median(xs.map(x=>Math.abs(x-m))); };
    const clamp01=x=>Math.max(0,Math.min(1,x));

    // Equal executable access for every model. Relation structure may affect judgment, never access rights.
    actionableIds = function(S,P,use=1){
      const here=currentPlace(P),ids=Object.keys(places),other=ids.filter(id=>id!==here);
      return other.length?other:ids;
    };

    // Disable the legacy direct relation path for OASIS-Full. The experiment below supplies one isolated mechanism only.
    MODELS.full.rel=0;

    function ensureClosed(P){
      if(!P.closedRelation)P.closedRelation={
        flow:{lastTick:null,lastDanger:null,fast:null,slow:null,volatility:.02,need:0,peakNeed:0},
        pending:null,events:[],episodes:[],completed:0,positive:0,choiceChanges:0,uses:0
      };
      return P.closedRelation;
    }

    function updateNeed(S,P){
      const X=ensureClosed(P).flow;
      if(X.lastTick===E.tick)return X.need;
      const x=S.danger;
      if(X.lastDanger==null){X.lastDanger=x;X.fast=x;X.slow=x;X.lastTick=E.tick;return X.need;}
      const delta=Math.abs(x-X.lastDanger);
      X.fast=.72*X.fast+.28*x;
      X.slow=.985*X.slow+.015*x;
      X.volatility=.94*X.volatility+.06*delta;
      const unresolved=Math.abs(X.fast-X.slow);
      const scale=.02+2*X.volatility;
      const instantaneous=unresolved/(unresolved+scale);
      const alpha=instantaneous>X.need?.035:.12;
      X.need=(1-alpha)*X.need+alpha*instantaneous;
      X.peakNeed=Math.max(X.peakNeed,X.need);
      X.lastDanger=x;X.lastTick=E.tick;
      return X.need;
    }

    function closeJourney(S,P,id){
      const C=ensureClosed(P),J=C.pending;
      if(!J||J.target!==id)return null;
      const endNeed=updateNeed(S,P);
      const closed={startTick:J.t,endTick:E.tick,target:id,startDanger:J.danger,endDanger:S.danger,startNeed:J.need,endNeed,resolution:J.need-endNeed};
      C.pending=null;C.completed++;if(closed.resolution>0)C.positive++;
      return closed;
    }

    function addCompletedRelation(S,P,id,closed){
      if(!closed)return;
      const C=ensureClosed(P),met=npcs.filter(n=>n[1]===id);
      for(const [npc,place] of met){
        const cur={t:E.tick,npc,place,journey:closed};
        const prior=C.events.slice(-18);
        for(const prev of prior){
          if(prev.npc===cur.npc)continue;
          const rs=[prev.journey?.resolution,cur.journey?.resolution].filter(Number.isFinite);
          C.episodes.push({
            t:E.tick,key:[prev.npc,cur.npc].sort().join('↔'),a:prev.npc,b:cur.npc,
            places:[prev.place,cur.place],resolution:rs.length?mean(rs):0
          });
        }
        C.events.push(cur);
      }
      C.events=C.events.slice(-40);C.episodes=C.episodes.slice(-100);
    }

    function relationSupport(S,P,id){
      const C=ensureClosed(P),need=updateNeed(S,P);
      if(!(need>0))return 0;
      let best=0;
      for(const ep of C.episodes){
        if(!ep.places.includes(id))continue;
        const gain=Math.max(0,ep.resolution||0);
        if(!gain)continue;
        const recency=Math.exp(-Math.max(0,E.tick-ep.t)/1200);
        const outcomeWeight=gain/(gain+need+1e-9);
        best=Math.max(best,need*outcomeWeight*recency);
      }
      return best;
    }

    memberRank=function(S,P,m,id,useRel=1){
      const base=originalMemberRank(S,P,m,id,0);
      if(S.key!=='full'||!useRel)return base;
      const support=relationSupport(S,P,id);
      if(!support)return base;
      const adjusted=[...base];
      adjusted[0]=(adjusted[0]??0)+support;
      return adjusted;
    };

    choose=function(S,P){
      if(S.key!=='full'){originalChoose(S,P);return;}
      const beforeWith=sig(evalP(S,P,1)),beforeWithout=sig(evalP(S,P,0));
      originalChoose(S,P);
      const C=ensureClosed(P),need=updateNeed(S,P);
      if(beforeWith.choice!==beforeWithout.choice){C.choiceChanges++;C.uses++;}
      C.pending={t:E.tick,target:P.target,danger:S.danger,need};
    };

    outcome=function(S,P,id){
      if(S.key!=='full'){originalOutcome(S,P,id);return;}
      const closed=closeJourney(S,P,id);
      originalOutcome(S,P,id);
      addCompletedRelation(S,P,id,closed);
    };

    tickW=function(S,e){
      originalTickW(S,e);
      if(S.key==='full')for(const P of S.parties)updateNeed(S,P);
    };

    const targetRisk=S=>mean(S.parties.map(P=>places[P.target]?.r??BASELINE_DANGER));
    const actionSignature=S=>S.parties.map(P=>P.target).join('|');
    const meanNeed=S=>mean(S.parties.map(P=>ensureClosed(P).flow.need))||0;
    const choiceChanges=S=>S.parties.reduce((n,P)=>n+ensureClosed(P).choiceChanges,0);
    const positiveEpisodes=S=>S.parties.reduce((n,P)=>n+ensureClosed(P).episodes.filter(ep=>ep.resolution>0).length,0);

    function makeDrive(offset){
      let latent=0;
      return t=>{
        const z=(offset+t)/90,b=Math.floor(z),f=z-b;
        const smooth=noise('hetero-rho',offset,b)*(1-f)+noise('hetero-rho',offset,b+1)*f;
        const rho=.62+.36*smooth,u=noise('hetero-innov',offset,t);
        const centered=(u-.5)*.010;
        const heavy=Math.sign(u-.5)*Math.pow(Math.abs(u-.5)*2,6)*.035;
        latent=Math.max(-.045,Math.min(.045,rho*latent+centered+heavy));
        return latent;
      };
    }

    function recoverTick(series,start,threshold,horizonEnd){
      let calm=0;
      for(let t=start;t<=horizonEnd;t++){
        if(Math.abs(series[t]-BASELINE_DANGER)<=threshold)calm++;else calm=0;
        if(calm>=30)return t-29;
      }
      return null;
    }

    function segmentReference(reference){
      const dev=reference.map(x=>Math.abs(x-BASELINE_DANGER)),tail=dev.slice(ANALYSIS_START);
      const q75=quantile(tail,.75)||.01,q90=quantile(tail,.90)||q75,windows=[];
      let i=ANALYSIS_START;
      while(i<reference.length){
        if(dev[i]<q90){i++;continue;}
        let start=i;while(start>ANALYSIS_START&&dev[start-1]>q75)start--;
        let j=i,calm=0;
        while(j<reference.length){if(dev[j]<=q75)calm++;else calm=0;if(calm>=30)break;j++;}
        const end=Math.min(reference.length-1,j),slice=dev.slice(start,end+1);
        windows.push({start,end,duration:end-start+1,peakDeviation:Math.max(...slice),integratedDeviation:slice.reduce((a,b)=>a+b,0)});
        i=end+1;
      }
      const burdens=windows.map(w=>w.integratedDeviation),bm=median(burdens)||0,bmad=mad(burdens)||0;
      for(const w of windows)w.flowClass=w.integratedDeviation>bm+.5*bmad?'persistent':'transient';
      return {windows,thresholds:{q75,q90,burdenMedian:bm,burdenMAD:bmad}};
    }

    function analyzeWindow(trace,w,threshold){
      const horizonEnd=Math.min(trace.danger.length-1,w.end+240),before=Math.max(0,w.start-1);
      const d=trace.danger.slice(w.start,horizonEnd+1),rt=recoverTick(trace.danger,w.start,threshold,horizonEnd);
      let switches=0;for(let t=w.start+1;t<=horizonEnd;t++)if(trace.actionSig[t]!==trace.actionSig[t-1])switches++;
      const needs=trace.need.slice(w.start,horizonEnd+1);
      return {
        recovered:rt!=null,recoveryLag:rt==null?null:rt-w.start,
        integratedDeviation:d.reduce((n,x)=>n+Math.abs(x-BASELINE_DANGER),0),
        actionSwitches:switches,meanNeed:mean(needs),maxNeed:Math.max(...needs),
        relationChoiceChanges:trace.choiceChanges[horizonEnd]-trace.choiceChanges[before],
        positiveEpisodeGain:trace.positiveEpisodes[horizonEnd]-trace.positiveEpisodes[before]
      };
    }

    function run(offset){
      E={tick:offset,worlds:{},paused:true};
      for(const k of MODEL_KEYS)E.worlds[k]=mkW(k);
      for(const P of E.worlds.full.parties)ensureClosed(P);
      const drive=makeDrive(offset);let referenceDanger=.12;const reference=[];
      const traces=Object.fromEntries(MODEL_KEYS.map(k=>[k,{danger:[],actionSig:[],need:[],choiceChanges:[],positiveEpisodes:[]}]))

      for(let t=0;t<TOTAL_TICKS;t++){
        E.tick++;const exogenous=drive(t);
        referenceDanger=clamp01(referenceDanger+exogenous+NATURAL_RETURN*(BASELINE_DANGER-referenceDanger));reference.push(referenceDanger);
        for(const k of MODEL_KEYS){
          const S=E.worlds[k],chosenRisk=targetRisk(S),actionEffect=ACTION_FEEDBACK*(chosenRisk-S.danger),natural=NATURAL_RETURN*(BASELINE_DANGER-S.danger);
          tickW(S,{pulse:exogenous+natural+actionEffect});
          traces[k].danger.push(S.danger);traces[k].actionSig.push(actionSignature(S));
          traces[k].need.push(k==='full'?meanNeed(S):0);traces[k].choiceChanges.push(k==='full'?choiceChanges(S):0);traces[k].positiveEpisodes.push(k==='full'?positiveEpisodes(S):0);
        }
      }

      const segmented=segmentReference(reference);
      const windows=segmented.windows.map((w,idx)=>({id:idx+1,...w,models:Object.fromEntries(MODEL_KEYS.map(k=>[k,analyzeWindow(traces[k],w,segmented.thresholds.q75)]))}));
      const C=E.worlds.full.parties.map(P=>ensureClosed(P));
      return {offset,thresholds:segmented.thresholds,windows,mechanism:{
        completedJourneys:C.reduce((n,x)=>n+x.completed,0),positiveResolutionJourneys:C.reduce((n,x)=>n+x.positive,0),
        episodes:C.reduce((n,x)=>n+x.episodes.length,0),positiveEpisodes:C.reduce((n,x)=>n+x.episodes.filter(e=>e.resolution>0).length,0),
        relationChoiceChanges:C.reduce((n,x)=>n+x.choiceChanges,0),peakNeed:Math.max(...C.map(x=>x.flow.peakNeed||0))
      }};
    }

    const trials=OFFSETS.map(run),allWindows=trials.flatMap(tr=>tr.windows.map(w=>({offset:tr.offset,...w})));
    function aggregateFor(k,c){
      const rows=allWindows.filter(w=>w.flowClass===c).map(w=>w.models[k]),rec=rows.filter(r=>r.recovered);
      return {model:MODELS[k].n,flowClass:c,windows:rows.length,recoveryRate:rows.length?rec.length/rows.length:null,
        meanRecoveryLag:mean(rec.map(r=>r.recoveryLag)),meanIntegratedDeviation:mean(rows.map(r=>r.integratedDeviation)),meanActionSwitches:mean(rows.map(r=>r.actionSwitches)),
        meanNeed:mean(rows.map(r=>r.meanNeed)),meanMaxNeed:mean(rows.map(r=>r.maxNeed)),meanRelationChoiceChanges:mean(rows.map(r=>r.relationChoiceChanges)),meanPositiveEpisodeGain:mean(rows.map(r=>r.positiveEpisodeGain))};
    }
    const aggregate={};for(const k of MODEL_KEYS)aggregate[k]={transient:aggregateFor(k,'transient'),persistent:aggregateFor(k,'persistent')};
    const mechanism={completedJourneys:trials.reduce((n,t)=>n+t.mechanism.completedJourneys,0),positiveResolutionJourneys:trials.reduce((n,t)=>n+t.mechanism.positiveResolutionJourneys,0),episodes:trials.reduce((n,t)=>n+t.mechanism.episodes,0),positiveEpisodes:trials.reduce((n,t)=>n+t.mechanism.positiveEpisodes,0),relationChoiceChanges:trials.reduce((n,t)=>n+t.mechanism.relationChoiceChanges,0),peakNeed:Math.max(...trials.map(t=>t.mechanism.peakNeed))};

    MODELS.full.rel=originalFullRel;memberRank=originalMemberRank;choose=originalChoose;outcome=originalOutcome;tickW=originalTickW;actionableIds=originalActionable;E=originalE;

    return {design:{
      koreanQuestion:'이질성을 사건으로 고정하지 않은 연속 흐름에서, 스스로 해소되는 이탈과 지속되는 이탈이 과거의 완결 관계경험을 서로 다르게 현재 판단에 참여시키는가?',
      englishTermNote:'Closed-experience relation memory = 행동 전 흐름, 행동, 행동 후 흐름을 하나의 완료된 경험으로 저장하고 이후 현재 흐름과의 관계에서 재사용하는 기억 표현.',
      isolation:'기존 OASIS relation 플래그를 이 실험에서 끄고 새 완결경험 메커니즘만 OASIS-Full에 적용했다.',
      fairness:'모든 모델은 동일 외생 흐름, 동일 실행가능 장소, 동일 행동→현실 피드백 법칙을 받는다. 관계는 접근권을 바꾸지 않는다.',
      noEventLabel:'transient/persistent 분류는 모든 실행이 끝난 뒤 reference trajectory에서만 사후 계산한다.',
      noSuccessAssertion:'OASIS 우위를 통과조건으로 사용하지 않는다.',offsets:OFFSETS,totalTicksPerTrial:TOTAL_TICKS
    },classCounts:{transient:allWindows.filter(w=>w.flowClass==='transient').length,persistent:allWindows.filter(w=>w.flowClass==='persistent').length},totalPostHocWindows:allWindows.length,trials,aggregate,mechanism};
  });

  console.log('\nOASIS CLOSED-EXPERIENCE HETEROGENEITY FLOW VALIDATION');
  console.log(`windows=${report.totalPostHocWindows} transient=${report.classCounts.transient} persistent=${report.classCounts.persistent}`);
  console.log(`mechanism completed=${report.mechanism.completedJourneys} positiveJourneys=${report.mechanism.positiveResolutionJourneys} episodes=${report.mechanism.episodes} positiveEpisodes=${report.mechanism.positiveEpisodes} relationChoiceChanges=${report.mechanism.relationChoiceChanges} peakNeed=${report.mechanism.peakNeed.toFixed(3)}`);
  for(const [k,classes] of Object.entries(report.aggregate))for(const c of ['transient','persistent']){const r=classes[c];console.log(`${k}/${c}: n=${r.windows} recovery=${r.recoveryRate?.toFixed(2)} lag=${r.meanRecoveryLag?.toFixed(1)} actionSwitch=${r.meanActionSwitches?.toFixed(2)} need=${r.meanNeed?.toFixed(3)} relationChoice=${r.meanRelationChoiceChanges?.toFixed(2)} area=${r.meanIntegratedDeviation?.toFixed(2)}`)}
  if(report.totalPostHocWindows<2||!report.classCounts.transient||!report.classCounts.persistent)throw new Error('FAIL - insufficient post-hoc flow classes');
  if(report.mechanism.completedJourneys===0||report.mechanism.episodes===0)throw new Error('FAIL - closed-experience mechanism had no valid exposure');
  console.log('RESULT: mechanism-exposure checks passed. No OASIS performance-success assertion was used.');
  await writeFile('heterogeneity-closed-experience-report.json',JSON.stringify(report,null,2));
} finally {
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
