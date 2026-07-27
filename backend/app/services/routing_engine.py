import heapq
import logging
from typing import Dict, Any, List, Tuple, Optional

logger = logging.getLogger(__name__)

class SmartCityRoutingEngine:
    def __init__(self):
        # 6-Junction graph topology
        # Junctions: int-1 to int-6
        # Edges model typical urban grid connection lengths in meters
        self.base_graph = {
            "int-1": {"int-2": 450.0, "int-3": 600.0},
            "int-2": {"int-1": 450.0, "int-4": 550.0},
            "int-3": {"int-1": 600.0, "int-4": 400.0, "int-5": 500.0},
            "int-4": {"int-2": 550.0, "int-3": 400.0, "int-6": 650.0},
            "int-5": {"int-3": 500.0, "int-6": 480.0},
            "int-6": {"int-4": 650.0, "int-5": 480.0}
        }

    def compute_travel_time_weight(self, origin: str, destination: str, weather: str = "clear") -> float:
        """
        Dynamically adjusts traversal cost based on real-time traffic features.
        Travel Time = Distance / Speed
        """
        base_dist = self.base_graph.get(origin, {}).get(destination, 500.0)
        
        # Determine average speed based on simulated congestion
        # We query simulation manager to get real-time metrics of connecting lanes
        from backend.app.services.simulation_manager import simulation_manager
        
        vehicle_count = 0
        avg_speed = 40.0 # base speed limit in km/h
        
        # Check active lane metrics for int-1 to int-6 matching the route direction
        try:
            for j in simulation_manager.intersections:
                if j["id"] == origin:
                    # Look at lanes output directions
                    # For simplicity, average lane speeds
                    lane_metrics = [l for l in j["lanes"]]
                    if lane_metrics:
                        vehicle_count = sum(l["vehicleCount"] for l in lane_metrics)
                        avg_speed = sum(l["averageSpeed"] for l in lane_metrics) / len(lane_metrics)
        except Exception:
            pass
            
        # Apply weather slowdown factor
        weather_slowdown = 1.0
        if weather.lower() == "rain":
            weather_slowdown = 0.8 # 20% slower
        elif weather.lower() == "fog":
            weather_slowdown = 0.65 # 35% slower
            
        effective_speed = max(5.0, avg_speed * weather_slowdown)
        
        # Travel time in seconds: distance / speed (m/s)
        speed_mps = (effective_speed / 3.6)
        travel_time_sec = base_dist / speed_mps
        
        # Congestion penalty multiplier (exponential weight based on vehicle counts)
        congestion_penalty = 1.0 + (vehicle_count * 0.15)
        
        return travel_time_sec * congestion_penalty

    def calculate_shortest_route(self, origin: str, destination: str, weather: str = "clear") -> Dict[str, Any]:
        """Calculates optimal path using dynamic Dijkstra algorithm."""
        if origin not in self.base_graph or destination not in self.base_graph:
            return {"status": "error", "message": "Invalid origin or destination junction ID"}
            
        # Priority queue containing: (cost, current_node, path)
        queue = [(0.0, origin, [origin])]
        visited = set()
        
        while queue:
            (cost, node, path) = heapq.heappop(queue)
            
            if node in visited:
                continue
                
            visited.add(node)
            
            if node == destination:
                return {
                    "status": "success",
                    "route": path,
                    "estimated_travel_time_seconds": round(cost, 1),
                    "weather_condition": weather,
                    "total_junctions_passed": len(path)
                }
                
            for neighbor in self.base_graph[node]:
                if neighbor not in visited:
                    edge_cost = self.compute_travel_time_weight(node, neighbor, weather)
                    heapq.heappush(queue, (cost + edge_cost, neighbor, path + [neighbor]))
                    
        return {"status": "error", "message": "No routing path available between selected junctions."}

routing_engine = SmartCityRoutingEngine()
