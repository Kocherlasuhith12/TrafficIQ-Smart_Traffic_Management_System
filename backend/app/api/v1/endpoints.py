from fastapi import APIRouter, Depends, HTTPException, Body, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime, timedelta
import os

from backend.app.core.database import get_db
from backend.app.db.models import Detection, Anomaly, EmergencyLog
from backend.app.services.simulation_manager import simulation_manager, SCENARIOS

router = APIRouter()

@router.get("/scenarios")
def get_scenarios():
    """Return all available traffic scenarios."""
    return [
        {"id": "normal", "name": "Normal Traffic", "description": "Moderate traffic across all lanes"},
        {"id": "rush-hour", "name": "Rush Hour", "description": "Heavy traffic on main corridors"},
        {"id": "imbalanced", "name": "Imbalanced Load", "description": "One lane dominates traffic"},
        {"id": "low-traffic", "name": "Low Traffic", "description": "Late night minimal traffic"}
    ]

@router.post("/scenarios/{scenario_id}/activate")
def activate_scenario(scenario_id: str):
    """Activate a specific traffic scenario."""
    if scenario_id not in SCENARIOS:
        raise HTTPException(status_code=404, detail="Scenario not found")
    simulation_manager.set_scenario(scenario_id)
    return {"status": "success", "activeScenario": scenario_id}

@router.post("/simulation/toggle")
def toggle_simulation():
    """Toggle simulation running state (Pause / Resume)."""
    simulation_manager.toggle_simulation()
    return {"status": "success", "isRunning": simulation_manager.is_running}

@router.post("/override/emergency")
def trigger_emergency(lane_id: str = Body(..., embed=True)):
    """Trigger emergency vehicle override for a specific lane."""
    # Validate lane_id matches Junction 1 lane structure
    valid_lanes = ["lane-N", "lane-S", "lane-E", "lane-W"]
    if lane_id not in valid_lanes:
         raise HTTPException(status_code=400, detail="Invalid lane ID for emergency override")
    
    simulation_manager.trigger_emergency_override(lane_id)
    return {"status": "success", "emergencyActive": True, "emergencyLane": lane_id}

@router.get("/analytics/history")
def get_history(db: Session = Depends(get_db)):
    """Retrieve historical traffic metrics for chart visualization."""
    # Get detections count in the last 1 hour, grouped by lane
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    
    try:
        results = db.query(Detection).filter(Detection.timestamp >= one_hour_ago).all()
        # Format for charts
        data = []
        for r in results:
            data.append({
                "timestamp": int(r.timestamp.timestamp() * 1000),
                "laneId": r.lane_id,
                "vehicleCount": 1, # represent individual count event
                "speed": r.speed,
                "confidence": r.confidence
            })
            
        if not data:
            # Fallback to current memory cache for demo compatibility
            data = simulation_manager.historical_data
            
        return data
    except Exception as e:
        # Fallback to simulation manager's local historical list
        return simulation_manager.historical_data


@router.post("/ml/train")
def train_forecaster():
    """Trigger self-training on the current collected CSV dataset."""
    from backend.app.services.prediction_ai import prediction_ai
    from backend.app.services.dataset_exporter import dataset_exporter
    
    result = prediction_ai.train_on_dataset(dataset_exporter.csv_path)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.post("/ml/export")
def export_dataset(db: Session = Depends(get_db)):
    """Manually trigger database logs flush to training CSV file."""
    from backend.app.services.dataset_exporter import dataset_exporter
    csv_path = dataset_exporter.export_to_csv(db)
    return {"status": "success", "csv_path": csv_path}


@router.post("/weather/set")
def set_weather(weather: str = Body(..., embed=True)):
    """Set active weather exogenous factor (clear, rain, fog)."""
    valid_weather = ["clear", "rain", "fog"]
    if weather.lower() not in valid_weather:
        raise HTTPException(status_code=400, detail=f"Invalid weather value. Must be one of {valid_weather}")
    simulation_manager.weather = weather.lower()
    return {"status": "success", "weather": weather.lower()}


@router.post("/ml/train/congestion")
def train_congestion_model():
    """Trigger training on XGBoost Congestion Predictor using CSV dataset."""
    from backend.app.services.congestion_predictor import congestion_predictor
    from backend.app.services.dataset_exporter import dataset_exporter
    
    result = congestion_predictor.train_on_dataset(dataset_exporter.csv_path)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.post("/rl/toggle")
def toggle_rl_mode():
    """Toggle between Rule-Based Adaptive Signal Control and PPO RL Policy Control."""
    from backend.app.services.rl_controller import rl_controller
    rl_controller.use_rl_mode = not rl_controller.use_rl_mode
    logger_msg = f"RL Control mode toggled to: {rl_controller.use_rl_mode}"
    return {"status": "success", "rlMode": rl_controller.use_rl_mode}


@router.post("/rl/train")
def train_rl_agent():
    """Trigger PPO reinforcement learning agent training on simulated SUMO environment."""
    from backend.app.services.rl_controller import rl_controller
    result = rl_controller.train_agent()
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.get("/routing/recommend")
def recommend_route(origin: str, destination: str):
    """Get the dynamic congestion-weighted shortest route between two grid junctions."""
    from backend.app.services.routing_engine import routing_engine
    weather = simulation_manager.weather
    result = routing_engine.calculate_shortest_route(origin, destination, weather=weather)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


# ─── Camera Management Endpoints ───

@router.get("/cameras")
def list_cameras():
    """List all available camera sources."""
    from backend.app.services.camera_manager import camera_manager
    return camera_manager.get_all_cameras()


@router.post("/cameras")
def add_camera(payload: Dict[str, Any] = Body(...)):
    """Add a new camera source."""
    from backend.app.services.camera_manager import camera_manager
    name = payload.get("name")
    type_str = payload.get("type")
    source = payload.get("source")
    if not name or not type_str or not source:
        raise HTTPException(status_code=400, detail="Missing required camera fields (name, type, source)")
    return camera_manager.add_camera(name, type_str, source)


@router.delete("/cameras/{cam_id}")
def delete_camera(cam_id: str):
    """Remove a camera source."""
    from backend.app.services.camera_manager import camera_manager
    camera_manager.delete_camera(cam_id)
    return {"status": "success"}


@router.post("/cameras/{cam_id}/start")
def start_camera(cam_id: str):
    """Start processing a camera feed."""
    from backend.app.services.camera_manager import camera_manager
    success = camera_manager.start_camera(cam_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Camera {cam_id} not found or failed to start")
    return {"status": "success"}


@router.post("/cameras/{cam_id}/stop")
def stop_camera(cam_id: str):
    """Stop processing a camera feed."""
    from backend.app.services.camera_manager import camera_manager
    success = camera_manager.stop_camera(cam_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Camera {cam_id} is not running or not found")
    return {"status": "success"}


@router.post("/cameras/{cam_id}/active")
def set_active_camera(cam_id: str):
    """Set the camera source to feed real counts into the main simulation."""
    from backend.app.services.camera_manager import camera_manager
    cam_id = camera_manager.normalize_id(cam_id)
    if cam_id not in camera_manager.cameras:
        raise HTTPException(status_code=404, detail=f"Camera {cam_id} not found")
    simulation_manager.active_camera_id = cam_id
    # Also start it automatically
    camera_manager.start_camera(cam_id)
    return {"status": "success", "activeCameraId": cam_id}


@router.post("/cameras/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file for traffic vision processing."""
    os.makedirs("backend/data/uploads", exist_ok=True)
    file_path = os.path.join("backend/data/uploads", file.filename)
    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        return {"status": "success", "file_path": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video upload failed: {e}")


@router.get("/cameras/{cam_id}/stream")
def stream_camera(cam_id: str):
    """MJPEG stream endpoint to render YOLO outputs dynamically in browser <img> tags."""
    from backend.app.services.camera_manager import camera_manager
    runner = camera_manager.get_runner(cam_id)
    if not runner or not runner.is_running:
        # Start automatically if it exists
        if cam_id in camera_manager.cameras:
            camera_manager.start_camera(cam_id)
            runner = camera_manager.get_runner(cam_id)
        else:
            raise HTTPException(status_code=404, detail=f"Camera {cam_id} is not active or not found")
            
    # Yield the streaming response
    return StreamingResponse(
        runner.get_frame_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


# ─── Phase 3: Incident Detection Endpoints ──────────────────────────────────────

@router.get("/incidents/screenshot/{anomaly_id}")
def get_incident_screenshot(anomaly_id: str):
    """
    Serve the JPEG screenshot for a given anomaly/incident.
    If the file doesn't exist on disk yet, capture it on-demand.
    """
    import os
    from fastapi.responses import FileResponse
    from backend.app.services.cv_service import cv_service

    base_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "screenshots")
    file_path = os.path.join(base_dir, f"{anomaly_id}.jpg")

    if not os.path.exists(file_path):
        # Capture on-demand using active camera or synthetic fallback
        result = cv_service.capture_screenshot(anomaly_id, simulation_manager.active_camera_id)
        if not result:
            raise HTTPException(status_code=404, detail=f"Screenshot for incident {anomaly_id} not found")
        file_path = result

    return FileResponse(
        path=file_path,
        media_type="image/jpeg",
        headers={"Cache-Control": "no-cache"},
    )


@router.post("/incidents/{anomaly_id}/resolve")
def resolve_incident(anomaly_id: str):
    """
    Mark an incident as resolved in the active simulation state.
    """
    resolved = False
    for anomaly in simulation_manager.anomalies:
        if anomaly.get("id") == anomaly_id:
            anomaly["resolved"] = True
            resolved = True
            break

    if not resolved:
        raise HTTPException(status_code=404, detail=f"Incident {anomaly_id} not found")

    return {"status": "resolved", "anomalyId": anomaly_id}
