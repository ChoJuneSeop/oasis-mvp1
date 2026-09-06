import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const BASE='tools/latent-relation-shadow-gate-comparison.mjs';
const TMP='tools/.tmp-latent-relation-responsibility-flow-shadow-pilot.mjs';
let src=await readFile(BASE,'utf8');
src=src
  .replace("const PORT=4192, MAX_TICK=30000, CHUNK=1000;","const PORT=4195, MAX_TICK=30000, CHUNK=1000;")
  .replace("const REPORT_FILE='latent-relation-shadow-gate-comparison-report.json';","const REPORT_FILE='latent-relation-responsibility-flow-shadow-pilot-report.json';")
  .replace("const names=['broad','rawBridge','completedProcess','exactProvenance'];","const names=['broad','rawBridge','completedProcess','exactProvenance','responsibilityFlow'];")
  .replace("G.byParty.set(P.id,{active:new Set(),lastExit:new Map()})","G.byParty.set(P.id,{active:new Set(),lastExit:new Map(),lastDanger:null,risingEvaluations:0,nonRisingEvaluations:0})");

const a=src.indexOf('    function gateIds(name,P,retrieved){');
const b=src.indexOf('    function evalIds(P,ids){');
if(a<0||b<0||b<=a)throw new Error('gateIds block not found');
const gateFn=`    function gateIds(name,P,retrieved){
      const st=stateFor(name,P),prev=new Set(st.active),now=new Set(),here=I.currentPlace(P),target=P.target,gate=places[target]?.gate;
      const historyByT=new Map(P.relationHistory.map(r=>[r.t,r]));
      const qs=P.relationField?.episodes||[];
      const sinceFor=(id,ep)=>st.lastExit.get(id)??ep.t;
      const completedEligible=(ep,since)=>{const oldEnds=new Set([ep.a,ep.b]);for(let i=qs.length-1;i>=0;i--){const q=qs[i];if((q.t??-1)<=since)break;const shared=oldEnds.has(q.a)||oldEnds.has(q.b);if(shared&&currentEpisode(P,q))return true}return false};
      const exactEligible=(ep,since)=>{const oldEnds=new Set([ep.a,ep.b]);for(let i=qs.length-1;i>=0;i--){const q=qs[i];if((q.t??-1)<=since)break;if(!oldEnds.has(q.a)||oldEnds.has(q.b))continue;const sourceT=q.from?.[1];if(!(sourceT>since))continue;const r=historyByT.get(sourceT);if(!r||r.npc!==q.b)continue;if(r.place===here||r.place===target||(gate&&r.npc===gate))return true}return false};
      const rising=name==='responsibilityFlow'&&st.lastDanger!=null&&S.danger>st.lastDanger;
      if(name==='responsibilityFlow'){if(rising)st.risingEvaluations++;else st.nonRisingEvaluations++}
      if(name==='broad'){for(const x of retrieved)now.add(x.id)}
      else for(const x of retrieved){
        const {id,ep}=x,d=direct(P,ep);let admitted=false;
        if(prev.has(id))admitted=d;
        else if(d){const since=sinceFor(id,ep);
          if(name==='rawBridge'){
            for(let i=P.relationHistory.length-1;i>=0;i--){const r=P.relationHistory[i];if((r.t??-1)<=since)break;if(r.npc===ep.a||r.npc===ep.b||ep.places.includes(r.place)||(gate&&r.npc===gate)){admitted=true;break}}
          }else if(name==='completedProcess')admitted=completedEligible(ep,since);
          else if(name==='exactProvenance')admitted=exactEligible(ep,since);
          else if(name==='responsibilityFlow')admitted=rising?completedEligible(ep,since):exactEligible(ep,since);
        }
        if(admitted)now.add(id);
      }
      const stats=gateState[name].stats;
      for(const id of now)if(!prev.has(id))stats.entries++;
      for(const id of prev)if(!now.has(id)){stats.exits++;st.lastExit.set(id,E.tick)}
      st.active=now;if(name==='responsibilityFlow')st.lastDanger=S.danger;stats.evaluations++;stats.activeEpisodeSum+=now.size;stats.maxActive=Math.max(stats.maxActive,now.size);
      return [...now];
    }
`;
src=src.slice(0,a)+gateFn+src.slice(b);
src=src.replace("shadowGates:['broad','rawBridge','completedProcess','exactProvenance']","shadowGates:['broad','rawBridge','completedProcess','exactProvenance','responsibilityFlow']");
src=src.replace("  for(const [name,s] of Object.entries(final.gates)){if(s.evaluations<=0)throw new Error(`no evaluations ${name}`);if(s.entries<=0)throw new Error(`no entries ${name}`)}","  for(const [name,s] of Object.entries(final.gates)){if(s.evaluations<=0)throw new Error(`no evaluations ${name}`);if(s.entries<=0)throw new Error(`no entries ${name}`)}\n  const f=final.gates.responsibilityFlow,e=final.gates.exactProvenance,c=final.gates.completedProcess,r=final.gates.rawBridge;\n  console.log('RESPONSIBILITY-FLOW '+JSON.stringify({flow:f,exact:e,completed:c,raw:r}));\n  if(f.choiceDiffs<=e.choiceDiffs)throw new Error('responsibility flow did not improve exact choice coverage');\n  if(f.meanActive>=c.meanActive)throw new Error('responsibility flow did not reduce completed active load');\n  if(f.choiceYield<=r.choiceYield)throw new Error('responsibility flow choice yield did not exceed raw bridge');");
if(!src.includes('responsibilityFlow'))throw new Error('responsibility-flow transform failed');
await writeFile(TMP,src);
const child=spawn(process.execPath,[TMP],{stdio:'inherit',cwd:process.cwd()});
const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)});
if(code!==0)process.exit(code??1);
