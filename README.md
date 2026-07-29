# 🚦 TrafficIQ — Intelligent Traffic Management System

### *Real-Time, ML-Powered Adaptive Signal Control Platform*

TrafficIQ is a simulation-first, production-architected intelligent traffic signal control platform. It replaces traditional fixed-time cycles with a dynamic, speed-and-density-aware timing engine, achieving up to a **40% reduction in average vehicle wait time**.

---

## 📌 Features

| Category | Capability | Description |
|---|---|---|
| ⏱️ **Adaptive Control** | **Speed-Aware Timing** | Green light durations are calculated dynamically based on real-time vehicle counts and lane speeds. |
| 🚨 **Emergency Priority** | **Override Queue** | Detects emergency vehicles (CCTV/mock) and preempts signals safely at the next cycle boundary. |
| 🤖 **Predictive ML** | **Multi-Horizon Forecast** | A deep learning GRU model anticipates congestion trends and adjusts timings proactively. |
| 🛡️ **Anomaly Detection** | **YOLOv11 Vision Logs** | Monitors road safety, flagging overspeeding, wrong-way driving, red-light runs, and breakdowns. |
| 🌗 **Premium UI/UX** | **Traffic Lights Theme** | Built with a vibrant Red-Orange-Green palette and a toggle between pure black and white backgrounds. |

---

## 🏗️ System Architecture

The platform operates on a **three-layer control architecture** that decouples safety rules from advisory AI optimization:

```
┌──────────────────────────────────────────────────────────────────┐
│  Layer 1 — Rule-Based Control (Deterministic & Always Active)    │
│  Green Duration = f(Vehicle Count, Average Speed)                │
├──────────────────────────────────────────────────────────────────┤
│  Layer 2 — ML Optimization (Advisory Trend Forecasting)          │
│  Deep GRU models predict future queue sizes & adjust durations.  │
├──────────────────────────────────────────────────────────────────┤
│  Layer 3 — Emergency Override (Immediate Preemption Queue)        │
│  Safely locks lanes to green during active emergency transits.  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

*   **Frontend**: React (18.x) · Vite · TypeScript · Tailwind CSS · shadcn/ui · Lucide Icons
*   **Backend**: FastAPI · Uvicorn · PyTorch (Deep GRU) · scikit-learn · NumPy (fallback helper)
*   **Infrastructure**: PostgreSQL (relational logs) · Redis (caching and WebSocket pub/sub)

---

## 🚀 Running the Project Locally

### Prerequisites
*   Node.js (version ≥ 18.x)
*   Python (version ≥ 3.10)
*   Docker (for local Postgres & Redis services)

### Step 1: Run Infrastructure
Ensure you have Postgres running on `localhost:5432` and Redis running on `localhost:6379`. The backend automatically hooks into the database credentials.

### Step 2: Run Backend (FastAPI)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Activate your virtual environment and start uvicorn:
   ```bash
   source venv/bin/activate
   PYTHONPATH=.. uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   *The API root will be available at `http://localhost:8000` and Swagger documentation at `http://localhost:8000/docs`.*

### Step 3: Run Frontend (Vite)
1. From the project root, start the development server on a free port (e.g., `5175`):
   ```bash
   npm run dev -- --port 5175
   ```
2. Open your browser and navigate to `http://localhost:5175`.

---

## ☁️ Deploying to a Public Server (Free)

Here is how you can host the entire system for free:

### 1. Database & Cache Providers
*   **PostgreSQL**: Host a lifetime-free serverless database at [Neon.tech](https://neon.tech/) and copy the URI.
*   **Redis**: Create a free serverless Redis instance on [Upstash Redis](https://upstash.com/) and copy the URI.

### 2. Backend Web Service (Render)
1. Link your GitHub repository to [Render](https://render.com/).
2. Create a new **Web Service** with the root directory set to `backend`.
3. Set the build and start commands:
   *   **Build**: `pip install -r requirements.txt`
   *   **Start**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables:
   *   `DATABASE_URL`: *(Your Neon connection string)*
   *   `REDIS_URL`: *(Your Upstash Redis connection string)*
   *   `PYTHONPATH`: `/opt/render/project/src/backend`

### 3. Frontend Static Site (Render)
1. Create a **Static Site** on Render linked to your repository.
2. Leave the root directory as `./`.
3. Set build commands:
   *   **Build**: `npm install --legacy-peer-deps && npm run build`
   *   **Publish directory**: `dist`
4. Add the environment variable `VITE_BACKEND_URL` pointing to your backend Render URL.
