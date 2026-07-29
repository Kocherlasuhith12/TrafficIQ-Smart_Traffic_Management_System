import { DetectionEvent, AnomalyRecord, VehicleType } from '@/data/trafficDetectionDataset';

interface TrafficDetectionFeedProps {
  detections: DetectionEvent[];
  anomalies: AnomalyRecord[];
}

const vehicleEmoji: Record<VehicleType, string> = {
  car: '🚗',
  truck: '🚛',
  bus: '🚌',
  motorcycle: '🏍️',
  bicycle: '🚲',
  emergency: '🚑',
  bike: '🏍️',
  pedestrian: '🚶',
  ambulance: '🚑',
  'fire truck': '🚒',
  'police vehicle': '🚓',
  animal: '🐕',
  'traffic cone': '🚧',
  'traffic light': '🚦',
  'road block': '🛑',
};

const severityColor: Record<string, string> = {
  low: 'text-muted-foreground',
  medium: 'text-accent',
  high: 'text-destructive',
  critical: 'text-destructive',
};

const TrafficDetectionFeed = ({ detections, anomalies }: TrafficDetectionFeedProps) => {
  const recentDetections = detections.slice(-12);

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">📷</span>
        <h3 className="text-sm font-semibold text-foreground">Detection Feed (CCTV/Sensor)</h3>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">
          {detections.length} total detections
        </span>
      </div>

      {/* Anomaly Alerts */}
      {anomalies.filter(a => !a.resolved).length > 0 && (
        <div className="mb-3 space-y-1.5">
          {anomalies.filter(a => !a.resolved).slice(-3).map(a => (
            <div key={a.id} className={`flex items-start gap-2 text-xs px-2.5 py-1.5 rounded-md border ${
              a.severity === 'critical' ? 'border-destructive/40 bg-destructive/10' :
              a.severity === 'high' ? 'border-destructive/20 bg-destructive/5' :
              'border-accent/20 bg-accent/5'
            }`}>
              <span className="mt-0.5">{a.severity === 'critical' ? '🚨' : '⚠️'}</span>
              <div>
                <span className={`font-medium ${severityColor[a.severity]}`}>
                  {a.type.replace(/_/g, ' ').toUpperCase()}
                </span>
                <p className="text-muted-foreground mt-0.5">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Detections */}
      <div className="space-y-1">
        {recentDetections.map(d => (
          <div key={d.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
            <div className="flex items-center gap-2">
              <span>{vehicleEmoji[d.vehicleType]}</span>
              <span className="text-muted-foreground font-mono">{d.laneId}</span>
              <span className="text-foreground capitalize">{d.vehicleType}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">{d.speed} km/h</span>
              <span className={`font-mono ${d.confidence > 0.9 ? 'text-primary' : 'text-accent'}`}>
                {Math.round(d.confidence * 100)}%
              </span>
              {d.isAnomaly && <span className="text-destructive">⚠</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          Simulated YOLO-based object detection pipeline. Ready for real CCTV integration.
        </p>
      </div>
    </div>
  );
};

export default TrafficDetectionFeed;
