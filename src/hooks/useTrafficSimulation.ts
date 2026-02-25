// ─── useTrafficSimulation.ts ───
// Main simulation hook that drives the entire traffic system.

import { useState, useEffect, useCallback, useRef } from 'react';
import { Intersection, TrafficMetrics, MLPrediction, HistoricalDataPoint, JunctionSummary, TrafficFlowMetrics, EmergencyOverrideLog } from '@/types/traffic';
import { SignalController } from '@/features/signal-control/SignalController';
import { createDefaultIntersections, generateHistoricalData } from '@/data/mockTrafficData';
import { createAllControllers } from '@/services/signalService';
import { getTrafficMetrics, getJunctionSummary, getTrafficFlowMetrics } from '@/services/trafficService';
import { generatePredictions, getMLInsightSummary } from '@/services/mlService';
import { trafficScenarios } from '@/data/scenarios';
import {
  DetectionEvent, AnomalyRecord, TrafficPattern,
  generateDetectionBatch, detectAnomalies, generateTrafficPatterns,
  getVehicleTypeDistribution, getAverageSpeed, getCurrentPatternPrediction,
  VehicleType,
} from '@/data/trafficDetectionDataset';

export interface SimulationState {
  intersections: Intersection[];
  metrics: TrafficMetrics[];
  predictions: MLPrediction[];
  mlInsight: string;
  isRunning: boolean;
  activeScenario: string;
  historicalData: HistoricalDataPoint[];
  elapsedSeconds: number;
  detections: DetectionEvent[];
  anomalies: AnomalyRecord[];
  trafficPatterns: TrafficPattern[];
  vehicleDistribution: Record<VehicleType, number>;
  averageSpeed: number;
  currentPattern: TrafficPattern | null;
  emergencyActive: boolean;
  emergencyLane: string | null;
  junctionSummaries: JunctionSummary[];
  trafficFlows: TrafficFlowMetrics[];
  emergencyLogs: EmergencyOverrideLog[];
}

export const useTrafficSimulation = () => {
  const controllerRef = useRef<SignalController[]>([]);
  const [state, setState] = useState<SimulationState>(() => {
    const intersections = createDefaultIntersections();
    const historical = generateHistoricalData();
    const patterns = generateTrafficPatterns();
    const metrics = intersections.map(i => getTrafficMetrics(i));
    return {
      intersections,
      metrics,
      predictions: [],
      mlInsight: 'Initializing ML analysis...',
      isRunning: true,
      activeScenario: 'normal',
      historicalData: historical,
      elapsedSeconds: 0,
      detections: [],
      anomalies: [],
      trafficPatterns: patterns,
      vehicleDistribution: { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0, emergency: 0 },
      averageSpeed: 0,
      currentPattern: getCurrentPatternPrediction(patterns),
      emergencyActive: false,
      emergencyLane: null,
      junctionSummaries: intersections.map((int, idx) => getJunctionSummary(int, metrics[idx])),
      trafficFlows: getTrafficFlowMetrics(intersections[0]),
      emergencyLogs: [],
    };
  });

  useEffect(() => {
    controllerRef.current = createAllControllers();
  }, []);

  // Main simulation loop
  useEffect(() => {
    if (!state.isRunning) return;

    const interval = setInterval(() => {
      setState(prev => {
        const controllers = controllerRef.current;
        if (controllers.length === 0) return prev;

        const updatedIntersections = prev.intersections.map((intersection, idx) => {
          const controller = controllers[idx];
          if (!controller) return intersection;
          return controller.tick(intersection);
        });

        const metrics = updatedIntersections.map(i => getTrafficMetrics(i));
        const junctionSummaries = updatedIntersections.map((int, idx) => getJunctionSummary(int, metrics[idx]));
        const trafficFlows = getTrafficFlowMetrics(updatedIntersections[0]);

        // ML predictions every 5 seconds
        let predictions = prev.predictions;
        let mlInsight = prev.mlInsight;
        if (prev.elapsedSeconds % 5 === 0) {
          const counts = updatedIntersections[0].lanes.map(l => ({
            laneId: l.id, laneName: l.name, count: l.vehicleCount, timestamp: Date.now(),
          }));
          predictions = generatePredictions(counts, prev.historicalData);
          mlInsight = getMLInsightSummary(predictions);
        }

        // Detection events every 3 seconds
        let detections = prev.detections;
        let anomalies = prev.anomalies;
        let vehicleDistribution = prev.vehicleDistribution;
        let averageSpeed = prev.averageSpeed;
        let emergencyActive = prev.emergencyActive;
        let emergencyLane = prev.emergencyLane;
        let emergencyLogs = prev.emergencyLogs;

        if (prev.elapsedSeconds % 3 === 0) {
          const allDetections: DetectionEvent[] = [];
          const newAnomalies: AnomalyRecord[] = [];

          updatedIntersections[0].lanes.forEach(lane => {
            const batch = generateDetectionBatch(lane.id, lane.vehicleCount);
            allDetections.push(...batch);
            const laneAnomalies = detectAnomalies(batch, lane.id);
            newAnomalies.push(...laneAnomalies);
          });

          detections = [...prev.detections.slice(-50), ...allDetections];
          anomalies = [...prev.anomalies, ...newAnomalies].slice(-50);
          vehicleDistribution = getVehicleTypeDistribution(allDetections);
          averageSpeed = getAverageSpeed(allDetections);

          const emergencyAnomaly = newAnomalies.find(a => a.type === 'emergency_vehicle');
          if (emergencyAnomaly) {
            emergencyActive = true;
            emergencyLane = emergencyAnomaly.laneId;
            controllers[0]?.setEmergencyOverride(emergencyAnomaly.laneId);
            emergencyLogs = [...emergencyLogs, {
              id: `eo-${Date.now()}`,
              timestamp: Date.now(),
              laneId: emergencyAnomaly.laneId,
              junctionId: 'int-1',
              junctionName: updatedIntersections[0].name,
              durationMs: 0,
              resolved: false,
            }].slice(-20);
          } else if (prev.emergencyActive && prev.elapsedSeconds % 15 === 0) {
            emergencyActive = false;
            emergencyLane = null;
            controllers[0]?.setEmergencyOverride(null);
            emergencyLogs = emergencyLogs.map(l => l.resolved ? l : { ...l, resolved: true, durationMs: Date.now() - l.timestamp });
          }
        }

        let currentPattern = prev.currentPattern;
        if (prev.elapsedSeconds % 60 === 0) {
          currentPattern = getCurrentPatternPrediction(prev.trafficPatterns);
        }

        return {
          ...prev,
          intersections: updatedIntersections,
          metrics,
          predictions,
          mlInsight,
          elapsedSeconds: prev.elapsedSeconds + 1,
          detections,
          anomalies,
          vehicleDistribution,
          averageSpeed,
          currentPattern,
          emergencyActive,
          emergencyLane,
          junctionSummaries,
          trafficFlows,
          emergencyLogs,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isRunning]);

  const toggleSimulation = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: !prev.isRunning }));
  }, []);

  const setScenario = useCallback((scenarioId: string) => {
    const scenario = trafficScenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    setState(prev => {
      const updated = { ...prev, activeScenario: scenarioId };
      const controller = controllerRef.current[0];
      if (controller) {
        scenario.laneConfigs.forEach(config => {
          controller.getCounter().updateBaseCount(config.laneId, config.baseCount);
        });
      }
      return updated;
    });
  }, []);

  return { ...state, toggleSimulation, setScenario };
};
