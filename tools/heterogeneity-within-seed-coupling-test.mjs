import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4178','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:4178/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Dual Comparison Laboratory')&&document.getElementById('relationFieldCard'),null,{timeout:60000});

  const report=await page.evaluate(()=>{
    const originalE=E,originalActionable=actionableIds,originalMemberRank=memberRank,originalChoose=choose,originalOutcome=outcome,originalTickW=tickW,originalFullRel=MODELS.full.rel;
    const MODEL_KEYS=['full','norel','rule','utility','qlite','retrieval'];
    const OFFSETS=[0,137,311,733,1201,1777,2473,3251,4099];
    const TOTAL_TICKS=4800,ANALYSIS_START=700,BASELINE=.28,ACTION_FEEDBACK=.007,NATURAL_RETURN=.006;
    const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
    const median=xs=>{if(!xs.length)return null;const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
    const quantile=(xs,q)=>{if(!xs.length)return null;const a=xs.slice().sort((x,y)=>x-y),p=(a.length-1)*q,lo=Math.floor(p),hi=Math.ceil(p);return lo===hi?a[lo]:a[lo]*(hi-p)+a[hi]*(p-lo)};
    const clamp01=x=>Math.max(0,Math.min(1,x));

    actionableIds=function(S,P,use=1){const here=currentPlace(P),ids=Object.keys(places),other=ids.filter(id=>id!==here);return other.length?other:ids};
    MODELS.full.rel=0; // isolate the closed-experience coupling path from legacy relation logic.

    function makeDrive(offset){let latent=0;const out=[];for(let t=0;t<TOTAL_TICKS;t++){
      const z=(offset+t)/90,b=Math.floor(z),f=z-b;
      const smooth=noise('hetero-rho',offset,b)*(1-f)+noise('hetero-rho',offset,b+1)*f;
      const rho=.62+.36*smooth,u=noise('hetero-innov',offset,t);
      const centered=(u-.5)*.010,heavy=Math.sign(u-.5)*Math.pow(Math.abs(u-.5)*2,6)*.035;
      latent=Math.max(-.045,Math.min(.045,rho*latent+centered+heavy));out.push(latent);
    }return out}

    function referenceFromDrive(drive){let d=.12;const ref=[];for(const ex of drive){d=clamp01(d+ex+NATURAL_RETURN*(BASELINE-d));ref.push(d)}return ref}
    function recoverTick(series,start,threshold,horizonEnd){let calm=0;for(let t=start;t<=horizonEnd;t++){if(Math.abs(series[t]-BASELINE)<=threshold)calm++;else calm=0;if(calm>=30)return t-29}return null}
    function segmentWithinSeed(reference){
      const dev=reference.map(x=>Math.abs(x-BASELINE)),tail=dev.slice(ANALYSIS_START),q75=quantile(tail,.75)||.01,q90=quantile(tail,.90)||q75,windows=[];
      let i=ANALYSIS_START;
      while(i<reference.length){
        if(dev[i]<q90){i++;continue}
        let start=i;while(start>ANALYSIS_START&&dev[start-1]>q75)start--;
        let j=i,calm=0;while(j<reference.length){if(dev[j]<=q75)calm++;else calm=0;if(calm>=30)break;j++}
        const end=Math.min(reference.length-1,j),horizonEnd=Math.min(reference.length-1,end+240),rt=recoverTick(reference,start,q75,horizonEnd),slice=dev.slice(start,end+1);
        windows.push({start,end,duration:end-start+1,referenceRecoveryLag:rt==null?horizonEnd-start+1:rt-start,peakDeviation:Math.max(...slice),integratedDeviation:slice.reduce((a,b)=>a+b,0)});
        i=end+1;
      }
      if(windows.length<6)return {valid:false,reason:'fewer-than-6-windows',q75,q90,windows};
      const ranked=windows.slice().sort((a,b)=>a.referenceRecoveryLag-b.referenceRecoveryLag),n=Math.max(2,Math.floor(ranked.length*.35));
      const quick=new Set(ranked.slice(0,n).map(x=>x.start)),long=new Set(ranked.slice(-n).map(x=>x.start));
      for(const w of windows)w.flowClass=quick.has(w.start)?'quick-return':long.has(w.start)?'long-lasting':'middle';
      const q=windows.filter(w=>w.flowClass==='quick-return').map(w=>w.referenceRecoveryLag),l=windows.filter(w=>w.flowClass==='long-lasting').map(w=>w.referenceRecoveryLag);
      const valid=q.length>=2&&l.length>=2&&median(l)>median(q);
      return {valid,reason:valid?null:'no-within-seed-duration-separation',q75,q90,quickMedian:median(q),longMedian:median(l),windows};
    }

    // Phase A: validate the reference environment before any agent is run.
    const environment=OFFSETS.map(offset=>{const drive=makeDrive(offset),reference=referenceFromDrive(drive),seg=segmentWithinSeed(reference);return {offset,drive,reference,seg}});
    const invalid=environment.filter(x=>!x.seg.valid).map(x=>({offset:x.offset,reason:x.seg.reason,windows:x.seg.windows.length}));

    function ensureClosed(P){if(!P.closedRelation)P.closedRelation={flow:{lastTick:null,lastDanger:null,fast:null,slow:null,volatility:.02,need:0,peakNeed:0},pending:null,events:[],episodes:[],completed:0,positive:0,choiceChanges:0,positiveSupportDecisions:0,totalSupportAtDecisions:0,changedSupportMass:0};return P.closedRelation}
    function updateNeed(S,P){const X=ensureClosed(P).flow;if(X.lastTick===E.tick)return X.need;const x=S.danger;if(X.lastDanger==null){X.lastDanger=x;X.fast=x;X.slow=x;X.lastTick=E.tick;return X.need}
      const delta=Math.abs(x-X.lastDanger);X.fast=.72*X.fast+.28*x;X.slow=.985*X.slow+.015*x;X.volatility=.94*X.volatility+.06*delta;const unresolved=Math.abs(X.fast-X.slow),scale=.02+2*X.volatility,instant=unresolved/(unresolved+scale),alpha=instant>X.need?.035:.12;X.need=(1-alpha)*X.need+alpha*instant;X.peakNeed=Math.max(X.peakNeed,X.need);X.lastDanger=x;X.lastTick=E.tick;return X.need}
    function closeJourney(S,P,id){const C=ensureClosed(P),J=C.pending;if(!J||J.target!==id)return null;const endNeed=updateNeed(S,P),closed={startTick:J.t,endTick:E.tick,target:id,startNeed:J.need,endNeed,resolution:J.need-endNeed};C.pending=null;C.completed++;if(closed.resolution>0)C.positive++;return closed}
    function addCompletedRelation(S,P,id,closed){if(!closed)return;const C=ensureClosed(P),met=npcs.filter(n=>n[1]===id);for(const[npc,place]of met){const cur={t:E.tick,npc,place,journey:closed},prior=C.events.slice(-18);for(const prev of prior){if(prev.npc===cur.npc)continue;const rs=[prev.journey?.resolution,cur.journey?.resolution].filter(Number.isFinite);C.episodes.push({t:E.tick,key:[prev.npc,cur.npc].sort().join('↔'),places:[prev.place,cur.place],resolution:rs.length?mean(rs):0})}C.events.push(cur)}C.events=C.events.slice(-40);C.episodes=C.episodes.slice(-120)}
    function relationSupport(S,P,id){const C=ensureClosed(P),need=updateNeed(S,P);if(!(need>0))return 0;const weights=[];for(const ep of C.episodes){if(!ep.places.includes(id))continue;const gain=Math.max(0,ep.resolution||0);if(!gain)continue;const recency=Math.exp(-Math.max(0,E.tick-ep.t)/1200),outcomeWeight=gain/(gain+need+1e-9);weights.push(need*outcomeWeight*recency)}weights.sort((a,b)=>b-a);return weights.slice(0,4).reduce((a,b)=>a+b,0)}
    function supportMass(S,P){return actionableIds(S,P,1).reduce((n,id)=>n+relationSupport(S,P,id),0)}

    memberRank=function(S,P,m,id,useRel=1){const base=originalMemberRank(S,P,m,id,0);if(S.key!=='full'||!useRel)return base;const support=relationSupport(S,P,id);if(!support)return base;const adjusted=[...base];adjusted[0]=(adjusted[0]??0)+support;return adjusted};
    choose=function(S,P){if(S.key!=='full'){originalChoose(S,P);return}const without=sig(evalP(S,P,0)),withRel=sig(evalP(S,P,1)),C=ensureClosed(P),mass=supportMass(S,P);if(mass>0){C.positiveSupportDecisions++;C.totalSupportAtDecisions+=mass}if(withRel.choice!==without.choice){C.choiceChanges++;C.changedSupportMass+=mass}originalChoose(S,P);C.pending={t:E.tick,target:P.target,need:updateNeed(S,P)}};
    outcome=function(S,P,id){if(S.key!=='full'){originalOutcome(S,P,id);return}const closed=closeJourney(S,P,id);originalOutcome(S,P,id);addCompletedRelation(S,P,id,closed)};
    tickW=function(S,e){originalTickW(S,e);if(S.key==='full')for(const P of S.parties)updateNeed(S,P)};

    const targetRisk=S=>mean(S.parties.map(P=>places[P.target]?.r??BASELINE));
    const actionSignature=S=>S.parties.map(P=>P.target).join('|');
    const sumClosed=(S,key)=>S.parties.reduce((n,P)=>n+(ensureClosed(P)[key]||0),0);
    const meanNeed=S=>mean(S.parties.map(P=>ensureClosed(P).flow.need))||0;
    const totalSupport=S=>S.parties.reduce((n,P)=>n+supportMass(S,P),0);

    function runAgents(env){
      E={tick:env.offset,worlds:{},paused:true};for(const k of MODEL_KEYS)E.worlds[k]=mkW(k);for(const P of E.worlds.full.parties)ensureClosed(P);
      const traces=Object.fromEntries(MODEL_KEYS.map(k=>[k,{danger:[],actionSig:[],need:[],supportMass:[],choiceChanges:[],positiveSupportDecisions:[],supportAtDecisions:[],changedSupportMass:[]}]))
      for(let t=0;t<TOTAL_TICKS;t++){
        E.tick++;const ex=env.drive[t];
        for(const k of MODEL_KEYS){const S=E.worlds[k],chosenRisk=targetRisk(S),actionEffect=ACTION_FEEDBACK*(chosenRisk-S.danger),natural=NATURAL_RETURN*(BASELINE-S.danger);tickW(S,{pulse:ex+natural+actionEffect});const tr=traces[k];tr.danger.push(S.danger);tr.actionSig.push(actionSignature(S));tr.need.push(k==='full'?meanNeed(S):0);tr.supportMass.push(k==='full'?totalSupport(S):0);tr.choiceChanges.push(k==='full'?sumClosed(S,'choiceChanges'):0);tr.positiveSupportDecisions.push(k==='full'?sumClosed(S,'positiveSupportDecisions'):0);tr.supportAtDecisions.push(k==='full'?sumClosed(S,'totalSupportAtDecisions'):0);tr.changedSupportMass.push(k==='full'?sumClosed(S,'changedSupportMass'):0)}
      }
      const windows=env.seg.windows.filter(w=>w.flowClass!=='middle').map((w,idx)=>{const horizonEnd=Math.min(TOTAL_TICKS-1,w.end+240),before=Math.max(0,w.start-1);const models={};for(const k of MODEL_KEYS){const tr=traces[k],d=tr.danger.slice(w.start,horizonEnd+1),rt=recoverTick(tr.danger,w.start,env.seg.q75,horizonEnd);let switches=0;for(let t=w.start+1;t<=horizonEnd;t++)if(tr.actionSig[t]!==tr.actionSig[t-1])switches++;const supportDec=tr.positiveSupportDecisions[horizonEnd]-tr.positiveSupportDecisions[before],changes=tr.choiceChanges[horizonEnd]-tr.choiceChanges[before],supportDecisionMass=tr.supportAtDecisions[horizonEnd]-tr.supportAtDecisions[before],changedMass=tr.changedSupportMass[horizonEnd]-tr.changedSupportMass[before];models[k]={recovered:rt!=null,recoveryLag:rt==null?null:rt-w.start,integratedDeviation:d.reduce((n,x)=>n+Math.abs(x-BASELINE),0),actionSwitches:switches,meanNeed:mean(tr.need.slice(w.start,horizonEnd+1)),maxNeed:Math.max(...tr.need.slice(w.start,horizonEnd+1)),meanSupportMass:mean(tr.supportMass.slice(w.start,horizonEnd+1)),maxSupportMass:Math.max(...tr.supportMass.slice(w.start,horizonEnd+1)),positiveSupportDecisions:supportDec,relationChoiceChanges:changes,supportDecisionMass,changedSupportMass,transmissionRate:supportDec?changes/supportDec:null,massTransmissionRate:supportDecisionMass?changedMass/supportDecisionMass:null}}
        return {id:idx+1,flowClass:w.flowClass,referenceRecoveryLag:w.referenceRecoveryLag,start:w.start,end:w.end,models};
      });
      const C=E.worlds.full.parties.map(P=>ensureClosed(P));
      return {offset:env.offset,environment:{totalWindows:env.seg.windows.length,quickMedian:env.seg.quickMedian,longMedian:env.seg.longMedian},windows,mechanism:{completed:C.reduce((n,x)=>n+x.completed,0),positive:C.reduce((n,x)=>n+x.positive,0),episodes:C.reduce((n,x)=>n+x.episodes.length,0),positiveEpisodes:C.reduce((n,x)=>n+x.episodes.filter(e=>e.resolution>0).length,0),choiceChanges:C.reduce((n,x)=>n+x.choiceChanges,0),positiveSupportDecisions:C.reduce((n,x)=>n+x.positiveSupportDecisions,0),peakNeed:Math.max(...C.map(x=>x.flow.peakNeed||0))}};
    }

    const trials=invalid.length?[]:environment.map(runAgents);
    function classMean(trial,k,c,field){const xs=trial.windows.filter(w=>w.flowClass===c).map(w=>w.models[k][field]).filter(Number.isFinite);return mean(xs)}
    const paired=trials.map(tr=>{const fields=['recoveryLag','integratedDeviation','meanNeed','maxNeed','meanSupportMass','maxSupportMass','positiveSupportDecisions','relationChoiceChanges','transmissionRate','massTransmissionRate'];const full={};for(const f of fields){const q=classMean(tr,'full','quick-return',f),l=classMean(tr,'full','long-lasting',f);full[f]={quick:q,long:l,diff:q==null||l==null?null:l-q}}return {offset:tr.offset,full}});
    const validDiffs=(f)=>paired.map(x=>x.full[f].diff).filter(Number.isFinite);
    const couplingSummary={
      seeds:paired.length,
      needLongerIn:validDiffs('meanNeed').filter(x=>x>0).length,
      supportMassLongerIn:validDiffs('meanSupportMass').filter(x=>x>0).length,
      choiceChangesLongerIn:validDiffs('relationChoiceChanges').filter(x=>x>0).length,
      transmissionRateLongerIn:validDiffs('transmissionRate').filter(x=>x>0).length,
      meanPairedNeedDiff:mean(validDiffs('meanNeed')),
      meanPairedSupportMassDiff:mean(validDiffs('meanSupportMass')),
      meanPairedChoiceChangeDiff:mean(validDiffs('relationChoiceChanges')),
      meanPairedTransmissionRateDiff:mean(validDiffs('transmissionRate'))
    };
    const modelRecovery={};for(const k of MODEL_KEYS)modelRecovery[k]={quick:mean(trials.flatMap(tr=>tr.windows.filter(w=>w.flowClass==='quick-return').map(w=>w.models[k].recoveryLag).filter(Number.isFinite))),long:mean(trials.flatMap(tr=>tr.windows.filter(w=>w.flowClass==='long-lasting').map(w=>w.models[k].recoveryLag).filter(Number.isFinite)))};
    const mechanism={completedJourneys:trials.reduce((n,t)=>n+t.mechanism.completed,0),positiveResolutionJourneys:trials.reduce((n,t)=>n+t.mechanism.positive,0),episodes:trials.reduce((n,t)=>n+t.mechanism.episodes,0),positiveEpisodes:trials.reduce((n,t)=>n+t.mechanism.positiveEpisodes,0),relationChoiceChanges:trials.reduce((n,t)=>n+t.mechanism.choiceChanges,0),positiveSupportDecisions:trials.reduce((n,t)=>n+t.mechanism.positiveSupportDecisions,0),peakNeed:trials.length?Math.max(...trials.map(t=>t.mechanism.peakNeed)):null};

    MODELS.full.rel=originalFullRel;memberRank=originalMemberRank;choose=originalChoose;outcome=originalOutcome;tickW=originalTickW;actionableIds=originalActionable;E=originalE;
    return {design:{koreanQuestion:'동일 시드 내부에서 자연복귀가 빠른 흐름과 오래 지속되는 흐름이 모두 존재할 때, 미해소 흐름이 완결 관계경험의 지원량을 키우고 그 지원량이 실제 선택 변경으로 전달되는가?',englishTermNote:'Relation-support mass = 현재 미해소 흐름에서 과거 완결 경험들이 각 실행가능 행동에 제공하는 연속 지원량의 합. Transmission rate = 양의 관계지원이 존재한 결정들 중 실제 선택이 무관계 반사실과 달라진 비율.',scope:'이질성 라벨/위험 임계값을 모델에 주지 않는다. reference trajectory를 먼저 실행해 동일 시드 내부 자연복귀 시간의 하위/상위 35% 구간만 사후 비교한다.',fairness:'모든 모델 동일 외생흐름, 동일 실행가능 장소, 동일 행동→현실 피드백. OASIS-Full의 기존 relation 경로는 끄고 완결경험 결합부만 격리한다.',nonCircularity:'OASIS 우위나 양의 차이는 assert하지 않는다. 환경 성립 여부만 실행 전 검증한다.',offsets:OFFSETS,totalTicks:TOTAL_TICKS},environmentValidation:{allSeedsValid:invalid.length===0,invalid,seeds:environment.map(x=>({offset:x.offset,valid:x.seg.valid,windows:x.seg.windows.length,quickMedian:x.seg.quickMedian,longMedian:x.seg.longMedian}))},trials,paired,couplingSummary,modelRecovery,mechanism};
  });

  console.log('\nOASIS WITHIN-SEED HETEROGENEITY COUPLING VALIDATION');
  console.log(`environment valid=${report.environmentValidation.allSeedsValid} invalid=${report.environmentValidation.invalid.length}`);
  for(const s of report.environmentValidation.seeds)console.log(`seed=${s.offset} valid=${s.valid} windows=${s.windows} quickMed=${s.quickMedian} longMed=${s.longMedian}`);
  console.log('COUPLING',report.couplingSummary);
  console.log('MECHANISM',report.mechanism);
  for(const[k,r]of Object.entries(report.modelRecovery))console.log(`${k}: quickLag=${r.quick?.toFixed?.(2)??r.quick} longLag=${r.long?.toFixed?.(2)??r.long}`);
  if(!report.environmentValidation.allSeedsValid)throw new Error(`FAIL - reference environment invalid for ${report.environmentValidation.invalid.length} predeclared seeds; agent comparison not run`);
  console.log('RESULT: environment passed before agent comparison; OASIS coupling differences are reported without a success assertion.');
  await writeFile('heterogeneity-within-seed-coupling-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
