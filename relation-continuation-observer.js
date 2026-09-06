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

window.OASISRelationContinuation={
  orderedEvents,
  compressedSequence,
  signature,
  snapshot,
  principle:'observation only: preserve relational event order without granting decision or execution authority'
};
})();
