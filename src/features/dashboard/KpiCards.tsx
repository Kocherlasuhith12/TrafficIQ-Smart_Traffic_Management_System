import { TrafficMetrics, JunctionSummary } from '@/types/traffic';
import { percentImprovement } from '@/utils/calculations';

interface KpiCardsProps {
  metrics: TrafficMetrics;
  elapsedSeconds: number;
  junctionSummaries: JunctionSummary[];
}

interface KpiItem {
  label: string;
  value: string | number;
  subtitle: string;
  trend?: 'positive' | 'negative' | 'neutral';
}

const KpiCards = ({ metrics, elapsedSeconds, junctionSummaries }: KpiCardsProps) => {
  const waitImprovement = percentImprovement(metrics.averageWaitTimeFixed, metrics.averageWaitTime);
  const throughputImprovement = percentImprovement(metrics.throughputFixed, metrics.throughput);
  const queueImprovement = percentImprovement(metrics.queueLengthFixed, metrics.queueLength);
  const bottlenecks = junctionSummaries.filter(j => j.isBottleneck).length;
  const highFlow = junctionSummaries.filter(j => j.isHighFlow).length;

  const kpis: KpiItem[] = [
    {
      label: 'Avg Wait Time',
      value: `${metrics.averageWaitTime}s`,
      subtitle: `${waitImprovement > 0 ? '↓' : '↑'} ${Math.abs(waitImprovement)}% vs fixed`,
      trend: waitImprovement > 0 ? 'positive' : 'negative',
    },
    {
      label: 'Throughput',
      value: `${metrics.throughput}`,
      subtitle: `${throughputImprovement > 0 ? '↑' : '↓'} ${Math.abs(throughputImprovement)}% vs fixed`,
      trend: throughputImprovement > 0 ? 'positive' : 'negative',
    },
    {
      label: 'Avg Speed',
      value: `${metrics.averageSpeed} km/h`,
      subtitle: metrics.averageSpeed > 30 ? 'Free flow' : metrics.averageSpeed > 15 ? 'Moderate' : 'Congested',
      trend: metrics.averageSpeed > 30 ? 'positive' : metrics.averageSpeed > 15 ? 'neutral' : 'negative',
    },
    {
      label: 'Congestion',
      value: `${Math.round(metrics.congestionLevel * 100)}%`,
      subtitle: metrics.congestionLevel < 0.3 ? 'Low' : metrics.congestionLevel < 0.6 ? 'Moderate' : 'High',
      trend: metrics.congestionLevel < 0.3 ? 'positive' : metrics.congestionLevel < 0.6 ? 'neutral' : 'negative',
    },
    {
      label: 'Queue Length',
      value: metrics.queueLength,
      subtitle: `${queueImprovement > 0 ? '↓' : '↑'} ${Math.abs(queueImprovement)}% vs fixed`,
      trend: queueImprovement > 0 ? 'positive' : 'negative',
    },
    {
      label: 'Junctions',
      value: `${junctionSummaries.length}`,
      subtitle: `${bottlenecks} bottleneck · ${highFlow} high-flow`,
      trend: bottlenecks === 0 ? 'positive' : bottlenecks <= 2 ? 'neutral' : 'negative',
    },
  ];

  const trendColor = (t?: string) => {
    if (t === 'positive') return 'text-primary';
    if (t === 'negative') return 'text-destructive';
    return 'text-accent';
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
      {kpis.map(kpi => (
        <div key={kpi.label} className="kpi-card animate-fade-in">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{kpi.label}</p>
          <p className="text-2xl font-bold font-mono text-foreground">{kpi.value}</p>
          <p className={`text-xs mt-1 ${trendColor(kpi.trend)}`}>{kpi.subtitle}</p>
        </div>
      ))}
    </div>
  );
};

export default KpiCards;
