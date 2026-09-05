import assert from 'node:assert/strict';
import { compareResponsibility, ResponsibilityCycleSegmenter } from './oasis-responsibility-cycle-v0.7.js';

const rho = (monitoring, search, verification, compute) => ({ monitoring, search, verification, compute });

assert.equal(compareResponsibility(rho(1,1,1,1), rho(1,2,1,1)), 'rise');
assert.equal(compareResponsibility(rho(2,3,2,4), rho(2,2,1,3)), 'fall');
assert.equal(compareResponsibility(rho(2,3,2,4), rho(3,2,2,4)), 'incomparable');

{
  const s = new ResponsibilityCycleSegmenter();
  s.ingest({ t:0, rho:rho(1,1,1,1) });
  const out = s.ingest({ t:1, rho:rho(1,2,1,1) });
  assert.equal(out.emittedEvents.length, 0);
  assert.equal(out.currentCycle.startedAt, 1);
}

{
  const s = new ResponsibilityCycleSegmenter();
  s.ingest({ t:0, rho:rho(1,1,1,1) });
  s.ingest({ t:1, rho:rho(2,2,2,2) });
  const out = s.ingest({ t:2, rho:rho(1,1,1,1) });
  assert.equal(out.emittedEvents.length, 0);
  assert.equal(out.currentCycle.troughAt, 2);
}

{
  const s = new ResponsibilityCycleSegmenter();
  s.ingest({ t:0, rho:rho(1,1,1,1) });
  s.ingest({ t:1, rho:rho(2,2,2,2), context:{relation:'fire-observed'} });
  s.ingest({ t:2, rho:rho(3,3,3,3), context:{judgment:'active'} });
  s.ingest({ t:3, rho:rho(2,2,2,2), context:{result:'settling'} });
  s.ingest({ t:4, rho:rho(1,1,1,1), context:{state:'low-activity'} });
  const out = s.ingest({ t:5, rho:rho(2,2,2,2), context:{relation:'new-demand'} });
  assert.equal(out.emittedEvents.length, 1);
  assert.equal(out.emittedEvents[0].closedAt, 4);
  assert.equal(out.emittedEvents[0].boundaryConfirmedAt, 5);
  assert.equal(out.currentCycle.startedAt, 5);
}

{
  const s = new ResponsibilityCycleSegmenter();
  s.ingest({ t:0, rho:rho(1,1,1,1) });
  s.ingest({ t:1, rho:rho(2,2,2,2) });
  s.ingest({ t:2, rho:rho(1,1,1,1) });
  s.ingest({ t:3, rho:rho(1,1,1,1) });
  const out = s.ingest({ t:4, rho:rho(1,2,1,1) });
  assert.equal(out.emittedEvents[0].closedAt, 3);
}

{
  const s = new ResponsibilityCycleSegmenter();
  s.ingest({ t:0, rho:rho(1,1,1,1) });
  s.ingest({ t:1, rho:rho(2,2,2,2) });
  const out = s.ingest({ t:1_000_000, rho:rho(2,2,2,2) });
  assert.equal(out.emittedEvents.length, 0);
}

{
  const s = new ResponsibilityCycleSegmenter();
  s.ingest({ t:0, rho:rho(1,1,1,1) });
  s.ingest({ t:1, rho:rho(2,2,2,2) });
  s.ingest({ t:2, rho:rho(1,1,1,1) });
  const out = s.ingest({ t:3, rho:rho(2,0,2,1) });
  assert.equal(out.movement, 'incomparable');
  assert.equal(out.emittedEvents.length, 0);
}

{
  const s = new ResponsibilityCycleSegmenter();
  const seq = [
    [0,rho(1,1,1,1)], [1,rho(2,2,2,2)], [2,rho(1,1,1,1)],
    [3,rho(2,2,2,2)], [4,rho(1,1,1,1)], [5,rho(2,2,2,2)]
  ];
  let out;
  for (const [t,r] of seq) out = s.ingest({t,rho:r});
  assert.deepEqual(out.history.map(e => e.eventId), ['e_1','e_2']);
  assert.deepEqual(out.history.map(e => e.closedAt), [2,4]);
}

{
  const s = new ResponsibilityCycleSegmenter();
  s.ingest({ t:0, rho:rho(1,1,1,1) });
  s.ingest({ t:1, rho:rho(2,2,2,2), context:{activeFlows:['A->B','B->fire']} });
  s.ingest({ t:2, rho:rho(1,1,1,1), context:{activeFlows:['A->B','B->fire']} });
  const out = s.ingest({ t:3, rho:rho(2,2,2,2), context:{activeFlows:['A->B','B->fire','C->A']} });
  const paths = out.emittedEvents[0].responsibilityPath.map(x => x.context?.activeFlows ?? []);
  assert.deepEqual(paths[0], ['A->B','B->fire']);
  assert.deepEqual(paths[1], ['A->B','B->fire']);
}

{
  const s = new ResponsibilityCycleSegmenter();
  s.ingest({ t:0, rho:rho(1,1,1,1) });
  s.ingest({ t:1, rho:rho(2,2,2,2), context:{relationStillActive:true} });
  s.ingest({ t:2, rho:rho(1,1,1,1), context:{relationStillActive:true} });
  const out = s.ingest({ t:3, rho:rho(2,2,2,2), context:{relationStillActive:true} });
  assert.equal(out.emittedEvents.length, 1);
  assert.equal(out.emittedEvents[0].closedAt, 2);
}

console.log('oasis-responsibility-cycle-v0.7: 12/12 tests passed');
