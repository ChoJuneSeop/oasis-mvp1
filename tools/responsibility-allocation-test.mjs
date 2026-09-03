import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server = spawn('python3', ['-m', 'http.server', '4174', '--bind', '127.0.0.1'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
function assert(cond, msg) { if (!cond) throw new Error(`FAIL - ${msg}`); console.log(`PASS - ${msg}`); }

let browser;
try {
  await sleep(700);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4174/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.title.includes('Dual Comparison Laboratory') && document.getElementById('relationFieldCard'), null, { timeout: 60000 });

  const report = await page.evaluate(() => {
    const originalE = E;
    const originalNPCs = npcs.slice();
    const originalActionable = actionableIds;
    const MODEL_KEYS = ['full','rule','utility','qlite','retrieval'];
    const OFFSETS = [0,73,149,251,389,577,911];
    const NEUTRAL_TICKS = 900;
    const DELAY_TICKS = 1500;
    const RELEVANT_TICKS = 900;
    const anchors = ['village','market','forest','lake'];

    actionableIds = function(S,P,use=1){
      const here=currentPlace(P), ids=Object.keys(places), other=ids.filter(id=>id!==here);
      return other.length?other:ids;
    };

    const relationKeys = S => new Set(S.parties.flatMap(P => (P.relationField?.episodes||[]).map(ep=>ep.key)));
    const decisions = S => new Set(S.parties.flatMap(P => P.choiceHistory.slice(-60).map(x=>x.target)));

    function run(offset){
      E={tick:offset,worlds:{},paused:true};
      for(const k of MODEL_KEYS) E.worlds[k]=mkW(k);
      const neutralNPCs=['무가치경험A','무가치경험B','무가치경험C','무가치경험D'];
      neutralNPCs.forEach((n,i)=>npcs.push([n,anchors[i]]));

      // Phase 1: every model receives the same experiences while they have no special future value signal.
      for(const k of MODEL_KEYS) for(const P of E.worlds[k].parties) P.target=anchors[0];
      for(let t=0;t<NEUTRAL_TICKS;t++){
        E.tick++;
        const e={pulse:0};
        for(const k of MODEL_KEYS) tickW(E.worlds[k],e);
      }
      const neutral = Object.fromEntries(MODEL_KEYS.map(k=>[k,{
        actions:E.worlds[k].c.actions,
        relationKeys:[...relationKeys(E.worlds[k])],
        memories:E.worlds[k].parties.reduce((n,P)=>n+(P.memory?.length||0),0),
        qEntries:E.worlds[k].parties.reduce((n,P)=>n+Object.keys(P.q||{}).length,0)
      }]));

      // Phase 2: long delay; no future relevance is announced.
      for(let t=0;t<DELAY_TICKS;t++){
        E.tick++;
        const e=env(E.tick);
        for(const k of MODEL_KEYS) tickW(E.worlds[k],e);
      }

      const before = Object.fromEntries(MODEL_KEYS.map(k=>[k,{
        actions:E.worlds[k].c.actions,
        choices:decisions(E.worlds[k]),
        fieldAct:E.worlds[k].c.relationFieldActivation||0,
        choiceTrans:E.worlds[k].c.choiceTransition||0,
        partTrans:E.worlds[k].c.participationTransition||0,
        recomb:E.worlds[k].c.relationRecombination||0
      }]));

      // Phase 3: only the present changes. Earlier neutral anchors now become relevant through danger/target context.
      for(const k of MODEL_KEYS){
        const S=E.worlds[k];
        S.danger=.62;
        for(const P of S.parties) P.target='forest';
      }
      for(let t=0;t<RELEVANT_TICKS;t++){
        E.tick++;
        const pulse=(noise('delayed-relevance',offset,t)-.5)*.018 + (.58-E.worlds.full.danger)*.006;
        const e={pulse};
        for(const k of MODEL_KEYS) tickW(E.worlds[k],e);
      }

      const after=Object.fromEntries(MODEL_KEYS.map(k=>{
        const S=E.worlds[k], b=before[k];
        const nowChoices=decisions(S);
        return [k,{
          model:MODELS[k].n,
          neutralRelationStructures:neutral[k].relationKeys.length,
          neutralMemoryEntries:neutral[k].memories,
          neutralQEntries:neutral[k].qEntries,
          laterActions:S.c.actions-b.actions,
          newChoiceTargets:[...nowChoices].filter(x=>!b.choices.has(x)).length,
          relationReactivations:(S.c.relationFieldActivation||0)-b.fieldAct,
          relationChoiceTransitions:(S.c.choiceTransition||0)-b.choiceTrans,
          relationParticipationTransitions:(S.c.participationTransition||0)-b.partTrans,
          relationRecombinations:(S.c.relationRecombination||0)-b.recomb,
          finalRelationStructures:relationKeys(S).size
        }];
      }));
      npcs.splice(npcs.length-neutralNPCs.length,neutralNPCs.length);
      return {offset,models:after};
    }

    const trials=OFFSETS.map(run);
    const aggregate=Object.fromEntries(MODEL_KEYS.map(k=>{
      const rows=trials.map(t=>t.models[k]);
      const sum=x=>rows.reduce((n,r)=>n+r[x],0);
      return [k,{
        model:MODELS[k].n,
        trials:rows.length,
        trialsWithNeutralRelation:rows.filter(r=>r.neutralRelationStructures>0).length,
        trialsWithLaterRelationReactivation:rows.filter(r=>r.relationReactivations>0).length,
        trialsWithRelationJudgmentChange:rows.filter(r=>r.relationChoiceTransitions>0||r.relationParticipationTransitions>0).length,
        totalLaterRelationReactivations:sum('relationReactivations'),
        totalRelationChoiceTransitions:sum('relationChoiceTransitions'),
        totalRelationParticipationTransitions:sum('relationParticipationTransitions'),
        totalNewChoiceTargets:sum('newChoiceTargets'),
        meanNeutralMemoryEntries:sum('neutralMemoryEntries')/rows.length,
        meanNeutralQEntries:sum('neutralQEntries')/rows.length
      }];
    }));

    E=originalE; npcs.splice(0,npcs.length,...originalNPCs); actionableIds=originalActionable;
    return {design:{
      question:'Can OASIS preserve initially non-privileged relationship experiences and later use them when the present changes, producing a judgment effect that value/rule/reward/retrieval comparison mechanisms do not obtain from an OASIS relation field?',
      superiorityMeaning:'superiority here means delayed-relevance recovery through value-independent relationship-process formation and present-flow reactivation, not universal task superiority',
      fairness:'same initial worlds, same neutral experiences, same delay, same later reality change, same executable access, same ticks',
      phases:['neutral experience without future relevance signal','delay','later present makes old context relevant'],
      offsets:OFFSETS
    },trials,aggregate};
  });

  console.log('\nOASIS ZERO-PRIOR-VALUE DELAYED-RELEVANCE SUPERIORITY EXPERIMENT');
  for(const [k,r] of Object.entries(report.aggregate)) console.log(`SUMMARY ${r.model}: neutralRelTrials=${r.trialsWithNeutralRelation}/${r.trials} laterReactTrials=${r.trialsWithLaterRelationReactivation}/${r.trials} relationJudgmentTrials=${r.trialsWithRelationJudgmentChange}/${r.trials} react=${r.totalLaterRelationReactivations} choiceTrans=${r.totalRelationChoiceTransitions} partTrans=${r.totalRelationParticipationTransitions} newTargets=${r.totalNewChoiceTargets} memory=${r.meanNeutralMemoryEntries.toFixed(1)} q=${r.meanNeutralQEntries.toFixed(1)}`);
  assert(report.aggregate.full.trialsWithNeutralRelation>0,'OASIS formed relationship structures before future relevance was known');
  assert(report.aggregate.full.trialsWithLaterRelationReactivation>0,'OASIS later reactivated prior relationship structures after the present changed');
  assert(report.aggregate.full.trialsWithRelationJudgmentChange>0,'reactivated relationship process changed participation or choice in later judgment');
  console.log('RESULT: finite superiority test completed; interpret only for the tested delayed-relevance mechanism and comparison implementations.');
  await writeFile('zero-prior-value-superiority-report.json',JSON.stringify(report,null,2));
} finally {
  if(browser) await browser.close();
  server.kill('SIGTERM');
}

await import('./open-possibility-flow-test.mjs');
