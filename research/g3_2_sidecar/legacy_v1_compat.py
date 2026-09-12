from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class LegacyCompatibilityReport:
    protocol_ok: bool
    harness_ok: bool
    probe_count: int
    purity_violations: int
    can_support_g32_participation: bool
    can_support_g32_reconstruction: bool
    can_support_g32_provenance: bool
    missing_fields: tuple[str, ...]

    @property
    def g31_compatible(self) -> bool:
        return self.protocol_ok and self.harness_ok and self.purity_violations == 0

    @property
    def g32_evidence_complete(self) -> bool:
        return (
            self.g31_compatible
            and self.can_support_g32_participation
            and self.can_support_g32_reconstruction
            and self.can_support_g32_provenance
        )


def audit_legacy_v1_report(report: Mapping[str, Any]) -> LegacyCompatibilityReport:
    """Audit an existing v1.0 integrity report without upgrading its evidence claims.

    The legacy report may demonstrate counterfactual purity, but it must never be
    interpreted as relation-element Participation/Reconstruction evidence when the
    required decision-time fields were not recorded.
    """
    protocol_ok = report.get("protocol") == "OASIS-CARLA Paper Validation Protocol v2.2"
    harness_ok = report.get("harness") == "OASIS-CARLA Paper Validation Harness v1.0"

    probe_count = 0
    purity_violations = 0
    for epoch in report.get("counterfactual_probe_records", ()):
        for probe in epoch.get("probes", ()):
            probe_count += 1
            if probe.get("before_hash") != probe.get("after_hash") or not probe.get("state_unchanged", False):
                purity_violations += 1

    missing = []
    required = {
        "relation_elements": False,
        "possibility_distribution": False,
        "relation_element_probes": False,
        "reconstruction": False,
        "post_realization_provenance": False,
    }
    for epoch in report.get("counterfactual_probe_records", ()):
        for key in tuple(required):
            if key in epoch:
                required[key] = True

    for key, present in required.items():
        if not present:
            missing.append(key)

    can_participate = all(required[k] for k in (
        "relation_elements",
        "possibility_distribution",
        "relation_element_probes",
    ))
    can_reconstruct = required["reconstruction"]
    can_provenance = required["post_realization_provenance"]

    return LegacyCompatibilityReport(
        protocol_ok=protocol_ok,
        harness_ok=harness_ok,
        probe_count=probe_count,
        purity_violations=purity_violations,
        can_support_g32_participation=can_participate,
        can_support_g32_reconstruction=can_reconstruct,
        can_support_g32_provenance=can_provenance,
        missing_fields=tuple(missing),
    )
