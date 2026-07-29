import { VehicleType } from '@/data/trafficDetectionDataset';

interface VehicleClassificationProps {
  distribution: Record<VehicleType, number>;
  averageSpeed: number;
}

const typeLabels: Record<VehicleType, { icon: string; label: string; color: string }> = {
  car: { icon: '🚗', label: 'Cars', color: 'bg-primary' },
  truck: { icon: '🚛', label: 'Trucks', color: 'bg-accent' },
  bus: { icon: '🚌', label: 'Buses', color: 'bg-[hsl(var(--chart-blue))]' },
  motorcycle: { icon: '🏍️', label: 'Motorcycles', color: 'bg-[hsl(var(--chart-purple))]' },
  bike: { icon: '🏍️', label: 'Motorcycles', color: 'bg-[hsl(var(--chart-purple))]' },
  bicycle: { icon: '🚲', label: 'Bicycles', color: 'bg-muted-foreground' },
  emergency: { icon: '🚑', label: 'Emergency', color: 'bg-destructive' },
  ambulance: { icon: '🚑', label: 'Ambulances', color: 'bg-destructive' },
  'fire truck': { icon: '🚒', label: 'Fire Trucks', color: 'bg-destructive' },
  pedestrian: { icon: '🚶', label: 'Pedestrians', color: 'bg-indigo-500' },
  'police vehicle': { icon: '🚓', label: 'Police Vehicles', color: 'bg-blue-600' },
  animal: { icon: '🐕', label: 'Animals', color: 'bg-amber-600' },
  'traffic cone': { icon: '🚧', label: 'Traffic Cones', color: 'bg-orange-500' },
  'traffic light': { icon: '🚦', label: 'Traffic Lights', color: 'bg-green-500' },
  'road block': { icon: '🛑', label: 'Road Blocks', color: 'bg-red-600' },
};

const VehicleClassification = ({ distribution, averageSpeed }: VehicleClassificationProps) => {
  const total = Object.values(distribution).reduce((s, v) => s + v, 0);
  const sorted = Object.entries(distribution)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a) as [VehicleType, number][];

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">🔍</span>
        <h3 className="text-sm font-semibold text-foreground">Vehicle Classification</h3>
      </div>

      {/* Speed indicator */}
      <div className="mb-4 flex items-center gap-2 rounded-md bg-secondary/50 px-3 py-2">
        <span className="text-xs text-muted-foreground">Avg Speed:</span>
        <span className={`text-sm font-mono font-bold ${
          averageSpeed > 35 ? 'text-primary' : averageSpeed > 20 ? 'text-accent' : 'text-destructive'
        }`}>
          {averageSpeed} km/h
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {averageSpeed > 35 ? 'Free flow' : averageSpeed > 20 ? 'Moderate' : 'Congested'}
        </span>
      </div>

      {/* Distribution */}
      <div className="space-y-2.5">
        {sorted.map(([type, count]) => {
          const info = typeLabels[type] || { icon: '🚗', label: type, color: 'bg-primary' };
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={type}>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5">
                  <span>{info.icon}</span>
                  <span className="text-foreground">{info.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-muted-foreground">{count}</span>
                  <span className="font-mono text-foreground">{pct}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${info.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          ML Classification: CNN-based vehicle type detection with {total} samples.
        </p>
      </div>
    </div>
  );
};

export default VehicleClassification;
