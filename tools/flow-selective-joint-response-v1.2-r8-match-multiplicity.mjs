import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const OFFSET=Number(process.env.OFFSET||0);
const LABEL=process.env.LABEL||`offset${OFFSET}`;
const HORIZON=120000;
const PORT=4910+(OFFSET%100);
const REPORT=`flow-selective-joint-response-v1.2-r8-${LABEL}.json`;
const EXPECTED={
  0:{dawn:917,star:547,blue:533},
  137:{dawn:593,star:757,blue:535},
  977:{dawn:531,star:543,blue:548},
  4099:{dawn:672,star:760,blue:577}
};
const typeMap={place:'byPlace',choice:'byChoice',leader:'byLeader',npc:'byNpc',placeTransition:'byPlaceTransition',choiceTransition:'byChoiceTransition',leaderTransition:'byLeaderTransition',dangerDirection:'byDangerDirection'};
const familyOf=type=>({
  place:'spatialAction',choice:'spatialAction',leader:'leader',npc:'npcRelation',
  placeTransition:'flowLocation',choiceTransition:'flowLocation',leaderTransition:'flowLeader',dangerDirection:'flowDirection'
}[type]||type);
const flowFamilies=new Set(['flowLocation','flowLeader','flowDirection']);
const staticFamilies=new Set(['spatialAction','leader','npcRelation']);

const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  await sleep(400);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  await page.addInitScript(()=>{
    globalThis.OASIS_LATENT_RELATION_STORE=true;
    globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;
  });
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>globalThis.oasisFlowSelectiveV12?.version==='1.2-r6-stageA',null,{timeout:60000});
  const toggle=page.locator('#toggle');
  if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({HORIZON,OFFSET,EXPECTED,typeMap})=>{
    E={tick:0,worlds:{full:mkW('full')},paused:true};
    const S=E.worlds.full, productionChoose=choose;
    const familyOfLocal=type=>({place:'spatialAction',choice:'spatialAction',leader:'leader',npc:'npcRelation',placeTransition:'flowLocation',choiceTransition:'flowLocation',leaderTransition:'flowLeader',dangerDirection:'flowDirection'}[type]||type);
    const flowFamiliesLocal=new Set(['flowLocation','flowLeader','flowDirection']);
    const staticFamiliesLocal=new Set(['spatialAction','leader','npcRelation']);
    const agg={frames:0,candidateInstances:0,singleFamilyOnly:0,multiFamily:0,staticPlusFlow:0,flowOnly:0,staticOnly:0,singleByFamily:{},party:{}};

    function ensureParty(id){return agg.party[id]||(agg.party[id]={frames:0,candidateInstances:0,singleFamilyOnly:0,multiFamily:0,staticPlusFlow:0});}
    function profile(P){
      const F=oasisFlowSelectiveV12.ensureFlowSelective(P);
      const keys=oasisFlowSelectiveV12.currentRelationalKeys(S,P);
      const matchFamilies=new Map();
      for(const [type,value] of keys){
        const mapName=typeMap[type];
        const bucket=mapName?F.index[mapName]?.get(value):null;
        if(!bucket)continue;
        const family=familyOfLocal(type);
        for(const id of bucket){if(!matchFamilies.has(id))matchFamilies.set(id,new Set());matchFamilies.get(id).add(family);}
      }
      const pa=ensureParty(P.id); agg.frames++; pa.frames++;
      for(const fams of matchFamilies.values()){
        agg.candidateInstances++;pa.candidateInstances++;
        const hasStatic=[...fams].some(x=>staticFamiliesLocal.has(x));
        const hasFlow=[...fams].some(x=>flowFamiliesLocal.has(x));
        if(fams.size===1){
          agg.singleFamilyOnly++;pa.singleFamilyOnly++;
          const f=[...fams][0];agg.singleByFamily[f]=(agg.singleByFamily[f]||0)+1;
        }else{agg.multiFamily++;pa.multiFamily++;}
        if(hasStatic&&hasFlow){agg.staticPlusFlow++;pa.staticPlusFlow++;}
        else if(hasFlow)agg.flowOnly++;
        else if(hasStatic)agg.staticOnly++;
      }
    }
    choose=function(W,P){if(W===S&&MODELS[W.key].kind==='oasis'&&MODELS[W.key].fb)profile(P);return productionChoose(W,P);};
    for(let t=1;t<=HORIZON;t++){E.tick=t;tickW(S,env(t+OFFSET));}
    choose=productionChoose;
    const finalCounts=Object.fromEntries(S.parties.map(P=>[P.id,ensurePastRelationalStructure(P).realizedExperiences.length]));
    const expected=EXPECTED[String(OFFSET)]||EXPECTED[OFFSET]||null;
    const trajectoryPreserved=!expected||JSON.stringify(finalCounts)===JSON.stringify(expected);
    const ratio=(x,d)=>d?x/d:0;
    const summary={
      ...agg,
      singleFamilyRatio:ratio(agg.singleFamilyOnly,agg.candidateInstances),
      multiFamilyRatio:ratio(agg.multiFamily,agg.candidateInstances),
      staticPlusFlowRatio:ratio(agg.staticPlusFlow,agg.candidateInstances),
      flowOnlyRatio:ratio(agg.flowOnly,agg.candidateInstances),
      staticOnlyRatio:ratio(agg.staticOnly,agg.candidateInstances)
    };
    for(const p of Object.values(summary.party)){
      p.singleFamilyRatio=ratio(p.singleFamilyOnly,p.candidateInstances);
      p.multiFamilyRatio=ratio(p.multiFamily,p.candidateInstances);
      p.staticPlusFlowRatio=ratio(p.staticPlusFlow,p.candidateInstances);
    }
    return {offset:OFFSET,horizon:HORIZON,finalCounts,expected,trajectoryPreserved,summary};
  },{HORIZON,OFFSET,EXPECTED,typeMap});

  const pass=result.trajectoryPreserved;
  const report={
    experiment:'OASIS Flow-Selective Joint Response v1.2',iteration:'r8',stage:'A semantic diagnostic',
    repairClass:'diagnostic-only-no-production-change',
    question:'How much current OR-union recall is admitted by only one semantic relation family?',
    interpretationGuard:'Single-family match is a structural-mismatch suspect, not automatically a false positive.',
    pass,result
  };
  await writeFile(REPORT,JSON.stringify(report,null,2));
  console.log('OASIS-FSJR-R8',JSON.stringify({label:LABEL,pass,...result}));
  if(!pass)process.exitCode=1;
} finally {
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
