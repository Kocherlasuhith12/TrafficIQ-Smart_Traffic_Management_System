# TrafficIQ Hub

**AI-powered smart traffic management system** — a real-time, multi-junction control dashboard that combines computer vision, forecasting, and a voice-controlled assistant to monitor and manage city traffic.

![Status](https://img.shields.io/badge/status-active-success)
![Python](https://img.shields.io/badge/backend-Python%20%7C%20FastAPI-blue)
![React](https://img.shields.io/badge/frontend-React-61DAFB)
![YOLOv11](https://img.shields.io/badge/vision-YOLOv11-orange)

---

## Overview

TrafficIQ Hub simulates a city-scale smart traffic control platform. It monitors multiple intersections in real time, detects vehicles, pedestrians, and incidents through computer vision, forecasts congestion using a machine learning model, and lets operators manage the system through both a visual dashboard and a natural-language voice assistant.

The goal of the project is to explore how computer vision, forecasting models, and conversational AI can come together in a single operational tool — the kind of system a smart-city traffic control room might use.

## Features

### Live Multi-Junction Control
- Real-time dashboard monitoring **6 intersections** simultaneously, each with independent lane-level status (blocked / congested / clear)
- Interactive city map showing signal state and live vehicle counts per junction
- Manual signal cycling plus an **Emergency Override** mode for priority corridors

### Computer Vision Detection
- **YOLOv11**-based detection pipeline for vehicles, pedestrians, and traffic incidents from camera feeds
- Supports multiple camera source types: video file, webcam, RTSP stream, and IP camera
- Vehicle classification (cars, buses, motorcycles, ambulances, etc.) with live confidence scores

### Forecasting & Analytics
- **GRU-based** traffic forecasting model to predict short-term congestion trends and recommend signal-timing adjustments
- Fixed-cycle vs. adaptive-control comparison (wait time, queue length, throughput)
- Peak-hour analysis, 24-hour traffic heatmap, and junction-to-junction comparison tables
- Exportable analytics reports in **PDF, CSV, and Excel** formats (hourly / daily / weekly / monthly)

### Incident Detection & Response
- Automatic detection of collisions, pedestrians on active lanes, and vehicle breakdowns
- Live incident timeline with severity levels (High / Critical) and alert notifications
- Behavioral density and congestion analytics per lane

### Voice-Controlled AI Assistant
- Conversational assistant ("TrafficIQ AI") that answers natural-language questions such as *"Which junction is busiest?"* or *"Any accidents?"*
- Can surface traffic status, busiest junctions, and active incidents on request
- Voice input/output support alongside text chat

### Access Control & Security
- Role-based system access (Admin / Operator / Guest) with per-capability permissions (scenario override, camera management, emergency corridor control, telemetry monitoring)
- Session authentication with operator ID and verification key
- Live system telemetry feed (cache status, model load, detection pipeline initialization, security shield status)

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI |
| Frontend | React |
| Computer Vision | YOLOv11 |
| Forecasting | GRU (Gated Recurrent Unit) model |
| Caching | Redis |
| Real-time updates | WebSockets |

## Screenshots

> Add dashboard screenshots here (`/assets` or `/docs/screenshots`) — e.g. the live control map, junction detail view, incident timeline, and the AI assistant panel.

## Getting Started

```bash
# Clone the repository
git clone https://github.com/Kocherlasuhith12/trafficIQ-management-system.git
cd trafficIQ-management-system

# Backend setup
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend setup
cd ../frontend
npm install
npm run dev
```

> Update the commands above to match your actual folder structure and entry-point filenames.

## Roadmap

- [ ] Integrate real CCTV/RTSP feeds in place of simulated streams
- [ ] Expand incident detection to more anomaly types
- [ ] Add authentication persistence and multi-operator session handling
- [ ] Deploy to a cloud environment for public demo access

## Author

**KKS Suhith Babu**
[Portfolio](https://kocherlasuhith12.github.io/portfolio-website/) · [GitHub](https://github.com/Kocherlasuhith12) · [LinkedIn](https://www.linkedin.com/in/kocherlakoteswarasuhithsravanbabu/)
