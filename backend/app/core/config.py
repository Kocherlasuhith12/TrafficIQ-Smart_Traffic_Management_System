import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "TrafficIQ Smart Traffic Management API"
    API_V1_STR: str = "/api/v1"
    
    # Databases
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/traffic_db"
    )
    REDIS_URL: str = os.getenv(
        "REDIS_URL", 
        "redis://localhost:6379/0"
    )
    
    # YOLO & Video Settings
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "yolov11n.pt")
    
    # WebSockets and state broadcasts
    STATE_BROADCAST_INTERVAL_SEC: float = 1.0
    
    class Config:
        case_sensitive = True

settings = Settings()
