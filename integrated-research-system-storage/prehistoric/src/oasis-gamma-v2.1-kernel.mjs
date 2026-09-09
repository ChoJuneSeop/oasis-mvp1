import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { OASISMathKernelV1CanonicalMemorySafe as Canonical } from './oasis-math-kernel-v1.2-memory-safe.mjs';
import { OASISGammaV2Kernel, buildHistoricalProcessBridgeCandidatesV2, GammaV2TestHelpers as H } from './oasis-gamma-v2-kernel.mjs';

const clone = x => structuredClone(x);
const hash = x => createHash('sha256').update(x).digest('hex');
const bridge = p => p.trace?.source === 'gamma-v2-historical-process-bridge';
const depths = ps => ps.map(p => p.sigma.length).sort((a,b) => a-b);
const keyed = ps => {
  const m = new Map(ps.map(p => [p.id,p]));
  assert.equal(m.size, ps.length, 'DUPLICATE_CANDIDATE_ID');
  return m;
};

export function bundle(kernel, observation, budget, round = 0) {
  const pre = {current: observation.participants.filter(p => p.available !== false).map(clone), historical: [], affectedEntities: clone(observation.entities)};
  const activeRelations = kernel.gamma(observation, pre);
  const participation = kernel.deriveParticipation(observation, activeRelations);
  const primitives = kernel.instantiateCapabilities(observation, participation, activeRelations, budget);
  const possibilities = kernel.omega(observation, participation, activeRelations, budget);
  const kappaById = Object.fromEntries(possibilities.map(p => [p.id,kernel.kappa(p)]));
  const psiById = Object.fromEntries(possibilities.map(p => [p.id,kernel.psi(p,kappaById[p.id],observation,participation)]));
  const responsibilityById = Object.fromEntries(possibilities.map(p => [p.id,kernel.responsibilityFor(p,observation,activeRelations,participation)]));
  const life = kernel.applyLifeConstraint(possibilities,{observation,participation,activeRelations,responsibilityById});
  const distribution = kernel.distribution(possibilities,possibilities.map(p => psiById[p.id]));
  return {historyRelations:clone(kernel.state.historyRelations),activeRelations,participation,primitives,possibilities,kappaById,psiById,responsibilityById,life,
    choiceInput:{admissible:life.admissible,distribution,responsibilityById,observation,participation,activeRelations,round}};
}

export function assertCommon(on, off) {
  for (const field of ['historyRelations','activeRelations','participation','primitives']) assert.deepStrictEqual(on[field],off[field],field);
  const canonical = on.possibilities.filter(p => !bridge(p));
  assert.deepStrictEqual(canonical,off.possibilities,'CANONICAL_OMEGA_EQUALITY');
  const a = keyed(on.possibilities), b = keyed(off.possibilities);
  for (const [id,p] of b) {
    assert(a.has(id),'G1_UNEXPECTED_CANDIDATE');
    for (const field of ['A_c','R_c','B_c','sigma','K_c']) assert.deepStrictEqual(a.get(id)[field],p[field],field);
    assert.deepStrictEqual(a.get(id),p,'COMMON_CANDIDATE');
    for (const field of ['kappaById','psiById','responsibilityById']) assert.deepStrictEqual(on[field][id],off[field][id],field);
    const lifeFor = v => ({admissible:v.life.admissible.filter(x => x.id===id),rejected:v.life.rejected.filter(x => x.possibilityId===id)});
    assert.deepStrictEqual(lifeFor(on),lifeFor(off),'LIFE_EQUALITY');
  }
  assert(on.possibilities.filter(p => !b.has(p.id)).every(bridge),'ONLY_HISTORICAL_EXTRAS');
  for (const field of ['observation','participation','activeRelations','round']) assert.deepStrictEqual(on.choiceInput[field],off.choiceInput[field],`CHOICE_${field}`);
  for (const field of ['admissible']) assert.deepStrictEqual(on.choiceInput[field].filter(p=>b.has(p.id)),off.choiceInput[field],`CHOICE_${field}`);
  const projectResponsibility = x => Object.fromEntries([...b.keys()].map(id=>[id,x.choiceInput.responsibilityById[id]]));
  assert.deepStrictEqual(projectResponsibility(on),projectResponsibility(off),'CHOICE_RESPONSIBILITY');
  // The original softmax is retained. Check every actual probability against its
  // own unchanged formula; common intrinsic weights above must be exactly equal.
  for (const v of [on,off]) {
    const values=v.possibilities.map(p=>v.psiById[p.id]);
    const max=Math.max(...values), weights=values.map(x=>Math.exp(x-max)), total=weights.reduce((x,y)=>x+y,0);
    assert.deepStrictEqual(v.choiceInput.distribution,v.possibilities.map((p,i)=>({possibilityId:p.id,probability:weights[i]/total})),'CHOICE_NORMALIZATION');
  }
  return {pass:true,commonCandidateCount:b.size,historicalExtraCount:a.size-b.size,normalizedProbabilityEqualityRequired:false};
}

export class OASISGammaV21Kernel extends OASISGammaV2Kernel {
  constructor(options={}) { super(options); this.auditOptions=options; this.auditCount=0; }
  bridgeMode() { return 'G0'; }
  omega(observation, participation, activeRelations, budget) {
    this.auditBudget=clone(budget);
    const canonical = Canonical.prototype.omega.call(this,observation,participation,activeRelations,budget);
    const mode=this.gammaV2InterventionActive ? this.bridgeMode() : 'G0';
    const steps=this.instantiateCapabilities(observation,participation,activeRelations,budget);
    let extras=[];
    let historical=[];
    if(mode!=='G1') {
      const history=mode==='G2' ? activeRelations.map(record=>({...clone(record),sourceSigmaActions:H.deterministicScramble(record.sourceSigmaActions??[],record.occurrenceId)})) : activeRelations;
      if(mode==='G2') for(let i=0;i<history.length;i++) {
        const {sourceSigmaActions:oldActions,...oldRest}=activeRelations[i];
        const {sourceSigmaActions:newActions,...newRest}=history[i];
        assert.deepStrictEqual(oldRest,newRest,'G2_RELATION_PARTICIPANT_PARITY');
        assert.deepStrictEqual([...(oldActions??[])].sort(),[...newActions].sort(),'G2_ACTION_MULTISET');
      }
      historical=buildHistoricalProcessBridgeCandidatesV2({observation,activeRelations:history,steps,canonicalPossibilities:canonical});
      extras=historical;
    }
    if(mode==='G3') {
      const pool=H.buildShamPool({observation,activeRelations,steps,canonicalPossibilities:canonical})
        .sort((a,b)=>hash(H.sigmaSignature(a)).localeCompare(hash(H.sigmaSignature(b)))||H.sigmaSignature(a).localeCompare(H.sigmaSignature(b)));
      const assess=p=>this.applyLifeConstraint([p],{observation,participation,activeRelations,responsibilityById:{[p.id]:this.responsibilityFor(p,observation,activeRelations,participation)}}).admissible.length===1;
      const used=new Set();
      extras=historical.map(target=>{
        const p=pool.find(p=>!used.has(p.id)&&p.sigma.length===target.sigma.length&&assess(p)===assess(target));
        assert(p,'SHAM_MATCH_NOT_AVAILABLE');
        used.add(p.id); return p;
      });
      assert.deepStrictEqual(depths(extras),depths(historical),'SHAM_DEPTH_MATCH');
      assert.deepStrictEqual(depths(extras.filter(assess)),depths(historical.filter(assess)),'SHAM_ADMISSIBLE_MATCH');
      assert(extras.every(p=>H.canStartStep(p.sigma[0],observation)&&H.canFollowByPhysicalPrerequisites(...p.sigma,observation)),'SHAM_PHYSICS');
      const forbidden=new Set(activeRelations.filter(r=>r.recurrenceRoute==='R').flatMap(r=>H.orderedPairs(r.sourceSigmaActions??[]).map(p=>JSON.stringify(p))));
      assert(extras.every(p=>!forbidden.has(JSON.stringify(p.sigma.map(s=>s.action)))),'SHAM_ADJACENCY');
    }
    this.lastGammaV2Diagnostics={activeRelationCount:activeRelations.length,canonicalPossibilityCount:canonical.length,historicalBridgeCandidateCount:historical.length,
      shamMatchAvailable:mode==='G3'?true:null,shamTargetCount:mode==='G3'?historical.length:null,shamReturnedCount:mode==='G3'?extras.length:null};
    return [...canonical,...extras].map(clone);
  }
  choiceAxis(input) {
    if(this.gammaV2InterventionActive) {
      const make=K=>{const k=new K(this.auditOptions);k.state=clone(this.state);k.setGammaV2Intervention(true);return k;};
      const before=clone(this.state);
      const on=bundle(make(OASISGammaV21Kernel),input.observation,this.auditBudget,input.round);
      const off=bundle(make(OASISGammaV21OffKernel),input.observation,this.auditBudget,input.round);
      const report=assertCommon(on,off);
      const expected=this.bridgeMode()==='G0'?on:this.bridgeMode()==='G1'?off:bundle(make(this.constructor),input.observation,this.auditBudget,input.round);
      assert.deepStrictEqual(input,expected.choiceInput,'ACTUAL_CHOICE_INPUT_EQUALITY');
      assert.deepStrictEqual(this.state,before,'SHADOW_AUDIT_STATE_PURITY');
      this.auditCount++;
      this.lastCommonAudit=report;
    }
    return super.choiceAxis(input);
  }
}
export class OASISGammaV21OffKernel extends OASISGammaV21Kernel { bridgeMode(){return 'G1';} }
export class OASISGammaV21OrderScrambledKernel extends OASISGammaV21Kernel { bridgeMode(){return 'G2';} }
export class OASISGammaV21CandidateMatchedShamKernel extends OASISGammaV21Kernel { bridgeMode(){return 'G3';} }
