import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server = spawn('python3', ['-m', 'http.server', '4175', '--bind', '127.0.0.1'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
function assert(cond, msg) { if (!cond) throw new Error(`FAIL - ${msg}`); console.log(`PASS - ${msg}`); }

let browser;
try {
  await sleep(700);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4175/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.title.includes('Dual Comparison Laboratory') && document.getElementById('relationFieldCard'), null, { timeout: 60000 });

  const report = await page.evaluate(() => {
    const originalE = E;
    const originalNPCs = npcs.slice();
    const originalActionable = actionableIds;
    const MODEL_KEYS = ['full','rule','utility','qlite','retrieval'];
    const STAGE_TICKS = 520;
    const STAGES = [
      ['새인연A','village'], ['새인연B','market'], ['새인연C','forest'], ['새인연D','lake'],
      ['새인연E','camp'], ['새인연F','road'], ['새인연G','market'], ['새인연H','forest']
    ];

    // Equal executable access: relation structure may affect judgment, not whether a place is executable.
    actionableIds = function(S,P,use=1){
      const here=currentPlace(P), ids=Object.keys(places), other=ids.filter(id=>id!==here);
      return other.length?other:ids;
    };

    function decisionSignature(S,P){
      const rows=evalP(S,P,1);
      const ranked=rows.slice(0,5).map(r=>r.id).join('>');
      return `${ranked}|choice=${rows[0]?.id||'none'}`;
    }
    function fieldKeys(S){
      const out=new Set();
      for(const P of S.parties) for(const ep of (P.relationField?.episodes||[])) out.add(ep.key);
      return out;
    }
    function snapshot(S, seenDecision, prevField){
      const nowDecision=new Set();
      for(const P of S.parties) nowDecision.add(decisionSignature(S,P));
      const novelDecision=[...nowDecision].filter(x=>!seenDecision.has(x));
      novelDecision.forEach(x=>seenDecision.add(x));
      const f=fieldKeys(S);
      const novelField=[...f].filter(x=>!prevField.has(x));
      return {nowDecision, novelDecision, field:f, novelField};
    }

    E={tick:0,worlds:{},paused:true};
    for(const k of MODEL_KEYS) E.worlds[k]=mkW(k);
    const seenDecision=Object.fromEntries(MODEL_KEYS.map(k=>[k,new Set()]));
    const prevField=new Set();
    const stages=[];

    for(let si=0; si<STAGES.length; si++){
      const [npc,anchor]=STAGES[si];
      npcs.push([npc,anchor]);

      // Same new real experience enters every model at the same point in the flow.
      for(const k of MODEL_KEYS){
        const S=E.worlds[k];
        for(const P of S.parties) P.target=anchor;
      }

      const before=Object.fromEntries(MODEL_KEYS.map(k=>{
        const S=E.worlds[k];
        return [k,{
          actions:S.c.actions,
          choiceTransitions:S.c.choiceTransition||0,
          participationTransitions:S.c.participationTransition||0,
          fieldActivations:S.c.relationFieldActivation||0,
          relationRecombinations:S.c.relationRecombination||0
        }];
      }));

      const stageDecisionNovel=Object.fromEntries(MODEL_KEYS.map(k=>[k,new Set()]));
      for(let t=1;t<=STAGE_TICKS;t++){
        E.tick++;
        const e=env(E.tick);
        for(const k of MODEL_KEYS){
          const S=E.worlds[k];
          tickW(S,e);
          if(t%20===0){
            for(const P of S.parties){
              const sig=decisionSignature(S,P);
              if(!seenDecision[k].has(sig)) stageDecisionNovel[k].add(sig);
              seenDecision[k].add(sig);
            }
          }
        }
      }

      const after=Object.fromEntries(MODEL_KEYS.map(k=>{
        const S=E.worlds[k];
        return [k,{
          cumulativeDecisionStructures:seenDecision[k].size,
          newDecisionStructures:stageDecisionNovel[k].size,
          actions:S.c.actions-before[k].actions,
          choiceTransitions:(S.c.choiceTransition||0)-before[k].choiceTransitions,
          participationTransitions:(S.c.participationTransition||0)-before[k].participationTransitions,
          fieldActivations:(S.c.relationFieldActivation||0)-before[k].fieldActivations,
          relationRecombinations:(S.c.relationRecombination||0)-before[k].relationRecombinations
        }];
      }));

      const fullField=fieldKeys(E.worlds.full);
      const newField=[...fullField].filter(x=>!prevField.has(x));
      prevField.clear(); fullField.forEach(x=>prevField.add(x));
      after.full.cumulativeRelationStructures=fullField.size;
      after.full.newRelationStructures=newField.length;
      stages.push({stage:si+1,newExperience:{npc,anchor},models:after});
    }

    const summary=Object.fromEntries(MODEL_KEYS.map(k=>{
      const rows=stages.map(s=>s.models[k]);
      return [k,{
        model:MODELS[k].n,
        totalDecisionStructures:seenDecision[k].size,
        stagesWithNewDecisionStructures:rows.filter(r=>r.newDecisionStructures>0).length,
        totalNewDecisionStructures:rows.reduce((n,r)=>n+r.newDecisionStructures,0),
        totalChoiceTransitions:rows.reduce((n,r)=>n+r.choiceTransitions,0),
        totalParticipationTransitions:rows.reduce((n,r)=>n+r.participationTransitions,0),
        totalFieldActivations:rows.reduce((n,r)=>n+r.fieldActivations,0),
        totalRelationRecombinations:rows.reduce((n,r)=>n+r.relationRecombinations,0)
      }];
    }));
    summary.full.finalDistinctRelationStructures=fieldKeys(E.worlds.full).size;
    summary.full.stagesWithNewRelationStructures=stages.filter(s=>s.models.full.newRelationStructures>0).length;

    npcs.splice(0,npcs.length,...originalNPCs);
    actionableIds=originalActionable;
    E=originalE;

    return {
      design:{
        question:'When genuinely new experiences enter a continuous shared reality, does OASIS keep generating previously absent relation/decision structures instead of being confined to a closed pre-existing possibility set?',
        operationalMeaning:'This tests non-closure / continued structural generativity, not literal execution of infinitely many possibilities.',
        fairness:'All models receive the same new NPC experience, world flow, executable place access, and real ticks.',
        wholeFlow:'new experience -> relation/learning update -> present-flow judgment -> participation/ranking -> single action -> outcome -> next judgment',
        stages:STAGES.length,
        stageTicks:STAGE_TICKS,
        models:MODEL_KEYS.map(k=>MODELS[k].n)
      },
      stages,summary
    };
  });

  console.log('\nOASIS WHOLE-FLOW OPEN POSSIBILITY SPACE EXPERIMENT');
  console.log(`meaning: ${report.design.operationalMeaning}`);
  for(const s of report.stages){
    const f=s.models.full;
    console.log(`stage=${s.stage} experience=${s.newExperience.npc}@${s.newExperience.anchor} OASIS newRelation=${f.newRelationStructures} cumRelation=${f.cumulativeRelationStructures} newDecision=${f.newDecisionStructures}`);
    for(const k of ['rule','utility','qlite','retrieval']){
      const r=s.models[k];
      console.log(`  ${r.model||k}: newDecision=${r.newDecisionStructures} cumulativeDecision=${r.cumulativeDecisionStructures}`);
    }
  }
  for(const [k,row] of Object.entries(report.summary)){
    console.log(`SUMMARY ${row.model}: decisionStructures=${row.totalDecisionStructures} noveltyStages=${row.stagesWithNewDecisionStructures}/${report.design.stages} choiceTransitions=${row.totalChoiceTransitions} participationTransitions=${row.totalParticipationTransitions} fieldRecombinations=${row.totalRelationRecombinations}`);
  }
  console.log(`OASIS relation novelty stages=${report.summary.full.stagesWithNewRelationStructures}/${report.design.stages} finalDistinctRelationStructures=${report.summary.full.finalDistinctRelationStructures}`);
  assert(report.summary.full.stagesWithNewRelationStructures>0,'OASIS generated relation structures absent before later experiences arrived');
  assert(report.summary.full.totalRelationRecombinations>0,'OASIS recombined real relationship experiences during the continuous flow');
  assert(report.summary.full.totalChoiceTransitions>0 || report.summary.full.totalParticipationTransitions>0,'OASIS relation process changed participation or choice somewhere in the continuous flow');
  console.log('RESULT: experiment completed. Interpret as evidence for or against structural non-closure; do not claim literal mathematical infinity from a finite run.');
  await writeFile('open-possibility-flow-report.json',JSON.stringify(report,null,2));
} finally {
  if(browser) await browser.close();
  server.kill('SIGTERM');
}
