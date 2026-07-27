import asyncio
import json
import logging
import random
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from backend.app.core.config import settings
from backend.app.core.database import SessionLocal
from backend.app.db.models import Junction, Lane as LaneModel, Detection, Anomaly, EmergencyLog, TrafficPattern
from backend.app.services.redis_service import redis_service
from backend.app.services.ml_service import MLService
from backend.app.services.cv_service import cv_service
from backend.app.core.database import get_db
from backend.app.services.prediction_ai import prediction_ai
from backend.app.services.dataset_exporter import dataset_exporter
from backend.app.services.congestion_predictor import congestion_predictor
from backend.app.services.signal_controller import (
    SignalController, VehicleCounter, TimingEngine,
    calculate_wait_time, calculate_throughput, calculate_congestion_level
)

logger = logging.getLogger(__name__)

# Scenarios configurations (matching frontend)
SCENARIOS = {
    "normal": [
        {"laneId": "lane-N", "baseCount": 10},
        {"laneId": "lane-S", "baseCount": 9},
        {"laneId": "lane-E", "baseCount": 11},
        {"laneId": "lane-W", "baseCount": 8},
    ],
    "rush-hour": [
        {"laneId": "lane-N", "baseCount": 25},
        {"laneId": "lane-S", "baseCount": 22},
        {"laneId": "lane-E", "baseCount": 18},
        {"laneId": "lane-W", "baseCount": 15},
    ],
    "imbalanced": [
        {"laneId": "lane-N", "baseCount": 30},
        {"laneId": "lane-S", "baseCount": 5},
        {"laneId": "lane-E", "baseCount": 4},
        {"laneId": "lane-W", "baseCount": 3},
    ],
    "low-traffic": [
        {"laneId": "lane-N", "baseCount": 3},
        {"laneId": "lane-S", "baseCount": 2},
        {"laneId": "lane-E", "baseCount": 4},
        {"laneId": "lane-W", "baseCount": 2},
    ],
}

def create_default_lanes(prefix: str) -> List[Dict[str, Any]]:
    # North, South, East, West lanes
    return [
        {
            "id": f"lane-N{prefix}",
            "name": "North Lane",
            "direction": "N",
            "vehicleCount": random.randint(10, 20),
            "queueLength": 4,
            "averageSpeed": float(random.randint(30, 45)),
            "speedCategory": "normal",
            "isCongested": False,
            "isBlocked": False,
        },
        {
            "id": f"lane-S{prefix}",
            "name": "South Lane",
            "direction": "S",
            "vehicleCount": random.randint(7, 15),
            "queueLength": 3,
            "averageSpeed": float(random.randint(32, 44)),
            "speedCategory": "normal",
            "isCongested": False,
            "isBlocked": False,
        },
        {
            "id": f"lane-E{prefix}",
            "name": "East Lane",
            "direction": "E",
            "vehicleCount": random.randint(12, 24),
            "queueLength": 5,
            "averageSpeed": float(random.randint(28, 43)),
            "speedCategory": "normal",
            "isCongested": False,
            "isBlocked": False,
        },
        {
            "id": f"lane-W{prefix}",
            "name": "West Lane",
            "direction": "W",
            "vehicleCount": random.randint(5, 13),
            "queueLength": 2,
            "averageSpeed": float(random.randint(35, 45)),
            "speedCategory": "normal",
            "isCongested": False,
            "isBlocked": False,
        },
    ]

def get_traffic_metrics(intersection: Dict[str, Any]) -> Dict[str, Any]:
    lanes = intersection["lanes"]
    total_vehicles = sum(l["vehicleCount"] for l in lanes)
    total_queue = sum(l["queueLength"] for l in lanes)
    avg_count = total_vehicles / len(lanes) if lanes else 0
    avg_speed = sum(l["averageSpeed"] for l in lanes) / len(lanes) if lanes else 30.0

    adaptive_cycle = len(lanes) * (intersection["remainingGreenTime"] + 3)
    avg_wait = calculate_wait_time(avg_count, intersection["remainingGreenTime"], max(adaptive_cycle, 40))
    throughput = calculate_throughput(intersection["remainingGreenTime"], max(adaptive_cycle, 40))

    avg_wait_fixed = calculate_wait_time(avg_count, FIXED_GREEN_DURATION, FIXED_CYCLE_DURATION)
    throughput_fixed = calculate_throughput(FIXED_GREEN_DURATION, FIXED_CYCLE_DURATION)
    queue_fixed = round(total_queue * 1.4)

    return {
        "averageWaitTime": avg_wait,
        "averageWaitTimeFixed": avg_wait_fixed,
        "throughput": throughput,
        "throughputFixed": throughput_fixed,
        "queueLength": total_queue,
        "queueLengthFixed": queue_fixed,
        "congestionLevel": calculate_congestion_level(total_queue, len(lanes) * 30),
        "averageSpeed": round(avg_speed),
    }

def get_junction_summary(intersection: Dict[str, Any], metrics: Dict[str, Any]) -> Dict[str, Any]:
    total_vehicles = sum(l["vehicleCount"] for l in intersection["lanes"])
    return {
        "id": intersection["id"],
        "name": intersection["name"],
        "totalVehicles": total_vehicles,
        "averageSpeed": metrics["averageSpeed"],
        "averageWaitTime": metrics["averageWaitTime"],
        "throughput": metrics["throughput"],
        "congestionLevel": metrics["congestionLevel"],
        "activeLane": intersection["activeLaneId"],
        "signalState": intersection["signalState"],
        "remainingGreenTime": intersection["remainingGreenTime"],
        "isBottleneck": metrics["congestionLevel"] > 0.6,
        "isHighFlow": metrics["throughput"] > 10 and metrics["congestionLevel"] < 0.3,
    }

def get_traffic_flow_metrics(intersection: Dict[str, Any]) -> List[Dict[str, Any]]:
    flows = []
    for lane in intersection["lanes"]:
        is_active = lane["id"] == intersection["activeLaneId"]
        speed_before = max(5.0, lane["averageSpeed"] - (0.0 if is_active else 10.0))
        speed_during = min(50.0, lane["averageSpeed"] + 8.0) if is_active else 0.0
        speed_after = min(55.0, speed_during + 5.0) if is_active else 0.0
        
        clearance_rate = 0.0
        if is_active and intersection["remainingGreenTime"] > 0:
            clearance_rate = min(2.0, lane["vehicleCount"] / max(1.0, intersection["remainingGreenTime"]))
            
        sig_efficiency = 0.0
        if is_active:
            sig_efficiency = min(1.0, clearance_rate / 1.5) * (speed_during / 50.0)

        flows.append({
            "laneId": lane["id"],
            "speedBeforeSignal": round(speed_before),
            "speedDuringGreen": round(speed_during),
            "speedAfterCrossing": round(speed_after),
            "signalEfficiency": round(sig_efficiency, 2),
            "clearanceRate": round(clearance_rate, 2),
        })
    return flows

class SimulationManager:
    def __init__(self):
        self.is_running = True
        self.active_scenario = "normal"
        self.elapsed_seconds = 0
        self.emergency_active = False
        self.emergency_lane = None
        self.emergency_duration = 0
        self.weather = "clear"
        
        # State caches
        self.intersections = []
        self.metrics = []
        self.predictions = []
        self.ml_insight = "Initializing ML analysis..."
        self.detections = []
        self.anomalies = []
        self.vehicle_distribution = {"car": 0, "truck": 0, "bus": 0, "motorcycle": 0, "bicycle": 0, "emergency": 0}
        self.average_speed = 30.0
        self.emergency_logs = []
        self.historical_data = []
        self.traffic_patterns = []
        self.current_pattern = None
        self.congestion_predictions = []
        self.carbon_co2 = 0.0
        self.carbon_co = 0.0
        self.carbon_nox = 0.0

        self.controllers = []
        self._loop_task: Optional[asyncio.Task] = None

    def initialize_simulation(self):
        """Build initial state of all 6 junctions and seed historical patterns."""
        names = [
            "Main St & 1st Ave",
            "Broadway & Oak Dr",
            "Park Ave & 5th St",
            "Central Blvd & Elm Rd",
            "Highway 7 & Ring Rd",
            "Station Rd & Lake Ave"
        ]
        
        # 1. Create Intersections and Controllers
        self.intersections = []
        self.controllers = []
        
        for idx, name in enumerate(names):
            suffix = str(idx + 1) if idx > 0 else ""
            lanes = create_default_lanes(suffix)
            
            # Initial counts map for this controller
            counts_map = {l["id"]: l["vehicleCount"] for l in lanes}
            counter = VehicleCounter(counts_map)
            engine = TimingEngine()
            controller = SignalController(counter, engine)
            self.controllers.append(controller)
            
            intersection = {
                "id": f"int-{idx + 1}",
                "name": name,
                "lanes": lanes,
                "activeLaneId": f"lane-N{suffix}",
                "signalState": "GREEN",
                "remainingGreenTime": 15 - idx * 2 if 15 - idx * 2 > 5 else 10,
                "cycleCount": 0
            }
            self.intersections.append(intersection)

        # 2. Seed Historical Data Points for ML
        self.historical_data = []
        lanes_j1 = ["lane-N", "lane-S", "lane-E", "lane-W"]
        now = int(time.time() * 1000)
        for i in range(60, 0, -1):
            timestamp = now - i * 60000
            hour = datetime.fromtimestamp(timestamp / 1000.0).hour
            rush_hour = 1.8 if (7 <= hour <= 9) or (17 <= hour <= 19) else 1.0
            
            for lane_id in lanes_j1:
                base = 8 + random.random() * 15
                count = round(base * rush_hour)
                self.historical_data.append({
                    "timestamp": timestamp,
                    "laneId": lane_id,
                    "vehicleCount": count,
                    "waitTime": round(20 + random.random() * 40 * rush_hour),
                    "greenDuration": round(15 + base * rush_hour),
                    "averageSpeed": round(40 - base * 0.5 * rush_hour + random.random() * 10)
                })

        # 3. Seed Traffic Patterns
        self.traffic_patterns = []
        for day in range(7):
            for hr in range(24):
                is_peak = (7 <= hr <= 9) or (17 <= hr <= 19)
                is_weekend = day in [0, 6]
                base_f = 0.6 if is_weekend else 1.0
                peak_f = 1.8 if is_peak else 1.0
                night_f = 0.3 if (hr >= 22 or hr <= 5) else 1.0
                
                avg_vehicles = round(15 * base_f * peak_f * night_f + random.random() * 5)
                avg_speed = max(5, round(40 - avg_vehicles * 0.8 + random.random() * 10))
                
                self.traffic_patterns.append({
                    "hour": hr,
                    "dayOfWeek": day,
                    "avgVehicles": avg_vehicles,
                    "avgSpeed": avg_speed,
                    "dominantType": "car" if avg_vehicles > 20 else ("truck" if random.random() > 0.7 else "car"),
                    "congestionProbability": min(1.0, avg_vehicles / 35.0),
                    "isPeakHour": is_peak and not is_weekend
                })
                
        # 4. Set Current Pattern
        now_dt = datetime.now()
        for p in self.traffic_patterns:
            if p["hour"] == now_dt.hour and p["dayOfWeek"] == now_dt.weekday():
                self.current_pattern = p
                break
                
        # 5. Populate initial database schemas on startup in background
        asyncio.create_task(self.sync_db_metadata())

    async def sync_db_metadata(self):
        """Seed metadata tables in DB."""
        await asyncio.sleep(1) # wait for db setup
        db = SessionLocal()
        try:
            # Add Junctions
            for j in self.intersections:
                db_junction = db.query(Junction).filter(Junction.id == j["id"]).first()
                if not db_junction:
                    db_junction = Junction(id=j["id"], name=j["name"], location="City Center")
                    db.add(db_junction)
                    db.commit()
                    
                # Add Lanes
                for l in j["lanes"]:
                    db_lane = db.query(LaneModel).filter(LaneModel.id == l["id"]).first()
                    if not db_lane:
                        db_lane = LaneModel(
                            id=l["id"],
                            junction_id=j["id"],
                            name=l["name"],
                            direction=l["direction"],
                            max_capacity=l["queueLength"] * 5
                        )
                        db.add(db_lane)
            db.commit()
        except Exception as e:
            logger.error(f"Error seeding DB Metadata: {e}")
        finally:
            db.close()

    async def start(self):
        self.initialize_simulation()
        self._loop_task = asyncio.create_task(self._simulation_loop())
        logger.info("Simulation loop started")

    async def stop(self):
        if self._loop_task:
            self._loop_task.cancel()
            try:
                await self._loop_task
            except asyncio.CancelledError:
                pass
            self._loop_task = None
            logger.info("Simulation loop stopped")

    def toggle_simulation(self):
        self.is_running = not self.is_running
        logger.info(f"Simulation is_running toggled to: {self.is_running}")

    def set_scenario(self, scenario_id: str):
        if scenario_id not in SCENARIOS:
            return
        self.active_scenario = scenario_id
        
        # Apply counts configs to Junction 1 counter (matches React logic)
        configs = SCENARIOS[scenario_id]
        controller_j1 = self.controllers[0]
        for cfg in configs:
            controller_j1.counter.update_base_count(cfg["laneId"], cfg["baseCount"])
        logger.info(f"Traffic Scenario set to: {scenario_id}")

    def trigger_emergency_override(self, lane_id: str):
        """Trigger emergency state on specific lane of Junction 1."""
        self.emergency_active = True
        self.emergency_lane = lane_id
        self.emergency_duration = 0
        self.controllers[0].set_emergency_override(lane_id)
        
        # Generate Log
        log_uuid = f"eo-{int(time.time() * 1000)}"
        self.emergency_logs.append({
            "id": log_uuid,
            "timestamp": int(time.time() * 1000),
            "laneId": lane_id,
            "junctionId": "int-1",
            "junctionName": self.intersections[0]["name"],
            "durationMs": 0,
            "resolved": False
        })
        self.emergency_logs = self.emergency_logs[-20:]
        
        # Async db write
        asyncio.create_task(self._save_emergency_log(log_uuid, lane_id, "int-1"))

    async def _save_emergency_log(self, log_uuid: str, lane_id: str, junction_id: str):
        db = SessionLocal()
        try:
            db_log = EmergencyLog(
                log_uuid=log_uuid,
                lane_id=lane_id,
                junction_id=junction_id,
                timestamp=datetime.utcnow(),
                resolved=False
            )
            db.add(db_log)
            db.commit()
        except Exception as e:
            logger.error(f"Error saving emergency log: {e}")
        finally:
            db.close()

    async def _resolve_emergency_log(self, log_uuid: str, duration_ms: int):
        db = SessionLocal()
        try:
            db_log = db.query(EmergencyLog).filter(EmergencyLog.log_uuid == log_uuid).first()
            if db_log:
                db_log.resolved = True
                db_log.duration_ms = duration_ms
                db.commit()
        except Exception as e:
            logger.error(f"Error resolving emergency log: {e}")
        finally:
            db.close()

    async def _simulation_loop(self):
        while True:
            try:
                await asyncio.sleep(1.0)
                if not self.is_running:
                    continue

                # 1. Tick signal controllers
                updated_intersections = []
                for idx, intersection in enumerate(self.intersections):
                    controller = self.controllers[idx]
                    updated_intersection = controller.tick(intersection)
                    updated_intersections.append(updated_intersection)
                self.intersections = updated_intersections

                # 2. Compute metrics & summaries
                self.metrics = [get_traffic_metrics(i) for i in self.intersections]
                
                # 3. ML Predictions and Dataset Generation (every 5 seconds)
                if self.elapsed_seconds % 5 == 0:
                    predictions = []
                    congestion_predictions = []
                    now_dt = datetime.now()
                    db = SessionLocal()
                    
                    try:
                        for l in self.intersections[0]["lanes"]:
                            is_active = l["id"] == self.intersections[0]["activeLaneId"]
                            lane_sig = self.intersections[0]["signalState"] if is_active else "RED"
                            
                            # Gather wait time from active tracks
                            wait_avg = 0.0
                            matched_dets = [d for d in self.detections if d["laneId"] == l["id"]]
                            if matched_dets:
                                wait_avg = sum(d.get("waitTime", 0.0) for d in matched_dets) / len(matched_dets)
                                
                            # Engineer features for PyTorch AI & XGBoost
                            vec = prediction_ai.engineer_features(
                                count=l["vehicleCount"],
                                speed=l["averageSpeed"],
                                queue=l["queueLength"],
                                wait=wait_avg,
                                throughput=float(self.metrics[0]["throughput"]),
                                weather=self.weather,
                                signal_state=lane_sig,
                                capacity=30.0,
                                dt_now=now_dt
                            )
                            
                            # Get multi-horizon forecast
                            fc = prediction_ai.forecast(l["id"], vec)
                            
                            # Predict Congestion using XGBoost + SHAP explainer
                            cong_res = congestion_predictor.predict_congestion(vec)
                            
                            # Log dataset entry
                            entry_data = {
                                "junction_id": "int-1",
                                "lane_id": l["id"],
                                "vehicle_count": l["vehicleCount"],
                                "average_speed": l["averageSpeed"],
                                "queue_length": l["queueLength"],
                                "weather": self.weather,
                                "day_of_week": now_dt.weekday(),
                                "hour": now_dt.hour,
                                "emergency_vehicle": self.emergency_active and self.emergency_lane == l["id"],
                                "congestion_level": l["queueLength"] / 30.0,
                                "signal_state": lane_sig,
                                "waiting_time": wait_avg,
                                "throughput": float(self.metrics[0]["throughput"]),
                                "occupancy": l["vehicleCount"] / 30.0,
                                "timestamp": now_dt
                            }
                            dataset_exporter.log_entry(db, entry_data)
                            dataset_exporter.append_to_csv_direct(entry_data)
                            
                            # Map PyTorch output to UI expected schema
                            current_count = l["vehicleCount"]
                            pred_count = fc["next_5min_count"]
                            trend = "increasing" if pred_count > current_count + 1 else ("decreasing" if pred_count < current_count - 1 else "stable")
                            
                            recommended_adj = round((fc["signal_demand_score"] - 50) / 5)
                            recommended_adj = max(-5, min(10, recommended_adj))
                            
                            predictions.append({
                                "laneId": l["id"],
                                "predictedCount": pred_count,
                                "predictedSpeed": round(l["averageSpeed"] + random.uniform(-4, 4)),
                                "confidence": fc["confidence"],
                                "trend": trend,
                                "speedTrend": "slowing" if l["averageSpeed"] < 15 else "stable",
                                "recommendedAdjustment": recommended_adj
                            })
                            
                            congestion_predictions.append({
                                "laneId": l["id"],
                                "probability": cong_res["congestion_probability"],
                                "isCongested": cong_res["is_congested"],
                                "shapValues": cong_res["shap_values"]
                            })
                            
                        self.predictions = predictions
                        self.congestion_predictions = congestion_predictions
                        self.ml_insight = f"Deep GRU Forecast: Traffic is {', '.join([p['trend'] for p in predictions[:2]])} across main directions. Custom signal adjustments queued."
                        
                    except Exception as e:
                        logger.error(f"Error in ML forecasting and logging: {e}")
                    finally:
                        db.close()

                # 4. YOLOv11 Computer Vision Detections (every 3 seconds)
                if self.elapsed_seconds % 3 == 0:
                    cv_result = cv_service.process_frame(None, "int-1")
                    all_detections = cv_result["detections"]
                    
                    # Update counts, queue lengths, and speeds on Junction 1 using real-time YOLO tracking
                    for lane in self.intersections[0]["lanes"]:
                        lane_id = lane["id"]
                        lane_metrics = cv_result["laneMetrics"].get(lane_id)
                        if lane_metrics:
                            lane["vehicleCount"] = lane_metrics["vehicleCount"]
                            lane["queueLength"] = lane_metrics["queueLength"]
                            lane["averageSpeed"] = lane_metrics["averageSpeed"]
                    
                    # Find anomalies
                    new_anomalies = cv_service.detect_anomalies(all_detections, "Main St & 1st Ave")

                    # Update history & metrics
                    self.detections = (self.detections[-50:] + all_detections)[-50:]
                    self.anomalies = (self.anomalies[-50:] + new_anomalies)[-50:]
                    
                    # Compute vehicle distribution
                    dist = {"car": 0, "truck": 0, "bus": 0, "motorcycle": 0, "bicycle": 0, "emergency": 0}
                    for d in all_detections:
                        dist[d["vehicleType"]] = dist.get(d["vehicleType"], 0) + 1
                    self.vehicle_distribution = dist
                    
                    # Compute average speed
                    if all_detections:
                        self.average_speed = round(sum(d["speed"] for d in all_detections) / len(all_detections))
                    else:
                        self.average_speed = 30.0

                    # Sync database logs for detections and anomalies
                    asyncio.create_task(self.persist_detections_and_anomalies(all_detections, new_anomalies))

                    # Check for emergency vehicle alerts
                    emergency_alerts = [a for a in new_anomalies if a["type"] == "emergency_vehicle"]
                    if emergency_alerts:
                        # Auto-trigger override
                        self.trigger_emergency_override(emergency_alerts[0]["laneId"])
                    elif self.emergency_active:
                        self.emergency_duration += 3
                        # Auto resolve after 15 seconds of clearance
                        if self.emergency_duration >= 15:
                            self.emergency_active = False
                            self.emergency_lane = None
                            self.controllers[0].set_emergency_override(None)
                            
                            # Resolve logs
                            for log in self.emergency_logs:
                                if not log["resolved"]:
                                    log["resolved"] = True
                                    duration = int(time.time() * 1000) - log["timestamp"]
                                    log["durationMs"] = duration
                                    asyncio.create_task(self._resolve_emergency_log(log["id"], duration))

                # 5. Traffic Patterns (every minute)
                if self.elapsed_seconds % 60 == 0:
                    now_dt = datetime.now()
                    for p in self.traffic_patterns:
                        if p["hour"] == now_dt.hour and p["dayOfWeek"] == now_dt.weekday():
                            self.current_pattern = p
                            break

                # ── Cumulative Carbon Footprint Estimation ──
                # Sum vehicles across all junctions
                total_vehicles = sum(l["vehicleCount"] for j in self.intersections for l in j["lanes"])
                self.carbon_co2 += total_vehicles * 0.15
                self.carbon_co += total_vehicles * 0.005
                self.carbon_nox += total_vehicles * 0.0002

                self.elapsed_seconds += 1

                # 6. Broadcast state through Redis Cache & PubSub
                live_state = self.get_current_state_payload()
                await redis_service.set_cache("traffic:live_state", live_state)
                await redis_service.publish("traffic:live", live_state)

            except Exception as e:
                logger.error(f"Error in simulation loop: {e}", exc_info=True)

    async def persist_detections_and_anomalies(self, detections: List[Dict[str, Any]], anomalies: List[Dict[str, Any]]):
        """Save detection events and anomalies to PostgreSQL db."""
        db = SessionLocal()
        try:
            for d in detections:
                db_det = Detection(
                    detection_uuid=d["id"] + "-" + str(uuid.uuid4().hex[:4]),
                    lane_id=d["laneId"],
                    vehicle_type=d["vehicleType"],
                    speed=d["speed"],
                    confidence=d["confidence"],
                    bounding_box=d["boundingBox"],
                    timestamp=datetime.utcnow()
                )
                db.add(db_det)
                
            for a in anomalies:
                db_anom = Anomaly(
                    lane_id=a["laneId"],
                    type=a["type"],
                    severity=a["severity"],
                    description=a["description"],
                    timestamp=datetime.utcnow(),
                    resolved=a["resolved"]
                )
                db.add(db_anom)
                
            db.commit()
        except Exception as e:
            logger.error(f"Error persisting live DB metrics: {e}")
        finally:
            db.close()

    def get_current_state_payload(self) -> Dict[str, Any]:
        """Shape the payload to exactly match React SimulationState."""
        junction_summaries = [
            get_junction_summary(int_s, self.metrics[idx])
            for idx, int_s in enumerate(self.intersections)
        ]
        
        from backend.app.services.rl_controller import rl_controller
        return {
            "intersections": self.intersections,
            "metrics": self.metrics,
            "predictions": self.predictions,
            "mlInsight": self.ml_insight,
            "isRunning": self.is_running,
            "activeScenario": self.active_scenario,
            "historicalData": self.historical_data,
            "elapsedSeconds": self.elapsed_seconds,
            "detections": self.detections,
            "anomalies": self.anomalies,
            "trafficPatterns": self.traffic_patterns,
            "vehicleDistribution": self.vehicle_distribution,
            "averageSpeed": self.average_speed,
            "currentPattern": self.current_pattern,
            "emergencyActive": self.emergency_active,
            "emergencyLane": self.emergency_lane,
            "junctionSummaries": junction_summaries,
            "trafficFlows": get_traffic_flow_metrics(self.intersections[0]),
            "emergencyLogs": self.emergency_logs,
            "congestionPredictions": self.congestion_predictions,
            "weather": self.weather,
            "rlMode": rl_controller.use_rl_mode,
            "carbonCO2": round(self.carbon_co2, 2),
            "carbonCO": round(self.carbon_co, 2),
            "carbonNOx": round(self.carbon_nox, 2)
        }

simulation_manager = SimulationManager()
import uuid
