import { VehicleCountEntry } from '@/types/traffic';

// Simulates vehicle count updates with some variance
export const generateVehicleCounts = (baseCounts: Record<string, number>): VehicleCountEntry[] => {
  const names: Record<string, string> = {
    'lane-N': 'North Lane', 'lane-S': 'South Lane', 'lane-E': 'East Lane', 'lane-W': 'West Lane',
    'lane-N2': 'North Lane', 'lane-S2': 'South Lane', 'lane-E2': 'East Lane', 'lane-W2': 'West Lane',
    'lane-N3': 'North Lane', 'lane-S3': 'South Lane', 'lane-E3': 'East Lane', 'lane-W3': 'West Lane',
    'lane-N4': 'North Lane', 'lane-S4': 'South Lane', 'lane-E4': 'East Lane', 'lane-W4': 'West Lane',
    'lane-N5': 'North Lane', 'lane-S5': 'South Lane', 'lane-E5': 'East Lane', 'lane-W5': 'West Lane',
    'lane-N6': 'North Lane', 'lane-S6': 'South Lane', 'lane-E6': 'East Lane', 'lane-W6': 'West Lane',
  };

  return Object.entries(baseCounts).map(([laneId, base]) => ({
    laneId,
    laneName: names[laneId] || laneId,
    count: Math.max(0, base + Math.floor(Math.random() * 7 - 3)),
    timestamp: Date.now(),
  }));
};

const makeInitial = (prefix: string) => ({
  [`lane-N${prefix}`]: 12 + Math.floor(Math.random() * 5),
  [`lane-S${prefix}`]: 8 + Math.floor(Math.random() * 5),
  [`lane-E${prefix}`]: 18 + Math.floor(Math.random() * 5),
  [`lane-W${prefix}`]: 5 + Math.floor(Math.random() * 5),
});

export const initialVehicleCounts: Record<string, number> = makeInitial('');
export const initialVehicleCounts2: Record<string, number> = makeInitial('2');
export const initialVehicleCounts3: Record<string, number> = makeInitial('3');
export const initialVehicleCounts4: Record<string, number> = makeInitial('4');
export const initialVehicleCounts5: Record<string, number> = makeInitial('5');
export const initialVehicleCounts6: Record<string, number> = makeInitial('6');
