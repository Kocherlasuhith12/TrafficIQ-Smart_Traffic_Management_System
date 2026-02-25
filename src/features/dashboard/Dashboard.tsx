import { useTrafficSimulation } from '@/hooks/useTrafficSimulation';
import KpiCards from './KpiCards';
import TrafficMap from './TrafficMap';
import Analytics from '@/features/analytics/Analytics';
import { trafficScenarios } from '@/data/scenarios';

const Dashboard = () => {
  const sim = useTrafficSimulation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              ML-Based Intelligent Traffic Management
            </h1>
            <span className="text-xs font-mono text-muted-foreground">
              v3.0 — Multi-Junction + Speed-Aware
            </span>
          </div>
          <div className="flex items-center gap-3">
            {sim.emergencyActive && (
              <span className="text-xs px-2 py-1 rounded-md bg-destructive/20 text-destructive border border-destructive/30 animate-pulse font-medium">
                🚨 Emergency Override
              </span>
            )}
            <span className="text-[10px] font-mono text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
              {sim.intersections.length} Junctions
            </span>
            <select
              value={sim.activeScenario}
              onChange={e => sim.setScenario(e.target.value)}
              className="text-xs bg-secondary text-secondary-foreground border border-border rounded-md px-2 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {trafficScenarios.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button
              onClick={sim.toggleSimulation}
              className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
                sim.isRunning
                  ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
                  : 'bg-secondary text-secondary-foreground border-border hover:bg-accent/20'
              }`}
            >
              {sim.isRunning ? '⏸ Pause' : '▶ Resume'}
            </button>
            <span className="text-xs font-mono text-muted-foreground">
              {Math.floor(sim.elapsedSeconds / 60)}:{(sim.elapsedSeconds % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* ML Insight Banner */}
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <span className="text-xs">🧠</span>
          <p className="text-xs text-foreground">{sim.mlInsight}</p>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">ML Layer</span>
        </div>

        {/* KPIs */}
        <KpiCards metrics={sim.metrics[0]} elapsedSeconds={sim.elapsedSeconds} junctionSummaries={sim.junctionSummaries} />

        {/* Traffic Map - All 6 Junctions */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Live Multi-Junction Control — {sim.intersections.length} Intersections
          </h2>
          <TrafficMap intersections={sim.intersections} />
        </section>

        {/* Analytics */}
        <Analytics
          intersections={sim.intersections}
          metrics={sim.metrics}
          predictions={sim.predictions}
          historicalData={sim.historicalData}
          detections={sim.detections}
          anomalies={sim.anomalies}
          trafficPatterns={sim.trafficPatterns}
          vehicleDistribution={sim.vehicleDistribution}
          averageSpeed={sim.averageSpeed}
          currentPattern={sim.currentPattern}
          emergencyActive={sim.emergencyActive}
          emergencyLane={sim.emergencyLane}
          junctionSummaries={sim.junctionSummaries}
          trafficFlows={sim.trafficFlows}
          emergencyLogs={sim.emergencyLogs}
        />
      </main>
    </div>
  );
};

export default Dashboard;
