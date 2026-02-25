// ─── Core Traffic Types ───

export type SignalState = 'RED' | 'YELLOW' | 'GREEN';
export type SpeedCategory = 'slow' | 'normal' | 'fast';

export interface Lane {
  id: string;
  name: string;
  direction: 'N' | 'S' | 'E' | 'W';
  vehicleCount: number;
  queueLength: number;
  averageSpeed: number;
  speedCategory: SpeedCategory;
  isCongested: boolean;
  isBlocked: boolean;
}

export interface Intersection {
  id: string;
  name: string;
  lanes: Lane[];
  activeLaneId: string;
  signalState: SignalState;
  remainingGreenTime: number;
  cycleCount: number;
}

export interface SignalTiming {
  laneId: string;
  greenDuration: number;
  yellowDuration: number;
  isAdaptive: boolean;
  densityFactor: number;
  speedFactor: number;
}

export interface TrafficMetrics {
  averageWaitTime: number;
  averageWaitTimeFixed: number;
  throughput: number;
  throughputFixed: number;
  queueLength: number;
  queueLengthFixed: number;
  congestionLevel: number;
  averageSpeed: number;
}

export interface JunctionSummary {
  id: string;
  name: string;
  totalVehicles: number;
  averageSpeed: number;
  averageWaitTime: number;
  throughput: number;
  congestionLevel: number;
  activeLane: string;
  signalState: SignalState;
  remainingGreenTime: number;
  isBottleneck: boolean;
  isHighFlow: boolean;
}

export interface VehicleCountEntry {
  laneId: string;
  laneName: string;
  count: number;
  timestamp: number;
}

export interface MLPrediction {
  laneId: string;
  predictedCount: number;
  predictedSpeed: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  speedTrend: 'slowing' | 'accelerating' | 'stable';
  recommendedAdjustment: number; // seconds to add/subtract
}

export interface HistoricalDataPoint {
  timestamp: number;
  laneId: string;
  vehicleCount: number;
  waitTime: number;
  greenDuration: number;
  averageSpeed: number;
}

export interface TrafficScenario {
  id: string;
  name: string;
  description: string;
  laneConfigs: { laneId: string; baseCount: number; variance: number }[];
}

export interface TrafficFlowMetrics {
  laneId: string;
  speedBeforeSignal: number;
  speedDuringGreen: number;
  speedAfterCrossing: number;
  signalEfficiency: number; // 0-1
  clearanceRate: number; // vehicles cleared per second
}

export interface EmergencyOverrideLog {
  id: string;
  timestamp: number;
  laneId: string;
  junctionId: string;
  junctionName: string;
  durationMs: number;
  resolved: boolean;
}
