import os
import cv2
import time
import uuid
import logging
import threading
import psutil
from typing import Dict, Any, List, Optional
import numpy as np

# Try importing torch
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

from backend.app.services.cv_service import cv_service

logger = logging.getLogger(__name__)

class Camera:
    def __init__(self, id: str, name: str, type: str, source: str):
        self.id = id
        self.name = name
        self.type = type # 'webcam' | 'rtsp' | 'ip' | 'cctv' | 'file'
        self.source = source # '0' for webcam, file path, or stream URL
        self.is_active = False

class CameraRunner:
    def __init__(self, camera: Camera):
        self.camera = camera
        self.is_running = False
        self.thread: Optional[threading.Thread] = None
        self.latest_frame: Optional[bytes] = None
        self.lock = threading.Lock()
        
        # Performance metrics
        self.fps = 0.0
        self.latency_ms = 0.0
        self.cpu_usage = 0.0
        self.gpu_usage = 0.0
        
        # Telemetry Cache
        self.latest_detections = []
        self.latest_lane_metrics = {}

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        logger.info(f"Started camera runner thread for camera {self.camera.id} ({self.camera.name})")

    def stop(self):
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=1.0)
            self.thread = None
        logger.info(f"Stopped camera runner thread for camera {self.camera.id}")

    def _run_loop(self):
        # Resolve source
        src = self.camera.source
        if self.camera.type == 'webcam':
            try:
                src = int(self.camera.source)
            except ValueError:
                src = 0
        
        cap = cv2.VideoCapture(src)
        if not cap.isOpened():
            logger.error(f"Failed to open video source: {self.camera.source} for camera {self.camera.id}")
            self.is_running = False
            return

        frame_count = 0
        start_time = time.time()
        
        while self.is_running:
            loop_start = time.time()
            ret, frame = cap.read()
            
            # Restart if video file reaches end
            if not ret:
                if self.camera.type == 'file':
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                else:
                    logger.warning(f"No frame received from video source {self.camera.id}. Retrying...")
                    time.sleep(0.5)
                    continue

            # Process frame using CV service
            process_start = time.time()
            result = cv_service.process_frame(frame, "int-1")
            process_end = time.time()
            
            self.latency_ms = (process_end - process_start) * 1000.0
            
            # Save telemetry data
            self.latest_detections = result.get("detections", [])
            self.latest_lane_metrics = result.get("laneMetrics", {})
            
            # Sync with global simulation manager if this is the active camera
            try:
                from backend.app.services.simulation_manager import simulation_manager
                # Update simulation active camera stats
                if simulation_manager.active_camera_id == self.camera.id:
                    # Sync counts and detections directly to simulation manager state
                    simulation_manager.sync_camera_telemetry(self.latest_detections, self.latest_lane_metrics)
            except Exception as e:
                logger.error(f"Failed to sync camera telemetry to simulation: {e}")

            # Encode annotated frame as JPEG
            ret_enc, buffer = cv2.imencode('.jpg', frame)
            if ret_enc:
                with self.lock:
                    self.latest_frame = buffer.tobytes()

            # Calculate FPS
            frame_count += 1
            elapsed = time.time() - start_time
            if elapsed >= 1.0:
                self.fps = frame_count / elapsed
                frame_count = 0
                start_time = time.time()
                
                # Fetch resource usages
                self.cpu_usage = psutil.cpu_percent()
                if TORCH_AVAILABLE and torch.cuda.is_available():
                    self.gpu_usage = float(torch.cuda.memory_allocated() / (1024 ** 2)) # in MB
                else:
                    self.gpu_usage = 0.0

            # Frame rate throttle to prevent CPU hogging
            # Target ~30 FPS max (33ms per frame)
            loop_elapsed = time.time() - loop_start
            delay = max(0.01, 0.033 - loop_elapsed)
            time.sleep(delay)

        cap.release()

    def get_frame_stream(self):
        while self.is_running:
            with self.lock:
                frame = self.latest_frame
            if frame:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            time.sleep(0.033) # ~30 FPS stream rate

class CameraManager:
    def __init__(self):
        self.cameras: Dict[str, Camera] = {}
        self.runners: Dict[str, CameraRunner] = {}
        self._initialize_default_cameras()

    def _initialize_default_cameras(self):
        # Prepopulate with 4 cameras
        cams = [
            Camera("cam-1", "Camera 1 (Downtown)", "file", "backend/data/videos/traffic_sample.mp4"),
            Camera("cam-2", "Camera 2 (Intersection)", "webcam", "0"),
            Camera("cam-3", "Camera 3 (Highway)", "rtsp", "rtsp://localhost:8554/live"),
            Camera("cam-4", "Camera 4 (Commercial)", "ip", "http://192.168.1.100/video.mjpg")
        ]
        for cam in cams:
            self.cameras[cam.id] = cam
            
        # Ensure default upload folder exists
        os.makedirs("backend/data/uploads", exist_ok=True)
        os.makedirs("backend/data/videos", exist_ok=True)

    def get_all_cameras(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": c.id,
                "name": c.name,
                "type": c.type,
                "source": c.source,
                "is_active": c.id in self.runners
            }
            for c in self.cameras.values()
        ]

    def add_camera(self, name: str, type: str, source: str) -> Dict[str, Any]:
        cam_id = f"cam-{len(self.cameras) + 1}"
        cam = Camera(cam_id, name, type, source)
        self.cameras[cam_id] = cam
        logger.info(f"Added new camera source: {cam_id} - {name} ({type})")
        return {
            "id": cam.id,
            "name": cam.name,
            "type": cam.type,
            "source": cam.source,
            "is_active": False
        }

    @staticmethod
    def normalize_id(cam_id: str) -> str:
        import re
        if not cam_id:
            return cam_id
        match = re.search(r'\d+', cam_id)
        if match:
            num = int(match.group(0))
            return f"cam-{num}"
        return cam_id

    def delete_camera(self, cam_id: str):
        cam_id = self.normalize_id(cam_id)
        if cam_id in self.runners:
            self.stop_camera(cam_id)
        if cam_id in self.cameras:
            del self.cameras[cam_id]
            logger.info(f"Deleted camera source: {cam_id}")

    def start_camera(self, cam_id: str) -> bool:
        cam_id = self.normalize_id(cam_id)
        if cam_id not in self.cameras:
            return False
        if cam_id in self.runners:
            return True
            
        cam = self.cameras[cam_id]
        
        # Verify sample file exists for file type, if not fallback to webcam or mock stream
        if cam.type == 'file' and not os.path.exists(cam.source):
            # Create a mock video file placeholder or let it fail gracefully
            logger.warning(f"Video file source {cam.source} does not exist. Please upload a file.")
            
        runner = CameraRunner(cam)
        self.runners[cam_id] = runner
        runner.start()
        cam.is_active = True
        return True

    def stop_camera(self, cam_id: str) -> bool:
        cam_id = self.normalize_id(cam_id)
        if cam_id not in self.runners:
            return False
        runner = self.runners[cam_id]
        runner.stop()
        del self.runners[cam_id]
        if cam_id in self.cameras:
            self.cameras[cam_id].is_active = False
        return True

    def get_runner(self, cam_id: str) -> Optional[CameraRunner]:
        cam_id = self.normalize_id(cam_id)
        return self.runners.get(cam_id)

camera_manager = CameraManager()
