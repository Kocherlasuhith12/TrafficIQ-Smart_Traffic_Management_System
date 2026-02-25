import { MLPrediction } from '@/types/traffic';

interface MLInsightsProps {
  predictions: MLPrediction[];
}

const MLInsights = ({ predictions }: MLInsightsProps) => {
  const trendIcon = (t: string) => {
    if (t === 'increasing') return '📈';
    if (t === 'decreasing') return '📉';
    return '➡️';
  };

  const speedTrendIcon = (t: string) => {
    if (t === 'slowing') return '🐌';
    if (t === 'accelerating') return '🏎️';
    return '➡️';
  };

  const trendColor = (t: string) => {
    if (t === 'increasing') return 'text-accent';
    if (t === 'decreasing') return 'text-primary';
    return 'text-muted-foreground';
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">🧠</span>
        <h3 className="text-sm font-semibold text-foreground">ML Predictions</h3>
      </div>
      {predictions.length === 0 ? (
        <p className="text-xs text-muted-foreground">Collecting data for predictions...</p>
      ) : (
        <div className="space-y-3">
          {predictions.map(p => (
            <div key={p.laneId} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span>{trendIcon(p.trend)}</span>
                  <span className="text-muted-foreground font-mono">{p.laneId}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={trendColor(p.trend)}>
                    {p.predictedCount} predicted
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(p.confidence * 100)}%
                  </span>
                  {p.recommendedAdjustment !== 0 && (
                    <span className="text-xs font-mono text-primary">
                      {p.recommendedAdjustment > 0 ? '+' : ''}{p.recommendedAdjustment}s
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground pl-6">
                <span>{speedTrendIcon(p.speedTrend)}</span>
                <span>Speed: {p.predictedSpeed} km/h ({p.speedTrend})</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          ML Layer: Linear trend analysis on vehicle counts + speed. Speed drop anticipation for proactive timing adjustment.
        </p>
      </div>
    </div>
  );
};

export default MLInsights;
