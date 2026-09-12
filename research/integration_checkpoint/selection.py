from research.oasis_core_v11.carla_domain_policy_v1 import ParetoThenDistributionChoiceOperator

class ParetoContextPreference:
    def __init__(self, base=None):
        self.base = base or ParetoThenDistributionChoiceOperator()

    def choose(self, *, context, eligible_ids):
        eligible = set(eligible_ids)
        ev = context.inputs.evaluation
        candidates = tuple(c for c in ev.candidates if c.possibility_id in eligible)
        if not candidates:
            raise RuntimeError('no eligible current candidate')
        responsibilities = {c.possibility_id: ev.responsibilities[c.possibility_id] for c in candidates}
        distribution = {c.possibility_id: ev.possibility_distribution[c.possibility_id] for c in candidates}
        contributions = tuple(x for x in ev.contributions if x.contribution.possibility_id in eligible)
        return self.base.choose(
            observation=ev.observation,
            candidates=candidates,
            distribution=distribution,
            responsibilities=responsibilities,
            contributions=contributions,
        )
