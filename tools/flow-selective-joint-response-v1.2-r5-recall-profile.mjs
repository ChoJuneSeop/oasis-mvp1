import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const OFFSET=Number(process.env.OFFSET||0);
const LABEL=process.env.LABEL||`offset${OFFSET}`;
const HORIZON=120000;
const PORT=4590+(OFFSET%100);
const REPORT=`flow-selective-joint-response-v1.2-r5-${LABEL}.json`;
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;

try{
  await sleep(500);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  await page.addInitScript(()=>{globalThis.OASIS_LATENT_RELATION_STORE=true;globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;});
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>globalThis.oasisFlowSelectiveV12?.version==='1.2-r3-stageA',null,{timeout:60000});
  const toggle=page.locator('#toggle');if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({HORIZON,OFFSET})=>{
    E={tick:0,worlds:{full:mkW('full')},paused:true};
    const S=E.worlds.full, productionChoose=choose;
    const rows=[];
    const typeMap={place:'byPlace',choice:'byChoice',leader:'byLeader',npc:'byNpc',placeTransition:'byPlaceTransition',choiceTransition:'byChoiceTransition',leaderTransition:'byLeaderTransition',dangerDirection:'byDangerDirection'};
    const snapshotTypes=new Set(['place','choice','leader','npc']);
    const flowTypes=new Set(['placeTransition','choiceTransition','leaderTransition','dangerDirection']);
    function union(sets){const o=new Set();for(const s of sets)for(const x of s)o.add(x);return o;}
    function intersect(a,b){return new Set([...a].filter(x=>b.has(x)));}
    function profile(P){
      const F=oasisFlowSelectiveV12.ensureFlowSelective(P), keys=oasisFlowSelectiveV12.currentRelationalKeys(S,P), total=F.index.byId.size;
      const parts=keys.map(([type,value])=>{const map=F.index[typeMap[type]], bucket=new Set(map?.get(value)||[]);return{type,value,bucket};});
      const allUnion=union(parts.map(x=>x.bucket));
      const snapUnion=union(parts.filter(x=>snapshotTypes.has(x.type)).map(x=>x.bucket));
      const flowUnion=union(parts.filter(x=>flowTypes.has(x.type)).map(x=>x.bucket));
      const snapFlowIntersection=intersect(snapUnion,flowUnion);
      const keyProfiles=parts.map((p,i)=>{
        const others=union(parts.filter((_,j)=>j!==i).map(x=>x.bucket));
        let unique=0;for(const id of p.bucket)if(!others.has(id))unique++;
        return {type:p.type,value:p.value,bucketSize:p.bucket.size,bucketRatio:total?p.bucket.size/total:0,uniqueMarginal:unique};
      });
      return {tick:E.tick,party:P.id,totalPast:total,unionSize:allUnion.size,unionRatio:total?allUnion.size/total:0,snapshotUnionSize:snapUnion.size,flowUnionSize:flowUnion.size,snapshotFlowIntersectionSize:snapFlowIntersection.size,snapshotFlowIntersectionRatio:total?snapFlowIntersection.size/total:0,keyProfiles};
    }
    choose=function(W,P){if(W===S&&MODELS[W.key].kind==='oasis'&&MODELS[W.key].fb)rows.push(profile(P));return productionChoose(W,P);};
    for(let t=1;t<=HORIZON;t++){E.tick=t;tickW(S,env(t+OFFSET));}
    choose=productionChoose;
    const byType={};
    for(const r of rows)for(const k of r.keyProfiles){const a=byType[k.type]||(byType[k.type]={frames:0,sumBucketRatio:0,sumBucketSize:0,sumUniqueMarginal:0,maxBucketRatio:0});a.frames++;a.sumBucketRatio+=k.bucketRatio;a.sumBucketSize+=k.bucketSize;a.sumUniqueMarginal+=k.uniqueMarginal;a.maxBucketRatio=Math.max(a.maxBucketRatio,k.bucketRatio);}
    for(const a of Object.values(byType)){a.meanBucketRatio=a.frames?a.sumBucketRatio/a.frames:0;a.meanBucketSize=a.frames?a.sumBucketSize/a.frames:0;a.meanUniqueMarginal=a.frames?a.sumUniqueMarginal/a.frames:0;}
    const mean=x=>rows.length?rows.reduce((s,r)=>s+r[x],0)/rows.length:0;
    const finalCounts=Object.fromEntries(S.parties.map(P=>[P.id,ensurePastRelationalStructure(P).realizedExperiences.length]));
    return {offset:OFFSET,horizon:HORIZON,decisionFrames:rows.length,finalCounts,summary:{meanUnionRatio:mean('unionRatio'),meanSnapshotFlowIntersectionRatio:mean('snapshotFlowIntersectionRatio'),byType},samples:rows.filter((_,i)=>i%Math.max(1,Math.floor(rows.length/24))===0).slice(0,24)};
  },{HORIZON,OFFSET});
  const report={experiment:'OASIS Flow-Selective Joint Response v1.2',iteration:'r5',stage:'A recall-breadth diagnostic',repairClass:'diagnostic-only-no-production-change',result};
  await writeFile(REPORT,JSON.stringify(report,null,2));
  console.log('OASIS-FSJR-R5',JSON.stringify({label:LABEL,decisionFrames:result.decisionFrames,finalCounts:result.finalCounts,summary:result.summary}));
} finally {if(browser)await browser.close();server.kill('SIGTERM');}
