# Founding Flow v9 — Reproducibility Record — 2026-09-06

## Frozen execution

- Workflow run: `34001718068`
- Frozen head: `7eb20deceb4dd0b9bd468bf7327077486fce51d9`
- Original job: `101401646958`
- Re-run job: `101406640294`
- Original artifact: `9979674335`
- Re-run artifact: `9980214826`

## Result

The original run and the frozen-head re-run both completed successfully with all v9 audits and full-flow execution passing.

The ZIP archive digests differ because GitHub artifact containers carry run-time archive metadata. The files inside the archives are identical.

### Internal file SHA-256

- `founding-flow-v9.json`
  - original: `10469ad23d980007da51adf2119c0baa54bc36ee96e835d57b9c31eed135af6f`
  - re-run: `10469ad23d980007da51adf2119c0baa54bc36ee96e835d57b9c31eed135af6f`

- `founding-flow-v9.log`
  - original: `6471694bbcb7647bf138754ae8349588137cedbeed07b913a07ba18aabc355c6`
  - re-run: `6471694bbcb7647bf138754ae8349588137cedbeed07b913a07ba18aabc355c6`

Therefore the internal v9 execution outputs are byte-for-byte reproducible under the frozen commit.

## Interpretation boundary

This reproducibility record supports only execution reproducibility and the audited C6 implementation correction. It is not evidence of OASIS superiority, uniqueness, cultural emergence, or generational advantage.
