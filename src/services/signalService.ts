// ─── signalService.ts ───
// Service for managing signal controller lifecycle for all 6 junctions.

import { SignalController } from '@/features/signal-control/SignalController';
import { VehicleCounter } from '@/features/signal-control/VehicleCounter';
import { TimingEngine } from '@/features/signal-control/TimingEngine';
import {
  initialVehicleCounts, initialVehicleCounts2, initialVehicleCounts3,
  initialVehicleCounts4, initialVehicleCounts5, initialVehicleCounts6,
} from '@/data/vehicleCounts';

const createController = (counts: Record<string, number>): SignalController => {
  return new SignalController(new VehicleCounter(counts), new TimingEngine());
};

export const createSignalController1 = (): SignalController => createController(initialVehicleCounts);
export const createSignalController2 = (): SignalController => createController(initialVehicleCounts2);
export const createSignalController3 = (): SignalController => createController(initialVehicleCounts3);
export const createSignalController4 = (): SignalController => createController(initialVehicleCounts4);
export const createSignalController5 = (): SignalController => createController(initialVehicleCounts5);
export const createSignalController6 = (): SignalController => createController(initialVehicleCounts6);

export const createAllControllers = (): SignalController[] => [
  createSignalController1(),
  createSignalController2(),
  createSignalController3(),
  createSignalController4(),
  createSignalController5(),
  createSignalController6(),
];
