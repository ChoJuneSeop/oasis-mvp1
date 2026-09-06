import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4190','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}
let browser;
try{
  await sleep(700);browser=await chromium.launch({headless:true});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4190/mvp3-authority-separated-nocap.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.OASISRealityFlowTopology&&!!window.OASISRelationAuthority&&!!window.OASISRelationExperienceStoreNoCap,null,{timeout:60000});

  const report=await page.evaluate(()=>{
    const originalE=E;
    const HIDDEN_LINK=hiddenDefs.find(h=>h.id==='wanderer');
    const HIDDEN_NO_LINK=hiddenDefs.find(h=>h.id==='herbRuin');

    function baseEpisode(){
      return{
        tag:'witness',t:450,
        key:['미라','엘리'].sort().join('↔'),
        a:'미라',b:'엘리',
        places:['market','ruin'],from:[430,450],
        flowTopologyRuns:[1],flowTopologyKey:'1'
      };
    }
    function hiddenPairEpisode(){
      return{
        tag:'hidden-pair',t:451,
        key:['???','아론'].sort().join('↔'),
        a:'???',b:'아론',places:['camp','canyon'],from:[431,451],
        flowTopologyRuns:[1],flowTopologyKey:'1'
      };
    }
    function strip(ep,fields){
      const x={...ep,places:ep.places?[...ep.places]:ep.places,from:ep.from?[...ep.from]:ep.from,flowTopologyRuns:ep.flowTopologyRuns?[...ep.flowTopologyRuns]:ep.flowTopologyRuns};
      for(const f of fields)delete x[f];
      return x;
    }
    function makeCase(name,remove=[]){
      E={tick:500,worlds:{},paused:true};
      const S=mkW('full');E.worlds.full=S;const P=S.parties[0];P.target='road';
      P.relationHistory=[
        {t:420,npc:'미라',place:'market'},
        {t:430,npc:'엘리',place:'forest'},
        {t:440,npc:'???',place:'camp'},
        {t:445,npc:'아론',place:'camp'}
      ];
      ['미라','엘리','???','아론'].forEach(n=>P.seenNPC.add(n));
      ['market','forest','ruin','camp','canyon'].forEach(id=>P.disc.add(id));
      P.relationField.episodes=[strip(baseEpisode(),remove),strip(hiddenPairEpisode(),remove)];
      OASISRealityFlowTopology.ingestTrace(S,[0.10,0.12,0.14,0.16,0.18,0.20],`stage16-${name}`);
      const A=OASISRelationAuthority.authoritySnapshot(S,P);
      const rows=evalP(S,P,1);
      const marketRow=rows.find(r=>r.id==='market');
      const ruinRow=rows.find(r=>r.id==='ruin');
      return{
        name,remove,
        flowKey:OASISRealityFlowTopology.currentKeyForParty(S,P),
        activeCount:OASISRealityFlowTopology.activeEpisodes(S,P).length,
        activeTags:OASISRealityFlowTopology.activeEpisodes(S,P).map(ep=>ep.tag),
        ruinAuthorized:A.authorized.includes('ruin'),
        ruinCandidate:rows.some(r=>r.id==='ruin'),
        marketRelevant:OASISRealityFlowTopology.relevantToPlace(S,P,'market'),
        ruinRelevant:OASISRealityFlowTopology.relevantToPlace(S,P,'ruin'),
        marketVotes:marketRow?.votes??null,
        ruinVotes:ruinRow?.votes??null,
        linkedHiddenReady:HIDDEN_LINK?hiddenReady(S,P,HIDDEN_LINK):null,
        linklessHiddenReady:HIDDEN_NO_LINK?hiddenReady(S,P,HIDDEN_NO_LINK):null
      };
    }

    const full=makeCase('full',[]);
    const noTopologyKey=makeCase('noTopologyKey',['flowTopologyKey']);
    const noEndpoints=makeCase('noEndpoints',['a','b']);
    const noPairKey=makeCase('noPairKey',['key']);
    const noPlaces=makeCase('noPlaces',['places']);
    const noTemporalProvenance=makeCase('noTemporalProvenance',['t','from']);
    const noRawRuns=makeCase('noRawRuns',['flowTopologyRuns']);

    const checks={
      controlFullyFunctional:full.activeCount===2&&full.ruinAuthorized&&full.ruinCandidate&&full.marketRelevant&&full.linkedHiddenReady,
      topologyKeyRequiredForReactivation:noTopologyKey.activeCount===0&&!noTopologyKey.ruinAuthorized&&!noTopologyKey.linkedHiddenReady,
      endpointsRequiredForGatedAuthority:noEndpoints.activeCount===2&&!noEndpoints.ruinAuthorized&&!noEndpoints.ruinRelevant,
      pairKeyRequiredForLinkedHiddenRelation:noPairKey.activeCount===2&&noPairKey.ruinAuthorized&&!noPairKey.linkedHiddenReady,
      placesRequiredForPublicPlaceRelation:noPlaces.activeCount===2&&noPlaces.ruinAuthorized&&!noPlaces.marketRelevant,
      temporalProvenanceNotUsedAfterAnnotation:noTemporalProvenance.activeCount===2&&noTemporalProvenance.ruinAuthorized&&noTemporalProvenance.marketRelevant&&noTemporalProvenance.linkedHiddenReady,
      rawRunsRedundantWhenTopologyKeyRetained:noRawRuns.activeCount===2&&noRawRuns.ruinAuthorized&&noRawRuns.marketRelevant&&noRawRuns.linkedHiddenReady
    };

    E=originalE;
    return{
      question:'After an episode has already been assigned a qualitative Reality Flow topology key, which stored relation fields are causally required for later reactivation in the current MVP3 mechanisms?',
      scope:'Post-annotation retention-witness ablation only. This does not prove a globally minimal memory representation, and it does not authorize deleting provenance needed for audit, reconstruction, re-annotation, or mechanisms not exercised here.',
      priorArtBoundary:'Memory consolidation/compression and graph/episodic representations are established prior art. The experiment tests which fields the present OASIS implementation actually consumes for delayed relation reactivation.',
      cases:{full,noTopologyKey,noEndpoints,noPairKey,noPlaces,noTemporalProvenance,noRawRuns},
      checks,
      interpretation:Object.values(checks).every(Boolean)
        ?'STAGE16_REACTIVATION_WITNESS_FIELDS_IDENTIFIED_FOR_CURRENT_MECHANISMS'
        :'STAGE16_REACTIVATION_WITNESS_ABLATION_INCONCLUSIVE'
    };
  });
  report.checks.noPageErrors=errors.length===0;report.errors=errors;
  console.log('\nSTAGE 16 — RELATION-PRESERVING RETENTION WITNESS ABLATION');console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.checks))assert(v,k);
  await writeFile('reality-flow-retention-witness-ablation-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
