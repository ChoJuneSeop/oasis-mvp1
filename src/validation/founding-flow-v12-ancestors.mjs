import {
  OASISConcurrentCanonicalCore,
  OASISAncestorV11Node,
  createFoundingV11AncestorNodes,
  sharedGoalForSeedV11
} from './founding-flow-v11-ancestors.mjs';

const clone = value => value == null ? value : structuredClone(value);
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
const uniq = values => [...new Set(values.filter(v => v != null && v !== ''))];
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

function explicitRelationOrder(relation) {
  return relation?.meta?.sequence ?? relation?.meta?.order ?? null;
}

function compareExplicitOrder(a, b) {
  const av = explicitRelationOrder(a);
  const bv = explicitRelationOrder(b);
  if (typeof av === 'number' && typeof bv === 'number' && av !== bv) return av - bv;
  const as = String(av);
  const bs = String(bv);
  if (as !== bs) return as.localeCompare(bs);
  return stable(a).localeCompare(stable(b));
}

export function canonicalizeFingerprintRelations(relations) {
  const rows = arr(relations).map(clone);
  if (rows.length < 2) return rows;
  const explicitCount = rows.filter(r => explicitRelationOrder(r) != null).length;
  if (explicitCount === rows.length) return rows.sort(compareExplicitOrder);
  if (explicitCount > 0) return rows; // Mixed explicit/implicit order: do not guess away meaning.
  return rows.sort((a, b) => stable(a).localeCompare(stable(b)));
}

export class OASISCanonicalFlowFingerprintCore extends OASISConcurrentCanonicalCore {
  _flowFingerprint() {
    return stable(this.state.flow.map(entry => ({
      event: {
        time: entry.event.time,
        facts: entry.event.facts,
        relations: canonicalizeFingerprintRelations(entry.event.relations),
        participants: entry.event.participants,
        affordances: entry.event.affordances,
        entities: entry.event.entities,
        intervention: entry.event.intervention
      },
      changedEntities: uniq(entry.changedEntities ?? []).sort((a, b) => String(a).localeCompare(String(b))),
      previousChoiceId: entry.previousChoiceId
    })));
  }
}

export class OASISAncestorV12Node extends OASISAncestorV11Node {
  reset() {
    this.core = new OASISCanonicalFlowFingerprintCore({ realizationSeed: this.seed, anchorEntityId: 'founder' });
    this.snapshot = null;
    this.pendingChoice = null;
    this.lastInstantFactIds = new Set();
  }
}

export function createFoundingV12AncestorNodes(seed) {
  const nodes = createFoundingV11AncestorNodes(seed);
  return nodes.map(node => node.id === 'oasis' ? new OASISAncestorV12Node(seed) : node);
}

export function sharedGoalForSeedV12(seed) {
  return sharedGoalForSeedV11(seed);
}
