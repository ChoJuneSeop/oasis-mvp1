from __future__ import annotations

from dataclasses import asdict
import json
from pathlib import Path

from .canonical import domain_digest
from .models import ArmFixture


def _h(domain: str, value: object) -> str:
    return domain_digest(domain, value)


def build_default_fixtures() -> tuple[ArmFixture, ...]:
    current = _h("A2_WORLD_V1", {"scene": "matched-current-flow-v1"})
    core = _h("A2_CORE_V1", {"core": "source-freeze"})
    possibilities = _h("A2_POSSIBILITIES_V1", ["continue-flow", "yield-space"])
    same_payload = _h("A2_PAYLOAD_V1", {"semantic": "matched-ce-payload"})
    base_relation = _h("A2_RELATION_V1", {"relation": "intact"})
    ablated_relation = _h("A2_RELATION_V1", {"relation": "ablated"})
    base_order = _h("A2_ORDER_V1", ["CE-1", "CE-2", "CE-3"])
    permuted_order = _h("A2_ORDER_V1", ["CE-2", "CE-1", "CE-3"])

    return (
        ArmFixture(
            "I0",
            "A2-I",
            current,
            core,
            possibilities,
            same_payload,
            ("CE-A",),
            base_relation,
            base_order,
        ),
        ArmFixture(
            "I1",
            "A2-I",
            current,
            core,
            possibilities,
            same_payload,
            ("CE-B",),
            base_relation,
            base_order,
        ),
        ArmFixture(
            "R0",
            "A2-R",
            current,
            core,
            possibilities,
            same_payload,
            ("CE-R",),
            base_relation,
            base_order,
        ),
        ArmFixture(
            "R1",
            "A2-R",
            current,
            core,
            possibilities,
            same_payload,
            ("CE-R",),
            ablated_relation,
            base_order,
        ),
        ArmFixture(
            "O0",
            "A2-O",
            current,
            core,
            possibilities,
            same_payload,
            ("CE-1", "CE-2", "CE-3"),
            base_relation,
            base_order,
        ),
        ArmFixture(
            "O1",
            "A2-O",
            current,
            core,
            possibilities,
            same_payload,
            ("CE-1", "CE-2", "CE-3"),
            base_relation,
            permuted_order,
        ),
        ArmFixture(
            "N1",
            "A2-N",
            current,
            core,
            possibilities,
            same_payload,
            ("CE-DECOY",),
            base_relation,
            base_order,
            "N1_REVALIDATION_NO",
        ),
        ArmFixture(
            "N2",
            "A2-N",
            current,
            core,
            possibilities,
            same_payload,
            ("CE-DECOY",),
            base_relation,
            base_order,
            "N2_NOT_PARTICIPATED",
        ),
        ArmFixture(
            "N3",
            "A2-N",
            current,
            core,
            possibilities,
            same_payload,
            ("CE-DECOY",),
            base_relation,
            base_order,
            "N3_PARTICIPATED_NOT_CONSUMED",
        ),
    )


def _diff_fields(left: ArmFixture, right: ArmFixture) -> set[str]:
    ignored = {"arm_id", "contrast_id"}
    a = asdict(left)
    b = asdict(right)
    return {key for key in a if key not in ignored and a[key] != b[key]}


def validate_fixture_isolation(fixtures: tuple[ArmFixture, ...]) -> tuple[str, ...]:
    by_id = {fixture.arm_id: fixture for fixture in fixtures}
    errors: list[str] = []

    required = {"I0", "I1", "R0", "R1", "O0", "O1", "N1", "N2", "N3"}
    missing = sorted(required - set(by_id))
    if missing:
        return (f"missing fixtures={missing}",)

    expected_pair_diffs = {
        ("I0", "I1"): {"identity_binding"},
        ("R0", "R1"): {"relation_digest"},
        ("O0", "O1"): {"order_digest"},
    }
    for pair, expected in expected_pair_diffs.items():
        actual = _diff_fields(by_id[pair[0]], by_id[pair[1]])
        if actual != expected:
            errors.append(f"{pair[0]}/{pair[1]} diff={sorted(actual)} expected={sorted(expected)}")

    negatives = [by_id["N1"], by_id["N2"], by_id["N3"]]
    common_fields = (
        "current_observation_hash",
        "core_hash",
        "possibility_set_hash",
        "payload_semantic_hash",
        "identity_binding",
        "relation_digest",
        "order_digest",
    )
    for field in common_fields:
        if len({getattr(item, field) for item in negatives}) != 1:
            errors.append(f"negative controls differ on frozen field={field}")

    stages = {item.negative_stage for item in negatives}
    expected_stages = {
        "N1_REVALIDATION_NO",
        "N2_NOT_PARTICIPATED",
        "N3_PARTICIPATED_NOT_CONSUMED",
    }
    if stages != expected_stages:
        errors.append(f"negative stages={sorted(str(x) for x in stages)}")

    return tuple(errors)



def load_frozen_fixtures(path: Path | None = None) -> tuple[ArmFixture, ...]:
    path = path or (Path(__file__).resolve().parent / "SCENARIO_FIXTURES.json")
    raw = json.loads(path.read_text(encoding="utf-8"))
    if raw.get("schema") != "governance-oasis-a2-scenario-fixtures-v1":
        raise ValueError("unsupported A2 fixture schema")
    fixtures = []
    for item in raw.get("fixtures", ()):
        fixtures.append(
            ArmFixture(
                arm_id=str(item["arm_id"]),
                contrast_id=str(item["contrast_id"]),
                current_observation_hash=str(item["current_observation_hash"]),
                core_hash=str(item["core_hash"]),
                possibility_set_hash=str(item["possibility_set_hash"]),
                payload_semantic_hash=str(item["payload_semantic_hash"]),
                identity_binding=tuple(str(x) for x in item["identity_binding"]),
                relation_digest=str(item["relation_digest"]),
                order_digest=str(item["order_digest"]),
                negative_stage=(
                    None if item.get("negative_stage") is None else str(item["negative_stage"])
                ),
            )
        )
    result = tuple(fixtures)
    errors = validate_fixture_isolation(result)
    if errors:
        raise ValueError("frozen fixture isolation failed: " + "; ".join(errors))
    return result
