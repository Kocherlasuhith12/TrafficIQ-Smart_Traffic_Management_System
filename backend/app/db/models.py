from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.core.database import Base

class Junction(Base):
    __tablename__ = "junctions"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    location = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    lanes = relationship("Lane", back_populates="junction", cascade="all, delete-orphan")


class Lane(Base):
    __tablename__ = "lanes"

    id = Column(String(50), primary_key=True)
    junction_id = Column(String(50), ForeignKey("junctions.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    direction = Column(String(1), nullable=False) # N, S, E, W
    max_capacity = Column(Integer, default=30)

    junction = relationship("Junction", back_populates="lanes")
    detections = relationship("Detection", back_populates="lane", cascade="all, delete-orphan")
    anomalies = relationship("Anomaly", back_populates="lane", cascade="all, delete-orphan")


class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    detection_uuid = Column(String(100), unique=True, nullable=False)
    lane_id = Column(String(50), ForeignKey("lanes.id", ondelete="CASCADE"), nullable=False)
    vehicle_type = Column(String(20), nullable=False) # car, truck, bus, motorcycle, bicycle, emergency
    speed = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    bounding_box = Column(JSON, nullable=False) # {x, y, w, h}
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    lane = relationship("Lane", back_populates="detections")


class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, index=True)
    lane_id = Column(String(50), ForeignKey("lanes.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False) # wrong_way, stopped_vehicle, overspeeding, emergency_vehicle, sudden_congestion, accident_risk
    severity = Column(String(20), nullable=False) # low, medium, high, critical
    description = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)

    lane = relationship("Lane", back_populates="anomalies")


class EmergencyLog(Base):
    __tablename__ = "emergency_logs"

    id = Column(Integer, primary_key=True, index=True)
    log_uuid = Column(String(100), unique=True, nullable=False)
    lane_id = Column(String(50), ForeignKey("lanes.id", ondelete="CASCADE"), nullable=False)
    junction_id = Column(String(50), ForeignKey("junctions.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    duration_ms = Column(Integer, default=0)
    resolved = Column(Boolean, default=False)


class TrafficPattern(Base):
    __tablename__ = "traffic_patterns"

    id = Column(Integer, primary_key=True, index=True)
    hour = Column(Integer, nullable=False) # 0-23
    day_of_week = Column(Integer, nullable=False) # 0-6
    avg_vehicles = Column(Integer, nullable=False)
    avg_speed = Column(Float, nullable=False)
    dominant_type = Column(String(20), nullable=False)
    congestion_probability = Column(Float, nullable=False)
    is_peak_hour = Column(Boolean, default=False)


class VehicleTrack(Base):
    __tablename__ = "vehicle_tracks"

    id = Column(Integer, primary_key=True, index=True)
    track_id = Column(Integer, nullable=False)
    junction_id = Column(String(50), ForeignKey("junctions.id", ondelete="CASCADE"), nullable=False)
    lane_id = Column(String(50), ForeignKey("lanes.id", ondelete="CASCADE"), nullable=False)
    vehicle_type = Column(String(20), nullable=False)
    entry_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    exit_time = Column(DateTime, nullable=True)
    avg_speed = Column(Float, nullable=False)
    max_speed = Column(Float, nullable=False)
    distance_travelled = Column(Float, default=0.0)
    wait_time_sec = Column(Float, default=0.0)


class TrafficDatasetEntry(Base):
    __tablename__ = "traffic_dataset_entries"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    junction_id = Column(String(50), nullable=False)
    lane_id = Column(String(50), nullable=False)
    vehicle_count = Column(Integer, nullable=False)
    average_speed = Column(Float, nullable=False)
    queue_length = Column(Integer, nullable=False)
    weather = Column(String(20), default="clear") # clear, rain, fog
    day_of_week = Column(Integer, nullable=False) # 0-6
    hour = Column(Integer, nullable=False) # 0-23
    emergency_vehicle = Column(Boolean, default=False)
    congestion_level = Column(Float, nullable=False)
    signal_state = Column(String(10), nullable=False) # RED, YELLOW, GREEN
    waiting_time = Column(Float, default=0.0)
    throughput = Column(Float, default=0.0)
    occupancy = Column(Float, default=0.0) # count to max capacity ratio


