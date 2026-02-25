// ─── mlService.ts ───
// Lightweight ML layer for traffic prediction.
// Clearly separated from rule-based logic in TimingEngine.

import { MLPrediction, HistoricalDataPoint, VehicleCountEntry } from '@/types/traffic';

/**
 * TREND ANALYSIS: Simple linear regression on recent vehicle counts.
 */
const analyzeTrend = (history: number[]): { slope: number; trend: 'increasing' | 'decreasing' | 'stable' } => {
  if (history.length < 3) return { slope: 0, trend: 'stable' };

  const n = history.length;
  const xMean = (n - 1) / 2;
  const yMean = history.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (history[i] - yMean);
    denominator += (i - xMean) * (i - xMean);
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const trend = slope > 0.5 ? 'increasing' : slope < -0.5 ? 'decreasing' : 'stable';
  return { slope, trend };
};

/**
 * SPEED TREND ANALYSIS: Predict whether speed is dropping (congestion forming).
 */
const analyzeSpeedTrend = (speeds: number[]): { trend: 'slowing' | 'accelerating' | 'stable'; predictedSpeed: number } => {
  if (speeds.length < 3) return { trend: 'stable', predictedSpeed: speeds[speeds.length - 1] || 30 };
  const { slope, trend } = analyzeTrend(speeds);
  const predictedSpeed = Math.max(0, Math.round(speeds[speeds.length - 1] + slope * 2));
  const speedTrend = trend === 'decreasing' ? 'slowing' : trend === 'increasing' ? 'accelerating' : 'stable';
  return { trend: speedTrend, predictedSpeed };
};

/**
 * Generate ML predictions for each lane based on historical data.
 */
export const generatePredictions = (
  currentCounts: VehicleCountEntry[],
  historicalData: HistoricalDataPoint[]
): MLPrediction[] => {
  return currentCounts.map(entry => {
    const laneHistory = historicalData
      .filter(h => h.laneId === entry.laneId)
      .slice(-10);

    const countHistory = laneHistory.map(h => h.vehicleCount);
    countHistory.push(entry.count);

    const speedHistory = laneHistory.map(h => h.averageSpeed);

    const { slope, trend } = analyzeTrend(countHistory);
    const { trend: speedTrend, predictedSpeed } = analyzeSpeedTrend(speedHistory);

    const predictedCount = Math.max(0, Math.round(entry.count + slope * 2));
    const confidence = Math.min(0.95, 0.5 + countHistory.length * 0.05);

    let recommendedAdjustment = 0;
    if (trend === 'increasing') recommendedAdjustment = Math.min(10, Math.round(slope * 3));
    if (trend === 'decreasing') recommendedAdjustment = Math.max(-5, Math.round(slope * 2));
    // Speed-based adjustment: if speed is dropping, extend green
    if (speedTrend === 'slowing') recommendedAdjustment += 2;
    if (speedTrend === 'accelerating') recommendedAdjustment -= 1;

    return {
      laneId: entry.laneId,
      predictedCount,
      predictedSpeed,
      confidence,
      trend,
      speedTrend,
      recommendedAdjustment,
    };
  });
};

/**
 * Get ML insight summary for display.
 */
export const getMLInsightSummary = (predictions: MLPrediction[]): string => {
  const increasing = predictions.filter(p => p.trend === 'increasing');
  const decreasing = predictions.filter(p => p.trend === 'decreasing');
  const slowing = predictions.filter(p => p.speedTrend === 'slowing');

  if (slowing.length > 0) {
    return `Speed drop detected on ${slowing.length} lane(s) — congestion forming. Signal timing adjusted proactively.`;
  }
  if (increasing.length > decreasing.length) {
    return `Traffic building up on ${increasing.length} lane(s). Signal timing extended proactively.`;
  } else if (decreasing.length > increasing.length) {
    return `Traffic easing on ${decreasing.length} lane(s). Reducing green time to improve efficiency.`;
  }
  return 'Traffic patterns stable. Maintaining current adaptive timing.';
};
