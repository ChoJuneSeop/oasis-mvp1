# OASIS Measurement -> Observation v0.5 Audit

## Scope

This step implements only:

`M_t -> O_t relational representation`

It does not implement `a_t`, possibility-combination generation, `Psi`, probability selection, responsibility, minimum safety boundary, or full OASIS decision logic.

## Kill-search conclusion

Qualitative reasoning, qualitative spatial reasoning, sensor uncertainty modelling, and extraction of qualitative relations from raw sensor data are established research areas. Therefore v0.5 does **not** claim novelty for converting quantitative measurements into qualitative relation states.

The OASIS-specific methodological requirement is narrower: the observation layer must not hide reward, preference, future information, task-success labels, memory similarity, or arbitrary OASIS-specific thresholds.

## Core design

### 1. Measurement uncertainty is part of M_t

A scalar measurement can supply:

- explicit lower/upper bounds;
- a measurement uncertainty supplied by the sensor/interface;
- or an explicitly declared exact value.

If none is supplied, the adapter does **not** invent a tolerance.

### 2. Relation change uses interval ordering

Given previous interval `I_prev` and current interval `I_now`:

- `I_now.upper < I_prev.lower` -> qualitative decrease;
- `I_now.lower > I_prev.upper` -> qualitative increase;
- otherwise -> `indeterminate`.

No epsilon, recent-N window, learned reward threshold, or hand-tuned OASIS decision boundary is used.

### 3. Ambiguity is preserved

Overlapping uncertainty intervals remain `indeterminate`.

This is deliberate. The adapter is not allowed to force a semantic relation merely because a downstream decision system would benefit from one.

### 4. Transparent semantic mapping

For pairwise distance only:

- qualitative decrease in distance -> `approaching`;
- qualitative increase in distance -> `receding`;
- unresolved trend -> `indeterminate`.

The raw measurement and uncertainty evidence remain attached to the observation.

### 5. Direction is preserved

Role assignments remain named and directional. `actor=A,target=B` is distinct from `actor=B,target=A`.

## Falsification result

Local equivalent execution:

`oasis-measurement-observation-v0.5: 12/12 tests passed`

Tests cover:

1. uncertainty-derived intervals;
2. no invented tolerance when uncertainty is absent;
3. explicit exact measurements;
4. strict decrease from non-overlapping intervals;
5. overlap -> indeterminate;
6. transparent distance decrease -> approaching mapping;
7. small numeric fluctuation inside uncertainty does not create a false semantic relation;
8. even a large numeric difference stays indeterminate when uncertainty is larger;
9. directional roles remain distinct;
10. geometric distance remains separate raw evidence;
11. missing uncertainty cannot force a trend;
12. adapter API contains no reward, task-success, future-state, or historical-answer input.

## Why this is preferable to a fixed threshold

A fixed epsilon such as `abs(delta) > 0.18` is an algorithmic preference inserted by the designer. In v0.5, the discrimination scale comes from the measurement system's stated uncertainty instead. If the sensor cannot distinguish two measurements, OASIS must preserve that ambiguity at the observation boundary.

## Critical limitation

This does **not** solve perception in general.

The current implementation proves only a narrow scalar-trend case, especially pairwise distance. Real-world relations such as support, obstruction, pursuit, cooperation, danger, ownership, social intent, or causation cannot be inferred from this adapter alone.

Further, sensor uncertainty itself can be incorrectly calibrated. v0.5 assumes that uncertainty metadata belongs to the measurement interface and must be independently validated.

## Construct-validity warning

The environment/perception interface remains a potential hidden answer key. A relation label must not be authored because it predicts the desired OASIS action. Comparator systems must receive the same raw external reality or an equivalent observation interface appropriate to the experimental design.

## Next target

The observation boundary is now sufficient for a first end-to-end neutral path:

`M_t -> O_t -> relational transition -> persistent f_t`

The next required work is an integration falsification between v0.5 and v0.4, followed by the still-unresolved definition of relational closure for producing `e_i` without a scripted closure label.
