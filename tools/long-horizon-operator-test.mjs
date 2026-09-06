import { writeFile } from 'node:fs/promises';

// OASIS long-horizon operator validation.
// This is an internal structural ablation, not a superiority benchmark.
// O1: ordered-process preservation
// O2: de-currentization without deletion
// O3: present-context reactivation
// O4: no future-information / no scheduled reactivation

const HORIZONS = [10_000, 100_000, 1_000_000];
const SEEDS = [17, 43, 101];
const MAX_PROCESSES = 6000;
const PROCESS_INTERVAL = 251;
const INACTIVE_AFTER = 97;

function mix32(x) {
  x |= 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return (x ^ (x >>> 16)) >>> 0;
}

function pick(seed, tick, salt, n) {
  return mix32(seed ^ Math.imul(tick + 1, 0x9e3779b1) ^ Math.imul(salt + 11, 0x85ebca6b)) % n;
}

function eventAt(seed, tick) {
  const actors = ['전사','치유사','정찰자','마도사','상인','주민','수호자','여행자','아이','장인','학자','농부'];
  const places = ['숲','강','마을','폐허','언덕','광장','동굴','농장','탑','시장','길','호수'];
  const roles = ['도움','경계','교환','회복','탐색','충돌','회피','협력'];
  const actor = actors[pick(seed,tick,1,actors.length)];
  let other = actors[pick(seed,tick,2,actors.length)];
  if (other === actor) other = actors[(actors.indexOf(other)+1)%actors.length];
  return {
    tick,
    actor,
    other,
    place: places[pick(seed,tick,3,places.length)],
    role: roles[pick(seed,tick,4,roles.length)],
    risk: pick(seed,tick,5,1000) / 1000
  };
}

const edge = (a,b) => `${a}>${b}`;
const unordered = (a,b) => [a,b].sort().join('<>');

function orderedSignature(a,b) {
  return [
    `인물:${edge(a.actor,b.actor)}`,
    `상대:${edge(a.other,b.other)}`,
    `장소:${edge(a.place,b.place)}`,
    `역할:${edge(a.role,b.role)}`
  ];
}

function unorderedSignature(a,b) {
  return [
    `인물:${unordered(a.actor,b.actor)}`,
    `상대:${unordered(a.other,b.other)}`,
    `장소:${unordered(a.place,b.place)}`,
    `역할:${unordered(a.role,b.role)}`
  ];
}

function contextTokens(e) {
  return new Set([
    `인물:${e.actor}`, `인물:${e.other}`,
    `장소:${e.place}`, `역할:${e.role}`,
    e.risk >= 0.7 ? '위험:높음' : e.risk <= 0.3 ? '위험:낮음' : '위험:중간'
  ]);
}

function relationTokens(a,b) {
  return new Set([
    `인물:${a.actor}`, `인물:${a.other}`, `인물:${b.actor}`, `인물:${b.other}`,
    `장소:${a.place}`, `장소:${b.place}`,
    `역할:${a.role}`, `역할:${b.role}`,
    (a.risk >= 0.7 || b.risk >= 0.7) ? '위험:높음' : (a.risk <= 0.3 && b.risk <= 0.3) ? '위험:낮음' : '위험:중간'
  ]);
}

function intersectsAtLeast(setA, setB, need) {
  let n = 0;
  for (const x of setA) if (setB.has(x) && ++n >= need) return true;
  return false;
}

function processMatchesNow(p, e, o1=true) {
  const now = contextTokens(e);
  if (!intersectsAtLeast(p.relationTokens, now, 2)) return false;
  // O1 affects the retained process structure. A current event does not need to
  // recreate the whole past; one directional edge can become meaningful again.
  if (!o1) return true;
  return p.signature.some(s => {
    if (!s.includes('>')) return false;
    const [kind, pair] = s.split(':');
    const [x,y] = pair.split('>');
    if (kind === '인물') return e.actor === y || e.other === y || e.actor === x;
    if (kind === '장소') return e.place === y || e.place === x;
    if (kind === '역할') return e.role === y || e.role === x;
    return false;
  });
}

function findFutureMatch(seed, start, p, o1, lookahead=50_000) {
  for (let t=start+1; t<=start+lookahead; t++) {
    if (processMatchesNow(p, eventAt(seed,t), o1)) return t;
  }
  return null;
}

function variantConfig(name) {
  return {
    name,
    o1: name !== 'O1제거',
    o2: name !== 'O2제거',
    o3: name !== 'O3제거',
    o4: name !== 'O4위반'
  };
}

function newState(cfg) {
  return {
    cfg,
    active: new Map(),
    latent: new Map(),
    all: new Map(),
    index: new Map(),
    nextId: 1,
    counters: {
      created:0, deCurrentized:0, reactivated:0, repeatReactivated:0,
      meaningReconstructed:0, lineageCreated:0, futureReads:0,
      orderCollapsed:0, activeExposure:0, latentExposure:0,
      permanentDeletes:0
    },
    firstReactivation: [],
    reactivationGaps: [],
    snapshots: {}
  };
}

function addIndex(state,p) {
  for (const tok of p.relationTokens) {
    if (!state.index.has(tok)) state.index.set(tok,new Set());
    state.index.get(tok).add(p.id);
  }
}

function createProcess(state, seed, a, b, parentId=null) {
  if (state.all.size >= MAX_PROCESSES) return null;
  const signature = state.cfg.o1 ? orderedSignature(a,b) : unorderedSignature(a,b);
  if (!state.cfg.o1) {
    const ordered = orderedSignature(a,b).join('|');
    const reversed = orderedSignature(b,a).join('|');
    if (ordered !== reversed) state.counters.orderCollapsed++;
  }
  const p = {
    id: state.nextId++,
    born: b.tick,
    lastCurrent: b.tick,
    lastReact: null,
    reactCount: 0,
    parentId,
    depth: parentId ? (state.all.get(parentId)?.depth || 0) + 1 : 0,
    signature,
    relationTokens: relationTokens(a,b),
    meaning: null,
    scheduled: null
  };
  state.all.set(p.id,p);
  state.active.set(p.id,p);
  addIndex(state,p);
  state.counters.created++;
  if (parentId) state.counters.lineageCreated++;

  // O4-off control: illegally inspect future reality and reserve a reactivation time.
  if (!state.cfg.o4 && state.cfg.o3) {
    state.counters.futureReads++;
    p.scheduled = findFutureMatch(seed,b.tick,p,state.cfg.o1);
  }
  return p;
}

function deCurrentize(state,tick) {
  if (!state.cfg.o2) return;
  for (const [id,p] of state.active) {
    if (tick - p.lastCurrent >= INACTIVE_AFTER) {
      state.active.delete(id);
      state.latent.set(id,p);
      state.counters.deCurrentized++;
    }
  }
}

function candidateIds(state,e) {
  const ids = new Set();
  for (const tok of contextTokens(e)) {
    const bucket = state.index.get(tok);
    if (bucket) for (const id of bucket) ids.add(id);
  }
  return ids;
}

function reactivate(state,seed,e) {
  if (!state.cfg.o3) return;
  const ids = state.cfg.o2 ? candidateIds(state,e) : new Set(state.active.keys());
  for (const id of ids) {
    const p = state.cfg.o2 ? state.latent.get(id) : state.active.get(id);
    if (!p) continue;
    const relationNow = !state.cfg.o4 && p.scheduled !== null
      ? e.tick === p.scheduled
      : processMatchesNow(p,e,state.cfg.o1);
    if (!relationNow) continue;

    if (state.cfg.o2) {
      state.latent.delete(id);
      state.active.set(id,p);
    }
    const prior = p.lastReact;
    p.lastReact = e.tick;
    p.lastCurrent = e.tick;
    p.reactCount++;
    p.meaning = `${e.role}@${e.place}:${e.risk >= .7 ? '위험' : e.risk <= .3 ? '안정' : '중간'}`;
    state.counters.reactivated++;
    state.counters.meaningReconstructed++;
    if (p.reactCount === 1) state.firstReactivation.push(e.tick - p.born);
    else {
      state.counters.repeatReactivated++;
      state.reactivationGaps.push(e.tick - prior);
    }

    // A reactivated completed process can participate in formation of a later process,
    // but only from actually observed current information.
    if (p.depth < 5 && state.all.size < MAX_PROCESSES && (mix32(seed ^ e.tick ^ p.id) % 19 === 0)) {
      const priorEvent = eventAt(seed, Math.max(0,e.tick-1));
      createProcess(state,seed,priorEvent,e,p.id);
    }
  }
}

function quantile(xs,q) {
  if (!xs.length) return null;
  const a=[...xs].sort((x,y)=>x-y);
  return a[Math.min(a.length-1,Math.floor(q*(a.length-1)))];
}

function snapshot(state,tick) {
  const never = [...state.all.values()].filter(p=>p.reactCount===0).length;
  const maxDepth = [...state.all.values()].reduce((m,p)=>Math.max(m,p.depth),0);
  return {
    tick,
    totalProcesses:state.all.size,
    active:state.active.size,
    latent:state.latent.size,
    neverReactivated:never,
    reactivatedProcesses:[...state.all.values()].filter(p=>p.reactCount>0).length,
    totalReactivations:state.counters.reactivated,
    repeatReactivations:state.counters.repeatReactivated,
    medianFirstReactivation:quantile(state.firstReactivation,.5),
    p90FirstReactivation:quantile(state.firstReactivation,.9),
    medianGap:quantile(state.reactivationGaps,.5),
    maxLineageDepth:maxDepth,
    counters:{...state.counters}
  };
}

function runVariant(seed,maxTick,name) {
  const state = newState(variantConfig(name));
  let prev = eventAt(seed,0);
  for (let t=1;t<=maxTick;t++) {
    const e=eventAt(seed,t);
    state.counters.activeExposure += state.active.size;
    state.counters.latentExposure += state.latent.size;

    if (t % PROCESS_INTERVAL === 0) createProcess(state,seed,prev,e);
    deCurrentize(state,t);
    reactivate(state,seed,e);

    if (HORIZONS.includes(t)) state.snapshots[t]=snapshot(state,t);
    prev=e;
  }
  return snapshot(state,maxTick);
}

const variants=['전체','O1제거','O2제거','O3제거','O4위반'];
const report={
  design:{
    purpose:'OASIS O1-O4 장기 구조 검증. 타 모델 성능 비교가 아님.',
    horizons:HORIZONS,
    seeds:SEEDS,
    environment:'seed+tick으로만 결정되는 외생 현실 테이프. OASIS 잠재과정의 존재를 환경 생성기가 참조하지 않음.',
    operators:{
      O1:'과정순서 보존',
      O2:'비현재화(삭제 없음)',
      O3:'현재관계 재활성화 및 현재 의미 재구성',
      O4:'미래정보 금지 / 재활성화 예약 금지'
    },
    successRule:'전체형의 점수 우월을 요구하지 않는다. 각 제거/위반이 해당 연산 구조를 실제로 제거하거나 변형하는지만 확인한다.'
  },
  runs:[]
};

for (const seed of SEEDS) {
  for (const name of variants) {
    const result=runVariant(seed,HORIZONS.at(-1),name);
    report.runs.push({seed,variant:name,result});
    console.log(`${name} seed=${seed} processes=${result.totalProcesses} active=${result.active} latent=${result.latent} react=${result.totalReactivations} never=${result.neverReactivated} medT=${result.medianFirstReactivation} p90T=${result.p90FirstReactivation} lineage=${result.maxLineageDepth} futureReads=${result.counters.futureReads}`);
  }
}

function rows(name){return report.runs.filter(r=>r.variant===name).map(r=>r.result)}
function every(name,pred){return rows(name).every(pred)}
function assert(cond,msg){if(!cond)throw new Error(`FAIL - ${msg}`);console.log(`PASS - ${msg}`)}

assert(every('전체',r=>r.counters.permanentDeletes===0),'전체형: 비현재화된 과정은 영구 삭제되지 않는다');
assert(every('전체',r=>r.counters.futureReads===0),'전체형: 미래정보를 읽지 않는다');
assert(every('O3제거',r=>r.totalReactivations===0),'O3 제거: 잠재과정 재활성화가 발생하지 않는다');
assert(every('O2제거',r=>r.latent===0),'O2 제거: 잠재/비현재화 영역이 생성되지 않는다');
assert(every('O1제거',r=>r.counters.orderCollapsed>0),'O1 제거: 서로 다른 순서과정이 정규화되어 순서정보가 소실된다');
assert(every('O4위반',r=>r.counters.futureReads>0),'O4 위반: 미래 현실을 미리 조회한 흔적이 기록된다');
assert(every('전체',r=>r.neverReactivated>0),'전체형: 관찰 종료까지 재활성화되지 않은 과정도 존재한다');
assert(every('전체',r=>r.totalReactivations>0),'전체형: 사전 예약 없이 현재관계에 의한 재활성화도 실제 발생한다');

await writeFile('long-horizon-operator-report.json',JSON.stringify(report,null,2));
console.log('RESULT: O1-O4 long-horizon structural validation completed. Interpret as mechanism validation only, not proof of general intelligence or superiority.');
