import { Intersection } from '@/types/traffic';
import { formatCountdown } from '@/utils/calculations';

interface TrafficMapProps {
  intersections: Intersection[];
}

const SignalLight = ({ state, active }: { state: string; active: boolean }) => {
  const getClass = (color: string) => {
    if (!active) return 'signal-light signal-off';
    if (state === color) {
      if (color === 'GREEN') return 'signal-light signal-green pulse-dot';
      if (color === 'YELLOW') return 'signal-light signal-yellow';
      if (color === 'RED') return 'signal-light signal-red';
    }
    return 'signal-light signal-off';
  };

  return (
    <div className="flex flex-col gap-1 bg-secondary/50 rounded-lg p-1.5 items-center">
      <div className={getClass('RED')} style={{ width: 14, height: 14 }} />
      <div className={getClass('YELLOW')} style={{ width: 14, height: 14 }} />
      <div className={getClass('GREEN')} style={{ width: 14, height: 14 }} />
    </div>
  );
};

const LaneCard = ({
  lane, isActive, signalState, remainingTime,
}: {
  lane: Intersection['lanes'][0];
  isActive: boolean;
  signalState: string;
  remainingTime: number;
}) => {
  const dirIcons: Record<string, string> = { N: '↑', S: '↓', E: '→', W: '←' };

  const speedColor = lane.speedCategory === 'slow' ? 'text-destructive' : lane.speedCategory === 'fast' ? 'text-primary' : 'text-accent';

  return (
    <div className={`flex items-center gap-2 rounded-lg border p-2 transition-all text-xs ${
      isActive ? 'border-primary/40 bg-primary/5' : lane.isCongested ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card'
    }`}>
      <SignalLight state={isActive ? signalState : 'RED'} active={true} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{dirIcons[lane.direction] || '•'}</span>
          <span className="font-medium text-foreground">{lane.name}</span>
          {lane.isCongested && <span className="text-[9px] px-1 rounded bg-destructive/20 text-destructive">CONGESTED</span>}
          {lane.isBlocked && <span className="text-[9px] px-1 rounded bg-destructive/30 text-destructive">BLOCKED</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-muted-foreground">
            🚗 <span className="font-mono font-semibold text-foreground">{lane.vehicleCount}</span>
          </span>
          <span className={`font-mono ${speedColor}`}>
            {Math.round(lane.averageSpeed)} km/h
          </span>
          <span className="text-muted-foreground font-mono">Q:{lane.queueLength}</span>
          {isActive && (
            <span className="text-[9px] text-primary font-mono">
              Green ≈ {lane.vehicleCount}s
            </span>
          )}
        </div>
      </div>
      {isActive && (
        <div className="text-right">
          <div className="font-mono text-lg font-bold text-primary tabular-nums">{formatCountdown(remainingTime)}</div>
          <div className="text-[9px] text-muted-foreground uppercase">remaining</div>
        </div>
      )}
    </div>
  );
};

const TrafficMap = ({ intersections }: TrafficMapProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {intersections.map(intersection => (
        <div key={intersection.id} className="rounded-xl border border-border bg-card p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-foreground">{intersection.name}</h3>
            <span className="text-[10px] font-mono text-muted-foreground">
              Cycle #{intersection.cycleCount}
            </span>
          </div>
          <div className="space-y-1.5">
            {intersection.lanes.map(lane => (
              <LaneCard
                key={lane.id}
                lane={lane}
                isActive={lane.id === intersection.activeLaneId}
                signalState={intersection.signalState}
                remainingTime={intersection.remainingGreenTime}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TrafficMap;
