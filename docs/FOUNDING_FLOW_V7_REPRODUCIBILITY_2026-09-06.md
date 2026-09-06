# Founding Flow v7 Reproducibility — 2026-09-06

## Frozen execution

- Workflow run: `34001450787`
- Original job: `101400937721`
- Re-run job: `101404788285`
- Frozen head: `998b0b47aa77940aec28fd4ed6bdcdbce32c3f32`
- Original artifact: `9979600884`
- Re-run artifact: `9980012273`

## Re-run status

All steps passed again:

- Unified-system contamination boundary audit
- Founding Flow v7 four-axis and polarity audit
- contaminated historical harness import guard
- full Founding Flow v7 execution
- raw trace upload

## Byte-level comparison

The ZIP container digests differ because GitHub artifact archives contain packaging metadata. The files inside the archives are byte-for-byte identical.

- `founding-flow-v7.json`
  - original SHA-256: `172b60d553aded60ac6fade85889baee25c06693aeb40c42c3c79e9edf6eb8d4`
  - re-run SHA-256: `172b60d553aded60ac6fade85889baee25c06693aeb40c42c3c79e9edf6eb8d4`
- `founding-flow-v7.log`
  - original SHA-256: `894ac2afea0a95b1dd93e1c9ad00933455b899efaf69524287bfbfa2f0d8c8eb`
  - re-run SHA-256: `894ac2afea0a95b1dd93e1c9ad00933455b899efaf69524287bfbfa2f0d8c8eb`

## Reproduced interpretation boundary

The re-run reproduces the v7 implementation-level finding:

- historical `upsert` and `remove` relation mutations remain distinct in structural relation signatures;
- `structuralExpansion.structureKey` distinguishes mutation polarity;
- relation-kind positive control remains distinct;
- v4/v5 regression guards remain intact;
- full-flow compatibility remains intact.

This does **not** establish OASIS superiority, uniqueness, cultural development, or generational advantage.

## Reproduced open issue

The same trace still motivates the C6 candidate:

**Relation State–Mutation Conflation** — a persistent relation state that merely continues to exist can carry the original `op=upsert` token into a later completed experience, making a continuing state look like a fresh mutation event.

The next experiment must therefore test the necessity of separating:

- current relation state identity, and
- relation mutation event identity.

No C6 fix is included in this reproducibility record.
