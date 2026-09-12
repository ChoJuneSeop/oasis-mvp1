from dataclasses import fields
from research.carla_v22_harness_v11.canonical_harness import PresentObservation
from research.oasis_core_v11.carla_domain_policy_v1 import ContinuousUVITResponsibilityOperator
from research.oasis_core_v11.current_relational_core import ResponsibilityVector
from research.oasis_core_v12.contracts import CurrentEvidence, CurrentFrame

class FrameCompatibilityError(RuntimeError):
    pass

def _evidence(evidence_id, field_name, observation, tau):
    return CurrentEvidence(evidence_id, field_name, getattr(observation, field_name), tau, tau)

def current_frame_from_host(observation: PresentObservation, *, tau: float, revision: str) -> CurrentFrame:
    items = [_evidence(f'observation:{f.name}', f.name, observation, tau) for f in fields(PresentObservation)]
    items.extend((
        _evidence('current:lane-heading', 'local_heading_error_deg', observation, tau),
        _evidence('current:local-participation', 'local_density', observation, tau),
        _evidence('observation:heading-error', 'local_heading_error_deg', observation, tau),
    ))
    if observation.front_present:
        items.extend((
            _evidence('current:front-longitudinal', 'front_closing_mps', observation, tau),
            _evidence('observation:front-present', 'front_present', observation, tau),
        ))
    if observation.local_heading_error_deg > 0:
        items.append(_evidence('observation:positive-heading-offset', 'local_heading_error_deg', observation, tau))
    elif observation.local_heading_error_deg < 0:
        items.append(_evidence('observation:negative-heading-offset', 'local_heading_error_deg', observation, tau))
    return CurrentFrame(observation, tau, revision, tuple(items))

class V12ResponsibilityEvidenceAdapter:
    def __init__(self, base=None):
        self.base = base or ContinuousUVITResponsibilityOperator()

    def evaluate(self, **kwargs):
        vector = self.base.evaluate(**kwargs)
        evidence = dict(vector.evidence)
        for name in vector.additional:
            if name == 'heading_magnitude':
                evidence[name] = ('observation:heading-error',)
            elif name not in evidence or not isinstance(evidence[name], (tuple, list)):
                raise FrameCompatibilityError(f'missing current evidence mapping: {name}')
        return ResponsibilityVector(
            vector.uncertainty,
            vector.impact,
            vector.irreversibility,
            vector.time_constraint,
            dict(vector.additional),
            evidence,
        )
