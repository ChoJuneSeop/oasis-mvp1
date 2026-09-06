# Founding Flow v10 Reproducibility — 2026-09-06

## Frozen execution

- Workflow run: `34003981662`
- Frozen head: `9efb271ddea82abf5d0395b188c8b09c88462a9e`
- Original artifact: `9980348561`
- Rerun artifact: `9980448890`

## Internal artifact hashes

Original and rerun internal files are byte-for-byte identical.

### `founding-flow-v10.json`

`31a1d8eb8736c6fbe45c600fc2fc1ce88d669b3f2359e43a8eaf494206844cf8`

### `founding-flow-v10.log`

`b2557e08bc0fabb5844ae821a7c60fd77868a1878a4ccef3c2f7eaa851ee0f41`

## Reproduced conclusion

`C7_CONFIRMED`

The same-frame twins contained the same semantic directed relation set and produced the same proposal/action, but reversing only the serialization order changed `relationSignature` array order and changed `structuralExpansion.structureKey`.

Temporal-order and directionality positive controls both remained distinct as required.

Therefore the confirmed defect is specifically simultaneous-relation serialization-order leakage, not loss of temporal order or directed relation identity.

## Boundary

This record establishes reproducibility of the implementation diagnosis only. It is not evidence of OASIS superiority, uniqueness, culture, or generational evolution.
