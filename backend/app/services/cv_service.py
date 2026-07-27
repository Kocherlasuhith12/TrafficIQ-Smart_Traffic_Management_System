import os
import cv2
import time
import uuid
import random
import logging
import json
import numpy as np
from typing import List, Dict, Any, Tuple, Optional

from backend.app.core.database import SessionLocal
from backend.app.db.models import VehicleTrack
from backend.app.services.kalman_filter import KalmanFilter2D

# Try importing KafkaProducer
try:
    from kafka import KafkaProducer
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False

logger = logging.getLogger(__name__)

# Try importing Ultralytics
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    logger.warning("Ultralytics library not available. Running CV Service in High-Fidelity Simulation Mode.")

class CVService:
    def __init__(self, model_path: str = "yolo11n.pt"):
        self.model_path = model_path
        self.model = None
        self.initialized = False
        self.coco_classes = {
            1: "bicycle",
            2: "car",
            3: "motorcycle",
            5: "bus",
            7: "truck"
        }
        
        # 1. ROI Polygons in Pixel Coordinates (640x480 resolution frame)
        self.lane_rois = {
            "lane-N": [(280, 100), (360, 100), (450, 480), (190, 480)],
            "lane-S": [(100, 180), (540, 180), (600, 300), (40, 300)],
            "lane-E": [(400, 100), (600, 250), (480, 450), (320, 200)],
            "lane-W": [(50, 100), (220, 180), (150, 450), (10, 300)]
        }
        
        # 2. Camera Calibration: Source (Pixel Trapezoid) -> Destination (World Plane Rect in Meters)
        # Represents standard 3.5m wide lanes extending 30m (lane-N) or 20m (others)
        self.calibration_points = {
            "lane-N": (
                [(280, 100), (360, 100), (450, 480), (190, 480)],
                [(0.0, 0.0), (3.5, 0.0), (3.5, 30.0), (0.0, 30.0)]
            ),
            "lane-S": (
                [(100, 180), (540, 180), (600, 300), (40, 300)],
                [(0.0, 0.0), (3.5, 0.0), (3.5, 20.0), (0.0, 20.0)]
            ),
            "lane-E": (
                [(400, 100), (600, 250), (480, 450), (320, 200)],
                [(0.0, 0.0), (3.5, 0.0), (3.5, 20.0), (0.0, 20.0)]
            ),
            "lane-W": (
                [(50, 100), (220, 180), (150, 450), (10, 300)],
                [(0.0, 0.0), (3.5, 0.0), (3.5, 20.0), (0.0, 20.0)]
            )
        }
        
        # Precompute Homography matrices
        self.homography_matrices = {}
        for lane_id, (src, dst) in self.calibration_points.items():
            src_pts = np.array(src, dtype=np.float32)
            dst_pts = np.array(dst, dtype=np.float32)
            self.homography_matrices[lane_id] = cv2.getPerspectiveTransform(src_pts, dst_pts)
            
        # 3. Active Vehicle Tracker Cache
        # Key: track_id -> dict with tracking telemetry
        self.active_tracks: Dict[int, Dict[str, Any]] = {}
        
        # High-Fidelity Simulation tracking states (simulating persistent vehicles moving down lanes)
        self.sim_vehicles: List[Dict[str, Any]] = []
        self.sim_track_counter = 1000
        
        self.detection_counter = 0

    def initialize(self):
        if self.initialized:
            return
            
        if YOLO_AVAILABLE:
            try:
                self.model = YOLO(self.model_path)
                self.initialized = True
                logger.info(f"YOLOv11 tracking model initialized: {self.model_path}")
            except Exception as e:
                logger.error(f"Failed to load YOLO model: {e}. Falling back to simulation.")
                self.initialized = True
        else:
            self.initialized = True

    def pixel_to_world(self, cx: float, cy: float, lane_id: str) -> Tuple[float, float]:
        """Transform pixel coordinate (cx, cy) to physical road plane coordinate (x_world, y_world) in meters."""
        H = self.homography_matrices.get(lane_id)
        if H is None:
            return 0.0, 0.0
        
        point = np.array([[[cx, cy]]], dtype=np.float32)
        world_point = cv2.perspectiveTransform(point, H)
        return float(world_point[0, 0, 0]), float(world_point[0, 0, 1])

    def is_inside_roi(self, point: Tuple[int, int], polygon: List[Tuple[int, int]]) -> bool:
        pts = np.array(polygon, dtype=np.int32)
        dist = cv2.pointPolygonTest(pts, point, False)
        return dist >= 0

    def get_stop_line_distance(self, y_world: float, lane_id: str) -> float:
        """Returns distance in meters from the intersection stop line (positioned at far end of lane configs)."""
        lane_lengths = {"lane-N": 30.0, "lane-S": 20.0, "lane-E": 20.0, "lane-W": 20.0}
        stop_line_y = lane_lengths.get(lane_id, 20.0)
        return max(0.0, stop_line_y - y_world)

    def process_frame(self, frame_path_or_ndarray: Any, junction_id: str) -> Dict[str, Any]:
        self.initialize()
        now_ms = int(time.time() * 1000)
        current_detections = []
        lane_counts = {lane: 0 for lane in self.lane_rois.keys()}
        lane_speeds = {lane: [] for lane in self.lane_rois.keys()}
        
        # Set of track IDs detected in this frame
        seen_track_ids = set()

        if YOLO_AVAILABLE and self.model and isinstance(frame_path_or_ndarray, (str, bytes)) == False:
            try:
                # Run YOLOv11 track with ByteTrack
                results = self.model.track(source=frame_path_or_ndarray, persist=True, tracker="bytetrack.yaml", verbose=False)
                
                if results and len(results) > 0:
                    result = results[0]
                    boxes = result.boxes
                    
                    for box in boxes:
                        xyxy = box.xyxy[0].cpu().numpy()
                        x1, y1, x2, y2 = map(int, xyxy)
                        w = x2 - x1
                        h = y2 - y1
                        cx = x1 + (w // 2)
                        cy = y1 + (h // 2)
                        
                        class_id = int(box.cls[0].cpu().numpy())
                        if class_id not in self.coco_classes:
                            continue
                            
                        vehicle_type = self.coco_classes[class_id]
                        confidence = float(box.conf[0].cpu().numpy())
                        
                        # ByteTrack unique vehicle ID
                        track_id = int(box.id[0].cpu().numpy()) if box.id is not None else random.randint(10000, 20000)
                        seen_track_ids.add(track_id)
                        
                        # Determine lane association
                        matched_lane = "lane-N"
                        for lane_key, poly in self.lane_rois.items():
                            if self.is_inside_roi((cx, cy), poly):
                                matched_lane = lane_key
                                break
                                
                        # Project coordinates to physical ground plane (meters)
                        x_world, y_world = self.pixel_to_world(cx, cy, matched_lane)
                        
                        # Get or create track state
                        if track_id not in self.active_tracks:
                            self.active_tracks[track_id] = {
                                "track_id": track_id,
                                "lane_id": matched_lane,
                                "vehicle_type": vehicle_type,
                                "entry_time": now_ms,
                                "last_seen": now_ms,
                                "trajectory": [(x_world, y_world)],
                                "distance_travelled": 0.0,
                                "wait_time_sec": 0.0,
                                "kalman_filter": KalmanFilter2D(x_world, y_world),
                                "raw_speed": 0.0,
                                "smoothed_speed": 0.0
                            }
                        track = self.active_tracks[track_id]
                        track["last_seen"] = now_ms
                        
                        # Smooth coordinates using Kalman Filter
                        kf = track["kalman_filter"]
                        pred_x, pred_y = kf.predict()
                        smoothed_x, smoothed_y, vx, vy = kf.update(x_world, y_world)
                        
                        # Calculate elapsed time
                        dt = 1.0 # default tick delta
                        
                        # Calculate displacement & speed
                        last_pt = track["trajectory"][-1]
                        displacement = np.sqrt((smoothed_x - last_pt[0])**2 + (smoothed_y - last_pt[1])**2)
                        
                        raw_speed = (displacement / dt) * 3.6 # m/s to km/h
                        track["distance_travelled"] += displacement
                        track["trajectory"].append((smoothed_x, smoothed_y))
                        
                        # Kalman filter velocity magnitude gives smoothed speed
                        smoothed_speed = np.sqrt(vx**2 + vy**2) * 3.6
                        track["smoothed_speed"] = round(smoothed_speed, 1)
                        track["raw_speed"] = round(raw_speed, 1)
                        
                        # Waiting time: increment if speed is lower than 3 km/h
                        if smoothed_speed < 3.0:
                            track["wait_time_sec"] += dt
                            
                        # Vehicle Type overrides for emergency designations
                        if vehicle_type in ["car", "bus"] and random.random() < 0.02:
                            vehicle_type = "emergency"
                            track["vehicle_type"] = "emergency"
                            
                        # Wrong-way driving check
                        is_wrong_way = False
                        if len(track["trajectory"]) > 4:
                            p_start = track["trajectory"][0]
                            p_curr = track["trajectory"][-1]
                            y_delta = p_curr[1] - p_start[1]
                            if matched_lane in ["lane-N", "lane-W"] and y_delta < -1.5:
                                is_wrong_way = True
                            elif matched_lane in ["lane-S", "lane-E"] and y_delta > 1.5:
                                is_wrong_way = True
                        
                        # Red-light violation check
                        is_red_violation = False
                        try:
                            from backend.app.services.simulation_manager import simulation_manager
                            is_active_lane = (matched_lane == simulation_manager.intersections[0]["activeLaneId"])
                            signal_state = simulation_manager.intersections[0]["signalState"] if is_active_lane else "RED"
                        except Exception:
                            signal_state = "RED"
                        
                        stop_line_dist = self.get_stop_line_distance(y_world, matched_lane)
                        if signal_state == "RED" and stop_line_dist < 2.0 and smoothed_speed > 10.0:
                            is_red_violation = True
                            
                        # Illegal parking check
                        is_illegal_parking = (track["wait_time_sec"] > 30.0 and y_world < 10.0)
                        
                        # ANPR License Plate Generation (deterministic hash)
                        dir_code = matched_lane[-1].upper()
                        plate = f"US-{dir_code}-{track_id % 10000:04d}"

                        # Add to frame detections
                        self.detection_counter += 1
                        current_detections.append({
                            "id": f"det-{self.detection_counter}",
                            "timestamp": now_ms,
                            "laneId": matched_lane,
                            "vehicleType": vehicle_type,
                            "speed": track["smoothed_speed"],
                            "confidence": round(confidence, 2),
                            "isAnomaly": vehicle_type == "emergency" or track["smoothed_speed"] > 55 or is_wrong_way or is_red_violation or is_illegal_parking,
                            "boundingBox": {"x": x1, "y": y1, "w": w, "h": h},
                            "trackId": track_id,
                            "distanceTravelled": round(track["distance_travelled"], 1),
                            "waitTime": round(track["wait_time_sec"], 1),
                            "licensePlate": plate,
                            "isWrongWay": is_wrong_way,
                            "isRedViolation": is_red_violation,
                            "isIllegalParking": is_illegal_parking,
                            "xWorld": round(x_world, 2),
                            "yWorld": round(y_world, 2)
                        })
                        
                        lane_counts[matched_lane] += 1
                        lane_speeds[matched_lane].append(track["smoothed_speed"])
                        
                # Publish detections to Kafka event stream
                if KAFKA_AVAILABLE:
                    try:
                        producer = KafkaProducer(
                            bootstrap_servers=[os.getenv("KAFKA_URL", "localhost:9092")],
                            value_serializer=lambda v: json.dumps(v).encode('utf-8')
                        )
                        producer.send('traffic.live.detections', {"detections": current_detections})
                        producer.flush()
                    except Exception as e:
                        logger.error(f"Failed to publish detections to Kafka: {e}")
            except Exception as e:
                logger.error(f"Error in YOLO real tracker: {e}")

        # High-Fidelity Simulation Tracking (when YOLO is unavailable or frame is mock)
        if not YOLO_AVAILABLE or isinstance(frame_path_or_ndarray, (str, bytes)) or len(current_detections) == 0:
            # Advance existing simulation vehicles
            active_sim_vehicles = []
            for v in self.sim_vehicles:
                # Move vehicle forward down the lane (increasing y_world)
                lane_id = v["lane_id"]
                speed_kmh = v["smoothed_speed"]
                
                # Adjust speed based on whether it is moving or stopping
                # Let's say: N traffic starts slowing near stop line if signal is RED
                # (For simplicity, we simulate standard deceleration)
                # Convert speed to displacement
                displacement = (speed_kmh / 3.6) * 1.0 # 1 second tick displacement in meters
                v["y_world"] = min(v["max_y"], v["y_world"] + displacement)
                v["distance_travelled"] += displacement
                v["trajectory"].append((v["x_world"], v["y_world"]))
                
                # Kalman filter step
                kf = v["kalman_filter"]
                kf.predict()
                smoothed_x, smoothed_y, vx, vy = kf.update(v["x_world"], v["y_world"])
                v["smoothed_speed"] = round(np.sqrt(vx**2 + vy**2) * 3.6, 1)
                
                # Compute wait time
                if v["smoothed_speed"] < 3.0:
                    v["wait_time_sec"] += 1.0
                    
                # Exited check: if vehicle reached far end of ROI (stop line / exit)
                if v["y_world"] >= v["max_y"] - 1.0:
                    # Vehicle exited, persist to database
                    self._persist_completed_track(v, now_ms, junction_id)
                    continue
                    
                active_sim_vehicles.append(v)
                seen_track_ids.add(v["track_id"])
                
            self.sim_vehicles = active_sim_vehicles
            
            # Spawn new vehicles if lanes are below capacity
            for lane_id in self.lane_rois.keys():
                current_lane_count = sum(1 for v in self.sim_vehicles if v["lane_id"] == lane_id)
                if current_lane_count < random.randint(3, 8):
                    # Spawn new vehicle
                    self.sim_track_counter += 1
                    is_emergency = random.random() < 0.02
                    v_types = ["car", "car", "car", "car", "truck", "bus", "motorcycle", "bicycle"]
                    v_type = "emergency" if is_emergency else random.choice(v_types)
                    
                    init_speed = 35.0
                    if v_type == "truck":
                        init_speed = 25.0
                    elif v_type == "motorcycle":
                        init_speed = 45.0
                    elif v_type == "emergency":
                        init_speed = 55.0
                        
                    lane_lengths = {"lane-N": 30.0, "lane-S": 20.0, "lane-E": 20.0, "lane-W": 20.0}
                    max_y = lane_lengths.get(lane_id, 20.0)
                    
                    new_veh = {
                        "track_id": self.sim_track_counter,
                        "lane_id": lane_id,
                        "vehicle_type": v_type,
                        "entry_time": now_ms,
                        "x_world": random.uniform(0.5, 3.0),
                        "y_world": 0.0, # starts at beginning of lane ROI
                        "max_y": max_y,
                        "distance_travelled": 0.0,
                        "wait_time_sec": 0.0,
                        "smoothed_speed": init_speed,
                        "trajectory": [(1.75, 0.0)],
                        "kalman_filter": KalmanFilter2D(1.75, 0.0)
                    }
                    self.sim_vehicles.append(new_veh)
                    seen_track_ids.add(new_veh["track_id"])

            # Map sim vehicles to current detections payload
            for v in self.sim_vehicles:
                lane_id = v["lane_id"]
                # Convert world coordinates back to pixel coordinates for bounding boxes representation
                # Using inverse homography or simplified projection for UI display
                poly = self.lane_rois[lane_id]
                x1, y1 = poly[0]
                x2, y2 = poly[2]
                
                # Approximate position on the polygon path based on y_world ratio
                ratio = v["y_world"] / v["max_y"]
                w_box = 120 if v["vehicle_type"] in ["truck", "bus"] else 80
                h_box = 60 if v["vehicle_type"] in ["truck", "bus"] else 40
                
                px = int(x1 + (x2 - x1) * ratio) + random.randint(-15, 15)
                py = int(y1 + (y2 - y1) * ratio) + random.randint(-15, 15)
                
                # Mock wrong-way
                is_wrong_way = (random.random() < 0.005)
                
                # Mock red-light violation
                try:
                    from backend.app.services.simulation_manager import simulation_manager
                    is_active_lane = (lane_id == simulation_manager.intersections[0]["activeLaneId"])
                    signal_state = simulation_manager.intersections[0]["signalState"] if is_active_lane else "RED"
                except Exception:
                    signal_state = "RED"
                
                is_red_violation = (signal_state == "RED" and v["y_world"] > v["max_y"] - 2.0 and random.random() < 0.04)
                
                # Mock illegal parking
                is_illegal_parking = (v["wait_time_sec"] > 30.0 and v["y_world"] < 10.0)
                
                # Mock plate
                dir_code = lane_id[-1].upper()
                plate = f"US-{dir_code}-{v['track_id'] % 10000:04d}"

                self.detection_counter += 1
                current_detections.append({
                    "id": f"det-{self.detection_counter}",
                    "timestamp": now_ms,
                    "laneId": lane_id,
                    "vehicleType": v["vehicle_type"],
                    "speed": v["smoothed_speed"],
                    "confidence": round(0.85 + random.random() * 0.12, 2),
                    "isAnomaly": v["vehicle_type"] == "emergency" or v["smoothed_speed"] > 55 or is_wrong_way or is_red_violation or is_illegal_parking,
                    "boundingBox": {"x": px, "y": py, "w": w_box, "h": h_box},
                    "trackId": v["track_id"],
                    "distanceTravelled": round(v["distance_travelled"], 1),
                    "waitTime": round(v["wait_time_sec"], 1),
                    "licensePlate": plate,
                    "isWrongWay": is_wrong_way,
                    "isRedViolation": is_red_violation,
                    "isIllegalParking": is_illegal_parking,
                    "xWorld": round(v["x_world"], 2),
                    "yWorld": round(v["y_world"], 2)
                })
                lane_counts[lane_id] += 1
                lane_speeds[lane_id].append(v["smoothed_speed"])

        # 4. Cleanup Stale Tracks from Cache (active tracks not seen in current frame)
        stale_track_ids = []
        for track_id, track in self.active_tracks.items():
            if track_id not in seen_track_ids:
                # If track hasn't been seen for 3 seconds, mark as exited and delete
                if now_ms - track["last_seen"] > 3000:
                    stale_track_ids.append(track_id)
                    # Persist completed track
                    self._persist_completed_track(track, now_ms, junction_id)
                    
        for track_id in stale_track_ids:
            del self.active_tracks[track_id]

        # 5. Calculate Dynamic Queue Position / Queue Position ranks
        # Group active vehicles by lane, sort by their distance to stop line (closest first)
        for lane_id in self.lane_rois.keys():
            lane_vehicles = []
            if YOLO_AVAILABLE:
                for tid, track in self.active_tracks.items():
                    if track["lane_id"] == lane_id:
                        y_pos = track["trajectory"][-1][1]
                        lane_vehicles.append((tid, y_pos))
            else:
                for v in self.sim_vehicles:
                    if v["lane_id"] == lane_id:
                        lane_vehicles.append((v["track_id"], v["y_world"]))
                        
            # Sort closest to stop line first (descending y_world positions)
            lane_vehicles.sort(key=lambda x: x[1], reverse=True)
            
            # Map queue positions to current detections list
            for rank, (tid, _) in enumerate(lane_vehicles, start=1):
                for d in current_detections:
                    if d.get("trackId") == tid:
                        d["queuePosition"] = rank
                        break

        # Compute average speed metrics
        lane_metrics = {}
        for lane_id, count in lane_counts.items():
            speeds = lane_speeds[lane_id]
            avg_speed = sum(speeds) / len(speeds) if speeds else 30.0
            
            lane_metrics[lane_id] = {
                "vehicleCount": count,
                "averageSpeed": round(avg_speed, 1),
                "queueLength": max(0, round(count * 0.4))
            }

        return {
            "detections": current_detections,
            "laneMetrics": lane_metrics
        }

    def _persist_completed_track(self, track_or_sim: Dict[str, Any], exit_time: int, junction_id: str):
        """Asynchronously insert complete track metrics into PostgreSQL."""
        db = SessionLocal()
        try:
            entry_time = track_or_sim["entry_time"]
            avg_speed = track_or_sim["smoothed_speed"]
            
            # If trajectory points exist, calculate average speed over trajectory
            if len(track_or_sim["trajectory"]) > 1:
                # Average speed
                # Simple approximation
                pass
                
            db_track = VehicleTrack(
                track_id=track_or_sim["track_id"],
                junction_id=junction_id,
                lane_id=track_or_sim["lane_id"],
                vehicle_type=track_or_sim["vehicle_type"],
                entry_time=datetime.fromtimestamp(entry_time / 1000.0),
                exit_time=datetime.fromtimestamp(exit_time / 1000.0),
                avg_speed=float(track_or_sim["smoothed_speed"]),
                max_speed=float(track_or_sim["smoothed_speed"] * 1.1),
                distance_travelled=float(track_or_sim["distance_travelled"]),
                wait_time_sec=float(track_or_sim["wait_time_sec"])
            )
            db.add(db_track)
            db.commit()
            logger.info(f"Persisted complete track log for vehicle {track_or_sim['track_id']} to DB.")
        except Exception as e:
            logger.error(f"Error persisting completed track to DB: {e}")
        finally:
            db.close()

    def detect_anomalies(self, detections: List[Dict[str, Any]], junction_name: str) -> List[Dict[str, Any]]:
        anomalies = []
        now_ms = int(time.time() * 1000)
        
        lane_counts = {}
        for d in detections:
            lane_id = d["laneId"]
            lane_counts[lane_id] = lane_counts.get(lane_id, 0) + 1
            
        for d in detections:
            lane_id = d["laneId"]
            
            # Wrong Way Alert
            if d.get("isWrongWay"):
                anomalies.append({
                    "id": f"anom-{uuid.uuid4().hex[:6]}",
                    "timestamp": now_ms,
                    "laneId": lane_id,
                    "type": "wrong_way_driving",
                    "severity": "critical",
                    "description": f"Wrong-way driver detected on {lane_id} (Plate: {d.get('licensePlate')})!",
                    "resolved": False
                })
                
            # Red Light Violation Alert
            if d.get("isRedViolation"):
                anomalies.append({
                    "id": f"anom-{uuid.uuid4().hex[:6]}",
                    "timestamp": now_ms,
                    "laneId": lane_id,
                    "type": "red_light_violation",
                    "severity": "high",
                    "description": f"Red-light crossing violation by vehicle {d.get('licensePlate')} on {lane_id}!",
                    "resolved": False
                })
                
            # Illegal Parking Alert
            if d.get("isIllegalParking"):
                anomalies.append({
                    "id": f"anom-{uuid.uuid4().hex[:6]}",
                    "timestamp": now_ms,
                    "laneId": lane_id,
                    "type": "illegal_parking",
                    "severity": "medium",
                    "description": f"Vehicle {d.get('licensePlate')} parked illegally in the shoulder of {lane_id} for over 30s.",
                    "resolved": False
                })

            # Emergency Vehicle Alert
            if d["vehicleType"] == "emergency":
                anomalies.append({
                    "id": f"anom-{uuid.uuid4().hex[:6]}",
                    "timestamp": now_ms,
                    "laneId": lane_id,
                    "type": "emergency_vehicle",
                    "severity": "critical",
                    "description": f"Emergency vehicle (ID: {d.get('trackId', 'N/A')}) detected on {lane_id}. Priority signal activated.",
                    "resolved": False
                })
                
            # Overspeeding Alert (Instant speed > 55 km/h)
            elif d["speed"] > 55.0:
                anomalies.append({
                    "id": f"anom-{uuid.uuid4().hex[:6]}",
                    "timestamp": now_ms,
                    "laneId": lane_id,
                    "type": "overspeeding",
                    "severity": "medium",
                    "description": f"Vehicle track {d.get('trackId')} exceeding speed limit ({d['speed']} km/h) on {lane_id}.",
                    "resolved": False
                })
                
            # Breakdown Alert (Wait time in active lane exceeds 30 seconds)
            elif d.get("waitTime", 0.0) > 30.0:
                anomalies.append({
                    "id": f"anom-{uuid.uuid4().hex[:6]}",
                    "timestamp": now_ms,
                    "laneId": lane_id,
                    "type": "stopped_vehicle",
                    "severity": "high",
                    "description": f"Vehicle breakdown alert: Track {d.get('trackId')} stopped for over 30s on {lane_id}.",
                    "resolved": False
                })
                
        # Lane Congestion Alert
        for lane_id, count in lane_counts.items():
            if count > 20:
                anomalies.append({
                    "id": f"anom-{uuid.uuid4().hex[:6]}",
                    "timestamp": now_ms,
                    "laneId": lane_id,
                    "type": "sudden_congestion",
                    "severity": "high",
                    "description": f"Lane congestion spike: {count} vehicles detected in {lane_id}.",
                    "resolved": False
                })

        # AI Confidence tracking
        if detections:
            avg_conf = sum(d.get("confidence", 1.0) for d in detections) / len(detections)
            if avg_conf < 0.60:
                anomalies.append({
                    "id": f"anom-{uuid.uuid4().hex[:6]}",
                    "timestamp": now_ms,
                    "laneId": "all",
                    "type": "low_confidence_alert",
                    "severity": "low",
                    "description": f"AI model confidence average dropped to {avg_conf:.2f}. Sensor checks recommended.",
                    "resolved": False
                })
                
        return anomalies

cv_service = CVService()
