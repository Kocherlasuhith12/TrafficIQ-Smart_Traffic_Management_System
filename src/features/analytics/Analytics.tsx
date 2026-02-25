import { Intersection, TrafficMetrics, MLPrediction, HistoricalDataPoint, JunctionSummary, TrafficFlowMetrics, EmergencyOverrideLog } from '@/types/traffic';
import { DetectionEvent, AnomalyRecord, TrafficPattern, VehicleType } from '@/data/trafficDetectionDataset';
import TrafficCharts from './TrafficCharts';
import CongestionAnalysis from './CongestionAnalysis';
import ModelMetrics from './ModelMetrics';
import FeatureImportance from './FeatureImportance';
import MLInsights from './MLInsights';
import TrafficDetectionFeed from './TrafficDetectionFeed';
import VehicleClassification from './VehicleClassification';
import PeakHourAnalysis from './PeakHourAnalysis';
import EmergencyPriority from './EmergencyPriority';

interface AnalyticsProps {
  intersections: Intersection[];
  metrics: TrafficMetrics[];
  predictions: MLPrediction[];
  historicalData: HistoricalDataPoint[];
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

const Analytics = ({
  intersections, metrics, predictions, historicalData,
  detections, anomalies, trafficPatterns, vehicleDistribution,
  averageSpeed, currentPattern, emergencyActive, emergencyLane,
  junctionSummaries, trafficFlows, emergencyLogs,
}: AnalyticsProps) => {
  return (
    <section className="space-y-6">
      {/* Junction Comparison */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Multi-Junction Comparison
      </h2>
      <JunctionComparison summaries={junctionSummaries} />

      {/* Speed & Flow Analysis */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Speed Analysis & Traffic Flow
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpeedAnalysis intersections={intersections} />
        <TrafficFlowEvaluation flows={trafficFlows} />
      </div>

      {/* Lane Intelligence */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Lane-Level Intelligence
      </h2>
      <LaneIntelligence intersections={intersections} />

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Analytics & ML Insights
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrafficCharts intersections={intersections} historicalData={historicalData} />
        <CongestionAnalysis metrics={metrics[0]} />
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Traffic Detection & Classification
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrafficDetectionFeed detections={detections} anomalies={anomalies} />
        <VehicleClassification distribution={vehicleDistribution} averageSpeed={averageSpeed} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MLInsights predictions={predictions} />
        <PeakHourAnalysis patterns={trafficPatterns} currentPattern={currentPattern} />
        <EmergencyPriority anomalies={anomalies} emergencyActive={emergencyActive} emergencyLane={emergencyLane} emergencyLogs={emergencyLogs} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModelMetrics metrics={metrics[0]} />
        <FeatureImportance />
      </div>
    </section>
  );
};

// ─── Junction Comparison Panel ───
const JunctionComparison = ({ summaries }: { summaries: JunctionSummary[] }) => {
  const sorted = [...summaries].sort((a, b) => b.congestionLevel - a.congestionLevel);
  const mostCongested = sorted[0];

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Junction-to-Junction Comparison</h3>
        {mostCongested && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20 font-mono">
            Most Congested: {mostCongested.name}
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-2 pr-3">Junction</th>
              <th className="text-right py-2 px-2">Vehicles</th>
              <th className="text-right py-2 px-2">Avg Speed</th>
              <th className="text-right py-2 px-2">Wait Time</th>
              <th className="text-right py-2 px-2">Throughput</th>
              <th className="text-right py-2 px-2">Congestion</th>
              <th className="text-center py-2 px-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(j => (
              <tr key={j.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="py-2 pr-3 font-medium text-foreground">{j.name}</td>
                <td className="text-right py-2 px-2 font-mono">{j.totalVehicles}</td>
                <td className={`text-right py-2 px-2 font-mono ${j.averageSpeed > 30 ? 'text-primary' : j.averageSpeed > 15 ? 'text-accent' : 'text-destructive'}`}>
                  {j.averageSpeed} km/h
                </td>
                <td className="text-right py-2 px-2 font-mono">{j.averageWaitTime}s</td>
                <td className="text-right py-2 px-2 font-mono">{j.throughput}</td>
                <td className="text-right py-2 px-2">
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${Math.round(j.congestionLevel * 100)}%`,
                        backgroundColor: j.congestionLevel > 0.6 ? 'hsl(var(--destructive))' : j.congestionLevel > 0.3 ? 'hsl(var(--accent))' : 'hsl(var(--primary))',
                      }} />
                    </div>
                    <span className="font-mono">{Math.round(j.congestionLevel * 100)}%</span>
                  </div>
                </td>
                <td className="text-center py-2 px-2">
                  {j.isBottleneck ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">Bottleneck</span>
                  ) : j.isHighFlow ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">High Flow</span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">Normal</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Speed Analysis Panel ───
const SpeedAnalysis = ({ intersections }: { intersections: Intersection[] }) => {
  const allLanes = intersections.flatMap((int, idx) =>
    int.lanes.map(l => ({ ...l, junction: int.name, jIdx: idx }))
  );
  const slowLanes = allLanes.filter(l => l.speedCategory === 'slow');
  const avgSpeed = allLanes.length > 0
    ? Math.round(allLanes.reduce((s, l) => s + l.averageSpeed, 0) / allLanes.length)
    : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">🏎️</span>
        <h3 className="text-sm font-semibold text-foreground">Vehicle Speed Analysis</h3>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-md bg-secondary/50 px-3 py-2 text-center">
          <p className="text-lg font-bold font-mono text-foreground">{avgSpeed}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Avg km/h</p>
        </div>
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-center">
          <p className="text-lg font-bold font-mono text-destructive">{slowLanes.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Slow Lanes</p>
        </div>
        <div className="rounded-md bg-primary/10 px-3 py-2 text-center">
          <p className="text-lg font-bold font-mono text-primary">
            {allLanes.filter(l => l.speedCategory === 'fast').length}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase">Fast Lanes</p>
        </div>
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Speed per Lane (across all junctions)</p>
        {allLanes.sort((a, b) => a.averageSpeed - b.averageSpeed).slice(0, 12).map(l => (
          <div key={`${l.junction}-${l.id}`} className="flex items-center justify-between text-xs py-1 border-b border-border/50">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${l.speedCategory === 'slow' ? 'bg-destructive' : l.speedCategory === 'fast' ? 'bg-primary' : 'bg-accent'}`} />
              <span className="text-muted-foreground truncate max-w-[120px]">{l.junction}</span>
              <span className="text-foreground font-mono">{l.direction}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-mono font-medium ${l.speedCategory === 'slow' ? 'text-destructive' : l.speedCategory === 'fast' ? 'text-primary' : 'text-accent'}`}>
                {Math.round(l.averageSpeed)} km/h
              </span>
              <span className="text-[9px] text-muted-foreground capitalize">{l.speedCategory}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Traffic Flow Evaluation Panel ───
const TrafficFlowEvaluation = ({ flows }: { flows: TrafficFlowMetrics[] }) => {
  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">📊</span>
        <h3 className="text-sm font-semibold text-foreground">Traffic Flow Evaluation</h3>
      </div>
      <p className="text-[10px] text-muted-foreground mb-3">
        Speed before signal → during green → after crossing. Evaluates signal efficiency.
      </p>
      <div className="space-y-3">
        {flows.map(f => (
          <div key={f.laneId} className="rounded-md bg-secondary/30 px-3 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono text-foreground">{f.laneId}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${f.signalEfficiency > 0.5 ? 'bg-primary/15 text-primary' : 'bg-accent/15 text-accent'}`}>
                Efficiency: {Math.round(f.signalEfficiency * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <div className="flex-1 text-center">
                <p className="text-muted-foreground">Before</p>
                <p className="font-mono text-foreground font-medium">{f.speedBeforeSignal} km/h</p>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="flex-1 text-center">
                <p className="text-muted-foreground">Green</p>
                <p className={`font-mono font-medium ${f.speedDuringGreen > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{f.speedDuringGreen} km/h</p>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="flex-1 text-center">
                <p className="text-muted-foreground">After</p>
                <p className={`font-mono font-medium ${f.speedAfterCrossing > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{f.speedAfterCrossing} km/h</p>
              </div>
              <div className="flex-1 text-center border-l border-border pl-2">
                <p className="text-muted-foreground">Clear Rate</p>
                <p className="font-mono text-foreground font-medium">{f.clearanceRate} v/s</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Lane Intelligence Panel ───
const LaneIntelligence = ({ intersections }: { intersections: Intersection[] }) => {
  const allLanes = intersections.flatMap(int =>
    int.lanes.map(l => ({ ...l, junction: int.name, jId: int.id, activeId: int.activeLaneId }))
  );
  const congested = allLanes.filter(l => l.isCongested);
  const blocked = allLanes.filter(l => l.isBlocked);
  const slowLanes = allLanes.filter(l => l.speedCategory === 'slow' && !l.isCongested);

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">🛣️</span>
        <h3 className="text-sm font-semibold text-foreground">Lane-Level Intelligence</h3>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">
          {allLanes.length} lanes across {intersections.length} junctions
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-center">
          <p className="text-xl font-bold font-mono text-destructive">{congested.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Congested</p>
        </div>
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center">
          <p className="text-xl font-bold font-mono text-destructive">{blocked.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Blocked</p>
        </div>
        <div className="rounded-md border border-accent/20 bg-accent/5 px-3 py-2 text-center">
          <p className="text-xl font-bold font-mono text-accent">{slowLanes.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Slow</p>
        </div>
      </div>

      {(congested.length > 0 || blocked.length > 0) ? (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Affected Lanes</p>
          {[...blocked, ...congested].slice(0, 8).map((l, i) => (
            <div key={`${l.jId}-${l.id}-${i}`} className="flex items-center justify-between text-xs py-1 border-b border-border/50">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] px-1 rounded ${l.isBlocked ? 'bg-destructive/20 text-destructive' : 'bg-accent/20 text-accent'}`}>
                  {l.isBlocked ? 'BLOCKED' : 'CONGESTED'}
                </span>
                <span className="text-muted-foreground">{l.junction}</span>
                <span className="text-foreground">{l.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-foreground">{l.vehicleCount} vehicles</span>
                <span className="font-mono text-destructive">{Math.round(l.averageSpeed)} km/h</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-primary">✅ All lanes operating normally.</p>
      )}
    </div>
  );
};

export default Analytics;
