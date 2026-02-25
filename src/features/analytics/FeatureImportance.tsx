const FeatureImportance = () => {
  const features = [
    { name: 'Vehicle Count', importance: 0.35, description: 'Primary density signal — directly proportional to green time' },
    { name: 'Average Speed', importance: 0.22, description: 'Speed-aware adjustment: slow traffic gets extended green' },
    { name: 'Queue Length', importance: 0.18, description: 'Accumulated backlog indicator' },
    { name: 'Time of Day', importance: 0.12, description: 'Rush hour pattern recognition' },
    { name: 'Speed Trend (ML)', importance: 0.08, description: 'ML-predicted speed drops for proactive adjustment' },
    { name: 'Cycle Position', importance: 0.05, description: 'Fairness rotation across lanes' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-foreground mb-4">Feature Importance (Signal Timing Model)</h3>
      <div className="space-y-3">
        {features.map(f => (
          <div key={f.name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-foreground">{f.name}</span>
              <span className="font-mono text-muted-foreground">{Math.round(f.importance * 100)}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${f.importance * 100}%`,
                  backgroundColor: `hsl(${142 + (1 - f.importance) * 100}, 60%, 45%)`,
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeatureImportance;
