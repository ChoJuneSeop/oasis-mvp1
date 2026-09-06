# Founding Flow v8 — Reproducibility Record (2026-09-06)

## Frozen execution

- Experiment: Founding Flow v8 — Relation State–Mutation Separation Audit
- Frozen head: `be06fafc5fe90ddfa7f2e55bde819c704c9b5b50`
- Workflow run: `34001574155`
- Original job: `101401263325`
- Re-run job: `101406355160`
- Original artifact: `9979640870`
- Re-run artifact: `9980184302`

## Re-run status

All required workflow stages passed again:

- syntax check
- unified-system contamination boundary audit
- C6 necessity audit
- artifact upload

No experiment logic or frozen input was changed for the re-run.

## Byte-level artifact comparison

The ZIP container digests differ because GitHub Actions archive metadata/timestamps differ between artifact generations. The files inside the archives are byte-for-byte identical.

### `founding-flow-v8.json`

Original SHA-256:
`0d44ed4129cb101c7b4845be8ee759c15806f2ecc4a6825d8223e93d3506d68c`

Re-run SHA-256:
`0d44ed4129cb101c7b4845be8ee759c15806f2ecc4a6825d8223e93d3506d68c`

### `founding-flow-v8.log`

Original SHA-256:
`86a09bf3337b10980ea6fb12e71e47c12a7a6e451770bbd51fe02e0d18ad6663`

Re-run SHA-256:
`86a09bf3337b10980ea6fb12e71e47c12a7a6e451770bbd51fe02e0d18ad6663`

## Reproduced mechanism finding

C6 — Relation State–Mutation Conflation — was reproduced.

1. A relation formed by an earlier `upsert` remains in materialized current state.
2. In a later experience with no relation mutation, that old `upsert` relation can appear in `processRelations` as if it were part of the later process mutation history.
3. When a later outcome actually removes the same relation, the prior current-state `upsert` can collide with the outcome `remove` during process-relation construction/deduplication.
4. The actual `remove` mutation is then absent from the completed process history even though the live world correctly removes the relation.

Therefore the reproduced issue is not relation-polarity loss alone. It is a representation-role conflation between:

- current relational state
- actual outcome mutation event

## Evidence boundary

This record supports only the reproducibility of the C6 implementation defect in the frozen v8 audit. It is not evidence of OASIS superiority, uniqueness, culture formation, or generational behavior.
