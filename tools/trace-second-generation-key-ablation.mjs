import { readFile, writeFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const sourcePath='tools/trace-second-generation-reactivation.mjs';
const tempPath='tools/__generated-second-generation-key-ablation.mjs';
let src=await readFile(sourcePath,'utf8');
src=src.replace('const PORT=4180;','const PORT=4182;');
src=src.replaceAll('second-generation-reactivation-report.json','second-generation-key-ablation-report.json');

const needle=`      if(groupDiff||individual.length){
        decisionContributions.push({tick:E.tick,party:P.id,targetBefore:P.target,currentPlace:currentPlace(P),danger:S.danger,relevantTracked:relevant.map(x=>x.id),full:full.sig,withoutTracked:withoutTracked.sig,groupDiff,individual});
      }`;
const replacement=`      if(groupDiff||individual.length){
        const relevantKeys=[...new Set(relevant.map(x=>x.key))];
        const keyAblations=[];
        for(let mask=1;mask<(1<<relevantKeys.length);mask++){
          const removedKeys=relevantKeys.filter((_,i)=>mask&(1<<i));
          const removedSet=new Set(removedKeys);
          const x=evalFiltered(P,ep=>!(ids.has(epId(ep))&&removedSet.has(ep.key)));
          if(changedSig(full.sig,x.sig))keyAblations.push({removedKeys,without:x.sig});
        }
        decisionContributions.push({tick:E.tick,party:P.id,targetBefore:P.target,currentPlace:currentPlace(P),danger:S.danger,relevantTracked:relevant.map(x=>x.id),relevantKeys,full:full.sig,withoutTracked:withoutTracked.sig,groupDiff,individual,keyAblations});
      }`;
if(!src.includes(needle))throw new Error('decision diagnostic patch target not found');
src=src.replace(needle,replacement);
await writeFile(tempPath,src);
const child=spawn(process.execPath,[tempPath],{stdio:'inherit'});
const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',c=>resolve(c??1));});
await unlink(tempPath).catch(()=>{});
if(code!==0)process.exit(code);
