# Pre-execution gates

Run `python -m research.governance_harness_gh1l.admission.preflight`.

The gate runs GH-1 frozen-artifact verification, Core regression, GH-1L admission,
scenario validity, evaluator leakage, Gap validity, RNG isolation, fresh-process
isolation, archive/hash freeze, scenario/seed/run-order freeze, confirmatory-reuse
blocking, counterfactual non-actuation, and logging completeness. It writes only the
readiness record; it does not execute pilot or confirmatory runs.
