// ─── TimingEngine.ts ───
// Calculates adaptive green signal durations based on vehicle density AND speed.
// Green time is directly proportional to vehicle count — never exceeds it.
// Speed-aware: high count + slow speed → longer green; low count + fast speed → shorter green.

import { SignalTiming, VehicleCountEntry, MLPrediction } from '@/types/traffic';

export interface TimingConfig {
  minGreenTime: number;   // seconds
  maxGreenTime: number;   // seconds
  yellowTime: number;     // seconds
  vehiclesPerSecond: number;
  speedThresholdSlow: number;  // km/h below this = slow
  speedThresholdFast: number;  // km/h above this = fast
}

const DEFAULT_TIMING_CONFIG: TimingConfig = {
  minGreenTime: 5,
  maxGreenTime: 45,
  yellowTime: 3,
  vehiclesPerSecond: 1,
  speedThresholdSlow: 20,
  speedThresholdFast: 40,
};

export class TimingEngine {
  private config: TimingConfig;

  constructor(config: Partial<TimingConfig> = {}) {
    this.config = { ...DEFAULT_TIMING_CONFIG, ...config };
  }

  /**
   * RULE-BASED: Green duration = vehicleCount / vehiclesPerSecond.
   * Directly proportional — green time never exceeds vehicle count.
   * Capped by min/max for safety.
   */
  calculateGreenDuration(vehicleCount: number): number {
    const needed = Math.ceil(vehicleCount / this.config.vehiclesPerSecond);
    return Math.max(this.config.minGreenTime, Math.min(this.config.maxGreenTime, needed));
  }

  /**
   * SPEED-AWARE: Adjust green duration based on average lane speed.
   * Slow traffic needs more time to clear → multiply by speed factor.
   * Fast traffic clears quickly → reduce green time.
   */
  calculateSpeedAwareDuration(vehicleCount: number, averageSpeed: number): number {
    let baseDuration = this.calculateGreenDuration(vehicleCount);

    // Speed factor: slow traffic gets up to 1.4x, fast traffic gets 0.7x
    let speedFactor = 1.0;
    if (averageSpeed <= this.config.speedThresholdSlow) {
      speedFactor = 1.2 + (this.config.speedThresholdSlow - averageSpeed) * 0.01; // up to ~1.4
    } else if (averageSpeed >= this.config.speedThresholdFast) {
      speedFactor = 0.85 - (averageSpeed - this.config.speedThresholdFast) * 0.005; // down to ~0.7
      speedFactor = Math.max(0.7, speedFactor);
    }

    baseDuration = Math.round(baseDuration * speedFactor);

    // Never exceed vehicle count
    baseDuration = Math.min(baseDuration, vehicleCount);
    return Math.max(this.config.minGreenTime, Math.min(this.config.maxGreenTime, baseDuration));
  }

  /**
   * ML-ASSISTED: Adjust green duration using ML prediction + speed.
   * Final value still capped so it doesn't exceed vehicle count + adjustment.
   */
  calculateAdaptiveDuration(vehicleCount: number, averageSpeed: number, prediction?: MLPrediction): number {
    let baseDuration = this.calculateSpeedAwareDuration(vehicleCount, averageSpeed);

    if (prediction) {
      baseDuration += prediction.recommendedAdjustment;
      const upperBound = Math.min(
        this.config.maxGreenTime,
        vehicleCount + Math.max(0, prediction.recommendedAdjustment)
      );
      baseDuration = Math.max(this.config.minGreenTime, Math.min(upperBound, baseDuration));
    }

    return Math.round(baseDuration);
  }

  /**
   * Calculate timing for all lanes, ensuring fairness.
   */
  calculateAllTimings(counts: VehicleCountEntry[], speeds: Record<string, number>, predictions?: MLPrediction[]): SignalTiming[] {
    const totalVehicles = counts.reduce((sum, c) => sum + c.count, 0);

    return counts.map(entry => {
      const prediction = predictions?.find(p => p.laneId === entry.laneId);
      const speed = speeds[entry.laneId] ?? 30;
      const greenDuration = this.calculateAdaptiveDuration(entry.count, speed, prediction);
      const densityFactor = totalVehicles > 0 ? entry.count / totalVehicles : 1 / counts.length;

      let speedFactor = 1.0;
      if (speed <= this.config.speedThresholdSlow) speedFactor = 1.3;
      else if (speed >= this.config.speedThresholdFast) speedFactor = 0.8;

      return {
        laneId: entry.laneId,
        greenDuration,
        yellowDuration: this.config.yellowTime,
        isAdaptive: true,
        densityFactor: Math.round(densityFactor * 100) / 100,
        speedFactor: Math.round(speedFactor * 100) / 100,
      };
    });
  }

  getConfig(): TimingConfig {
    return { ...this.config };
  }
}
