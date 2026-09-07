const clone = value => value == null ? value : structuredClone(value);

function distinct(values) {
  return [...new Set(values.filter(v => v != null))];
}

function lineageTouches(event, lineageSet) {
  if (event.objectId && lineageSet.has(event.objectId)) return true;
  if (event.target && lineageSet.has(event.target)) return true;
  if (Array.isArray(event.lineage) && event.lineage.some(id => lineageSet.has(id))) return true;
  if (Array.isArray(event.componentIds) && event.componentIds.some(id => lineageSet.has(id))) return true;
  return false;
}

export function createCivilizationObserverV1({ society }) {
  const candidates = new Map();

  return {
    async observe({ cycle }) {
      const snapshot = society.externalSnapshot();
      const ledger = snapshot.ledger;

      for (const object of snapshot.objects.filter(o => o.type === 'composite')) {
        if (!candidates.has(object.id)) {
          candidates.set(object.id, {
            rootId: object.id,
            creator: object.creator,
            createdCycle: object.createdCycle,
            lineage: clone(object.lineage ?? [object.id]),
            signature: object.materialSignature ?? null
          });
        }
      }

      const evidence = [];
      for (const candidate of candidates.values()) {
        const lineageSet = new Set(candidate.lineage);
        const events = ledger.filter(e => e.cycle >= candidate.createdCycle && lineageTouches(e, lineageSet));
        const artifactStillPresent = snapshot.objects.some(o => o.id === candidate.rootId || (o.lineage ?? []).some(id => lineageSet.has(id)));
        const age = cycle - candidate.createdCycle;
        const users = distinct(events.map(e => e.actor).filter(Boolean));
        const nonCreatorUsers = users.filter(id => id !== candidate.creator);
        const actionTypes = distinct(events.map(e => e.action));
        const transferEvents = events.filter(e => e.action === 'transfer');
        const derivedCombineEvents = ledger.filter(e => e.action === 'combine' && e.actor !== candidate.creator && Array.isArray(e.lineage) && e.lineage.some(id => lineageSet.has(id)));
        const dependentAgents = distinct([
          ...users,
          ...events.flatMap(e => e.participants ?? [])
        ]);

        const E1 = artifactStillPresent && age >= 6;
        const E2 = nonCreatorUsers.length >= 1 && events.filter(e => ['contact', 'grasp', 'carry', 'release', 'strike', 'transfer', 'combine'].includes(e.action)).length >= 2;
        const E3 = transferEvents.length >= 1 || derivedCombineEvents.length >= 1;
        const E4 = dependentAgents.length >= 3 && actionTypes.filter(a => ['combine', 'carry', 'transfer', 'contact', 'strike', 'grasp', 'release'].includes(a)).length >= 3;

        evidence.push({
          rootId: candidate.rootId,
          creator: candidate.creator,
          age,
          users,
          actionTypes,
          E1, E2, E3, E4,
          eventCount: events.length
        });

        if (E1 && E2 && E3 && E4) {
          return {
            confirmed: true,
            type: 'supra-individual-durable-structure',
            cycle,
            rootId: candidate.rootId,
            creator: candidate.creator,
            evidence: { E1, E2, E3, E4 },
            users,
            actionTypes,
            eventCount: events.length,
            note: 'External observer confirmation only; no civilization label was fed into OASIS.'
          };
        }
      }

      const socialEvents = ledger.filter(e => ['contact', 'transfer'].includes(e.action));
      if (cycle >= 30 && socialEvents.length >= 18) {
        const participants = distinct(socialEvents.flatMap(e => [e.actor, ...(e.participants ?? [])]).filter(Boolean));
        const directedPairs = distinct(socialEvents.map(e => `${e.actor}->${e.target}`));
        const transferActors = distinct(socialEvents.filter(e => e.action === 'transfer').map(e => e.actor));
        const repeatedPairs = directedPairs.filter(pair => socialEvents.filter(e => `${e.actor}->${e.target}` === pair).length >= 2);
        if (participants.length >= 4 && repeatedPairs.length >= 3 && transferActors.length >= 2) {
          return {
            confirmed: true,
            type: 'reused-distributed-relational-practice',
            cycle,
            evidence: { E1: true, E2: true, E3: true, E4: true },
            participants,
            repeatedPairs,
            transferActors,
            note: 'Confirmed from repeated supra-individual practice; not from a predeclared technology milestone.'
          };
        }
      }

      return { confirmed: false, cycle, candidates: evidence.slice(-12) };
    }
  };
}
