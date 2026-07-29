// ─── Traffic Detection Dataset ───
// Simulated CCTV/sensor detection data for ML training and real-time display.

export type VehicleType = 
  | 'car' 
  | 'truck' 
  | 'bus' 
  | 'motorcycle' 
  | 'bicycle' 
  | 'emergency' 
  | 'bike' 
  | 'pedestrian' 
  | 'ambulance' 
  | 'fire truck'
  | 'police vehicle'
  | 'animal'
  | 'traffic cone'
  | 'traffic light'
  | 'road block';

export interface DetectionEvent {
  id: string;
  trackId: number; // Unique tracking ID for ByteTrack/DeepSORT
  timestamp: number;
  laneId: string;
  vehicleType: VehicleType;
  speed: number; // km/h
  confidence: number; // 0-1 detection confidence
  isAnomaly: boolean;
  boundingBox: { x: number; y: number; w: number; h: number };
}

export interface TrafficPattern {
  hour: number;
  dayOfWeek: number; // 0=Sun, 6=Sat
  avgVehicles: number;
  avgSpeed: number;
  dominantType: VehicleType;
  congestionProbability: number;
  isPeakHour: boolean;
}

export interface AnomalyRecord {
  id: string;
  timestamp: number;
  laneId: string;
  type: string; // incident type
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolved: boolean;
  cameraId?: string;
  location?: string;
  screenshotPath?: string;
}

const VEHICLE_TYPES: VehicleType[] = [
  'car', 'car', 'car', 'car',
  'truck', 'bus', 'motorcycle', 'bicycle',
  'pedestrian', 'ambulance', 'fire truck',
  'police vehicle', 'animal', 'traffic cone',
  'traffic light', 'road block'
];
const LANES = ['lane-N', 'lane-S', 'lane-E', 'lane-W'];

let detectionIdCounter = 0;
let anomalyIdCounter = 0;
let trackIdCounter = 1000;

/**
 * Generate a batch of simulated detection events (as if from CCTV/YOLO).
 */
export const generateDetectionBatch = (laneId: string, vehicleCount: number): DetectionEvent[] => {
  const events: DetectionEvent[] = [];
  const now = Date.now();

  for (let i = 0; i < vehicleCount; i++) {
    const isEmergency = Math.random() < 0.02;
    const vehicleType: VehicleType = isEmergency 
      ? (Math.random() < 0.5 ? 'ambulance' : 'fire truck') 
      : VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
      
    let baseSpeed = 35;
    let w = 80;
    let h = 40;

    switch (vehicleType) {
      case 'truck':
        baseSpeed = 25;
        w = 120;
        h = 55;
        break;
      case 'bus':
        baseSpeed = 20;
        w = 130;
        h = 60;
        break;
      case 'motorcycle':
      case 'bike':
        baseSpeed = 45;
        w = 50;
        h = 30;
        break;
      case 'bicycle':
        baseSpeed = 15;
        w = 40;
        h = 25;
        break;
      case 'pedestrian':
        baseSpeed = 4;
        w = 30;
        h = 30;
        break;
      case 'ambulance':
      case 'fire truck':
      case 'police vehicle':
        baseSpeed = 55;
        w = 90;
        h = 45;
        break;
      case 'animal':
        baseSpeed = 8;
        w = 45;
        h = 35;
        break;
      case 'traffic cone':
      case 'traffic light':
      case 'road block':
        baseSpeed = 0; // Stationary
        w = 25;
        h = 35;
        if (vehicleType === 'road block') {
          w = 70;
          h = 30;
        }
        break;
      default:
        baseSpeed = 35;
        break;
    }

    events.push({
      id: `det-${++detectionIdCounter}`,
      trackId: ++trackIdCounter,
      timestamp: now - Math.floor(Math.random() * 5000),
      laneId,
      vehicleType,
      speed: Math.max(0, baseSpeed + Math.floor(Math.random() * 20 - 10)),
      confidence: 0.75 + Math.random() * 0.25,
      isAnomaly: Math.random() < 0.03,
      boundingBox: {
        x: Math.floor(Math.random() * 800),
        y: Math.floor(Math.random() * 600),
        w,
        h,
      },
    });
  }

  return events;
};

/**
 * Generate historical traffic patterns for pattern recognition.
 */
export const generateTrafficPatterns = (): TrafficPattern[] => {
  const patterns: TrafficPattern[] = [];

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
      const isWeekend = day === 0 || day === 6;
      const baseFactor = isWeekend ? 0.6 : 1;
      const peakFactor = isPeak ? 1.8 : 1;
      const nightFactor = (hour >= 22 || hour <= 5) ? 0.3 : 1;

      const avgVehicles = Math.round(15 * baseFactor * peakFactor * nightFactor + Math.random() * 5);
      const avgSpeed = Math.round(40 - avgVehicles * 0.8 + Math.random() * 10);

      patterns.push({
        hour,
        dayOfWeek: day,
        avgVehicles,
        avgSpeed: Math.max(5, avgSpeed),
        dominantType: avgVehicles > 20 ? 'car' : Math.random() > 0.7 ? 'truck' : 'car',
        congestionProbability: Math.min(1, avgVehicles / 35),
        isPeakHour: isPeak && !isWeekend,
      });
    }
  }

  return patterns;
};

/**
 * Check for anomalies in current detection data.
 */
export const detectAnomalies = (detections: DetectionEvent[], laneId: string): AnomalyRecord[] => {
  const anomalies: AnomalyRecord[] = [];
  const now = Date.now();

  // Emergency vehicle detection
  const emergencies = detections.filter(d => d.vehicleType === 'emergency' || d.vehicleType === 'ambulance' || d.vehicleType === 'fire truck');
  if (emergencies.length > 0) {
    anomalies.push({
      id: `anom-${++anomalyIdCounter}`,
      timestamp: now,
      laneId,
      type: 'emergency_vehicle',
      severity: 'critical',
      description: `Emergency vehicle detected on ${laneId}. Priority signal recommended.`,
      resolved: false,
      cameraId: `CAM-01`,
      location: `${laneId.replace('lane-', 'Lane ')}`,
      screenshotPath: `/api/v1/incidents/screenshot/anom-${anomalyIdCounter}`
    });
  }

  // Overspeeding
  const speeders = detections.filter(d => d.speed > 55);
  if (speeders.length > 0) {
    anomalies.push({
      id: `anom-${++anomalyIdCounter}`,
      timestamp: now,
      laneId,
      type: 'overspeeding',
      severity: 'medium',
      description: `${speeders.length} vehicle(s) exceeding speed limit on ${laneId}.`,
      resolved: false,
      cameraId: `CAM-02`,
      location: `${laneId.replace('lane-', 'Lane ')}`,
      screenshotPath: `/api/v1/incidents/screenshot/anom-${anomalyIdCounter}`
    });
  }

  // Sudden congestion (too many vehicles)
  if (detections.length > 25) {
    anomalies.push({
      id: `anom-${++anomalyIdCounter}`,
      timestamp: now,
      laneId,
      type: 'sudden_congestion',
      severity: 'high',
      description: `Sudden congestion spike: ${detections.length} vehicles on ${laneId}.`,
      resolved: false,
      cameraId: `CAM-03`,
      location: `${laneId.replace('lane-', 'Lane ')}`,
      screenshotPath: `/api/v1/incidents/screenshot/anom-${anomalyIdCounter}`
    });
  }

  // Stopped vehicle / Breakdown
  const stopped = detections.filter(d => d.speed < 3);
  if (stopped.length >= 2) {
    anomalies.push({
      id: `anom-${++anomalyIdCounter}`,
      timestamp: now,
      laneId,
      type: 'vehicle_breakdown',
      severity: 'medium',
      description: `${stopped.length} stopped vehicle(s) detected on ${laneId}. Possible breakdown.`,
      resolved: false,
      cameraId: `CAM-04`,
      location: `${laneId.replace('lane-', 'Lane ')}`,
      screenshotPath: `/api/v1/incidents/screenshot/anom-${anomalyIdCounter}`
    });
  }

  // Simulated major incidents (Phase 9)
  if (Math.random() < 0.04) {
    const majorIncidents = [
      { type: 'accident', severity: 'critical' as const, description: 'Accident: Multiple vehicle collision' },
      { type: 'vehicle_collision', severity: 'critical' as const, description: 'Collision: Secondary impact crash' },
      { type: 'wrong_way_driving', severity: 'critical' as const, description: 'Wrong-way Driving: Vehicle traveling opposite direction' },
      { type: 'illegal_parking', severity: 'medium' as const, description: 'Illegal Parking: Stalled delivery vehicle' },
      { type: 'red_light_violation', severity: 'high' as const, description: 'Red Light Violation: Vehicle crossed limit line on RED' },
      { type: 'road_block', severity: 'high' as const, description: 'Road Block: Visual debris/spill on lane' },
      { type: 'fire', severity: 'critical' as const, description: 'Fire: Active engine/brush fire detected' },
      { type: 'smoke', severity: 'high' as const, description: 'Smoke: Thick haze limiting visibility' },
    ];
    const item = majorIncidents[Math.floor(Math.random() * majorIncidents.length)];
    anomalies.push({
      id: `anom-${++anomalyIdCounter}`,
      timestamp: now,
      laneId,
      type: item.type,
      severity: item.severity,
      description: `${item.description} on ${laneId}. Emergency services notified.`,
      resolved: false,
      cameraId: `CAM-0${Math.floor(Math.random() * 4) + 1}`,
      location: `${laneId.replace('lane-', 'Lane ')}`,
      screenshotPath: `/api/v1/incidents/screenshot/anom-${anomalyIdCounter}`
    });
  }

  return anomalies;
};

export const getVehicleTypeDistribution = (detections: DetectionEvent[]): Record<VehicleType, number> => {
  const dist: Record<VehicleType, number> = { 
    car: 0, 
    truck: 0, 
    bus: 0, 
    motorcycle: 0, 
    bicycle: 0, 
    emergency: 0,
    bike: 0,
    pedestrian: 0,
    ambulance: 0,
    'fire truck': 0,
    'police vehicle': 0,
    animal: 0,
    'traffic cone': 0,
    'traffic light': 0,
    'road block': 0
  };
  detections.forEach(d => { 
    if (dist[d.vehicleType] !== undefined) {
      dist[d.vehicleType]++; 
    }
  });
  return dist;
};

/**
 * Calculate average speed from detections.
 */
export const getAverageSpeed = (detections: DetectionEvent[]): number => {
  if (detections.length === 0) return 0;
  return Math.round(detections.reduce((s, d) => s + d.speed, 0) / detections.length);
};

/**
 * Get current hour traffic pattern prediction.
 */
export const getCurrentPatternPrediction = (patterns: TrafficPattern[]): TrafficPattern | null => {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  return patterns.find(p => p.hour === hour && p.dayOfWeek === day) || null;
};
