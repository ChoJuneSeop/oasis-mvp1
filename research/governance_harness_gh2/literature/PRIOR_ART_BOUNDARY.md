# Stage 4 — Prior research review and boundary

This review is for experimental differentiation, not a novelty opinion.

## Meaningful Human Control
Santoni de Sio & van den Hoven (2018), *Meaningful Human Control over Autonomous Systems: A Philosophical Account*, identifies tracking and tracing conditions linking autonomous-system behavior to relevant human reasons and responsibility. Later operationalization work translates MHC toward engineering requirements.

Boundary: GH-2 does not allocate human moral or legal responsibility. It tests whether an internal governance responsibility representation is causally placed between current possibilities and realization.

## Safe / constrained / risk-sensitive decision making
Safe RL and constrained MDP work modifies optimization criteria, reward/cost constraints, risk measures, or exploration. Representative sources include García & Fernández (2015) and later CVaR/chance-constrained work.

Boundary: GH-2 has no reward objective, learned policy, cumulative cost, CVaR, or fixed safety threshold. U/I/V/T is not a scalar optimization objective.

## Multi-objective / Pareto decision making
Multi-objective MDP research studies Pareto fronts over competing objectives.

Boundary: GH-2 borrows only a non-dominance concept for a frozen experimental responsibility operator. It does not claim Pareto optimization itself as novel and does not define U/I/V/T as cumulative objectives.

## Ethical governors and machine ethics
Arkin, Ulam & Duncan (2009) demonstrated an ethical governor that constrains lethal action according to explicit ethical rules. Machine-ethics/planning literature also evaluates moral permissibility of actions or plans.

Boundary: GH-2 is not a rule-of-engagement filter or ethical-permissibility classifier. Its target is current-context candidate-specific responsibility binding, including explicit nonselection provenance and a non-sticky control.

## Dynamic accountability and provenance
Recent work such as DyRAE (2026), PROV-AGENT (2025), and reasoning-provenance frameworks addresses real-time ethical accountability and structured agent provenance.

Boundary: these are close comparison targets. GH-2 therefore makes no novelty claim at this stage. The experimental differentiation target is the full sequence: **actual possibility formation -> candidate-specific non-scalar U/I/V/T -> responsibility-bound selection/nonselection provenance -> single realization**, with record-only/permuted/stale causal ablations.

## Sources recorded for the paper track
- Santoni de Sio, F. & van den Hoven, J. (2018). Frontiers in Robotics and AI 5:15.
- Abbink et al. (2022). *Meaningful human control: actionable properties for AI system development*. AI and Ethics.
- Calvert (2025). *Principles and Framework for the Operationalisation of Meaningful Human Control Over Autonomous Systems*. Science and Engineering Ethics.
- García, J. & Fernández, F. (2015). *A Comprehensive Survey on Safe Reinforcement Learning*. JMLR 16.
- Li, Ju & Shroff (2024). *How to Find the Exact Pareto Front for Multi-Objective MDPs?*
- Arkin, Ulam & Duncan (2009). *An Ethical Governor for Constraining Lethal Action in an Autonomous System*. GIT-GVU-09-02.
- Lindner, Mattmüller & Nebel (2019). *Moral Permissibility of Action Plans*. AAAI.
- PROV-AGENT (IEEE eScience 2025).
- DyRAE (ICCSC 2026).

A dedicated patent novelty search remains separate from this research comparison and is not inferred from this review.
