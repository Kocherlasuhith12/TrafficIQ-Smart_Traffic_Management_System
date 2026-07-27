import random
import time
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.app.services.ml_service import MLService

# ─── Configuration Constants ───
FIXED_GREEN_DURATION = 30
FIXED_CYCLE_DURATION = 120

# ─── Helper Calculations ───
def calculate_wait_time(vehicle_count: float, green_duration: float, cycle_duration: float) -> int:
    if green_duration <= 0 or cycle_duration <= 0:
        return 0
    effective_green = green_duration / cycle_duration
    if effective_green >= 1.0:
        effective_green = 0.99  # Prevent division by zero
    
    congestion_factor = min(vehicle_count / 20.0, 1.0)
    denominator = 2 * (1 - effective_green * congestion_factor)
    if denominator <= 0:
        denominator = 0.01

    avg_wait = (cycle_duration * ((1 - effective_green) ** 2)) / denominator
    return max(0, round(avg_wait))

def calculate_throughput(green_duration: float, cycle_duration: float, saturation_flow: float = 0.5) -> int:
    if cycle_duration <= 0:
        return 0
    return round((green_duration / cycle_duration) * saturation_flow * 60)

def calculate_congestion_level(queue_length: float, capacity: float = 30) -> float:
    if capacity <= 0:
        return 0.0
    return min(1.0, max(0.0, queue_length / capacity))


class TimingEngine:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = {
            "minGreenTime": 5,
            "maxGreenTime": 45,
            "yellowTime": 3,
            "vehiclesPerSecond": 1,
            "speedThresholdSlow": 20,
            "speedThresholdFast": 40,
        }
        if config:
            self.config.update(config)

    def calculate_green_duration(self, vehicle_count: int) -> int:
        needed = math_ceil = int(vehicle_count / self.config["vehiclesPerSecond"])
        if vehicle_count % self.config["vehiclesPerSecond"] != 0:
            math_ceil += 1
        return max(self.config["minGreenTime"], min(self.config["maxGreenTime"], math_ceil))

    def calculate_speed_aware_duration(self, vehicle_count: int, average_speed: float) -> int:
        base_duration = self.calculate_green_duration(vehicle_count)

        speed_factor = 1.0
        if average_speed <= self.config["speedThresholdSlow"]:
            speed_factor = 1.2 + (self.config["speedThresholdSlow"] - average_speed) * 0.01
        elif average_speed >= self.config["speedThresholdFast"]:
            speed_factor = 0.85 - (average_speed - self.config["speedThresholdFast"]) * 0.005
            speed_factor = max(0.7, speed_factor)

        base_duration = round(base_duration * speed_factor)
        base_duration = min(base_duration, vehicle_count)
        
        # Weather aware duration modification (expansion during rain/fog)
        try:
            from backend.app.services.simulation_manager import simulation_manager
            weather = simulation_manager.weather.lower()
        except Exception:
            weather = "clear"
            
        weather_mult = 1.0
        if weather == "rain":
            weather_mult = 1.2
        elif weather == "fog":
            weather_mult = 1.35
            
        base_duration = round(base_duration * weather_mult)
        return max(self.config["minGreenTime"], min(self.config["maxGreenTime"], base_duration))

    def calculate_adaptive_duration(self, vehicle_count: int, average_speed: float, prediction: Optional[Dict[str, Any]] = None) -> int:
        base_duration = self.calculate_speed_aware_duration(vehicle_count, average_speed)

        if prediction:
            recommended_adjustment = prediction.get("recommendedAdjustment", 0)
            base_duration += recommended_adjustment
            upper_bound = min(
                self.config["maxGreenTime"],
                vehicle_count + max(0, recommended_adjustment)
            )
            base_duration = max(self.config["minGreenTime"], min(upper_bound, base_duration))

        return round(base_duration)


class VehicleCounter:
    def __init__(self, base_counts: Dict[str, int], noise_level: float = 0.2):
        self.base_counts = base_counts.copy()
        self.noise_level = noise_level
        self.history = []

    def get_counts(self) -> List[Dict[str, Any]]:
        counts = []
        for lane_id, base in self.base_counts.items():
            noise = int((random.random() * 2 - 1) * base * self.noise_level)
            count = max(0, base + noise)
            counts.append({
                "laneId": lane_id,
                "laneName": self.get_lane_name(lane_id),
                "count": count,
                "timestamp": int(time.time() * 1000)
            })
        self.history.append(counts)
        if len(self.history) > 30:
            self.history.pop(0)
        return counts

    def update_base_count(self, lane_id: str, count: int):
        self.base_counts[lane_id] = max(0, count)

    def get_lane_name(self, lane_id: str) -> str:
        dir_code = "".join([c for c in lane_id if c.isalpha()]).replace("lane", "")
        dir_map = {"N": "North Lane", "S": "South Lane", "E": "East Lane", "W": "West Lane"}
        return dir_map.get(dir_code, lane_id)


class SignalController:
    def __init__(self, counter: VehicleCounter, engine: TimingEngine):
        self.counter = counter
        self.engine = engine
        self.pending_emergency_lane = None
        self.emergency_active = False
        self.cycle_locked = False

    def tick(self, intersection: Dict[str, Any]) -> Dict[str, Any]:
        updated = {
            "id": intersection["id"],
            "name": intersection["name"],
            "lanes": [dict(l) for l in intersection["lanes"]],
            "activeLaneId": intersection["activeLaneId"],
            "signalState": intersection["signalState"],
            "remainingGreenTime": intersection["remainingGreenTime"],
            "cycleCount": intersection["cycleCount"]
        }

        # ── Phase 1: Countdown ──
        if updated["remainingGreenTime"] > 0:
            updated["remainingGreenTime"] -= 1
            self.cycle_locked = True

            # ── Phase 2: State transitions ──
            if updated["remainingGreenTime"] <= 0:
                if updated["signalState"] == "GREEN":
                    # Check for Public Transport (Bus) priority override extension
                    has_bus_priority = False
                    try:
                        from backend.app.services.simulation_manager import simulation_manager
                        buses = [d for d in simulation_manager.detections if d["laneId"] == updated["activeLaneId"] and d["vehicleType"] == "bus" and d.get("queuePosition", 9) <= 2]
                        if buses:
                            has_bus_priority = True
                    except Exception:
                        pass
                        
                    if has_bus_priority:
                        updated["remainingGreenTime"] = 8 # Extend green by 8s
                    else:
                        updated["signalState"] = "YELLOW"
                        updated["remainingGreenTime"] = self.engine.config["yellowTime"]
                elif updated["signalState"] == "YELLOW":
                    self.cycle_locked = False
                    updated["signalState"] = "RED"

                    # ── Phase 3: Next cycle setup ──
                    next_lane = self.select_next_lane(updated)
                    updated["activeLaneId"] = next_lane["id"]
                    updated["signalState"] = "GREEN"

                    # Refresh counts
                    counts = self.counter.get_counts()
                    for c in counts:
                        for l in updated["lanes"]:
                            if l["id"] == c["laneId"]:
                                l["vehicleCount"] = c["count"]
                                l["queueLength"] = max(0, round(c["count"] * 0.4))

                    # Calculate green time
                    next_count = 10
                    for c in counts:
                        if c["laneId"] == next_lane["id"]:
                            next_count = c["count"]
                            break
                    
                    next_speed = next_lane.get("averageSpeed", 30.0)
                    updated["remainingGreenTime"] = self.engine.calculate_speed_aware_duration(next_count, next_speed)
                    updated["cycleCount"] += 1
                    self.cycle_locked = True

        # ── Phase 4: Traffic simulation ──
        # Vehicles clear on green lanes
        for lane in updated["lanes"]:
            if lane["id"] == updated["activeLaneId"] and updated["signalState"] == "GREEN" and lane["vehicleCount"] > 0:
                lane["vehicleCount"] = max(0, lane["vehicleCount"] - 1)
                lane["queueLength"] = max(0, lane["queueLength"] - 1)
                lane["averageSpeed"] = min(55.0, lane["averageSpeed"] + 0.5)

        # Vehicles arrive on red lanes
        for lane in updated["lanes"]:
            if lane["id"] != updated["activeLaneId"]:
                if random.random() > 0.6:
                    lane["vehicleCount"] += 1
                    lane["queueLength"] = min(lane["queueLength"] + 1, 30)
                lane["averageSpeed"] = max(0.0, lane["averageSpeed"] - 0.3)

            # Speed classification and congestion status
            lane["speedCategory"] = self.classify_speed(lane["averageSpeed"])
            lane["isCongested"] = lane["vehicleCount"] > 20 and lane["averageSpeed"] < 15
            lane["isBlocked"] = lane["averageSpeed"] < 5 and lane["vehicleCount"] > 5

        return updated

    def classify_speed(self, speed: float) -> str:
        if speed < 15:
            return "slow"
        if speed > 35:
            return "fast"
        return "normal"

    def select_next_lane(self, intersection: Dict[str, Any]) -> Dict[str, Any]:
        if self.pending_emergency_lane:
            for l in intersection["lanes"]:
                if l["id"] == self.pending_emergency_lane:
                    self.emergency_active = True
                    return l

        # ── Reinforcement Learning Mode (PPO Policy selector) ──
        try:
            from backend.app.services.rl_controller import rl_controller
            if rl_controller.use_rl_mode:
                counts = [float(l["vehicleCount"]) for l in intersection["lanes"]]
                speeds = [float(l["averageSpeed"]) for l in intersection["lanes"]]
                queues = [float(l["queueLength"]) for l in intersection["lanes"]]
                
                active_idx = 0
                for idx, l in enumerate(intersection["lanes"]):
                    if l["id"] == intersection["activeLaneId"]:
                        active_idx = idx
                        break
                        
                rl_action = rl_controller.select_rl_phase(
                    counts=counts,
                    speeds=speeds,
                    queues=queues,
                    active_phase=active_idx,
                    elapsed_time=int(max(0, 30 - intersection["remainingGreenTime"]))
                )
                if 0 <= rl_action < len(intersection["lanes"]):
                    return intersection["lanes"][rl_action]
        except Exception as e:
            # Fall back gracefully to rule-based logic
            pass

        other_lanes = [l for l in intersection["lanes"] if l["id"] != intersection["activeLaneId"]]
        
        def score_lane(lane):
            # higher count + lower speed = higher score
            return lane["vehicleCount"] * (1 + max(0.0, 40.0 - lane["averageSpeed"]) / 40.0)

        if other_lanes:
            other_lanes.sort(key=score_lane, reverse=True)
            return other_lanes[0]
            
        # Fallback
        current_idx = 0
        for idx, l in enumerate(intersection["lanes"]):
            if l["id"] == intersection["activeLaneId"]:
                current_idx = idx
                break
        return intersection["lanes"][(current_idx + 1) % len(intersection["lanes"])]

    def set_emergency_override(self, lane_id: Optional[str]):
        self.pending_emergency_lane = lane_id
        if not lane_id:
            self.emergency_active = False

    def is_emergency_active(self) -> bool:
        return self.emergency_active
