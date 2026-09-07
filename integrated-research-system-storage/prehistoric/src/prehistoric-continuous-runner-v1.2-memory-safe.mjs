import { PREHISTORIC_COHORT_V1 } from './prehistoric-cohort-v1.mjs';

const clone = value => value == null ? value : structuredClone(value);

function rotated(values, offset) {
  if (!values.length) return [];
  const k = ((offset % values.length) + values.length) % values.length;
  return [...values.slice(k), ...values.slice(0, k)];
}

function transitionDigest(agentId, transition) {
  const lastRound = transition?.deliberation?.rounds?.at?.(-1) ?? null;
  return {
    agentId,
    status: transition?.status ?? null,
    observationId: lastRound?.observation?.id ?? null,
    activeRelationIds: (lastRound?.activeRelations ?? []).map(r => r?.relation?.id).filter(Boolean),
    possibilityCount: lastRound?.possibilities?.length ?? 0,
    admissibleCount: lastRound?.life?.admissibleIds?.length ?? 0,
    choiceId: transition?.deliberation?.realizedPossibility?.id ?? lastRound?.choice?.possibilityId ?? null,
    realizationId: transition?.realization?.id ?? null,
    experienceId: transition?.experience?.id ?? null,
    historyLength: transition?.historyLength ?? null
  };
}

/**
 * Streaming long-horizon runner with the same scheduling/termination semantics
 * as runPrehistoricUntilCivilizationV1.
 *
 * Difference: full transition objects are inspected in the current cycle and
 * then released. Only compact causal/audit digests are retained in RAM.
 * This is a representation fix, not a decision or world-rule change.
 */
export async function runPrehistoricUntilCivilizationMemorySafeV1_2(options = {}) {
  const {
    createSociety,
    createKernelForAgent,
    createCivilizationObserver,
    seedForRun = runIndex => `prehistoric-run-${runIndex}`,
    cohort = PREHISTORIC_COHORT_V1,
    maxRuns = Infinity,
    maxCyclesPerRun = Infinity,
    onEvent = null,
    onCycleDigest = null
  } = options;

  if (typeof createSociety !== 'function') throw new TypeError('createSociety is required');
  if (typeof createKernelForAgent !== 'function') throw new TypeError('createKernelForAgent is required');
  if (typeof createCivilizationObserver !== 'function') throw new TypeError('createCivilizationObserver is required');

  const completedRuns = [];

  for (let runIndex = 0; runIndex < maxRuns; runIndex++) {
    const seed = seedForRun(runIndex);
    const society = await createSociety({ seed, runIndex, cohort: clone(cohort) });
    if (!society || typeof society !== 'object') throw new TypeError('createSociety must return a society object');
    if (typeof society.isTerminal !== 'function') throw new TypeError('society.isTerminal() is required');

    const observer = await createCivilizationObserver({ seed, runIndex, society });
    if (!observer || typeof observer.observe !== 'function') throw new TypeError('civilization observer with observe() is required');

    const kernels = new Map();
    for (const agentSpec of cohort) {
      const kernel = await createKernelForAgent({ agentSpec: clone(agentSpec), society, seed, runIndex });
      if (!kernel || typeof kernel.step !== 'function') throw new TypeError(`kernel.step() missing for ${agentSpec.id}`);
      kernels.set(agentSpec.id, kernel);
    }

    const runRecord = {
      runIndex,
      seed,
      cycles: 0,
      terminal: false,
      civilization: null,
      transitionCount: 0
    };

    while (true) {
      if (runRecord.cycles >= maxCyclesPerRun) {
        return {
          status: 'software-guard-reached',
          reason: 'maxCyclesPerRun is a software/CI guard, not evidence of no civilization',
          activeRun: clone(runRecord),
          completedRuns: clone(completedRuns)
        };
      }

      const schedulerOrder = rotated(cohort.map(agent => agent.id), runRecord.cycles);
      const currentTransitions = [];
      const digests = [];

      for (const agentId of schedulerOrder) {
        const kernel = kernels.get(agentId);
        const transition = await kernel.step();
        currentTransitions.push({ agentId, transition });
        const digest = transitionDigest(agentId, transition);
        digests.push(digest);
        runRecord.transitionCount += 1;
        if (typeof onEvent === 'function') await onEvent({ agentId, transition });
      }

      if (typeof society.advanceExogenousFlow === 'function') {
        await society.advanceExogenousFlow({ runIndex, cycle: runRecord.cycles, seed });
      }

      runRecord.cycles += 1;
      if (typeof onCycleDigest === 'function') {
        await onCycleDigest({
          runIndex,
          seed,
          cycle: runRecord.cycles,
          schedulerOrder: [...schedulerOrder],
          transitions: clone(digests)
        });
      }

      // Observer sees the same current-cycle transition information as before.
      // It is not retained after observation.
      const civilizationObservation = await observer.observe({
        runIndex,
        seed,
        cycle: runRecord.cycles,
        society,
        kernels,
        cycleEvent: {
          type: 'world-cycle',
          runIndex,
          cycle: runRecord.cycles - 1,
          schedulerOrder: [...schedulerOrder],
          agentTransitions: currentTransitions
        }
      });

      if (civilizationObservation?.confirmed === true) {
        runRecord.civilization = clone(civilizationObservation);
        completedRuns.push(clone(runRecord));
        return {
          status: 'civilization-confirmed',
          runIndex,
          seed,
          civilization: clone(civilizationObservation),
          completedRuns: clone(completedRuns)
        };
      }

      if (await society.isTerminal()) {
        runRecord.terminal = true;
        runRecord.terminalReason = typeof society.terminalReason === 'function'
          ? await society.terminalReason()
          : 'natural-world-terminal-state';
        completedRuns.push(clone(runRecord));
        break;
      }
    }
  }

  return {
    status: 'software-run-guard-reached',
    reason: 'maxRuns is a software/CI guard, not evidence that civilization cannot emerge',
    completedRuns: clone(completedRuns)
  };
}
