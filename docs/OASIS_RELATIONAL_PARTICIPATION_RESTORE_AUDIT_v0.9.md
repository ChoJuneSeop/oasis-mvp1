# OASIS Relational Participation Restore Audit v0.9

## Scope

This branch restores an existing OASIS participation-state idea and connects it to the current flow/responsibility work:

`current relational flow f_t + responsibility movement -> participation state u_t`

The intended state topology is:

`non-participating <-> candidate <-> participating`

This branch does not add a new RPG-role system and does not use the v0.8 scripted `action/recovery/oversight` demand labels.

## What was recovered from earlier GitHub work

Earlier party-based OASIS code already made participation depend on current world conditions, individual characteristics, relation history, and later measured relation-caused participation transitions separately from candidate expansion and choice transition.

Two relevant historical commits are:

- `a0e7dfb...` — `Refactor MVP to party-based movement and participation`
- `335ded9...` — `Separate relation expansion, participation, choice transition and completed spiral`

The old implementation is useful evidence that participation-state reconfiguration was already part of the project. However, it also contained fixed thresholds and hand-tuned weights such as danger cutoffs, HP cutoffs, and role weights. Those numeric rules are not restored as canonical OASIS because later audits already identified fixed thresholds/weights as implementation contamination.

Therefore v0.9 restores the participation-state structure, not the obsolete numeric policy.

## v0.8 correction

v0.8 introduced explicit functional demand labels:

- `action`
- `recovery`
- `oversight`

Those labels can become a hidden answer key if a scenario author decides in advance that a healer or supervisor is needed.

v0.9 removes those demand inputs entirely.

Companion/healer/goddess remain only descriptive aliases for capabilities:

- `act` -> companion-like capability
- `recover` -> healer-like capability
- `oversee` -> goddess-like capability

Capability does not itself force participation.

## Current relational participation rule

The current active relational flows are treated as a relational hypergraph.

1. An entity directly sharing a current relation with `self` is a current participant.
2. An entity connected indirectly through current relations is a participation candidate.
3. A responsibility `rise` can widen participation from direct relations to currently reachable relational candidates.
4. A responsibility `fall` removes only the responsibility-expanded layer; directly related participants remain while their current relation remains.
5. `same` or `incomparable` responsibility movement preserves already-expanded participation while the relational path remains current.
6. If the current relational path disappears, the participant returns to non-participating regardless of elapsed time.
7. Responsibility rise cannot admit a relationally isolated entity.

No absolute responsibility threshold is used.

## Direction and relational connectivity

The relation graph uses each current relation as a connectivity hyperedge only for determining whether an entity belongs to the current relational component.

This does not erase relation direction. The original named role bindings are retained as evidence, e.g.:

`{observer:self, observed:A}`

is preserved exactly.

This distinction is important: connectivity answers whether a relation path exists; role bindings preserve how that relation is structured.

## Relation-first interpretation

The restored rule can be summarized as:

`relation first -> candidate/participant structure -> responsibility widens or relaxes participation range`

not:

`high responsibility -> summon a predefined role`

This means a goddess-like supervisor cannot appear simply because responsibility rises. A current relational path to that supervisor/oversight entity must already exist in the observable/current relational field. Likewise, a healer-like participant is not activated by a scripted `recovery` label; it participates when its current relational position admits it, and its recovery capability can later affect possibility construction.

## Kill-search conclusion

Dynamic event-triggered multi-agent control, adaptive autonomy, and human-autonomy teaming already contain mechanisms where changing system state, uncertainty, or reliability alters communication, leadership, or human involvement.

Therefore OASIS should not claim novelty for dynamic participation or adaptive oversight by itself.

The narrower OASIS question is whether current relational structure plus responsibility dynamics can reorganize `u_t`, and whether the resulting participation-state change creates/removes/recombines possibilities in `C_t` without relying on fixed action lists, scripted role demand, or task-answer labels.

## Falsification result

Exact JavaScript logic was executed locally from the same source structure:

`oasis-relational-participation-v0.9: 14/14 tests passed`

Tests cover:

1. direct current relation -> participation;
2. indirect relation -> candidate;
3. responsibility rise -> relationally reachable candidate expansion;
4. responsibility rise cannot admit isolated participants;
5. expanded participation persists while current relation persists;
6. responsibility fall demotes expanded participation but preserves direct participation;
7. relation loss causes exit independent of elapsed time;
8. participant name does not determine functional role;
9. healer-like capability can participate without scripted recovery demand;
10. goddess-like capability can participate through relation + responsibility expansion without scripted oversight demand;
11. one entity can carry multiple functional capabilities;
12. directional role bindings remain preserved;
13. multi-party relations are handled as relational hyperedges;
14. current relation reachability has no fixed hop/time threshold.

## Critical limitation

v0.9 consumes `responsibilityMovement` (`rise/fall/same/incomparable`) from upstream. It does not yet implement the canonical patent-stage mapping:

`Z_t^resp = {U_t, I_t, V_t, T_t} ∪ A_t`

`rho_t = H_resp(Z_t^resp, C_hat_t)`

Therefore v0.9 completes the missing participation bridge but does not by itself prove the full responsibility algorithm.

## Next integration target

Do not invent another participant-selection rule.

The next integration target is only:

`M_t -> O_t -> f_t`

`existing patent responsibility causes -> rho movement`

`current relation graph + rho movement -> u_t`  [implemented here]

`u_t + current relations + reactivated past relations -> C_t`

The next code should therefore focus on the existing responsibility-cause bridge or on `u_t -> C_t`, depending on which patent-stage operator is already sufficiently specified to implement without new arbitrary assumptions.
