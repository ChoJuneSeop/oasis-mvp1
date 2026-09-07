import json, math, hashlib
from collections import defaultdict
import numpy as np
from scipy.optimize import milp, Bounds, LinearConstraint
from scipy.sparse import lil_matrix, vstack

INPUT='o3-danger-balance-records-120k.json'
OUTPUT='o3-danger-balanced-multiverse-120k-report.json'
TARGET_TAU=0.05
BALANCE_GATE=0.10
STRONG_GATE=0.05
MAX_ITER=6
TARGET_SOLUTIONS=256
CHAIN_SEEDS=[17,43,101,211,307,401,503,607]
SOLUTIONS_PER_CHAIN=TARGET_SOLUTIONS//len(CHAIN_SEEDS)
BURN_ACCEPTED=600
SPACING_ACCEPTED=80
MAX_ATTEMPTS_PER_CHAIN=250000

with open(INPUT,encoding='utf-8') as f: data=json.load(f)
records=data['records']
assert len(records)==1997
assert sum(bool(r['choiceDiff']) for r in records)==164
assert sum(bool(r['decisionDiff']) for r in records)==197

scalar=['disc','routes','seenNPC','relationHistory','episodes','latentCount','eligibleCount','activeKeyCount','hiddenCandidates','decisionIndex','decisionGap','tick']
places=data['placeIds']; npcs=data['npcNames']
base_names=scalar+[f'visit:{x}' for x in places]+[f'recentNpc:{x}' for x in npcs]+[f'recentPlace:{x}' for x in places]

def base_vec(r): return np.asarray([r[k] for k in scalar]+r['visits']+r['recentNpc']+r['recentPlace'],dtype=float)
B=np.vstack([base_vec(r) for r in records]); D=B.shape[1]
cols=[]; names=[]
for j,n in enumerate(base_names): cols.append(B[:,j]); names.append(n)
for j,n in enumerate(base_names): cols.append(B[:,j]**2); names.append(f'{n}^2')
for j in range(D):
    for k in range(j+1,D):
        cols.append(B[:,j]*B[:,k]); names.append(f'{base_names[j]}*{base_names[k]}')
F=np.vstack(cols).T
ref_full_sd=F.std(axis=0,ddof=1)
keep=np.isfinite(ref_full_sd)&(ref_full_sd>1e-10)
F=F[:,keep]; ref_full_sd=ref_full_sd[keep]; names=[n for n,k in zip(names,keep) if k]
M=F.shape[1]; R=len(records)
assert M==650

pos=np.asarray([i for i,r in enumerate(records) if r['choiceDiff']],dtype=int)
neg=np.asarray([i for i,r in enumerate(records) if not r['choiceDiff']],dtype=int)
ispos=np.zeros(R,dtype=bool); ispos[pos]=True

def active_key(r): return tuple(sorted(r.get('activeKeys') or []))
def stratum_key(r): return (r['party'],r['here'],r['target'],active_key(r))

strata=defaultdict(lambda:[[],[]])
for i,r in enumerate(records): strata[stratum_key(r)][0 if r['choiceDiff'] else 1].append(i)

overlap=set(); exact_rows=[]
for key,(ps,ns) in strata.items():
    if not ps or not ns: continue
    overlap.update(ps); overlap.update(ns)
    row=lil_matrix((1,R),dtype=float); row[0,ps]=1; row[0,ns]=-1; exact_rows.append(row.tocsr())
Aexact=vstack(exact_rows,format='csr')
upper=np.asarray([1.0 if i in overlap else 0.0 for i in range(R)])
pos_overlap=np.asarray([i for i in pos if i in overlap],dtype=int)
pos_indicator=ispos.astype(float)
assert len(pos_overlap)==163

# Actual matched-sample balance. Danger is intentionally absent from all design code.
def actual_balance(sp,sn):
    a=F[sp]; b=F[sn]
    ma=a.mean(axis=0); mb=b.mean(axis=0)
    va=((a-ma)**2).mean(axis=0); vb=((b-mb)**2).mean(axis=0)
    pooled=np.sqrt((va+vb)/2)
    smd=np.zeros(M)
    mask=pooled>1e-12
    smd[mask]=(ma[mask]-mb[mask])/pooled[mask]
    av=np.abs(smd)
    order=np.argsort(-av)
    return {
        'maxAbsSMD':float(av.max()),
        'medianAbsSMD':float(np.median(av)),
        'over01':int(np.sum(av>BALANCE_GATE)),
        'worst':[{'name':names[j],'absSMD':float(av[j]),'signedSMD':float(smd[j])} for j in order[:10]]
    }, pooled

# Reproduce the previously validated danger-blind cardinality solution.
def solve(refsd):
    A=lil_matrix((2*M,R),dtype=float)
    for j in range(M):
        diff=np.where(ispos,F[:,j],-F[:,j]); tol=TARGET_TAU*refsd[j]
        A[2*j,:]=diff-tol*pos_indicator
        A[2*j+1,:]=-diff-tol*pos_indicator
    AA=vstack([Aexact,A.tocsr()],format='csr')
    lb=np.concatenate([np.zeros(Aexact.shape[0]),np.full(2*M,-np.inf)])
    ub=np.zeros(Aexact.shape[0]+2*M)
    c=np.where(ispos,-1.0,0.0)
    res=milp(c=c,integrality=np.ones(R,dtype=int),bounds=Bounds(np.zeros(R),upper),constraints=LinearConstraint(AA,lb,ub),options={'time_limit':90,'mip_rel_gap':0.0})
    if res.x is None: return res,None,None
    selected=res.x>0.5
    return res,np.flatnonzero(selected&ispos),np.flatnonzero(selected&~ispos)

refsd=ref_full_sd.copy(); baseline_sp=baseline_sn=None; baseline_bal=None
iterations=[]
for it in range(MAX_ITER):
    res,sp,sn=solve(refsd)
    if sp is None: raise RuntimeError('baseline cardinality solution missing')
    bal,pooled=actual_balance(sp,sn)
    iterations.append({'iteration':it,'solverStatus':int(res.status),'solverMessage':res.message,'matchedPairs':len(sp),'balance':bal})
    baseline_sp,baseline_sn,baseline_bal=sp,sn,bal
    if bal['maxAbsSMD']<=BALANCE_GATE: break
    refsd=np.minimum(refsd,np.maximum(pooled,1e-12))

assert baseline_bal['maxAbsSMD']<=BALANCE_GATE
assert len(baseline_sp)==163 and len(baseline_sn)==163
assert set(baseline_sp)==set(pos_overlap)

# Positive O3 events are fixed across the entire multiverse.
positive=baseline_sp.copy(); n=len(positive)
P=F[positive]
pos_mean=P.mean(axis=0)
pos_var=((P-pos_mean)**2).mean(axis=0)

# Controls can move only inside the same exact stratum, preserving exact counts.
control_pools={}
base_selected={}
for key,(ps,ns) in strata.items():
    if not ps or not ns: continue
    need=sum(i in set(positive) for i in ps)
    if need<=0: continue
    pool=[i for i in ns if i in overlap]
    chosen=[i for i in baseline_sn if stratum_key(records[i])==key]
    assert len(chosen)==need
    control_pools[key]=pool
    base_selected[key]=set(chosen)
movable=[k for k,pool in control_pools.items() if len(pool)>len(base_selected[k])]
assert movable

# Fast exact actual-SMD check for a proposed control set, using population variances
# exactly as in the validated balance metric.
def ctrl_stats(selected_set):
    idx=np.asarray(sorted(selected_set),dtype=int)
    C=F[idx]
    return C.sum(axis=0), (C*C).sum(axis=0)

def balance_from_stats(csum,css):
    cm=csum/n
    cv=np.maximum(0.0,css/n-cm*cm)
    pooled=np.sqrt((pos_var+cv)/2)
    smd=np.zeros(M)
    mask=pooled>1e-12
    smd[mask]=(pos_mean[mask]-cm[mask])/pooled[mask]
    av=np.abs(smd)
    return float(av.max()), float(np.median(av))

def solution_id(ctrl):
    raw=','.join(str(i) for i in sorted(ctrl)).encode()
    return hashlib.sha256(raw).hexdigest()[:20]

baseline_ctrl=set(int(i) for i in baseline_sn)
solutions=[]; seen=set()

def freeze_solution(ctrl,chain,accepted,attempts):
    sid=solution_id(ctrl)
    if sid in seen: return False
    csum,css=ctrl_stats(ctrl); mx,med=balance_from_stats(csum,css)
    if mx>BALANCE_GATE+1e-12: return False
    seen.add(sid)
    inter=len(ctrl&baseline_ctrl); union=len(ctrl|baseline_ctrl)
    solutions.append({
        'id':sid,'chain':chain,'acceptedSwaps':accepted,'attempts':attempts,
        'controls':tuple(sorted(ctrl)),'maxAbsSMD':mx,'medianAbsSMD':med,
        'distanceFromBaseline':1.0-inter/union
    })
    return True

# Include the validated baseline as solution 0, then generate danger-blind alternatives.
freeze_solution(baseline_ctrl,-1,0,0)
chain_reports=[]
for chain,seed in enumerate(CHAIN_SEEDS):
    rng=np.random.default_rng(seed)
    selected={k:set(v) for k,v in base_selected.items()}
    ctrl=set().union(*selected.values())
    csum,css=ctrl_stats(ctrl)
    accepted=0; attempts=0; collected=0; next_collect=BURN_ACCEPTED
    while attempts<MAX_ATTEMPTS_PER_CHAIN and collected<SOLUTIONS_PER_CHAIN:
        attempts+=1
        key=movable[int(rng.integers(0,len(movable)))]
        sel=selected[key]
        pool=control_pools[key]
        old=int(rng.choice(tuple(sel)))
        # Draw a genuinely unselected alternative from the same exact stratum.
        new=int(rng.choice(pool))
        retry=0
        while new in sel and retry<20:
            new=int(rng.choice(pool)); retry+=1
        if new in sel: continue
        nsum=csum-F[old]+F[new]
        nss=css-F[old]*F[old]+F[new]*F[new]
        mx,_=balance_from_stats(nsum,nss)
        if mx>BALANCE_GATE+1e-12: continue
        sel.remove(old); sel.add(new); ctrl.remove(old); ctrl.add(new)
        csum,css=nsum,nss; accepted+=1
        if accepted>=next_collect:
            if freeze_solution(ctrl,chain,accepted,attempts): collected+=1
            next_collect=accepted+SPACING_ACCEPTED
    chain_reports.append({'chain':chain,'seed':seed,'attempts':attempts,'acceptedSwaps':accepted,'collectedUnique':collected})

# Freeze the design BEFORE reading danger. Everything above is danger-blind.
frozen_solutions=tuple({k:v for k,v in s.items() if k!='controls'} | {'controls':tuple(s['controls'])} for s in solutions)

# Outcome/exposure read begins only here, after all matched subsamples are fixed.
danger=np.asarray([float(r['danger']) for r in records])
pos_danger=float(danger[positive].mean())
residuals=[]
for s in frozen_solutions:
    ctrl=np.asarray(s['controls'],dtype=int)
    residual=pos_danger-float(danger[ctrl].mean())
    residuals.append({
        'id':s['id'],'chain':s['chain'],'dangerResidual':residual,
        'maxAbsSMD':s['maxAbsSMD'],'medianAbsSMD':s['medianAbsSMD'],
        'distanceFromBaseline':s['distanceFromBaseline']
    })

vals=np.asarray([x['dangerResidual'] for x in residuals],dtype=float)
bals=np.asarray([x['maxAbsSMD'] for x in residuals],dtype=float)
dists=np.asarray([x['distanceFromBaseline'] for x in residuals],dtype=float)

def q(a,p): return float(np.quantile(a,p)) if len(a) else None

def summarize(mask):
    a=vals[mask]
    if not len(a): return {'n':0}
    return {
        'n':int(len(a)),'min':float(a.min()),'p05':q(a,.05),'p25':q(a,.25),
        'median':q(a,.5),'p75':q(a,.75),'p95':q(a,.95),'max':float(a.max()),
        'positiveFraction':float(np.mean(a>0)),'nonPositiveCount':int(np.sum(a<=0))
    }

strong=bals<=STRONG_GATE+1e-12
# Pairwise solution diversity is descriptive only; solutions are correlated random-walk draws.
control_sets=[set(s['controls']) for s in frozen_solutions]
pair_d=[]
for i in range(len(control_sets)):
    for j in range(i+1,len(control_sets)):
        a=control_sets[i]; b=control_sets[j]
        pair_d.append(1-len(a&b)/len(a|b))
pair_d=np.asarray(pair_d,dtype=float)

report={
    'design':{
        'purpose':'quantify matched-subsample/design uncertainty in the residual danger association across many equally admissible danger-blind balanced control selections',
        'worldPolicy':'fixed 120k production trajectory exported by the existing browser adapter; production source unchanged',
        'o3Policy':'completed-process O3 fixed; the same 163 matchable positive O3 choice-difference events are retained in every solution',
        'exactStrata':'same party + same current place + same current target + exactly identical active relation-key set; swaps never cross strata',
        'balance':'650 nonconstant structural terms (base, square, every two-way product); every frozen solution is rechecked on actual matched-sample max |SMD| <= 0.10',
        'generation':'8 deterministic danger-blind random-walk chains from the validated cardinality solution; only exact-stratum control swaps that preserve actual balance are accepted',
        'targetSolutions':TARGET_SOLUTIONS,
        'dangerPolicy':'danger is not referenced during matching, swap proposals, acceptance, collection, balance, or diversity checks; it is read only after the full solution set is frozen',
        'strongBalanceSubset':'solutions with max |SMD| <= 0.05 are reported separately',
        'inferenceWarning':'solution draws are correlated feasible designs, not IID statistical samples; positiveFraction is a robustness proportion, not a p-value',
        'causalClaim':False
    },
    'input':{'records':R,'positiveChoiceDiffs':len(pos),'matchablePositiveEvents':len(positive),'expandedBalanceFeatures':M},
    'baseline':{'iterations':iterations,'balance':baseline_bal,'controlSetId':solution_id(baseline_ctrl)},
    'generation':{
        'requested':TARGET_SOLUTIONS,'generatedUnique':len(frozen_solutions),
        'chainReports':chain_reports,'uniqueControlsEverUsed':len(set().union(*control_sets)) if control_sets else 0,
        'balanceMaxAcrossSolutions':float(bals.max()) if len(bals) else None,
        'balanceMedianAcrossSolutions':float(np.median(bals)) if len(bals) else None,
        'strongBalanceCount':int(np.sum(strong)),
        'distanceFromBaseline':{'min':float(dists.min()),'median':float(np.median(dists)),'max':float(dists.max())} if len(dists) else None,
        'pairwiseJaccardDistance':{'min':float(pair_d.min()),'median':float(np.median(pair_d)),'max':float(pair_d.max())} if len(pair_d) else None
    },
    'dangerAfterFreeze':{
        'positiveGroupMeanDanger':pos_danger,
        'allBalancedSolutions':summarize(np.ones(len(vals),dtype=bool)),
        'strongBalanceSolutions':summarize(strong),
        'baselineResidual':next(x['dangerResidual'] for x in residuals if x['id']==solution_id(baseline_ctrl)),
        'residualBalanceCorrelation':float(np.corrcoef(vals,bals)[0,1]) if len(vals)>1 and np.std(vals)>0 and np.std(bals)>0 else None,
        'residualDistanceCorrelation':float(np.corrcoef(vals,dists)[0,1]) if len(vals)>1 and np.std(vals)>0 and np.std(dists)>0 else None
    },
    'solutions':residuals
}
with open(OUTPUT,'w',encoding='utf-8') as f: json.dump(report,f,ensure_ascii=False,indent=2)
print('O3-DANGER-BALANCED-MULTIVERSE-120K '+json.dumps({
    'generatedUnique':len(frozen_solutions),
    'balanceMax':report['generation']['balanceMaxAcrossSolutions'],
    'strongBalanceCount':report['generation']['strongBalanceCount'],
    'all':report['dangerAfterFreeze']['allBalancedSolutions'],
    'strong':report['dangerAfterFreeze']['strongBalanceSolutions'],
    'baselineResidual':report['dangerAfterFreeze']['baselineResidual'],
    'pairwiseDistance':report['generation']['pairwiseJaccardDistance']
},ensure_ascii=False))
