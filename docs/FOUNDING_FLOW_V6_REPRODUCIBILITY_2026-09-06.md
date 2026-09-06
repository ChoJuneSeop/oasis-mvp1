# Founding Flow v6 Reproducibility — 2026-09-06

## Scope

This record freezes the reproducibility check for Founding Flow v6, the read-only C4 necessity audit.

- Frozen head: `973e2e126fd21a494c292030752ce6272bf99aae`
- Workflow run: `34001328132`
- Original job: `101400610209`
- Re-run job: `101404435195`
- Original artifact: `9979567198`
- Re-run artifact: `9979974842`

No OASIS decision, reactivation, responsibility, or comparator code was modified for the re-run.

## Audit result reproduced

The re-run reproduced the original mechanism result:

- raw historical relation object distinguishes `op=upsert` vs `op=remove`
- possibility support raw relation object also preserves the `op`
- `relationSignature` does **not** distinguish `upsert` vs `remove`
- `structuralExpansion.structureKey` does **not** distinguish `upsert` vs `remove`
- final choice and tie state do not differ between the polarity twins
- positive control `kind=contacted` vs `kind=signaled` is distinguished in both relation signature and structure key

Therefore the broad C4 hypothesis remains falsified. The remaining defect is localized to:

**C4-N — Relation Mutation Polarity Collapse**

한국어 설명: 관계가 형성됐는지(`upsert`) 해제됐는지(`remove`)라는 역사적 변화 방향은 raw evidence에는 남아 있지만, relation signature와 structural identity에서는 빠져 반대 방향의 관계과정이 같은 구조로 접히는 문제.

## Byte-level reproducibility

The ZIP container digests differ because GitHub artifact archives include container metadata, but the internal result files are byte-for-byte identical.

- `founding-flow-v6.json`
  - original SHA-256: `7f6aa324be00aad66101c54878afe70093d782e307f1f739171f8eafaba26cdb`
  - re-run SHA-256: `7f6aa324be00aad66101c54878afe70093d782e307f1f739171f8eafaba26cdb`
- `founding-flow-v6.log`
  - original SHA-256: `7e14a2af5f6f3ae9645f4b4da89d7362bde5883d4a7e9055623f88c0032ecefd`
  - re-run SHA-256: `7e14a2af5f6f3ae9645f4b4da89d7362bde5883d4a7e9055623f88c0032ecefd`

## Evidence boundary

This is a mechanism necessity audit only. It is not evidence of OASIS superiority, uniqueness, culture formation, or generational evolution.

The next experiment must not broaden C4 again. Before any implementation change, it must kill-search temporal/event graph representations and test whether relation mutation polarity belongs in structural identity as an event/state distinction rather than merely appending an `op` token.
