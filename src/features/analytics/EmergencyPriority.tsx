import { AnomalyRecord } from '@/data/trafficDetectionDataset';
import { EmergencyOverrideLog } from '@/types/traffic';

interface EmergencyPriorityProps {
  anomalies: AnomalyRecord[];
  emergencyActive: boolean;
  emergencyLane: string | null;
  emergencyLogs: EmergencyOverrideLog[];
}

const EmergencyPriority = ({ anomalies, emergencyActive, emergencyLane, emergencyLogs }: EmergencyPriorityProps) => {
  const recentAnomalies = anomalies.slice(-10).reverse();
  const criticalCount = anomalies.filter(a => a.severity === 'critical' && !a.resolved).length;
  const highCount = anomalies.filter(a => a.severity === 'high' && !a.resolved).length;

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">🚨</span>
        <h3 className="text-sm font-semibold text-foreground">Emergency & Anomaly Monitor</h3>
      </div>

      {/* Emergency status */}
      <div className={`mb-4 rounded-md px-3 py-2.5 border ${
        emergencyActive
          ? 'border-destructive/50 bg-destructive/10 animate-pulse'
          : 'border-border bg-secondary/30'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${emergencyActive ? 'bg-destructive' : 'bg-primary'}`} />
          <span className="text-xs font-medium text-foreground">
            {emergencyActive
              ? `🚑 Emergency Vehicle — Priority Override → ${emergencyLane}`
              : '✅ No Active Emergencies'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-md bg-secondary/50 px-2 py-1.5 text-center">
          <p className="text-lg font-bold font-mono text-foreground">{anomalies.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Total</p>
        </div>
        <div className="rounded-md bg-destructive/10 px-2 py-1.5 text-center">
          <p className="text-lg font-bold font-mono text-destructive">{criticalCount}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Critical</p>
        </div>
        <div className="rounded-md bg-accent/10 px-2 py-1.5 text-center">
          <p className="text-lg font-bold font-mono text-accent">{highCount}</p>
          <p className="text-[9px] text-muted-foreground uppercase">High</p>
        </div>
      </div>

      {/* Emergency override log */}
      {emergencyLogs.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Override Log</p>
          {emergencyLogs.slice(-3).reverse().map(l => (
            <div key={l.id} className="flex items-center justify-between text-[10px] py-0.5 border-b border-border/50">
              <span className="text-foreground">{l.junctionName} → {l.laneId}</span>
              <span className={l.resolved ? 'text-primary' : 'text-destructive'}>
                {l.resolved ? `✅ ${Math.round(l.durationMs / 1000)}s` : '⏳ Active'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recent anomalies */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recent Events</p>
        {recentAnomalies.length === 0 ? (
          <p className="text-xs text-muted-foreground">No anomalies detected yet.</p>
        ) : (
          recentAnomalies.slice(0, 5).map(a => (
            <div key={a.id} className="flex items-start gap-2 text-xs py-1 border-b border-border/50 last:border-0">
              <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                a.severity === 'critical' ? 'bg-destructive' :
                a.severity === 'high' ? 'bg-accent' : 'bg-muted-foreground'
              }`} />
              <div className="min-w-0">
                <span className="text-foreground font-medium">{a.type.replace(/_/g, ' ')}</span>
                <p className="text-muted-foreground text-[10px] truncate">{a.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EmergencyPriority;
