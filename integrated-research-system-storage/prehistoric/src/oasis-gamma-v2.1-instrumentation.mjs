// Pure, exact source transforms. The audit proves that the copied world differs
// from v1/v1.1 only in read-only RNG/full-state access and import routing.
export function instrumentWorld(source) {
  const replace=(a,b)=>{if(source.split(a).length!==2)throw Error('INSTRUMENTATION_SOURCE_DRIFT');source=source.replace(a,b);};
  replace('  return () => {\n    x ^= x << 13;', '  const next = () => {\n    x ^= x << 13;');
  replace('    return (x >>> 0) / 4294967296;\n  };', '    return (x >>> 0) / 4294967296;\n  };\n  next.auditState = () => x;\n  return next;');
  replace('    externalSnapshot() {', '    auditSnapshot() {\n      return {seed, cycle, observationSerial, objectSerial, rngState: rng.auditState(), agents: clone([...agents]), objects: clone([...objects]), relations: clone([...relations]), ledger: clone(ledger)};\n    },\n    externalSnapshot() {');
  return source;
}
export const routeWorld = source => source.replace("'./prehistoric-clean-world-v1.mjs'", "'./prehistoric-clean-world-v1-gamma-v2.1-audited.mjs'");
