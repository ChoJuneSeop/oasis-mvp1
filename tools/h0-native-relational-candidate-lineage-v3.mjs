import { readFile, writeFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const SOURCE='tools/h0-native-relational-candidate-trace-v3.mjs';
const TEMP='tools/.h0-native-relational-candidate-lineage-run.mjs';
let src=await readFile(SOURCE,'utf8');
const from="if(traces.length<60&&(rec.candidates.length||rec.selectedDirectRelationalSupportIds.length))traces.push(clone(rec));";
const to="if(traces.length<60&&(rec.candidates.length||rec.selectedDirectRelationalSupportIds.length))traces.push(rec);";
if(!src.includes(from))throw new Error('H0 lineage patch target missing');
src=src.replace(from,to);
await writeFile(TEMP,src);
const child=spawn(process.execPath,[TEMP],{stdio:'inherit'});
const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',(c,s)=>resolve(c??(s?1:0)))});
await unlink(TEMP).catch(()=>{});
process.exit(code);
