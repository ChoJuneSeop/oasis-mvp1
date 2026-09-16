# Stage 4 — Prior work and boundary review

## Scope
This review is used to prevent GH-3 from rebranding known feedback-learning, reflection-memory, continual-learning, or post-deployment monitoring mechanisms as Outcome-based Revalidation. It is a research-boundary review, not a novelty or patentability opinion.

## 1. Reflexion — Shinn et al. (2023)
`Reflexion: Language Agents with Verbal Reinforcement Learning` stores linguistic reflections derived from task feedback in episodic memory and reuses those reflections in later trials without model-weight updates.

### Overlap
- later decisions can use information derived from earlier task outcomes;
- explicit memory/feedback can alter subsequent behavior without parameter fine-tuning.

### GH-3 boundary
GH-3 does not treat task feedback as free-form reflection or reinforcement. The feedback is generated only after a realized action is followed by host-authoritative post-observation and Closure, and it is a typed revalidation of specific prior governance judgments (`Gap`, each participation/nonparticipation decision, choice, responsibility). It is relation/provenance-bound, cannot act in the same epoch, and is not a positive/negative reward memory.

Reference: Noah Shinn et al., arXiv:2303.11366.

## 2. Self-Refine — Madaan et al. (2023)
`Self-Refine: Iterative Refinement with Self-Feedback` iteratively generates feedback on an output and refines that output at inference time without supervised training or RL.

### Overlap
- feedback can alter a later generation step without model parameter updates.

### GH-3 boundary
Self-Refine is an intra-task iterative refinement loop and the generator itself provides the feedback. GH-3 requires an externalized realized-world transition, authoritative post-observation, Closure, provenance-preserving revalidation, and a later governance epoch. Same-epoch iterative correction is explicitly outside the GH-3 primary causal path.

Reference: Aman Madaan et al., arXiv:2303.17651.

## 3. CRITIC — Gou et al. (2023)
`CRITIC: Large Language Models Can Self-Correct with Tool-Interactive Critiquing` uses external tools to evaluate model outputs and iteratively revise them.

### Overlap
- external evidence can be used to evaluate and change a subsequent output.

### GH-3 boundary
CRITIC validates/refines generated content. GH-3 revalidates a previously realized governance decision only after realisation provenance and Closure, preserves the original decision unchanged, and stores typed judgment status for possible later governance use rather than rewriting the completed decision.

Reference: Zhibin Gou et al., arXiv:2305.11738.

## 4. Voyager — Wang et al. (2023)
`Voyager: An Open-Ended Embodied Agent with Large Language Models` uses environment feedback, execution errors, self-verification, and an ever-growing skill library to improve later behavior.

### Overlap
- embodied environmental outcomes can influence later agent behavior;
- acquired experience can persist across future decisions.

### GH-3 boundary
Voyager's objective is open-ended skill acquisition and improvement. GH-3 isolates a narrower governance mechanism: post-Closure revalidation of named prior judgments, provenance-bound feedback, and a controlled later-decision causal ablation. The primary GH-3 contrast excludes newly committed CE reuse so that skill/experience accumulation cannot explain the effect.

Reference: Guanzhi Wang et al., arXiv:2305.16291.

## 5. Generative Agents — Park et al. (2023)
`Generative Agents: Interactive Simulacra of Human Behavior` stores experience records, synthesizes reflections, and retrieves memories dynamically for future planning.

### Overlap
- past experience and reflection can influence later behavior;
- memory retrieval is dynamic rather than equivalent to parameter retraining.

### GH-3 boundary
Generative Agents rank/retrieve memories for believable simulation and synthesize higher-level reflections. GH-3 prohibits global memory importance/reward scoring in the experimental mechanism and instead tests relation/provenance-specific categorical revalidation produced only after a completed realized process.

Reference: Joon Sung Park et al., arXiv:2304.03442.

## 6. Experience replay / continual learning
Experience replay methods preserve and replay past observations or trajectories to train a continually learning model and reduce forgetting.

### Overlap
- completed experience can affect future decisions.

### GH-3 boundary
Primary GH-3 does not train model parameters, replay examples into an optimizer, or sample from a buffer according to learned importance. Newly committed CE decision reuse is disabled in the primary contrast. Only provenance-bound revalidation feedback differs across experimental arms.

Reference: David Rolnick et al., `Experience Replay for Continual Learning`, arXiv:1811.11682.

## 7. Post-deployment AI monitoring and NIST AI RMF
NIST AI RMF and its Playbook emphasize lifecycle risk management, monitoring deployed systems, evaluating real-world impacts, documenting errors/near-misses, and responding to post-deployment evidence. NIST AI 800-4 (2026) further identifies the importance and current methodological gaps of deployed-AI monitoring, including human-AI feedback loops.

### Overlap
- real-world outcomes should be monitored after deployment;
- observed impacts should inform risk-management decisions and response.

### GH-3 boundary
These are governance/risk-management frameworks and monitoring practices at the organizational/system lifecycle level. GH-3 is an executable decision-layer causal mechanism: one realized decision is closed, its prior judgments are typed and revalidated with provenance, and the effect of that feedback on a later matched governance epoch is experimentally ablated.

References: NIST AI 100-1 (AI RMF 1.0); NIST AI RMF Playbook; NIST AI 800-4 (2026).

## Boundary conclusion
The closest technical overlap is outcome/feedback-informed later behavior without mandatory model-weight updates, especially Reflexion and embodied lifelong-agent systems. Those works mean GH-3 cannot claim novelty merely from “learning from outcomes,” “using past feedback,” “reflection,” “memory,” or “post-deployment monitoring.”

The defensible GH-3 research object is narrower and compositional:

`one realized governance decision -> authoritative post observation -> Closure -> typed revalidation of specific prior judgments -> immutable relation/provenance-bound feedback -> no same-epoch use -> controlled later-governance exposure/withholding/permutation while new-CE reuse is held out`

Stage 4 status: `PRIOR_WORK_IDENTIFIED / OVERLAP_ACKNOWLEDGED / GH3_CAUSAL_OBJECT_NARROWED`.
