# OASIS External Research Governance Storage

Status: Independent research-governance storage layer
Branch: `storage/oasis-research-governance-v1.0`
Created: 2026-09-08

## Purpose

This storage is intentionally separated from the OASIS Integrated Paper System and production implementation.

Its role is limited to:
- preserving the GitHub research genealogy and current reclassification;
- preventing redundant experiments;
- preventing reintroduction of falsified or contaminated assumptions;
- recording audit constraints before new research begins;
- maintaining provenance for prior positive, negative, null, contaminated, and implementation-mismatch results.

It must not:
- provide answers to an experiment;
- inject preferred outcomes, rewards, action menus, relation cues, or success criteria into OASIS;
- modify the reality stream used by a new experiment;
- be treated as part of the OASIS decision architecture;
- be merged conceptually into the OASIS Integrated Paper System.

## Separation rule

Past research may constrain how researchers avoid known errors, but it must not constrain what a new reality is allowed to produce.

`past research -> researcher audit conditions` is allowed.

`past research -> OASIS input / experimental answer / preferred reality` is prohibited.

## Initial authoritative source

The current master genealogy/reclassification was created on the separate validation branch at commit:

`67314b9f92b271b106da36696169ad428e15af7f`

Path:
`docs/validation/OASIS_GITHUB_MASTER_GENEALOGY_RECLASSIFICATION_v1.0_2026-09-08.md`

This storage records that source as prior research. It does not import its conclusions into future experimental reality.
