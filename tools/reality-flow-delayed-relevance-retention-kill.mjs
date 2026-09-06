import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4189','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}
let browser;
try{
  await sleep(700);browser=await chromium.launch({headless:true});

  async function run(url,mode){
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(m=>document.title.includes('Laboratory')&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationAuthority&&(m==='cap80'?!!window.OASISRelationExperienceStore:!!window.OASISRelationExperienceStoreNoCap),mode,{timeout:60000});

    const out=await page.evaluate(mode=>{
      const originalE=E;
      E={tick:500,worlds:{},paused:true};
      const S=mkW('full');E.worlds.full=S;const P=S.parties[0];
      P.target='road';
      P.relationHistory=[{t:1,npc:'미라',place:'market'},{t:2,npc:'엘리',place:'forest'}];
      P.seenNPC.add('미라');P.seenNPC.add('엘리');

      const old={
        tag:'old-delayed-relevance',t:2,
        key:['미라','엘리'].sort().join('↔'),a:'미라',b:'엘리',
        places:['market','ruin'],from:[1,2],
        flowTopologyRuns:[1],flowTopologyKey:'1'
      };
      const fillers=Array.from({length:80},(_,i)=>({
        tag:`filler-${i}`,t:20+i,
        key:[`F${i}`,`G${i}`].sort().join('↔'),a:`F${i}`,b:`G${i}`,
        places:['road'],from:[20+i,21+i],
        flowTopologyRuns:[-1],flowTopologyKey:'-1'
      }));
      P.relationField.episodes=[old,...fillers];
      const targetBefore=P.relationField.episodes.some(ep=>ep.tag==='old-delayed-relevance');
      const store=mode==='cap80'?window.OASISRelationExperienceStore:window.OASISRelationExperienceStoreNoCap;
      store.composeField(S,P,[]);
      const targetAfter=P.relationField.episodes.some(ep=>ep.tag==='old-delayed-relevance');
      const afterPolicyCount=P.relationField.episodes.length;

      OASISRealityFlowTopology.ingestTrace(S,[0.30,0.24,0.18,0.15,0.16,0.18,0.20],'stage15-dormant');
      const dormantAuthority=OASISRelationAuthority.authoritySnapshot(S,P);
      const dormant={
        flowKey:OASISRealityFlowTopology.currentKeyForParty(S,P),
        activeTags:OASISRealityFlowTopology.activeEpisodes(S,P).map(ep=>ep.tag),
        known:dormantAuthority.known.slice().sort(),
        authorized:dormantAuthority.authorized.slice().sort(),
        dormant:dormantAuthority.knownButDormant.slice().sort(),
        actionable:actionableIds(S,P,1),
        candidates:evalP(S,P,1).map(r=>r.id)
      };

      OASISRealityFlowTopology.ingestTrace(S,[0.10,0.12,0.14,0.16,0.18,0.20],'stage15-later-relevance');
      const laterAuthority=OASISRelationAuthority.authoritySnapshot(S,P);
      const later={
        endpoint:S.danger,
        flowKey:OASISRealityFlowTopology.currentKeyForParty(S,P),
        activeTags:OASISRealityFlowTopology.activeEpisodes(S,P).map(ep=>ep.tag),
        known:laterAuthority.known.slice().sort(),
        authorized:laterAuthority.authorized.slice().sort(),
        dormant:laterAuthority.knownButDormant.slice().sort(),
        actionable:actionableIds(S,P,1),
        candidates:evalP(S,P,1).map(r=>r.id)
      };
      E=originalE;
      return{mode,targetBefore,targetAfter,afterPolicyCount,dormant,later};
    },mode);
    await page.close();return{out,errors};
  }

  const cap80=await run('http://127.0.0.1:4189/mvp3-authority-separated.html','cap80');
  const noCap=await run('http://127.0.0.1:4189/mvp3-authority-separated-nocap.html','nocap');
  const C=cap80.out,N=noCap.out;
  const checks={
    cleanRuns:cap80.errors.length===0&&noCap.errors.length===0,
    sameInitialStoredExperience:C.targetBefore&&N.targetBefore,
    capEvictsOldestTarget:!C.targetAfter&&C.afterPolicyCount===80,
    noCapRetainsOldestTarget:N.targetAfter&&N.afterPolicyCount===81,
    oldExperienceInitiallyDormant:N.dormant.flowKey==='-1>1'&&!N.dormant.activeTags.includes('old-delayed-relevance'),
    evidenceRemainsKnownInBothDormant:C.dormant.known.includes('ruin')&&N.dormant.known.includes('ruin'),
    noPrematureExecutionAuthority:!C.dormant.authorized.includes('ruin')&&!N.dormant.authorized.includes('ruin')&&!C.dormant.candidates.includes('ruin')&&!N.dormant.candidates.includes('ruin'),
    sameLaterCurrentFlow:C.later.endpoint===N.later.endpoint&&C.later.flowKey===N.later.flowKey&&N.later.flowKey==='1',
    noCapReactivatesDelayedRelation:N.later.activeTags.includes('old-delayed-relevance'),
    capCannotReactivateDeletedRelation:!C.later.activeTags.includes('old-delayed-relevance'),
    memoryEvidenceStillKnownAfterEviction:C.later.known.includes('ruin')&&N.later.known.includes('ruin'),
    laterExecutionAuthorityDiffers:!C.later.authorized.includes('ruin')&&N.later.authorized.includes('ruin'),
    laterCandidateSetDiffers:!C.later.candidates.includes('ruin')&&N.later.candidates.includes('ruin')
  };
  const report={
    question:'Can an experience that is dormant when stored become relevant later, and does fixed oldest-first episode eviction prevent that later relation from regaining current execution authority?',
    scope:'Targeted delayed-relevance falsification of the fixed 80-episode oldest-first retention policy. Both arms preserve identical relationship knowledge and later current topology; only episode retention differs. The test does not claim unlimited retention is optimal, nor that delayed-relevance memory is novel.',
    english:{
      delayedRelevance:'information that is not useful in the current situation but becomes relevant in a later situation',
      fifoLikeEviction:'capacity management that removes the oldest retained entries first',
      dormantEvidence:'remembered evidence that currently has no execution authority'
    },
    cap80:{...C,errors:cap80.errors},noCap:{...N,errors:noCap.errors},checks,
    interpretation:Object.values(checks).every(Boolean)
      ?'STAGE15_OLDEST_FIRST_CAP_BLOCKS_DELAYED_RELATION_REACTIVATION'
      :'STAGE15_DELAYED_RELEVANCE_RETENTION_FALSIFICATION_NOT_ESTABLISHED'
  };
  console.log('\nSTAGE 15 — DELAYED-RELEVANCE RETENTION KILL');console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(checks))assert(v,k);
  await writeFile('reality-flow-delayed-relevance-retention-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
