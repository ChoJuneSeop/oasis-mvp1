import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server = spawn('python3', ['-m', 'http.server', '4176', '--bind', '127.0.0.1'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let browser;
try {
  await sleep(700);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4176/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(
    () => document.title.includes('Dual Comparison Laboratory') && document.getElementById('relationFieldCard'),
    null,
    { timeout: 60000 }
  );

  const report = await page.evaluate(() => {
    const originalE = E;
    const MODEL_KEYS = ['full', 'norel', 'rule', 'utility', 'qlite', 'retrieval'];
    const OFFSETS = [0, 137, 311, 733, 1201];
    const TOTAL_TICKS = 3600;
    const ANALYSIS_START = 500;
    const BASELINE_DANGER = 0.28;
    const ACTION_FEEDBACK = 0.007;
    const NATURAL_RETURN = 0.006;

    const clamp01 = x => Math.max(0, Math.min(1, x));
    const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
    const median = xs => {
      if (!xs.length) return null;
      const a = xs.slice().sort((x, y) => x - y);
      const m = Math.floor(a.length / 2);
      return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
    };
    const quantile = (xs, q) => {
      if (!xs.length) return null;
      const a = xs.slice().sort((x, y) => x - y);
      const p = (a.length - 1) * q;
      const lo = Math.floor(p), hi = Math.ceil(p);
      return lo === hi ? a[lo] : a[lo] * (hi - p) + a[hi] * (p - lo);
    };
    const mad = xs => {
      const m = median(xs);
      return m == null ? null : median(xs.map(x => Math.abs(x - m)));
    };

    function targetRisk(S) {
      return mean(S.parties.map(P => places[P.target]?.r ?? BASELINE_DANGER));
    }
    function actionSignature(S) {
      return S.parties.map(P => P.target).join('|');
    }
    function relationActiveCount(S) {
      return S.parties.reduce((n, P) => n + (P.relationField?.active?.length || 0), 0);
    }

    // 연속 외생 흐름(continuous exogenous flow): benign/dangerous event labels are never created.
    // Persistence itself drifts smoothly and innovations have heavy tails, so heterogeneity is identified only after the run.
    function makeDrive(offset) {
      let latent = 0;
      return t => {
        const z = (offset + t) / 90;
        const b = Math.floor(z), f = z - b;
        const p0 = noise('hetero-rho', offset, b);
        const p1 = noise('hetero-rho', offset, b + 1);
        const smooth = p0 * (1 - f) + p1 * f;
        const rho = 0.62 + 0.36 * smooth;
        const u = noise('hetero-innov', offset, t);
        const centered = (u - 0.5) * 0.010;
        const heavy = Math.sign(u - 0.5) * Math.pow(Math.abs(u - 0.5) * 2, 6) * 0.035;
        latent = Math.max(-0.045, Math.min(0.045, rho * latent + centered + heavy));
        return latent;
      };
    }

    function recoverTick(series, start, threshold, horizonEnd) {
      let calm = 0;
      for (let t = start; t <= horizonEnd; t++) {
        if (Math.abs(series[t] - BASELINE_DANGER) <= threshold) calm++;
        else calm = 0;
        if (calm >= 30) return t - 29;
      }
      return null;
    }

    function segmentReference(reference) {
      const dev = reference.map(x => Math.abs(x - BASELINE_DANGER));
      const tail = dev.slice(ANALYSIS_START);
      const q75 = quantile(tail, 0.75) || 0.01;
      const q90 = quantile(tail, 0.90) || q75;
      const windows = [];
      let i = ANALYSIS_START;
      while (i < reference.length) {
        if (dev[i] < q90) { i++; continue; }
        let start = i;
        while (start > ANALYSIS_START && dev[start - 1] > q75) start--;
        let j = i, calm = 0;
        while (j < reference.length) {
          if (dev[j] <= q75) calm++;
          else calm = 0;
          if (calm >= 30) break;
          j++;
        }
        const end = Math.min(reference.length - 1, j);
        const slice = dev.slice(start, end + 1);
        windows.push({
          start,
          end,
          duration: end - start + 1,
          peakDeviation: Math.max(...slice),
          integratedDeviation: slice.reduce((a, b) => a + b, 0)
        });
        i = end + 1;
      }
      const burdens = windows.map(w => w.integratedDeviation);
      const bm = median(burdens) || 0;
      const bmad = mad(burdens) || 0;
      for (const w of windows) {
        w.flowClass = w.integratedDeviation > bm + 0.5 * bmad ? 'persistent' : 'transient';
      }
      return { windows, thresholds: { q75, q90, burdenMedian: bm, burdenMAD: bmad } };
    }

    function analyzeWindow(trace, w, threshold) {
      const horizonEnd = Math.min(trace.danger.length - 1, w.end + 240);
      const dangerSlice = trace.danger.slice(w.start, horizonEnd + 1);
      const peakDeviation = Math.max(...dangerSlice.map(x => Math.abs(x - BASELINE_DANGER)));
      const integratedDeviation = dangerSlice.reduce((n, x) => n + Math.abs(x - BASELINE_DANGER), 0);
      const rt = recoverTick(trace.danger, w.start, threshold, horizonEnd);

      let actionSwitches = 0;
      let firstActionSwitchTick = null;
      for (let t = w.start + 1; t <= horizonEnd; t++) {
        if (trace.actionSig[t] !== trace.actionSig[t - 1]) {
          actionSwitches++;
          if (firstActionSwitchTick == null) firstActionSwitchTick = t;
        }
      }

      let firstRelationTick = null;
      let activeFieldTicks = 0;
      for (let t = w.start; t <= horizonEnd; t++) {
        if (trace.activeField[t] > 0) activeFieldTicks++;
        if (t > w.start && firstRelationTick == null) {
          const act = trace.relAct[t] > trace.relAct[t - 1];
          const judge = (trace.choiceTrans[t] + trace.partTrans[t]) > (trace.choiceTrans[t - 1] + trace.partTrans[t - 1]);
          if (act || judge) firstRelationTick = t;
        }
      }

      const before = Math.max(0, w.start - 1);
      return {
        peakDeviation,
        integratedDeviation,
        recovered: rt != null,
        recoveryLag: rt == null ? null : rt - w.start,
        actionSwitches,
        firstActionSwitchTick,
        relationActivations: trace.relAct[horizonEnd] - trace.relAct[before],
        relationJudgmentChanges:
          (trace.choiceTrans[horizonEnd] + trace.partTrans[horizonEnd]) -
          (trace.choiceTrans[before] + trace.partTrans[before]),
        activeFieldTicks,
        firstRelationTick,
        relationBeforeAction:
          firstRelationTick != null && firstActionSwitchTick != null && firstRelationTick <= firstActionSwitchTick
      };
    }

    function run(offset) {
      E = { tick: offset, worlds: {}, paused: true };
      for (const k of MODEL_KEYS) E.worlds[k] = mkW(k);

      const drive = makeDrive(offset);
      let referenceDanger = 0.12;
      const reference = [];
      const commonDrive = [];
      const traces = Object.fromEntries(MODEL_KEYS.map(k => [k, {
        danger: [], actionSig: [], relAct: [], choiceTrans: [], partTrans: [], activeField: [], targetRisk: []
      }]));

      for (let t = 0; t < TOTAL_TICKS; t++) {
        E.tick++;
        const exogenous = drive(t);
        commonDrive.push(exogenous);
        referenceDanger = clamp01(referenceDanger + exogenous + NATURAL_RETURN * (BASELINE_DANGER - referenceDanger));
        reference.push(referenceDanger);

        for (const k of MODEL_KEYS) {
          const S = E.worlds[k];
          const chosenRisk = targetRisk(S);
          const actionEffect = ACTION_FEEDBACK * (chosenRisk - S.danger);
          const naturalReturn = NATURAL_RETURN * (BASELINE_DANGER - S.danger);
          tickW(S, { pulse: exogenous + naturalReturn + actionEffect });

          const tr = traces[k];
          tr.danger.push(S.danger);
          tr.actionSig.push(actionSignature(S));
          tr.relAct.push(S.c.relationFieldActivation || 0);
          tr.choiceTrans.push(S.c.choiceTransition || 0);
          tr.partTrans.push(S.c.participationTransition || 0);
          tr.activeField.push(relationActiveCount(S));
          tr.targetRisk.push(targetRisk(S));
        }
      }

      const segmented = segmentReference(reference);
      const windows = segmented.windows.map((w, idx) => ({
        id: idx + 1,
        ...w,
        referenceRecoveryLag: (() => {
          const rt = recoverTick(reference, w.start, segmented.thresholds.q75, Math.min(reference.length - 1, w.end + 240));
          return rt == null ? null : rt - w.start;
        })(),
        models: Object.fromEntries(MODEL_KEYS.map(k => [k, analyzeWindow(traces[k], w, segmented.thresholds.q75)]))
      }));

      const finalCounters = Object.fromEntries(MODEL_KEYS.map(k => {
        const S = E.worlds[k];
        return [k, {
          model: MODELS[k].n,
          actions: S.c.actions,
          relationActivations: S.c.relationFieldActivation || 0,
          relationRecombinations: S.c.relationRecombination || 0,
          relationChoiceTransitions: S.c.choiceTransition || 0,
          relationParticipationTransitions: S.c.participationTransition || 0,
          finalDanger: S.danger
        }];
      }));

      return {
        offset,
        thresholds: segmented.thresholds,
        windows,
        finalCounters,
        integrity: {
          modelCount: MODEL_KEYS.length,
          totalTicks: TOTAL_TICKS,
          noHeterogeneityLabelInjected: true,
          noTargetForcedAfterInitialization: true,
          noDangerValueForcedAfterInitialization: true,
          commonExogenousFlowLength: commonDrive.length
        }
      };
    }

    const trials = OFFSETS.map(run);
    const allWindows = trials.flatMap(tr => tr.windows.map(w => ({ offset: tr.offset, ...w })));

    function aggregateFor(k, flowClass) {
      const rows = allWindows.filter(w => w.flowClass === flowClass).map(w => w.models[k]);
      const recovered = rows.filter(r => r.recovered);
      return {
        model: MODELS[k].n,
        flowClass,
        windows: rows.length,
        recoveryRate: rows.length ? recovered.length / rows.length : null,
        meanRecoveryLag: mean(recovered.map(r => r.recoveryLag)),
        meanIntegratedDeviation: mean(rows.map(r => r.integratedDeviation)),
        meanActionSwitches: mean(rows.map(r => r.actionSwitches)),
        meanRelationActivations: mean(rows.map(r => r.relationActivations)),
        meanRelationJudgmentChanges: mean(rows.map(r => r.relationJudgmentChanges)),
        meanActiveFieldTicks: mean(rows.map(r => r.activeFieldTicks)),
        relationBeforeActionRate: (() => {
          const eligible = rows.filter(r => r.firstRelationTick != null && r.firstActionSwitchTick != null);
          return eligible.length ? eligible.filter(r => r.relationBeforeAction).length / eligible.length : null;
        })()
      };
    }

    const aggregate = {};
    for (const k of MODEL_KEYS) {
      aggregate[k] = {
        transient: aggregateFor(k, 'transient'),
        persistent: aggregateFor(k, 'persistent')
      };
    }

    const oasisTransient = aggregate.full.transient;
    const oasisPersistent = aggregate.full.persistent;
    const noRelPersistent = aggregate.norel.persistent;
    const interpretationFlags = {
      possibleTransientOverreaction:
        (oasisTransient.meanRelationJudgmentChanges || 0) > 0 && (oasisTransient.meanActionSwitches || 0) > 0,
      persistentRelationParticipationObserved:
        (oasisPersistent.meanRelationActivations || 0) > 0 || (oasisPersistent.meanRelationJudgmentChanges || 0) > 0,
      persistentRecoveryAdvantageVsNoRelation:
        oasisPersistent.meanRecoveryLag != null && noRelPersistent.meanRecoveryLag != null
          ? oasisPersistent.meanRecoveryLag < noRelPersistent.meanRecoveryLag
          : null
    };

    E = originalE;
    return {
      design: {
        koreanQuestion: '이질성을 고정 사건으로 정의하지 않은 연속 현실 흐름에서, 자연 복귀하는 이탈과 지속되는 이탈 뒤 OASIS의 관계 재활성·행동 변화·안정화 궤적이 어떻게 다른가?',
        englishTermNote: 'Post-hoc heterogeneity flow validation = 이질성을 사전에 라벨링하지 않고 전체 흐름을 실행한 뒤 궤적을 사후 분류하는 검증.',
        scope: '현재 좌표값의 위험도가 아니라 이탈 발생 전후의 연속 흐름, 선택 변화, 관계필드 참여, 회복 궤적만 평가한다.',
        fairness: '모든 모델은 동일한 외생 흐름을 받고, 선택한 목표의 위험 속성이 다음 현실 위험도에 미치는 동일한 피드백 법칙을 적용받는다.',
        nonCircularity: 'OASIS 성공을 assert하지 않는다. 관계필드가 작동하지 않거나 NoRelation 대비 차이가 없어도 그대로 결과로 남긴다.',
        models: MODEL_KEYS.map(k => MODELS[k].n),
        offsets: OFFSETS,
        totalTicksPerTrial: TOTAL_TICKS,
        analysisStartsAtTick: ANALYSIS_START,
        baselineDanger: BASELINE_DANGER,
        naturalReturnCoefficient: NATURAL_RETURN,
        actionFeedbackCoefficient: ACTION_FEEDBACK
      },
      trials,
      aggregate,
      interpretationFlags,
      totalPostHocWindows: allWindows.length,
      classCounts: {
        transient: allWindows.filter(w => w.flowClass === 'transient').length,
        persistent: allWindows.filter(w => w.flowClass === 'persistent').length
      }
    };
  });

  console.log('\nOASIS POST-HOC HETEROGENEITY FLOW VALIDATION');
  console.log(`windows=${report.totalPostHocWindows} transient=${report.classCounts.transient} persistent=${report.classCounts.persistent}`);
  for (const [k, classes] of Object.entries(report.aggregate)) {
    for (const c of ['transient', 'persistent']) {
      const r = classes[c];
      const lag = r.meanRecoveryLag == null ? 'NA' : r.meanRecoveryLag.toFixed(1);
      const rel = r.meanRelationJudgmentChanges == null ? 'NA' : r.meanRelationJudgmentChanges.toFixed(2);
      const act = r.meanActionSwitches == null ? 'NA' : r.meanActionSwitches.toFixed(2);
      console.log(`${k}/${c}: n=${r.windows} recovery=${r.recoveryRate == null ? 'NA' : r.recoveryRate.toFixed(2)} lag=${lag} actionSwitch=${act} relationJudgment=${rel}`);
    }
  }
  console.log('FLAGS', report.interpretationFlags);
  console.log('RESULT: no OASIS-success assertion is used; interpret the measured flow differences, including null or adverse results.');

  if (report.totalPostHocWindows < 2) {
    throw new Error('FAIL - continuous stream did not generate enough post-hoc excursion windows for interpretation');
  }
  if (!report.classCounts.transient || !report.classCounts.persistent) {
    throw new Error('FAIL - stream did not contain both transient and persistent post-hoc flow classes');
  }

  await writeFile('heterogeneity-flow-report.json', JSON.stringify(report, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
