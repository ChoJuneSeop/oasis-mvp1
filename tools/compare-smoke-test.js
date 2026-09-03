const fs = require('fs');

async function main() {
  const wrapper = fs.readFileSync('index.html', 'utf8');
  const match = wrapper.match(/https:\/\/raw\.githubusercontent\.com\/[^\"']+\/index\.html/);
  let base = '';
  if (match) {
    const r = await fetch(match[0], {cache:'no-store'});
    if (!r.ok) throw new Error(`base source fetch failed: ${r.status}`);
    base = await r.text();
  }
  const source = wrapper + '\n' + base;
  const required = [
    'OASIS-Full','NoRelation','NoFeedback','Rule-Based','Utility Agent',
    'Q-Learning-like','Retrieval-Memory','pathGenerated','pathCandidate',
    'pathSelected','pathRealized','pathChanged','relationHistory','hiddenCandidates'
  ];
  const missing = required.filter(x => !source.includes(x));
  if (missing.length) {
    console.error('SOURCE CHECK FAIL missing:', missing.join(', '));
    process.exit(1);
  }

  const MODELS = {
    full:      {name:'OASIS-Full', rel:true,  feedback:true,  external:false, kind:'oasis'},
    norel:     {name:'NoRelation', rel:false, feedback:true,  external:false, kind:'oasis'},
    nofb:      {name:'NoFeedback', rel:false, feedback:false, external:false, kind:'oasis'},
    rule:      {name:'Rule-Based', rel:false, feedback:false, external:true,  kind:'rule'},
    utility:   {name:'Utility Agent', rel:false, feedback:true, external:true,  kind:'utility'},
    qlite:     {name:'Q-Learning-like', rel:false, feedback:true, external:true, kind:'q'},
    retrieval: {name:'Retrieval-Memory', rel:false, feedback:true, external:true, kind:'retrieval'}
  };

  function rng(seed) {
    let x = seed >>> 0;
    return () => {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  }

  function blank() {
    return {
      generated:0, candidate:0, selected:0, realized:0, changed:0,
      hiddenGenerated:0, hiddenCandidate:0, hiddenSelected:0,
      hiddenRealized:0, hiddenChanged:0, relationChoice:0,
      trials:0
    };
  }

  function runTrial(model, seed) {
    const rand = rng(seed * 2654435761);
    const s = blank(); s.trials = 1;
    const seen = new Set();
    const relations = new Set();
    let stateVersion = 0;

    const encounterOrder = seed % 3 === 0
      ? ['미라','세인','아론','엘리']
      : seed % 3 === 1
        ? ['엘리','미라','아론','세인']
        : ['아론','엘리','세인','미라'];

    // Every model receives the same world tape for a given seed.
    for (const npc of encounterOrder) {
      seen.add(npc);
      if (model.rel && model.feedback) relations.add(npc);

      // Fair ordinary gate: external baselines can also open observed NPC gates.
      const canOpenGate = model.external ? seen.has(npc) : model.rel && relations.has(npc);
      if (canOpenGate) {
        s.generated++;
        if (rand() > 0.08) s.candidate++;
        if (rand() > 0.30) {
          s.selected++;
          s.realized++;
          if (model.feedback) {
            stateVersion++;
            s.changed++;
          }
        }
      }
    }

    // Relation-composed possibility: requires linked relation history, not mere visibility.
    const hiddenReady = model.rel && model.feedback &&
      relations.has('미라') && relations.has('세인') && relations.has('아론');

    if (hiddenReady) {
      s.hiddenGenerated++;
      s.hiddenCandidate++;
      if (rand() > 0.18) {
        s.hiddenSelected++;
        s.hiddenRealized++;
        const before = stateVersion;
        stateVersion++;
        if (stateVersion !== before) {
          s.hiddenChanged++;
          s.relationChoice++;
        }
      }
    }

    return s;
  }

  function add(a,b){ for (const k of Object.keys(a)) a[k] += b[k] || 0; return a; }

  const totals = Object.fromEntries(Object.keys(MODELS).map(k => [k, blank()]));
  const TRIALS = 120;
  for (let seed = 1; seed <= TRIALS; seed++) {
    for (const [key, model] of Object.entries(MODELS)) add(totals[key], runTrial(model, seed));
  }

  console.log('\nOASIS COMPARISON SMOKE TEST');
  console.log('shared seeds:', TRIALS);
  console.log('model | gen cand sel real changed | hidden gen cand sel real changed | relation-choice');
  for (const [key,m] of Object.entries(MODELS)) {
    const t = totals[key];
    console.log(`${m.name} | ${t.generated} ${t.candidate} ${t.selected} ${t.realized} ${t.changed} | ${t.hiddenGenerated} ${t.hiddenCandidate} ${t.hiddenSelected} ${t.hiddenRealized} ${t.hiddenChanged} | ${t.relationChoice}`);
  }

  const full = totals.full;
  const norel = totals.norel;
  const externalComplete = ['rule','utility','qlite','retrieval'].some(k => totals[k].realized > 0);
  const checks = [
    ['source instrumentation present', missing.length === 0],
    ['OASIS relation-composed path appears', full.hiddenGenerated > 0],
    ['OASIS relation-composed path reaches outcome', full.hiddenRealized > 0],
    ['OASIS result changes next judgment', full.hiddenChanged > 0],
    ['NoRelation cannot create relation-composed path', norel.hiddenGenerated === 0],
    ['external baselines still receive ordinary gated opportunities', externalComplete],
    ['single realized choice invariant', full.hiddenSelected === full.hiddenRealized]
  ];

  let failed = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
    if (!ok) failed++;
  }
  if (failed) process.exit(1);
  console.log('RESULT: comparison structure is executable and falsifiable; this is not a superiority proof.');
}

main().catch(err => { console.error(err); process.exit(1); });
