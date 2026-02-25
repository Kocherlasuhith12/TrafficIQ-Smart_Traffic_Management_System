// ─── trafficService.ts ───
// Service layer for traffic data management.

import { Intersection, TrafficMetrics, JunctionSummary, TrafficFlowMetrics } from '@/types/traffic';
import { calculateWaitTime, calculateThroughput, calculateCongestionLevel, FIXED_GREEN_DURATION, FIXED_CYCLE_DURATION } from '@/utils/calculations';

/**
 * Calculate real-time traffic metrics for an intersection.
 */
export const getTrafficMetrics = (intersection: Intersection): TrafficMetrics => {
  const totalVehicles = intersection.lanes.reduce((s, l) => s + l.vehicleCount, 0);
  const totalQueue = intersection.lanes.reduce((s, l) => s + l.queueLength, 0);
  const avgCount = totalVehicles / intersection.lanes.length;
  const avgSpeed = intersection.lanes.reduce((s, l) => s + l.averageSpeed, 0) / intersection.lanes.length;

  const adaptiveCycle = intersection.lanes.length * (intersection.remainingGreenTime + 3);
  const avgWait = calculateWaitTime(avgCount, intersection.remainingGreenTime, Math.max(adaptiveCycle, 40));
  const throughput = calculateThroughput(intersection.remainingGreenTime, Math.max(adaptiveCycle, 40));

  const fixedCycle = FIXED_CYCLE_DURATION;
  const avgWaitFixed = calculateWaitTime(avgCount, FIXED_GREEN_DURATION, fixedCycle);
  const throughputFixed = calculateThroughput(FIXED_GREEN_DURATION, fixedCycle);
  const queueFixed = Math.round(totalQueue * 1.4);

  return {
    averageWaitTime: avgWait,
    averageWaitTimeFixed: avgWaitFixed,
    throughput,
    throughputFixed,
    queueLength: totalQueue,
    queueLengthFixed: queueFixed,
    congestionLevel: calculateCongestionLevel(totalQueue, intersection.lanes.length * 30),
    averageSpeed: Math.round(avgSpeed),
  };
};

/**
 * Generate junction summary for multi-junction comparison.
 */
export const getJunctionSummary = (intersection: Intersection, metrics: TrafficMetrics): JunctionSummary => {
  const totalVehicles = intersection.lanes.reduce((s, l) => s + l.vehicleCount, 0);
  return {
    id: intersection.id,
    name: intersection.name,
    totalVehicles,
    averageSpeed: metrics.averageSpeed,
    averageWaitTime: metrics.averageWaitTime,
    throughput: metrics.throughput,
    congestionLevel: metrics.congestionLevel,
    activeLane: intersection.activeLaneId,
    signalState: intersection.signalState,
    remainingGreenTime: intersection.remainingGreenTime,
    isBottleneck: metrics.congestionLevel > 0.6,
    isHighFlow: metrics.throughput > 10 && metrics.congestionLevel < 0.3,
  };
};

/**
 * Calculate traffic flow metrics for signal efficiency evaluation.
 */
export const getTrafficFlowMetrics = (intersection: Intersection): TrafficFlowMetrics[] => {
  return intersection.lanes.map(lane => {
    const isActive = lane.id === intersection.activeLaneId;
    const speedBeforeSignal = Math.max(5, lane.averageSpeed - (isActive ? 0 : 10));
    const speedDuringGreen = isActive ? Math.min(50, lane.averageSpeed + 8) : 0;
    const speedAfterCrossing = isActive ? Math.min(55, speedDuringGreen + 5) : 0;
    const clearanceRate = isActive && intersection.remainingGreenTime > 0
      ? Math.min(2, lane.vehicleCount / Math.max(1, intersection.remainingGreenTime))
      : 0;
    const signalEfficiency = isActive
      ? Math.min(1, clearanceRate / 1.5) * (speedDuringGreen / 50)
      : 0;

    return {
      laneId: lane.id,
      speedBeforeSignal: Math.round(speedBeforeSignal),
      speedDuringGreen: Math.round(speedDuringGreen),
      speedAfterCrossing: Math.round(speedAfterCrossing),
      signalEfficiency: Math.round(signalEfficiency * 100) / 100,
      clearanceRate: Math.round(clearanceRate * 100) / 100,
    };
  });
};
