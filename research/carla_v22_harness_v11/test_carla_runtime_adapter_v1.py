import sys
import types
import unittest

from research.carla_v22_harness_v11.canonical_harness import VehicleActuation
from research.carla_v22_harness_v11.carla_runtime_adapter_v1 import (
    CARLAPresentFlowPort,
    CARLARuntimeInvariantError,
    ControlledOracleObservationGateway,
    runtime_identity,
    validate_runtime_identity,
)


class V:
    def __init__(self,x=0,y=0,z=0): self.x=x; self.y=y; self.z=z
class R:
    def __init__(self,pitch=0,yaw=0,roll=0): self.pitch=pitch; self.yaw=yaw; self.roll=roll
class T:
    def __init__(self,x=0,y=0,z=0,yaw=0): self.location=V(x,y,z); self.rotation=R(yaw=yaw)
class WP:
    def __init__(self,road=1,lane=1,yaw=0): self.road_id=road; self.lane_id=lane; self.transform=T(yaw=yaw)
class Stamp:
    def __init__(self,t): self.elapsed_seconds=t
class Snap:
    def __init__(self,frame=200,t=13.7): self.frame=frame; self.timestamp=Stamp(t)
class Control:
    throttle=0.0; brake=0.0; steer=0.0; hand_brake=False; reverse=False; gear=0; manual_gear_shift=False

class Actor:
    def __init__(self,aid,type_id,x,road=1,lane=1,vx=0):
        self.id=aid; self.type_id=type_id; self.t=T(x=x); self.road=road; self.lane=lane; self.v=V(vx,0,0); self.applied=[]
    def get_transform(self): return self.t
    def get_location(self): return self.t.location
    def get_velocity(self): return self.v
    def get_angular_velocity(self): return V()
    def get_acceleration(self): return V()
    def get_control(self): return Control()
    def apply_control(self,c): self.applied.append(c)

class Map:
    name='Town10HD_Opt'
    def __init__(self,actors): self.actors=actors
    def get_waypoint(self,loc):
        for a in self.actors:
            if a.t.location is loc: return WP(a.road,a.lane,0)
        return WP(1,1,0)
class Settings:
    synchronous_mode=True; fixed_delta_seconds=0.05; no_rendering_mode=True
class World:
    def __init__(self,actors): self.actors=actors; self.snap=Snap(); self.map=Map(actors)
    def get_snapshot(self): return self.snap
    def get_map(self): return self.map
    def get_actors(self): return list(self.actors)
    def get_settings(self): return Settings()
class Client:
    def __init__(self,client='0.9.x',server='0.9.x'): self.client=client; self.server=server
    def get_client_version(self): return self.client
    def get_server_version(self): return self.server

class RuntimeAdapterTests(unittest.TestCase):
    def setUp(self):
        self.ego=Actor(1,'vehicle.ego',0,vx=5)
        self.front=Actor(2,'vehicle.other',250,vx=3)
        self.other=Actor(3,'vehicle.side',10,road=2,lane=1,vx=1)
        self.world=World([self.ego,self.front,self.other])
        self.gateway=ControlledOracleObservationGateway(self.world,self.ego)
        self.port=CARLAPresentFlowPort(self.world,self.ego,self.gateway)

    def test_gateway_exact_schema_and_no_raw_identity_or_coordinates(self):
        data=self.gateway.observe().as_mapping()
        self.assertEqual(tuple(data),('epoch','ego_speed_mps','front_present','front_gap_m','front_closing_mps','front_kind','local_heading_error_deg','local_density'))
        self.assertFalse(any(k in data for k in ('actor_id','x','y','z','seed','trigger','trajectory','scenario_label')))

    def test_far_same_lane_actor_is_still_current_front_without_distance_cutoff(self):
        obs=self.gateway.observe()
        self.assertTrue(obs.front_present)
        self.assertGreater(obs.front_gap_m,200.0)

    def test_full_world_fingerprint_detects_unrelated_actor_mutation(self):
        before=self.port.flow_fingerprint()
        self.other.t.location.x += 1.0
        after=self.port.flow_fingerprint()
        self.assertNotEqual(before,after)

    def test_tau_is_snapshot_elapsed_time_not_frame_delta_product(self):
        self.assertEqual(self.port.current_tau(),13.7)
        self.assertNotEqual(self.port.current_tau(),200*0.05)

    def test_same_frame_second_actuation_is_rejected(self):
        fake=types.SimpleNamespace()
        class VC:
            def __init__(self,**kw): self.__dict__.update(kw)
        fake.VehicleControl=VC
        old=sys.modules.get('carla'); sys.modules['carla']=fake
        try:
            self.port.apply_single_actuation(VehicleActuation(.1,0,0))
            with self.assertRaises(CARLARuntimeInvariantError):
                self.port.apply_single_actuation(VehicleActuation(.1,0,0))
        finally:
            if old is None: sys.modules.pop('carla',None)
            else: sys.modules['carla']=old

    def test_runtime_identity_does_not_invent_missing_version(self):
        old=sys.modules.pop('carla',None)
        try:
            ident=runtime_identity(self.world)
            self.assertEqual(ident['map_name'],'Town10HD_Opt')
            self.assertTrue(ident['synchronous_mode'])
            self.assertEqual(ident['fixed_delta_seconds'],0.05)
            self.assertIsNone(ident['carla_client_version'])
            self.assertIsNone(ident['carla_server_version'])
            with self.assertRaises(CARLARuntimeInvariantError):
                validate_runtime_identity(ident)
        finally:
            if old is not None: sys.modules['carla']=old

    def test_live_identity_requires_matching_client_server_versions(self):
        ident=runtime_identity(self.world,Client('0.9.x','0.9.y'))
        with self.assertRaises(CARLARuntimeInvariantError):
            validate_runtime_identity(ident)

    def test_live_identity_accepts_protocol_runtime_without_inventing_version(self):
        ident=runtime_identity(self.world,Client('0.9.x','0.9.x'))
        checked=validate_runtime_identity(ident)
        self.assertEqual(checked['carla_client_version'],'0.9.x')
        self.assertEqual(checked['carla_server_version'],'0.9.x')
        self.assertEqual(checked['map_name'],'Town10HD_Opt')
        self.assertTrue(checked['synchronous_mode'])
        self.assertEqual(checked['fixed_delta_seconds'],0.05)

    def test_identity_rejects_wrong_map_or_async_or_wrong_delta(self):
        good=runtime_identity(self.world,Client())
        for patch in (
            {'map_name':'Town04'},
            {'synchronous_mode':False},
            {'fixed_delta_seconds':0.1},
        ):
            bad=dict(good); bad.update(patch)
            with self.assertRaises(CARLARuntimeInvariantError):
                validate_runtime_identity(bad)

if __name__=='__main__': unittest.main()
