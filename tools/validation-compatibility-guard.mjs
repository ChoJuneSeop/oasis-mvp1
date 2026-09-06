import { readFile } from 'node:fs/promises';

function assert(cond,msg){
  if(!cond) throw new Error(`VALIDATION COMPATIBILITY FAIL - ${msg}`);
  console.log(`PASS - ${msg}`);
}

const relation = await readFile('relation-field.js','utf8');
const browser = await readFile('tools/browser-world-test.mjs','utf8');
const openPossibility = await readFile('tools/open-possibility-flow-test.mjs','utf8');
const o1Aux = await readFile('tools/o1-order-long-horizon-paired-test.mjs','utf8');

// Canonical baseline constraints. These guards exist so auxiliary long-horizon
// experiments cannot silently rewrite the conditions under which earlier
// browser-world results were obtained.
assert(relation.includes("function pairKey(a,b){return [a,b].sort().join('↔')}"),
  'canonical relation-field identity remains order-insensitive at pairKey level');
assert(relation.includes('P.relationHistory.slice(-18)'),
  'canonical relation-field recombination still uses the last-18 relation window');
assert(relation.includes('P.relationField.episodes=P.relationField.episodes.slice(-80)'),
  'canonical relation-field still keeps the last-80 episode window');
assert(relation.includes('if(E.tick-ep.t>1200)return false'),
  'canonical relation-field reactivation still has the 1200-tick age window');
assert(browser.includes('const batches = 40'),
  'canonical matched browser-world experiment remains a 40 x run100 test');
assert(browser.includes("primaryContrast: 'OASIS-Full vs NoRelation'"),
  'canonical matched browser-world primary contrast remains Full vs NoRelation');
assert(openPossibility.includes('const STAGE_TICKS = 520'),
  'canonical open-possibility experiment retains 520 ticks per stage');

// The paired O1 long-horizon test must remain a self-contained synthetic
// feasibility test and must not patch/import the production relation field.
assert(!o1Aux.includes("relation-field.js") && !o1Aux.includes('pairKey('),
  'auxiliary O1 paired test remains isolated from production relation-field.js');

console.log('RESULT: canonical experiments and auxiliary operator experiments remain structurally separated.');
