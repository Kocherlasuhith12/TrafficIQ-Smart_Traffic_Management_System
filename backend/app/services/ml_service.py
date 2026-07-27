import time
import math
from typing import List, Dict, Any

class MLService:
    @staticmethod
    def analyze_trend(history: List[int]) -> Dict[str, Any]:
        """Simple linear regression on history of counts."""
        n = len(history)
        if n < 3:
            return {"slope": 0.0, "trend": "stable"}

        x_mean = (n - 1) / 2.0
        y_mean = sum(history) / n

        numerator = 0.0
        denominator = 0.0
        for i in range(n):
            numerator += (i - x_mean) * (history[i] - y_mean)
            denominator += (i - x_mean) * (i - x_mean)

        slope = numerator / denominator if denominator != 0 else 0.0
        
        if slope > 0.5:
            trend = "increasing"
        elif slope < -0.5:
            trend = "decreasing"
        else:
            trend = "stable"
            
        return {"slope": slope, "trend": trend}

    @staticmethod
    def analyze_speed_trend(speeds: List[float]) -> Dict[str, Any]:
        """Predict speed trend to see if congestion is forming."""
        n = len(speeds)
        if n < 3:
            return {"trend": "stable", "predictedSpeed": speeds[-1] if speeds else 30.0}

        # Use same linear regression helper
        trend_res = MLService.analyze_trend(speeds)
        slope = trend_res["slope"]
        trend = trend_res["trend"]
        
        predicted_speed = max(0.0, round(speeds[-1] + slope * 2))
        
        if trend == "decreasing":
            speed_trend = "slowing"
        elif trend == "increasing":
            speed_trend = "accelerating"
        else:
            speed_trend = "stable"
            
        return {"trend": speed_trend, "predictedSpeed": predicted_speed}

    @staticmethod
    def generate_predictions(
        current_counts: List[Dict[str, Any]], 
        historical_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate ML predictions for each lane.
        current_counts: list of {laneId, count}
        historical_data: list of {laneId, vehicleCount, averageSpeed, timestamp}
        """
        predictions = []
        for entry in current_counts:
            lane_id = entry["laneId"]
            current_count = entry["count"]

            # Filter and sort historical data for this lane (last 10 points)
            lane_history = [
                h for h in historical_data 
                if h["laneId"] == lane_id
            ]
            lane_history = sorted(lane_history, key=lambda x: x["timestamp"])[-10:]

            count_history = [h["vehicleCount"] for h in lane_history]
            count_history.append(current_count)

            speed_history = [h["averageSpeed"] for h in lane_history]

            trend_res = MLService.analyze_trend(count_history)
            slope = trend_res["slope"]
            trend = trend_res["trend"]

            speed_res = MLService.analyze_speed_trend(speed_history)
            speed_trend = speed_res["trend"]
            predicted_speed = speed_res["predictedSpeed"]

            predicted_count = max(0, round(current_count + slope * 2))
            confidence = min(0.95, 0.5 + len(count_history) * 0.05)

            recommended_adjustment = 0
            if trend == "increasing":
                recommended_adjustment = min(10, round(slope * 3))
            elif trend == "decreasing":
                recommended_adjustment = max(-5, round(slope * 2))

            if speed_trend == "slowing":
                recommended_adjustment += 2
            elif speed_trend == "accelerating":
                recommended_adjustment -= 1

            predictions.append({
                "laneId": lane_id,
                "predictedCount": predicted_count,
                "predictedSpeed": predicted_speed,
                "confidence": confidence,
                "trend": trend,
                "speedTrend": speed_trend,
                "recommendedAdjustment": recommended_adjustment
            })

        return predictions

    @staticmethod
    def get_ml_insight_summary(predictions: List[Dict[str, Any]]) -> str:
        slowing = [p for p in predictions if p["speedTrend"] == "slowing"]
        increasing = [p for p in predictions if p["trend"] == "increasing"]
        decreasing = [p for p in predictions if p["trend"] == "decreasing"]

        if slowing:
            return f"Speed drop detected on {len(slowing)} lane(s) — congestion forming. Signal timing adjusted proactively."
        if len(increasing) > len(decreasing):
            return f"Traffic building up on {len(increasing)} lane(s). Signal timing extended proactively."
        elif len(decreasing) > len(increasing):
            return f"Traffic easing on {len(decreasing)} lane(s). Reducing green time to improve efficiency."
            
        return "Traffic patterns stable. Maintaining current adaptive timing."
