import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const base=path.join(here,'prehistoric-headless-v4.mjs');
const temp=path.join(here,'.prehistoric-headless-v4-human.tmp.mjs');
let src=fs.readFileSync(base,'utf8');
src=src.replace("'prehistoric-cooperation-v4.js']","'prehistoric-cooperation-v4.js','prehistoric-human-substrate-v4.js']");
fs.writeFileSync(temp,src);
const r=spawnSync(process.execPath,[temp],{stdio:'inherit'});
try{fs.unlinkSync(temp)}catch{}
process.exit(r.status??1);
