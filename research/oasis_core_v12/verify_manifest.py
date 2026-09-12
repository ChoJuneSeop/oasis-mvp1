"""소스 고정 확인 / source freeze verification, never efficacy validation."""
import hashlib
import json
from pathlib import Path


def verify():
    root = Path(__file__).resolve().parents[2]
    manifest = json.loads((root/'research/oasis_core_v12/SOURCE_MANIFEST.json').read_text())
    for group in ('preserved_sources', 'supplement_sources'):
        for name, expected in manifest[group].items():
            path = root / name
            actual = hashlib.sha256(path.read_bytes()).hexdigest()
            if actual != expected:
                raise RuntimeError(f'source mismatch: {name}')
    assert manifest['experimental_evidence'] is False
    assert manifest['real_carla_execution'] == 'BLOCKED_UNTIL_DOMAIN_POLICY_ADMISSION'
    return {'source_manifest': 'PASS', 'experimental_evidence': False}


if __name__ == '__main__':
    print(json.dumps(verify()))
