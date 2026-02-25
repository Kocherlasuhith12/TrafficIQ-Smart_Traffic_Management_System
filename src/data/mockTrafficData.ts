import { Intersection, Lane, HistoricalDataPoint } from '@/types/traffic';

const makeLanes = (prefix: string): Lane[] => [
  { id: `lane-N${prefix}`, name: 'North Lane', direction: 'N', vehicleCount: 10 + Math.floor(Math.random() * 10), queueLength: 4, averageSpeed: 30 + Math.floor(Math.random() * 15), speedCategory: 'normal', isCongested: false, isBlocked: false },
  { id: `lane-S${prefix}`, name: 'South Lane', direction: 'S', vehicleCount: 7 + Math.floor(Math.random() * 8), queueLength: 3, averageSpeed: 32 + Math.floor(Math.random() * 12), speedCategory: 'normal', isCongested: false, isBlocked: false },
  { id: `lane-E${prefix}`, name: 'East Lane', direction: 'E', vehicleCount: 12 + Math.floor(Math.random() * 12), queueLength: 5, averageSpeed: 28 + Math.floor(Math.random() * 15), speedCategory: 'normal', isCongested: false, isBlocked: false },
  { id: `lane-W${prefix}`, name: 'West Lane', direction: 'W', vehicleCount: 5 + Math.floor(Math.random() * 8), queueLength: 2, averageSpeed: 35 + Math.floor(Math.random() * 10), speedCategory: 'normal', isCongested: false, isBlocked: false },
];

export const createDefaultIntersections = (): Intersection[] => [
  { id: 'int-1', name: 'Main St & 1st Ave', lanes: makeLanes(''), activeLaneId: 'lane-N', signalState: 'GREEN', remainingGreenTime: 15, cycleCount: 0 },
  { id: 'int-2', name: 'Broadway & Oak Dr', lanes: makeLanes('2'), activeLaneId: 'lane-N2', signalState: 'GREEN', remainingGreenTime: 12, cycleCount: 0 },
  { id: 'int-3', name: 'Park Ave & 5th St', lanes: makeLanes('3'), activeLaneId: 'lane-N3', signalState: 'GREEN', remainingGreenTime: 18, cycleCount: 0 },
  { id: 'int-4', name: 'Central Blvd & Elm Rd', lanes: makeLanes('4'), activeLaneId: 'lane-N4', signalState: 'GREEN', remainingGreenTime: 10, cycleCount: 0 },
  { id: 'int-5', name: 'Highway 7 & Ring Rd', lanes: makeLanes('5'), activeLaneId: 'lane-N5', signalState: 'GREEN', remainingGreenTime: 20, cycleCount: 0 },
  { id: 'int-6', name: 'Station Rd & Lake Ave', lanes: makeLanes('6'), activeLaneId: 'lane-N6', signalState: 'GREEN', remainingGreenTime: 14, cycleCount: 0 },
];

export const generateHistoricalData = (): HistoricalDataPoint[] => {
  const data: HistoricalDataPoint[] = [];
  const lanes = ['lane-N', 'lane-S', 'lane-E', 'lane-W'];
  const now = Date.now();

  for (let i = 60; i >= 0; i--) {
    lanes.forEach(laneId => {
      const hour = new Date(now - i * 60000).getHours();
      const rushHourFactor = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19) ? 1.8 : 1;
      const base = 8 + Math.random() * 15;
      data.push({
        timestamp: now - i * 60000,
        laneId,
        vehicleCount: Math.round(base * rushHourFactor),
        waitTime: Math.round(20 + Math.random() * 40 * rushHourFactor),
        greenDuration: Math.round(15 + base * rushHourFactor),
        averageSpeed: Math.round(40 - base * 0.5 * rushHourFactor + Math.random() * 10),
      });
    });
  }
  return data;
};
