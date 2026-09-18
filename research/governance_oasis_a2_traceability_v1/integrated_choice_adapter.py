from __future__ import annotations

from copy import deepcopy
from dataclasses import asdict, is_dataclass
from typing import Any, Mapping, Sequence

from .adapter import DecisionBoundaryTap, DecisionInputEnvelope
from .canonical import domain_digest
from .ledger import ReferenceLedger


PRODUCTION_CHOICE_PATH = "research/choice_responsibility_v01/integration.py"
PRODUCTION_CHOICE_BLOB_SHA = "cc49c976db4494d7d25a2c6347fd80f651b3e056"
PRODUCTION_CHOICE_CALL = (
    "self.preference_operator.choose(context=deepcopy(context), eligible_ids=eligible)"
)


def _plain(value: Any) -> Any:
    if is_dataclass(value):
        return _plain(asdict(value))
    if isinstance(value, Mapping):
        return {str(k): _plain(v) for k, v in value.items()}
    if isinstance(value, (tuple, list)):
        return [_plain(v) for v in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return repr(value)


def extract_consumed_envelopes(context: Any) -> tuple[DecisionInputEnvelope, ...]:
    """Extract CE-derived inputs that actually cross IntegratedChoiceCore's choice boundary.

    The function reads only the current ChoiceContext presented to the production
    preference operator. It never consults the OASIS system trace. Multiple relation
    elements from one Completed Experience are aggregated under that CE identity.
    """
    inputs = getattr(context, "inputs", None)
    evaluation = getattr(inputs, "evaluation", None)
    if evaluation is None:
        raise ValueError("choice context lacks inputs.evaluation")

    contributions = tuple(getattr(evaluation, "contributions", ()) or ())
    reconstructions = tuple(getattr(evaluation, "reconstructions", ()) or ())

    buckets: dict[str, dict[str, Any]] = {}
    ordered_relation_elements: list[str] = []
    first_seen: list[str] = []

    def bucket_for(source: Any) -> tuple[str, dict[str, Any]]:
        experience_id = str(getattr(source, "experience_id", ""))
        relation_element_id = str(getattr(source, "relation_element_id", ""))
        if not experience_id or not relation_element_id:
            raise ValueError("CE source lacks experience/relation identity")
        if relation_element_id not in ordered_relation_elements:
            ordered_relation_elements.append(relation_element_id)
        if experience_id not in buckets:
            first_seen.append(experience_id)
            buckets[experience_id] = {
                "semantics": [],
                "relations": [],
                "reconstructions": [],
            }
        return experience_id, buckets[experience_id]

    for bound in contributions:
        source = getattr(bound, "source", None)
        if source is None:
            raise ValueError("bound contribution lacks source")
        experience_id, bucket = bucket_for(source)
        semantic = getattr(bound, "semantic", None)
        contribution = getattr(bound, "contribution", None)
        bucket["semantics"].append(_plain(semantic))
        bucket["relations"].append(
            {
                "relation_element_id": str(getattr(source, "relation_element_id")),
                "relation_descriptor": _plain(getattr(source, "relation_descriptor", {})),
                "possibility_id": str(getattr(contribution, "possibility_id", "")),
                "current_relation_ids": list(
                    getattr(contribution, "current_relation_ids", ()) or ()
                ),
                "role_trace": list(getattr(contribution, "role_trace", ()) or ()),
                "generated_possibilities": list(
                    getattr(contribution, "generated_possibilities", ()) or ()
                ),
                "trace": _plain(getattr(contribution, "trace", {})),
            }
        )

    for reconstruction in reconstructions:
        for link in tuple(getattr(reconstruction, "source_links", ()) or ()):
            source = getattr(link, "source", None)
            if source is None:
                raise ValueError("reconstruction provenance link lacks source")
            experience_id, bucket = bucket_for(source)
            bucket["reconstructions"].append(
                {
                    "relation_element_id": str(getattr(source, "relation_element_id")),
                    "possibility_id": str(getattr(reconstruction, "possibility_id", "")),
                    "distribution_effect": getattr(link, "distribution_effect", None),
                    "participation_roles": list(
                        getattr(link, "participation_roles", ()) or ()
                    ),
                    "generated_possibilities": list(
                        getattr(link, "generated_possibilities", ()) or ()
                    ),
                    "contribution_trace": _plain(
                        getattr(link, "contribution_trace", {})
                    ),
                }
            )

    if not first_seen:
        return ()

    order_digest = domain_digest(
        "A2_INTEGRATED_CHOICE_ORDER_V1",
        ordered_relation_elements,
    )
    envelopes = []
    for experience_id in first_seen:
        bucket = buckets[experience_id]
        envelopes.append(
            DecisionInputEnvelope(
                ce_instance_id=experience_id,
                payload_digest=domain_digest(
                    "A2_INTEGRATED_CHOICE_PAYLOAD_V1",
                    bucket["semantics"],
                ),
                relation_digest=domain_digest(
                    "A2_INTEGRATED_CHOICE_RELATION_V1",
                    {
                        "relations": bucket["relations"],
                        "reconstructions": bucket["reconstructions"],
                    },
                ),
                order_digest=order_digest,
            )
        )
    return tuple(envelopes)


class InstrumentedPreferenceOperator:
    """Transparent wrapper for IntegratedChoiceCore's production preference boundary.

    It records only the independent reference-plane DECISION_INPUT_CONSUMED events.
    Candidate, revalidation and participation observations must come from their own
    upstream runtime boundaries; they are intentionally not inferred here.
    """

    def __init__(self, inner: Any, ledger: ReferenceLedger):
        self._inner = inner
        self._tap = DecisionBoundaryTap(ledger)

    def choose(self, *, context: Any, eligible_ids: Sequence[str]) -> str:
        envelopes = extract_consumed_envelopes(context)
        frozen_eligible = tuple(str(x) for x in eligible_ids)
        return self._tap.invoke(
            lambda _envelopes: self._inner.choose(
                context=deepcopy(context),
                eligible_ids=frozen_eligible,
            ),
            envelopes,
        )
