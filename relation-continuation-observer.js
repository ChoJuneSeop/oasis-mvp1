(function(){
function orderedEvents(P,afterTick=null){
  return (P?.relationHistory||[])
    .filter(e=>afterTick==null||e.t>=afterTick)
    .map(e=>({t:e.t,npc:e.npc,place:e.place}));
}

function compressedSequence(P,afterTick=null){
  const out=[];
  for(const e of orderedEvents(P,afterTick)){
    const token={npc:e.npc,place:e.place};
    const last=out.at(-1);
    if(!last||last.npc!==token.npc||last.place!==token.place)out.push(token);
  }
  return out;
}

function signature(P,afterTick=null){
  return compressedSequence(P,afterTick).map(e=>`${e.npc}@${e.place}`).join('>');
}

function snapshot(P,afterTick=null){
  const events=orderedEvents(P,afterTick);
  const sequence=compressedSequence(P,afterTick);
  return{
    afterTick,
    events,
    sequence,
    signature:sequence.map(e=>`${e.npc}@${e.place}`).join('>'),
    currentRelationalEndpoint:sequence.at(-1)||null
  };
}

function timeBatches(P,afterTick=null){
  const byTime=new Map();
  for(const e of orderedEvents(P,afterTick)){
    if(!byTime.has(e.t))byTime.set(e.t,[]);
    byTime.get(e.t).push({npc:e.npc,place:e.place});
  }
  return [...byTime.entries()]
    .sort((a,b)=>a[0]-b[0])
    .map(([t,events])=>({
      t,
      events:[...events].sort((a,b)=>a.npc.localeCompare(b.npc)||a.place.localeCompare(b.place))
    }));
}

function batchedSignature(P,afterTick=null){
  return timeBatches(P,afterTick)
    .map(batch=>`[${batch.events.map(e=>`${e.npc}@${e.place}`).join('&')}]`)
    .join('>');
}

function batchedSnapshot(P,afterTick=null){
  const batches=timeBatches(P,afterTick);
  return{
    afterTick,
    batches,
    signature:batches.map(batch=>`[${batch.events.map(e=>`${e.npc}@${e.place}`).join('&')}]`).join('>'),
    currentRelationalFrontier:batches.at(-1)?.events||[]
  };
}

window.OASISRelationContinuation={
  orderedEvents,
  compressedSequence,
  signature,
  snapshot,
  timeBatches,
  batchedSignature,
  batchedSnapshot,
  principle:'observation only: preserve relational event order without granting decision or execution authority',
  batchedPrinciple:'observation only: preserve order across distinguishable timestamps while treating tied timestamps as unordered relational batches'
};
})();
