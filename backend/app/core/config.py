import os
from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "TrafficIQ Smart Traffic Management API"
    API_V1_STR: str = "/api/v1"
    
    # Databases
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/traffic_db"
    )
    
    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v: str) -> str:
        if isinstance(v, str) and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v
        
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
