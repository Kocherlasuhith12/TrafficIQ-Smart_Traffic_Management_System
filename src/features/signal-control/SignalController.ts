// ─── SignalController.ts ───
// Orchestrates vehicle counting, timing calculation, and signal state transitions.
// Now speed-aware: uses average speed per lane to adjust green duration.

import { Intersection, SignalState, Lane, SpeedCategory } from '@/types/traffic';
import { VehicleCounter } from './VehicleCounter';
import { TimingEngine } from './TimingEngine';

export class SignalController {
  private counter: VehicleCounter;
  private engine: TimingEngine;
  private emergencyOverride: string | null = null;

  constructor(counter: VehicleCounter, engine: TimingEngine) {
    this.counter = counter;
    this.engine = engine;
  }

  /**
   * Main tick: advance the intersection state by 1 second.
   */
  tick(intersection: Intersection): Intersection {
    const updated = { ...intersection, lanes: intersection.lanes.map(l => ({ ...l })) };

    // Emergency override: force green on emergency lane
    if (this.emergencyOverride) {
      const eLane = updated.lanes.find(l => l.id === this.emergencyOverride);
      if (eLane && updated.activeLaneId !== this.emergencyOverride) {
        updated.activeLaneId = this.emergencyOverride;
        updated.signalState = 'GREEN';
        updated.remainingGreenTime = 15; // emergency green
      }
    }

    if (updated.remainingGreenTime > 0) {
      updated.remainingGreenTime -= 1;

      if (updated.remainingGreenTime <= 0) {
        if (updated.signalState === 'GREEN') {
          updated.signalState = 'YELLOW';
          updated.remainingGreenTime = this.engine.getConfig().yellowTime;
        } else if (updated.signalState === 'YELLOW') {
          updated.signalState = 'RED';
          const nextLane = this.getNextLane(updated);
          updated.activeLaneId = nextLane.id;
          updated.signalState = 'GREEN';

          const counts = this.counter.getCounts();
          counts.forEach(c => {
            const lane = updated.lanes.find(l => l.id === c.laneId);
            if (lane) {
              lane.vehicleCount = c.count;
              lane.queueLength = Math.max(0, Math.round(c.count * 0.4));
            }
          });

          const nextCount = counts.find(c => c.laneId === nextLane.id)?.count ?? 10;
          const nextSpeed = nextLane.averageSpeed || 30;
          updated.remainingGreenTime = this.engine.calculateSpeedAwareDuration(nextCount, nextSpeed);
          updated.cycleCount += 1;
        }
      }
    }

    // Simulate vehicles clearing during green
    const activeLane = updated.lanes.find(l => l.id === updated.activeLaneId);
    if (activeLane && updated.signalState === 'GREEN' && activeLane.vehicleCount > 0) {
      activeLane.vehicleCount = Math.max(0, activeLane.vehicleCount - 1);
      activeLane.queueLength = Math.max(0, activeLane.queueLength - 1);
      // Speed increases when green
      activeLane.averageSpeed = Math.min(55, activeLane.averageSpeed + 0.5);
    }

    // Simulate vehicles arriving on red lanes and speed dropping
    updated.lanes.forEach(lane => {
      if (lane.id !== updated.activeLaneId) {
        if (Math.random() > 0.6) {
          lane.vehicleCount += 1;
          lane.queueLength = Math.min(lane.queueLength + 1, 30);
        }
        // Speed drops on red
        lane.averageSpeed = Math.max(0, lane.averageSpeed - 0.3);
      }

      // Classify speed
      lane.speedCategory = this.classifySpeed(lane.averageSpeed);
      lane.isCongested = lane.vehicleCount > 20 && lane.averageSpeed < 15;
      lane.isBlocked = lane.averageSpeed < 5 && lane.vehicleCount > 5;
    });

    return updated;
  }

  private classifySpeed(speed: number): SpeedCategory {
    if (speed < 15) return 'slow';
    if (speed > 35) return 'fast';
    return 'normal';
  }

  /**
   * Select next lane using density + speed priority.
   * Congested (high count + slow speed) lanes get higher priority.
   */
  private getNextLane(intersection: Intersection): Lane {
    const currentIdx = intersection.lanes.findIndex(l => l.id === intersection.activeLaneId);
    const otherLanes = intersection.lanes.filter(l => l.id !== intersection.activeLaneId);

    // Priority score: higher count + lower speed = higher priority
    otherLanes.sort((a, b) => {
      const scoreA = a.vehicleCount * (1 + Math.max(0, 40 - a.averageSpeed) / 40);
      const scoreB = b.vehicleCount * (1 + Math.max(0, 40 - b.averageSpeed) / 40);
      return scoreB - scoreA;
    });

    return otherLanes[0] || intersection.lanes[(currentIdx + 1) % intersection.lanes.length];
  }

  setEmergencyOverride(laneId: string | null): void {
    this.emergencyOverride = laneId;
  }

  getCounter(): VehicleCounter {
    return this.counter;
  }

  getEngine(): TimingEngine {
    return this.engine;
  }
}
