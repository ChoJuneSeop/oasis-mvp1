import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const OFFSET=Number(process.env.OFFSET||0), LABEL=process.env.LABEL||`offset${OFFSET}`, HORIZON=120000;
const PORT=4790+(OFFSET%100), REPORT=`flow-selective-joint-response-v1.2-r7-${LABEL}.json`;
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'}), sleep=ms=>new Promise(r=>setTimeout(r,ms)); let browser;
try{
  await sleep(400); browser=await chromium.launch({headless:true}); const page=await browser.newPage();
  await page.addInitScript(()=>{globalThis.OASIS_LATENT_RELATION_STORE=true;globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;});
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>globalThis.oasisFlowSelectiveV12?.version==='1.2-r6-stageA',null,{timeout:60000});
  const toggle=page.locator('#toggle'); if((await toggle.textContent())?.includes('일시정지'))await toggle.click();
  const result=await page.evaluate(({HORIZON,OFFSET})=>{
    E={tick:0,worlds:{full:mkW('full')},paused:true}; const S=E.worlds.full, productionChoose=choose, rows=[];
    const typeMap={place:'byPlace',choice:'byChoice',leader:'byLeader',npc:'byNpc',placeTransition:'byPlaceTransition',choiceTransition:'byChoiceTransition',leaderTransition:'byLeaderTransition',dangerDirection:'byDangerDirection'};
    function union(parts){const out=new Set();for(const p of parts)for(const id of p)out.add(id);return out;}
    function profile(P){
      const F=oasisFlowSelectiveV12.ensureFlowSelective(P), keys=oasisFlowSelectiveV12.currentRelationalKeys(S,P), total=F.index.byId.size;
      const parts=keys.map(([type,value])=>({type,value,bucket:new Set(F.index[typeMap[type]]?.get(value)||[])}));
      const all=union(parts.map(p=>p.bucket));
      const keyProfiles=parts.map((p,i)=>{const others=union(parts.filter((_,j)=>j!==i).map(x=>x.bucket));let unique=0;for(const id of p.bucket)if(!others.has(id))unique++;return{type:p.type,value:p.value,bucketSize:p.bucket.size,bucketRatio:total?p.bucket.size/total:0,uniqueMarginal:unique};});
      return {party:P.id,total,unionSize:all.size,unionRatio:total?all.size/total:0,keyProfiles};
    }
    choose=function(W,P){if(W===S&&MODELS[W.key].kind==='oasis'&&MODELS[W.key].fb)rows.push(profile(P));return productionChoose(W,P);};
    for(let t=1;t<=HORIZON;t++){E.tick=t;tickW(S,env(t+OFFSET));} choose=productionChoose;
    const byType={}; for(const r of rows)for(const k of r.keyProfiles){const a=byType[k.type]||(byType[k.type]={frames:0,sumBucketRatio:0,sumBucketSize:0,sumUniqueMarginal:0,maxBucketRatio:0});a.frames++;a.sumBucketRatio+=k.bucketRatio;a.sumBucketSize+=k.bucketSize;a.sumUniqueMarginal+=k.uniqueMarginal;a.maxBucketRatio=Math.max(a.maxBucketRatio,k.bucketRatio);}
    for(const a of Object.values(byType)){a.meanBucketRatio=a.frames?a.sumBucketRatio/a.frames:0;a.meanBucketSize=a.frames?a.sumBucketSize/a.frames:0;a.meanUniqueMarginal=a.frames?a.sumUniqueMarginal/a.frames:0;}
    const meanUnionRatio=rows.length?rows.reduce((s,r)=>s+r.unionRatio,0)/rows.length:0;
    return {offset:OFFSET,horizon:HORIZON,decisionFrames:rows.length,meanUnionRatio,byType,finalCounts:Object.fromEntries(S.parties.map(P=>[P.id,ensurePastRelationalStructure(P).realizedExperiences.length]))};
  },{HORIZON,OFFSET});
  const report={experiment:'OASIS Flow-Selective Joint Response v1.2',iteration:'r7',stage:'A corrected-recall diagnostic',repairClass:'diagnostic-only-no-production-change',result};
  await writeFile(REPORT,JSON.stringify(report,null,2)); console.log('OASIS-FSJR-R7',JSON.stringify({label:LABEL,...result}));
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
