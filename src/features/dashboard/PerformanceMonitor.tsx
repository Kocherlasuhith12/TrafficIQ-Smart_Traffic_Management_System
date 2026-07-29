import React from 'react';

interface PerformanceMonitorProps {
  stats?: {
    fps: number;
    latencyMs: number;
    cpuUsage: number;
    gpuUsage: number;
  };
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ stats }) => {
  const fps = stats?.fps ?? 0;
  const latency = stats?.latencyMs ?? 0;
  const cpu = stats?.cpuUsage ?? 0;
  const gpu = stats?.gpuUsage ?? 0;

  // Determine health color classes
  const getFpsColor = (val: number) => {
    if (val >= 24) return 'text-[#22c55e]';
    if (val >= 12) return 'text-[#f97316]';
    return 'text-[#ef4444]';
  };

  const getLatencyColor = (val: number) => {
    if (val <= 60) return 'text-[#22c55e]';
    if (val <= 120) return 'text-[#f97316]';
    return 'text-[#ef4444]';
  };

  const getCpuColor = (val: number) => {
    if (val < 70) return 'bg-[#22c55e]';
    if (val < 90) return 'bg-[#f97316]';
    return 'bg-[#ef4444]';
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur-md p-4 shadow-lg flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
          🖥️ AI Hardware & Vision Monitor
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
          Real-time
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* FPS */}
        <div className="flex flex-col p-2.5 rounded-lg bg-background/50 border border-border/50">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Vision FPS</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-2xl font-mono font-bold tracking-tight ${getFpsColor(fps)}`}>
              {fps.toFixed(1)}
            </span>
            <span className="text-[10px] text-muted-foreground">fps</span>
          </div>
          <span className="text-[9px] text-muted-foreground mt-0.5">YOLOv11 tracking rate</span>
        </div>

        {/* Latency */}
        <div className="flex flex-col p-2.5 rounded-lg bg-background/50 border border-border/50">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Latency</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-2xl font-mono font-bold tracking-tight ${getLatencyColor(latency)}`}>
              {Math.round(latency)}
            </span>
            <span className="text-[10px] text-muted-foreground">ms</span>
          </div>
          <span className="text-[9px] text-muted-foreground mt-0.5">YOLO processing lag</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* CPU */}
        <div>
          <div className="flex justify-between text-[10px] font-medium text-muted-foreground mb-1">
            <span>CPU Core Load</span>
            <span className="font-mono text-foreground font-semibold">{cpu.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${getCpuColor(cpu)}`}
              style={{ width: `${Math.min(100, Math.max(2, cpu))}%` }}
            />
          </div>
        </div>

        {/* GPU Memory */}
        <div>
          <div className="flex justify-between text-[10px] font-medium text-muted-foreground mb-1">
            <span>GPU VRAM / Engine Alloc</span>
            <span className="font-mono text-foreground font-semibold">
              {gpu > 0 ? `${gpu.toFixed(0)} MB` : 'N/A (CPU Mode)'}
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: gpu > 0 ? `${Math.min(100, (gpu / 4096) * 100)}%` : '0%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
