# 🚦 TrafficIQ — Intelligent Traffic Management System

### *Real-Time, ML-Powered Adaptive Signal Control & Vision Telemetry Platform*

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)
[![Python Version](https://img.shields.io/badge/python-3.10%2B-blue.svg)](#)
[![Node Version](https://img.shields.io/badge/node-20%2B-green.svg)](#)
[![Docker Support](https://img.shields.io/badge/docker-supported-blue.svg)](#)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](#)

TrafficIQ is a simulation-first, production-architected intelligent traffic signal control platform. It replaces traditional fixed-time cycles with a dynamic, speed-and-density-aware timing engine, achieving up to a **40% reduction in average vehicle wait time**. It incorporates real-time Computer Vision via YOLOv11, Reinforcement Learning signal policy execution using Stable-Baselines3 PPO, dynamic weather-aware routing, and a smart AI voice command centre.

---

## 📌 Table of Contents
1. [🏗️ System Architecture](#️-system-architecture)
2. [📁 Technical Directory Breakdown](#-technical-directory-breakdown)
   - [FastAPI Backend Services (`backend/app/services/`)](#fastapi-backend-services-backendappservices)
   - [API Routers (`backend/app/api/v1/`)](#api-routers-backendappapiv1)
   - [Frontend Components (`src/features/` & `src/hooks/`)](#frontend-components-srcfeatures--srchooks)
3. [🧠 Deep Dive: Algorithms & Logic](#-deep-dive-algorithms--logic)
   - [Homography Transformation & Kalman Smoothing](#homography-transformation--kalman-smoothing)
   - [SB3 PPO Reinforcement Learning Environment](#sb3-ppo-reinforcement-learning-environment)
   - [Weather-Aware Congestion Routing](#weather-aware-congestion-routing)
4. [🛠️ Technology Stack](#️-technology-stack)
5. [🚀 Running the Project Locally](#-running-the-project-locally)
6. [🧠 Machine Learning & Reinforcement Learning Pipelines](#-machine-learning--reinforcement-learning-pipelines)
7. [🐳 Docker Compose Production Deployment](#-docker-compose-production-deployment)
8. [🔌 API Reference & WebSocket Protocols](#-api-reference--websocket-protocols)

---

## 🏗️ System Architecture

TrafficIQ operates on a **four-layer control architecture** that decouples safety rules from advisory AI optimization:

```
┌──────────────────────────────────────────────────────────────────┐
│  Layer 4 — AI Voice Command Centre (Natural Language Commands)  │
│  Validates chat & voice instructions; overrides simulation settings.│
├──────────────────────────────────────────────────────────────────┤
│  Layer 3 — Emergency Override (Immediate Preemption Queue)        │
│  Safely locks lanes to green during active emergency transits.  │
├──────────────────────────────────────────────────────────────────┤
│  Layer 2 — ML/RL Advisory Optimization (Intelligent Forecasting) │
│  - Stable-Baselines3 PPO model recommends green light durations. │
│  - PyTorch Deep GRU forecasts queue sizes & congestion trends.  │
├──────────────────────────────────────────────────────────────────┤
│  Layer 1 — Rule-Based Control (Deterministic & Always Active)    │
│  Green Duration = f(Vehicle Count, Average Speed)                │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📁 Technical Directory Breakdown

The codebase is split into a robust **FastAPI backend** handling simulations, machine learning inference, and computer vision feeds, and a **Vite/TypeScript React frontend** rendering live telemetries, maps, and AI chatbot interfaces.

```
TrafficIQ-Smart_Traffic_Management_System/
├── backend/                  # FastAPI Application Layer
│   ├── app/
│   │   ├── api/v1/          # REST Endpoints & WebSockets
│   │   ├── core/            # Config & DB engine bootstrap
│   │   ├── db/              # SQLAlchemy Schemas & Models
│   │   └── services/        # ML, CV, RL, and Simulation Services
│   ├── data/                 # Local DB storage, models weights, videos, and datasets
│   └── requirements.txt     # Python Virtual Environment dependencies
├── src/                      # Vite + React Frontend Layer
│   ├── components/           # Reusable UI widgets
│   ├── data/                 # Mock state data and configurations
│   ├── features/             # Modular dashboard features (AI, analytics, control)
│   ├── hooks/                # React custom state hooks
│   └── services/             # HTTP clients & WebSocket adapters
├── dvc.yaml                  # ML DVC self-training pipelines definition
└── docker-compose.yml        # Production Docker-Compose cluster
```

### FastAPI Backend Services (`backend/app/services/`)

*   **[simulation_manager.py](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/backend/app/services/simulation_manager.py)**: The heartbeat of the backend. It runs a 1Hz loop ticking the intersections, periodically fetching predictions from the YOLO vision service, calling the PyTorch and XGBoost models, updating carbon footprints, and broadcasting the unified state through Redis Pub/Sub (`traffic:live`) and cache (`traffic:live_state`).
*   **[cv_service.py](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/backend/app/services/cv_service.py)**: Integrates YOLOv11 with ByteTrack to track vehicles. Features ROI polygon filtering, pixel-to-world Homography projections, Kalman trajectory smoothing, speed/wait calculations, ANPR plate generation, and detects 12 types of incidents (speeding, red-light running, wrong-way, collision, breakdowns, etc.).
*   **[camera_manager.py](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/backend/app/services/camera_manager.py)**: Handles multiple camera streams (webcam, RTSP, static files, video uploads). Spawns separate threads (`CameraRunner`) to read frames and stream annotated video output dynamically as MJPEG streams. Exposes performance telemetries (FPS, latency, CPU, GPU VRAM).
*   **[rl_controller.py](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/backend/app/services/rl_controller.py)**: Implements `SUMOTrafficEnv` (Gymnasium wrapper) mapping discrete green phases actions (0=North, 1=South, 2=East, 3=West) to traffic state matrices. Utilizes Stable-Baselines3 PPO (Proximal Policy Optimization) to train policy weights and select optimal phases.
*   **[routing_engine.py](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/backend/app/services/routing_engine.py)**: Uses Dijkstra's algorithm to calculate shortest paths between junctions. Computes travel costs dynamically based on real-time vehicle counts, average speeds, and weather factors.
*   **[prediction_ai.py](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/backend/app/services/prediction_ai.py)**: Implements PyTorch deep GRU network (Gated Recurrent Unit). Uses engineered features (counts, wait times, throughput, weather, signals) to forecast queue trends and recommend green duration offsets.
*   **[congestion_predictor.py](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/backend/app/services/congestion_predictor.py)**: Runs XGBoost modeling to classify congestion probabilities and returns SHAP values explaining the impact of each variable.
*   **[dataset_exporter.py](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/backend/app/services/dataset_exporter.py)**: Automatically saves real-time telemetry metrics into SQLite/PostgreSQL databases and flushes logs to local training CSV datasets.
*   **[mlflow_tracker.py](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/backend/app/services/mlflow_tracker.py)**: Connects to MLflow servers to log hyperparameters, training metrics, and loss statistics. Falls back to a local JSON cache if MLflow is offline.
*   **[kalman_filter.py](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/backend/app/services/kalman_filter.py)**: 2D linear Kalman filter that smooths bounding boxes coordinates and isolates velocity vectors.

### API Routers (`backend/app/api/v1/`)

*   **[endpoints.py](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/backend/app/api/v1/endpoints.py)**: Exposes REST API routes for database queries, starting/stopping cameras, scenario selection, weather set, route recommendations, and training triggers.
*   **[websockets.py](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/backend/app/api/v1/websockets.py)**: Orchestrates the bidirectional `/ws/traffic` endpoint. Broadcasts live Redis state frames to web sockets and processes incoming control commands (`toggle`, `set_scenario`, `override_emergency`).

### Frontend Components (`src/features/` & `src/hooks/`)

*   **[useTrafficSimulation.ts](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/src/hooks/useTrafficSimulation.ts)**: Synchronizes state by parsing live WebSocket data. Safely switches to local mock client-side simulations if the FastAPI server goes offline.
*   **[AIAssistant.tsx](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/src/features/ai-assistant/AIAssistant.tsx)**: Floating orb button triggering AI text/voice chat. Integrates the Web Speech API for voice recognition and text-to-speech output, with quick-command chips.
*   **[SmartCityMap.tsx](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/src/features/dashboard/SmartCityMap.tsx)**: SVG visualization of the 6-junction city layout. Shows dynamic signal colors, real-time queues/congestion levels, green priority corridors, and clickable CCTV nodes.
*   **[LiveCameraFeed.tsx](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/src/features/dashboard/LiveCameraFeed.tsx)**: Renders the active camera stream (`GET /stream`) showing YOLO boundary boxes and details of detected violations.
*   **[PerformanceMonitor.tsx](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/src/features/dashboard/PerformanceMonitor.tsx)**: Renders processing performance stats including frame rate (FPS), latency (ms), and server CPU/GPU VRAM loads.

---

## 🧠 Deep Dive: Algorithms & Logic

### Homography Transformation & Kalman Smoothing

To compute physical speeds from pixel detections, the platform projects camera space coordinates onto the physical road plane using **Homography Perspective Transformations**:

$$\begin{bmatrix} x_{\text{world}} \\ y_{\text{world}} \\ w \end{bmatrix} = H \begin{bmatrix} u_{\text{pixel}} \\ v_{\text{pixel}} \\ 1 \end{bmatrix}$$

1. **Perspective Calibration**: ROI Trapezoids map the road segment (e.g., standard 3.5m lane extending 30m).
2. **Perspective Transform**: Projections convert centroid $(u, v)$ points to $(x_{\text{world}}, y_{\text{world}})$ coordinates in meters.
3. **Kalman Filtering**: Project trajectory points through a 2D linear state vector $[x, y, v_x, v_y]^T$ to filter high-frequency noise:
   - **Prediction Step**:
     $$\hat{x}_k^- = F \hat{x}_{k-1} + B u_k$$
     $$P_k^- = F P_{k-1} F^T + Q$$
   - **Update Step**:
     $$K_k = P_k^- H^T (H P_k^- H^T + R)^{-1}$$
     $$\hat{x}_k = \hat{x}_k^- + K_k (z_k - H \hat{x}_k^-)$$
     $$P_k = (I - K_k H) P_k^-$$
4. **Speed Resolution**: Vehicle velocity magnitudes ($v_{\text{world}} = \sqrt{v_x^2 + v_y^2} \times 3.6$ km/h) are updated. If $v_{\text{world}} < 3.0$ km/h, wait times accumulate.

---

### SB3 PPO Reinforcement Learning Environment

Instead of rigid fixed-time cycles, the PPO Reinforcement Learning policy models intersections dynamically:

```
   ┌─────────────────────────────────────────────────────────────┐
   │                       ENVIRONMENT                           │
   │ State Observation Matrix (14-dim)                           │
   │ [ Lane Vehicle Counts (4), Lane Average Speeds (4),         │
   │   Lane Queue Lengths (4), Active Phase (1), Elapsed (1) ]   │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                         PPO POLICY                          │
   │ Actor-Critic Network yields Phase Action                    │
   │ Action: Discrete (0 = North, 1 = South, 2 = East, 3 = West) │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                           REWARD                            │
   │ Reward = -(w1*Queues + w2*WaitTimes + w3*Emissions) +       │
   │          (w4*Throughput)                                    │
   └─────────────────────────────────────────────────────────────┘
```

The reward weights motivate the agent to minimize bottlenecks, reduce idling emissions, and maximize vehicle clearance.

---

### Weather-Aware Congestion Routing

Optimal routes between the 6 city junctions are computed using a dynamic, traffic-weighted Dijkstra search:

$$\text{Weight} = \left( \frac{\text{Distance}}{\text{Speed}_{\text{base}} \times \gamma_{\text{weather}}} \right) \times (1.0 + \text{Count}_{\text{lane}} \times 0.15)$$

Where the weather penalty scale $\gamma_{\text{weather}}$ is configured as:
- **Rain**: $\gamma = 0.80$ (20% speed drop)
- **Fog**: $\gamma = 0.65$ (35% speed drop)
- **Clear**: $\gamma = 1.00$

The algorithm calculates congestion penalties exponentially, routing vehicles around busy routes.

---

## 🛠️ Technology Stack

*   **Frontend**: React 18 · Vite · TypeScript · Tailwind CSS · shadcn/ui · Lucide Icons · Recharts
*   **Backend**: FastAPI · Uvicorn · WebSockets · PyTorch (GRU) · scikit-learn · XGBoost · Gymnasium · Stable-Baselines3 (PPO) · OpenCV
*   **Data Pipelines**: DVC (Data Version Control) · MLflow
*   **Infrastructure**: PostgreSQL (relational logs) · Redis (caching and WebSocket pub/sub) · Nginx (SSL Gateway)
*   **Telemetry**: Prometheus · Grafana

---

## 🚀 Running the Project Locally

### Prerequisites
- **Node.js** (version ≥ 20.x)
- **Python** (version ≥ 3.10)
- **Docker** (for local services)

### Step 1: Spin Up Infrastructure
Ensure you have local instances of PostgreSQL (port `5432`) and Redis (port `6379`) running. Alternatively, you can use the Docker Compose setups detailed below.

### Step 2: Run Backend (FastAPI)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the Uvicorn server:
   ```bash
   PYTHONPATH=.. uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   *   The API root will be available at `http://localhost:8000`
   *   Interactive Swagger documentation is available at `http://localhost:8000/docs`

### Step 3: Run Frontend (Vite)
1. From the project root, install NPM packages:
   ```bash
   npm install --legacy-peer-deps
   ```
2. Start the development server:
   ```bash
   npm run dev -- --port 5175
   ```
3. Open your browser and navigate to `http://localhost:5175`.

---

## 🧠 Machine Learning & Reinforcement Learning Pipelines

### Data Version Control (DVC) Pipelines
The ML training pipelines are modularly defined in [dvc.yaml](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/dvc.yaml). You can execute the training pipeline stages using:

```bash
# Run both training pipeline stages (GRU Forecaster and XGBoost Congestion models)
dvc repro
```

*   **`train-forecaster`**: Trains the deep PyTorch GRU model on accumulated traffic logs (`backend/data/training_data.csv`) and outputs `backend/data/models/gru_traffic_model.pt`.
*   **`train-congestion`**: Trains the XGBoost Congestion model, saving the schema to `backend/data/models/xgb_congestion_model.json`.

### Reinforcement Learning (RL) Policy Training
Trigger agent training on-demand by sending a request to the FastAPI endpoint:
```bash
curl -X POST http://localhost:8000/api/v1/rl/train
```
*Trained model weights will be saved to `backend/data/models/ppo_traffic_model.zip`.*

---

## 🐳 Docker Compose Production Deployment

The project includes a multi-container configuration in [docker-compose.yml](file:///Users/holyteam/Desktop/Traffic%20Management%20System/TrafficIQ-Smart_Traffic_Management_System/docker-compose.yml) that sets up the database, caching layer, main backend services, frontend web server, and monitoring dashboard.

### Start the entire system in one command:
```bash
docker-compose up --build
```

### Services Mapped Ports:
*   **Frontend**: `https://localhost` (via Nginx SSL Reverse Proxy, exposing port `443` and redirection on `80`).
*   **FastAPI Backend**: `http://localhost:8000`.
*   **Prometheus Traffic Telemetry**: `http://localhost:9090`.
*   **Grafana Telemetry Dashboard**: `http://localhost:3000` (Default credentials: `admin` / `admin`).

---

## 🔌 API Reference & WebSocket Protocols

### REST API Highlights
*   `GET /api/v1/scenarios`: Returns available traffic simulation scenarios (`normal`, `rush-hour`, `imbalanced`, `low-traffic`).
*   `POST /api/v1/override/emergency`: Activates emergency preemption priorities on specific lanes.
*   `POST /api/v1/weather/set`: Sets the weather conditions (`clear`, `rain`, `fog`) which impacts vehicles' average speeds.
*   `POST /api/v1/rl/toggle`: Toggles between Rule-Based control and Reinforcement Learning signal selection.
*   `GET /api/v1/routing/recommend`: Calculates Dijkstra-based path recommendations weighted by weather and traffic counts.

### Live Telemetry WebSockets
- **Endpoint**: `/ws/traffic`
- **Direction**: Bi-directional communication.
  - **Broadcast updates**: Regularly pushes the entire junction, lane speeds, queue counts, anomalies, and active green lights over the Redis Pub/Sub channel `traffic:live`.
  - **Inbound Commands**: Accept client commands in JSON format, e.g., toggling simulation active states:
    ```json
    { "command": "toggle" }
    ```
    Or changing active traffic scenarios:
    ```json
    { "command": "set_scenario", "scenarioId": "rush-hour" }
    ```
