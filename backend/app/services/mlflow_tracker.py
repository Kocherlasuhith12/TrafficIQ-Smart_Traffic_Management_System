import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional

try:
    import mlflow
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("MLflow library not available. Experiment logs will be cached locally in JSON.")

logger = logging.getLogger(__name__)

class MLflowTracker:
    def __init__(self, fallback_log_dir: str = "backend/data/experiments"):
        self.fallback_log_dir = fallback_log_dir
        self.fallback_file = os.path.join(fallback_log_dir, "experiment_runs.json")
        
        os.makedirs(self.fallback_log_dir, exist_ok=True)
        
        # Initialize MLflow tracking URI if present
        if MLFLOW_AVAILABLE:
            tracking_uri = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
            mlflow.set_tracking_uri(tracking_uri)
            mlflow.set_experiment("TrafficIQ_Smart_Traffic_Predictor")

    def log_experiment_run(self, run_name: str, params: Dict[str, Any], metrics: Dict[str, Any], model_type: str) -> Optional[str]:
        """Logs model hyperparameter metrics and registers runs to MLflow."""
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        
        # ── MLflow Experiment Logging ──
        if MLFLOW_AVAILABLE:
            try:
                with mlflow.start_run(run_name=f"{run_name}_{now_str}"):
                    # Log parameters
                    mlflow.log_params(params)
                    mlflow.log_param("model_type", model_type)
                    
                    # Log metrics
                    mlflow.log_metrics(metrics)
                    
                    run_id = mlflow.active_run().info.run_id
                    logger.info(f"Registered run {run_id} to MLflow experiment dashboard.")
                    return run_id
            except Exception as e:
                logger.error(f"Failed to log run to MLflow: {e}. Falling back to local log cache.")

        # ── High-Fidelity Local Fallback Log Cache ──
        run_record = {
            "run_name": run_name,
            "timestamp": now_str,
            "model_type": model_type,
            "hyperparameters": params,
            "evaluation_metrics": metrics
        }
        
        try:
            runs = []
            if os.path.exists(self.fallback_file):
                with open(self.fallback_file, "r") as f:
                    try:
                        runs = json.load(f)
                    except json.JSONDecodeError:
                        pass
                        
            runs.append(run_record)
            with open(self.fallback_file, "w") as f:
                json.dump(runs, f, indent=4)
            logger.info(f"Successfully logged experiment metrics locally to {self.fallback_file}")
        except Exception as e:
            logger.error(f"Failed to write local experiment log: {e}")
            
        return "local_fallback_run"

mlflow_tracker = MLflowTracker()
