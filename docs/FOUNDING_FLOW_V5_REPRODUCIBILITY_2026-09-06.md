# Founding Flow v5 — Reproducibility Record (2026-09-06)

## Purpose

This record documents a frozen re-run of Founding Flow v5 at the original valid experiment head. The purpose was reproducibility only; no experiment code, world, seeds, archetype rules, rounds, or audit criteria were changed.

## Frozen experiment

- Workflow run: `34001176534`
- Original valid job: `101400199203`
- Re-run job: `101403087523`
- Frozen head: `00e61bc28e34d489f02f6d03389c87a8687137cb`
- Original artifact: `9979524556`
- Re-run artifact: `9979825711`
- Seeds: `101, 211, 307, 401, 503`
- 12 decisions per seed / 60 OASIS deliberations total

## Audit status on re-run

All workflow gates passed again:

- Syntax check: PASS
- Unified-system contamination boundary audit: PASS
- Founding Flow v5 four-axis and C5 process-evidence audit: PASS
- Contaminated historical harness non-import check: PASS
- Founding Flow v5 execution: PASS
- Raw trace upload: PASS

## Byte-level reproducibility

The ZIP archive digest differs because GitHub artifact containers include run-time archive metadata. Therefore reproducibility was checked on the actual experiment payload files after extraction.

### `founding-flow-v5.json`

Original SHA-256:
`6ddf457c42e19fa9c8d63528a630c6eb9cf27db367f80dea23d85dc527b55037`

Re-run SHA-256:
`6ddf457c42e19fa9c8d63528a630c6eb9cf27db367f80dea23d85dc527b55037`

### `founding-flow-v5.log`

Original SHA-256:
`d03fc00366ea4de6fdba810ada8be189d82fa62dcea751b6cb448f617c834bc5`

Re-run SHA-256:
`d03fc00366ea4de6fdba810ada8be189d82fa62dcea751b6cb448f617c834bc5`

A recursive file comparison returned no differences.

## Reproducibility conclusion

**Founding Flow v5 is byte-for-byte reproducible at the frozen experiment head.**

This strengthens only the methodological claim already established by the v5 post-run audit:

- C1-C3 fixes remain preserved.
- C5 process-evidence eligibility fix is reproducible.
- Raw snapshot co-presence does not re-enter completed-experience relevance through the corrected v5 path.
- C4 remains intentionally open and was not modified.

This record does **not** upgrade v5 into evidence for OASIS superiority, uniqueness, cultural evolution, or generational development.
