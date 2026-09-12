"""별도 통합 과정 소스 검증 / separate-process source verification."""
import hashlib
import json
from pathlib import Path


def verify():
    root=Path(__file__).resolve().parents[2]
    manifest=json.loads((root/'research/choice_responsibility_v01/SOURCE_MANIFEST.json').read_text())
    for group in ('preserved_sources','integration_sources'):
        for name,digest in manifest[group].items():
            if hashlib.sha256((root/name).read_bytes()).hexdigest()!=digest:
                raise RuntimeError('source mismatch: '+name)
    assert manifest['separate_process'] is True
    assert manifest['experimental_evidence'] is False
    return {'separate_integration_source_manifest':'PASS','experimental_evidence':False}


if __name__=='__main__':
    print(json.dumps(verify()))
