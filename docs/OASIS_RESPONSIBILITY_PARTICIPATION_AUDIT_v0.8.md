# OASIS Responsibility-Participation Coupling v0.8 Audit

## Scope

This branch implements one narrow coupling:

`responsibility movement + current functional demand -> participation state u_t`

It restores the earlier companion / healer / goddess structure as functional participation modes rather than RPG classes.

It does **not** yet implement the canonical responsibility function:

`Z_t^resp = {U_t, I_t, V_t, T_t} ∪ A_t`

`rho_t = H_resp(Z_t^resp, C_hat_t)`

That computation remains a separate unresolved algorithmic target.

## Functional participation modes

### Companion-like participation

Capability: `act`

Mode: `action-participation`

Meaning: directly participates in action / realization inside the current flow.

### Healer-like participation

Capability: `recover`

Mode: `recovery-participation`

Meaning: participates when the current flow contains a recovery / mitigation demand.

### Goddess-like participation

Capability: `oversee`

Mode: `supervisory-participation`

Meaning: higher-order observation / supervision that can enter when responsibility is rising and oversight is currently relevant.

The words companion, healer, and goddess are descriptive aliases only. Runtime logic is capability-based, not name-based or RPG-class-based.

## Coupling rule

1. Direct action demand can activate participants capable of `act`.
2. Recovery demand can activate participants capable of `recover`.
3. Oversight demand alone does not automatically activate a supervisor.
4. A responsibility `rise` while oversight is relevant admits participants capable of `oversee`.
5. Once admitted, supervisory participation remains while that same oversight demand remains in the current flow.
6. When the oversight demand disappears, supervisory participation exits.
7. Multiple functional participation modes can coexist.
8. One participant can satisfy multiple modes if it actually has the corresponding capabilities.
9. No participant is forced into `u_t` when the current flow has no matching demand.

## Why no fixed responsibility threshold is used

The model does not use rules such as:

`rho > 0.7 -> goddess`

or

`damage > 0.5 -> healer`.

The supervisor is coupled to a responsibility direction change plus an actually present oversight demand. Recovery participation is coupled to a current recovery demand. This avoids adding arbitrary absolute thresholds at this layer.

## v0.7 semantic correction

v0.7 represented responsibility as a component-wise resource-allocation vector to test only the mathematical behavior of a relative trough and renewed rise.

That representation is **not canonical rho**.

Patent-stage OASIS structure places uncertainty, impact, irreversibility, temporal constraint, and adaptive responsibility variables upstream of `rho`, while search / verification / computation are consequences that responsibility can regulate.

Therefore v0.8 consumes only the already-resolved responsibility movement (`rise`, `fall`, `same`, `incomparable`) and does not pretend to have solved `H_resp`.

## Kill-search conclusion

Adaptive human oversight, risk-aware intervention, and managed-autonomy research already vary supervisory involvement according to uncertainty, risk, or system reliability. Therefore selective supervisory escalation itself is not an OASIS novelty claim.

The narrower OASIS hypothesis is that responsibility dynamics reorganize the broader participation state `u_t`, and that this changed participation can subsequently change the current relational possibility-combination space rather than merely approve or veto a fixed action.

This distinction must be tested rather than assumed.

## Falsification result

Local equivalent execution:

`oasis-responsibility-participation-v0.8: 12/12 tests passed`

Tests cover:

1. action-capable participation;
2. recovery-capable participation without forced responsibility escalation;
3. no automatic supervisor from oversight demand alone;
4. supervisor admission on responsibility rise + oversight relevance;
5. supervisor persistence while oversight remains relevant;
6. supervisor exit when oversight relevance disappears;
7. simultaneous action / recovery / supervision;
8. participant names do not determine function;
9. one participant can occupy multiple functional modes;
10. participation-mode changes are explicit transitions;
11. no current demand means no forced participant;
12. unknown task-like semantic demand is rejected rather than silently interpreted.

## Critical construct-validity warning

The current prototype receives functional demands (`action`, `recovery`, `oversight`) as inputs.

If those demands are manually scripted using the desired answer, this layer becomes another hidden answer key.

Therefore the next validation target is not to add more participant rules. It is to derive these participation demands from current observed relational flow and responsibility causes without task-success labels or future information.

## Next target

The next coherent chain is:

`M_t -> O_t -> f_t`

`f_t + current uncertainty / impact / irreversibility / temporal constraint / adaptive variables`

`-> rho_t movement`

`-> u_t participation reconfiguration`

`-> C_t possibility-combination change`

Only after this chain works without scripted answer labels should participation be used inside OASIS judgment experiments.
