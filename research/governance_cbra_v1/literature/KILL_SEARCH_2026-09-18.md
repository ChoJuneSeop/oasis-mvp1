# CBRA Kill Search — 2026-09-18

Status: KILL_SEARCH_COMPLETE / BROAD_CLAIMS_NARROWED

This search is a technical prior-art kill search, not a legal patentability opinion and not a claim of exhaustive worldwide search.

## Search target

Attempt to kill the broad proposition that CBRA is novel merely because an agent:

- stores failed experiences,
- reflects on outcomes,
- updates memory,
- retains provenance/audit logs,
- continuously monitors decisions,
- or uses past failures to improve later behavior.

## Strong overlap found

### Reflexion — Shinn et al., NeurIPS 2023
https://arxiv.org/abs/2303.11366

Stores verbal self-reflection in episodic memory and uses feedback from prior trials to improve later trajectories.

**Kills:** broad "failure feedback stored in episodic memory changes later decisions."

### Generative Agents — Park et al., UIST 2023
https://arxiv.org/abs/2304.03442

Stores complete experience records, synthesizes reflections, and retrieves memories dynamically for later planning.

**Kills:** broad "experience record + reflection + later retrieval."

### MemGPT — Packer et al., 2023
https://arxiv.org/abs/2310.08560

Long-horizon dynamic memory management for agents.

**Kills:** broad "long-horizon external agent memory management."

### A-MEM — Xu et al., NeurIPS 2025
https://arxiv.org/abs/2502.12110

New memories can trigger updates to contextual representations and attributes of historical memories.

**Kills:** broad "new experience causes historical memory evolution."

### Hindsight — Latimer et al., 2025
https://arxiv.org/abs/2512.12818

Structured retain/recall/reflect memory with evolving beliefs and traceable updates.

**Kills:** broad "structured traceable belief/memory re-evaluation over time."

### From Agent Traces to Trust — Wang et al., 2026
https://arxiv.org/abs/2606.04990

Surveys evidence tracing and execution provenance connecting observations, memory, actions and outputs.

**Kills:** broad "agent decision provenance/evidence tracing is itself distinctive."

### Reasoning Provenance for Autonomous AI Agents — Vispute, 2026
https://arxiv.org/abs/2603.21692

Structured reasoning provenance, versioned plans, revision rationale and evidence chains.

**Kills:** broad "structured decision-reason provenance."

### When Do Agent Loops Mistake Stagnation for Progress? — Park & Choi, 2026
https://arxiv.org/abs/2607.25152

Shows that externally grounded real-world verification is structurally important for long-running agent loops.

**Kills:** broad "post-action external verification is distinctive."

## Strong patent overlap found

### CN120542459A — memory-learning collaborative agent decision model
Priority 2025-05-22
https://patents.google.com/patent/CN120542459A/en

Memory credibility is dynamically evaluated and memory participates in a circular feedback decision mechanism.

**Kills:** broad "dynamic memory credibility + feedback loop."

### US20260119479A1 — multi-agent AI system with shared experience repository
https://patents.google.com/patent/US20260119479A1/en

Stores inputs/actions/outcomes and supports replay/self-play/retrospective scoring according to long-term criteria.

**High-risk overlap. Kills:** broad "completed experiences are retrospectively scored/updated and reused."

### US12626064B2 / US20250328735A1 — meta-reflection for language agents
https://patents.google.com/patent/US12626064B2/en

Stores self-reflection in episodic memory and uses past reflections to improve later trajectories.

**Kills:** broad "reflection memory improves future behavior."

### CN121636323A — agent memory audit using dual time axes
https://patents.google.com/patent/CN121636323A/en

Applies temporal auditing and traceability to agent memory.

**Kills:** broad "time-aware auditable agent memory."

### CN121094123B — continuous selected-action alignment audit
https://patents.google.com/patent/CN121094123B/en

Continuously audits selected actions, traces evidence and can adjust subsequent audit/intervention.

**Kills:** broad "continuous action audit with evidence tracing."

## Surviving technical differentiation candidate

The search did **not** identify one source that clearly discloses the entire following combination as one causal governance mechanism:

1. prior experience participation YES **and** NO are both first-class preserved decision provenance;
2. selected **and nonselected** candidate grounds are preserved;
3. nonparticipation/nonselection are revalidated only for evidentiary consistency, without inventing unrealized counterfactual outcomes;
4. responsibility is revalidated separately across U/I/V/T rather than collapsed to one reward/reliability score;
5. later evidence is causally typed as decision-linked, exogenous, mixed or unresolved;
6. revalidation occurs only after Closure and is append-only and temporally ordered;
7. historical revalidation is not overwritten into one permanent memory score;
8. a later Governance decision reads only past checkpoints and recomputes relevance in its **current relation/context**;
9. revised experience is not globally deleted and may re-enter when the current relation/scope changes.

This combination is the CBRA defensible research boundary. It is not a conclusion of legal novelty or inventive step.

## Consequence for experiment

The experiment must **not** test merely whether "failure memory helps."

It must isolate whether the above provenance-preserving bidirectional mechanism produces a distinguishable later-governance effect compared with:

- the same Governance path without CBRA influence, and
- a general history/logging harness without selective bidirectional provenance revalidation.

The experiment must include exogenous and delayed failures so that a trivial "bad outcome -> suppress memory" rule cannot pass.
