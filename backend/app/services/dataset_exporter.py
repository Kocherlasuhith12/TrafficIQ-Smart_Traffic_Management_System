import os
import csv
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from backend.app.core.database import SessionLocal
from backend.app.db.models import TrafficDatasetEntry

logger = logging.getLogger(__name__)

class DatasetExporter:
    def __init__(self, export_dir: str = "backend/data"):
        self.export_dir = export_dir
        self.csv_filename = "training_data.csv"
        
        # Header row
        self.headers = [
            "timestamp", "junction_id", "lane_id", "vehicle_count",
            "average_speed", "queue_length", "weather", "day_of_week",
            "hour", "emergency_vehicle", "congestion_level", "signal_state",
            "waiting_time", "throughput", "occupancy"
        ]
        
        # Ensure export directory exists
        os.makedirs(self.export_dir, exist_ok=True)
        self.csv_path = os.path.join(self.export_dir, self.csv_filename)
        
        # Create CSV with headers if it doesn't exist
        if not os.path.exists(self.csv_path):
            self.write_headers()

    def write_headers(self):
        try:
            with open(self.csv_path, mode="w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(self.headers)
            logger.info(f"Initialized training CSV file with headers at {self.csv_path}")
        except Exception as e:
            logger.error(f"Error creating training CSV file: {e}")

    def log_entry(self, db: Session, entry_data: Dict[str, Any]) -> bool:
        """Create a new dataset entry in PostgreSQL."""
        try:
            db_entry = TrafficDatasetEntry(
                timestamp=entry_data.get("timestamp", datetime.utcnow()),
                junction_id=entry_data["junction_id"],
                lane_id=entry_data["lane_id"],
                vehicle_count=entry_data["vehicle_count"],
                average_speed=entry_data["average_speed"],
                queue_length=entry_data["queue_length"],
                weather=entry_data.get("weather", "clear"),
                day_of_week=entry_data["day_of_week"],
                hour=entry_data["hour"],
                emergency_vehicle=entry_data.get("emergency_vehicle", False),
                congestion_level=entry_data["congestion_level"],
                signal_state=entry_data["signal_state"],
                waiting_time=entry_data.get("waiting_time", 0.0),
                throughput=entry_data.get("throughput", 0.0),
                occupancy=entry_data.get("occupancy", 0.0)
            )
            db.add(db_entry)
            db.commit()
            return True
        except Exception as e:
            logger.error(f"Error logging dataset entry in DB: {e}")
            db.rollback()
            return False

    def export_to_csv(self, db: Session) -> str:
        """Query all logs from database and write them to the training CSV file."""
        try:
            entries = db.query(TrafficDatasetEntry).order_by(TrafficDatasetEntry.timestamp.asc()).all()
            
            with open(self.csv_path, mode="w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(self.headers)
                
                for e in entries:
                    writer.writerow([
                        e.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                        e.junction_id,
                        e.lane_id,
                        e.vehicle_count,
                        e.average_speed,
                        e.queue_length,
                        e.weather,
                        e.day_of_week,
                        e.hour,
                        1 if e.emergency_vehicle else 0,
                        round(e.congestion_level, 2),
                        e.signal_state,
                        round(e.waiting_time, 1),
                        round(e.throughput, 1),
                        round(e.occupancy, 2)
                    ])
            logger.info(f"Successfully exported {len(entries)} logs to CSV: {self.csv_path}")
            return self.csv_path
        except Exception as e:
            logger.error(f"Failed to export training CSV: {e}")
            return self.csv_path

    def append_to_csv_direct(self, entry_data: Dict[str, Any]):
        """Directly append a record to the CSV for speed/efficiency (optional)."""
        try:
            ts = entry_data.get("timestamp", datetime.utcnow())
            if isinstance(ts, int):
                ts = datetime.fromtimestamp(ts / 1000.0)
                
            with open(self.csv_path, mode="a", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([
                    ts.strftime("%Y-%m-%d %H:%M:%S"),
                    entry_data["junction_id"],
                    entry_data["lane_id"],
                    entry_data["vehicle_count"],
                    entry_data["average_speed"],
                    entry_data["queue_length"],
                    entry_data.get("weather", "clear"),
                    entry_data["day_of_week"],
                    entry_data["hour"],
                    1 if entry_data.get("emergency_vehicle", False) else 0,
                    round(entry_data["congestion_level"], 2),
                    entry_data["signal_state"],
                    round(entry_data.get("waiting_time", 0.0), 1),
                    round(entry_data.get("throughput", 0.0), 1),
                    round(entry_data.get("occupancy", 0.0), 2)
                ])
        except Exception as e:
            logger.error(f"Error appending directly to CSV: {e}")

dataset_exporter = DatasetExporter()
