from research.g3_rpfo_carla_01.protocol import verify_experiment_manifest

def verified_manifest():
    data = dict(verify_experiment_manifest())
    data["experiment_source_snapshot_commit"] = data.get(
        "experiment_source_snapshot_commit", data["source_snapshot_commit"]
    )
    return data
