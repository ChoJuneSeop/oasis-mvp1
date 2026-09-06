(function(){
function topologyEdges(S){return S?.realityFlowTopology?.edges||[]}

function structuralCrossings(S){
  const edges=topologyEdges(S);
  if(!edges.length)return[];
  let origin=edges[0].from;
  let extreme=origin;
  let dir=0;
  const out=[];
  for(const e of edges){
    const x=e.to;
    if(dir===0){
      if(x>origin){dir=1;extreme=x}
      else if(x<origin){dir=-1;extreme=x}
      continue;
    }
    if(dir===1){
      if(x>=extreme){extreme=x;continue}
      if(x<origin){
        const priorOrigin=origin,priorExtreme=extreme;
        out.push({t:e.t,source:e.source||null,fromDir:1,toDir:-1,anchor:priorOrigin,priorExtreme,at:x});
        dir=-1;origin=priorExtreme;extreme=x;
      }
    }else{
      if(x<=extreme){extreme=x;continue}
      if(x>origin){
        const priorOrigin=origin,priorExtreme=extreme;
        out.push({t:e.t,source:e.source||null,fromDir:-1,toDir:1,anchor:priorOrigin,priorExtreme,at:x});
        dir=1;origin=priorExtreme;extreme=x;
      }
    }
  }
  return out;
}

function orderedRelationEvents(P){
  return (P?.relationHistory||[]).map((e,i)=>({...e,_order:i})).sort((a,b)=>(a.t-b.t)||(a._order-b._order));
}

function continuationAfter(P,crossing){
  if(!crossing)return{crossing:null,events:[],sequence:[],transitions:[],endpoint:null};
  const events=orderedRelationEvents(P).filter(e=>e.t>=crossing.t);
  const sequence=events.map(e=>e.npc);
  const transitions=[];
  for(let i=1;i<sequence.length;i++)transitions.push(`${sequence[i-1]}→${sequence[i]}`);
  return{
    crossing:{...crossing},
    events:events.map(({_order,...e})=>e),
    sequence,
    transitions,
    endpoint:sequence.at(-1)||null
  };
}

function witnesses(S,P){
  return structuralCrossings(S).map(c=>continuationAfter(P,c));
}

function firstDepartureWitness(S,P){
  const crossing=structuralCrossings(S)[0]||null;
  return continuationAfter(P,crossing);
}

window.OASISRelationContinuationWitness={
  structuralCrossings,
  continuationAfter,
  witnesses,
  firstDepartureWitness
};
})();
