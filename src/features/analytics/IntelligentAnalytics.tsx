import React, { useState } from 'react';
import { Intersection, TrafficMetrics, HistoricalDataPoint } from '@/types/traffic';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Badge } from '@/components/ui/badge';

interface IntelligentAnalyticsProps {
  intersections: Intersection[];
  metrics: TrafficMetrics;
  historicalData: HistoricalDataPoint[];
}

const IntelligentAnalytics: React.FC<IntelligentAnalyticsProps> = ({
  intersections,
  metrics,
  historicalData,
}) => {
  const [chartTab, setChartTab] = useState<'hourly' | 'daily' | 'weekly'>('hourly');

  const activeJunction = intersections[0];
  const lanes = activeJunction?.lanes || [];

  // 1. Calculate Overall Congestion Score (0 to 100%)
  const congestionScore = Math.round((metrics?.congestionLevel ?? 0.3) * 100);
  const congestionSeverity = congestionScore > 75 ? 'Heavy' : congestionScore > 35 ? 'Moderate' : 'Light';
  const congestionColor = congestionScore > 75 ? 'text-[#ef4444]' : congestionScore > 35 ? 'text-[#f97316]' : 'text-[#22c55e]';
  const congestionBorder = congestionScore > 75 ? 'border-[#ef4444]/40 bg-[#ef4444]/5' : congestionScore > 35 ? 'border-[#f97316]/40 bg-[#f97316]/5' : 'border-[#22c55e]/40 bg-[#22c55e]/5';

  // 2. Calculate Traffic Trend (Increasing, Stable, Decreasing)
  const totalVehicles = lanes.reduce((s, l) => s + l.vehicleCount, 0);
  const recentAvg = historicalData.slice(-5).reduce((s, d) => s + d.vehicles, 0) / 5 || totalVehicles;
  const trend = totalVehicles > recentAvg + 2 ? 'Increasing' : (totalVehicles < recentAvg - 2 ? 'Decreasing' : 'Stable');
  
  const getTrendBadge = (status: string) => {
    switch (status) {
      case 'Increasing':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30 animate-pulse font-bold">▲ INCREASING</span>;
      case 'Decreasing':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30 font-bold">▼ DECREASING</span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/30 font-bold">● STABLE</span>;
    }
  };

  // 3. Generate Heatmap Grid coordinates
  // Map directions (N, S, E, W) to congestion levels
  const getHeatmapColor = (density: number) => {
    if (density > 75) return 'bg-[#ef4444]/30 border-[#ef4444]/60 text-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.15)]';
    if (density > 35) return 'bg-[#f97316]/30 border-[#f97316]/60 text-[#f97316] shadow-[0_0_8px_rgba(249,115,22,0.15)]';
    return 'bg-[#22c55e]/30 border-[#22c55e]/60 text-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.15)]';
  };

  // 4. Timeframe Chart Data Generators
  const getChartData = () => {
    if (chartTab === 'weekly') {
      // 4 weeks summary
      return [
        { label: 'Week 1', vehicles: Math.round(recentAvg * 0.9), delay: 28 },
        { label: 'Week 2', vehicles: Math.round(recentAvg * 1.05), delay: 32 },
        { label: 'Week 3', vehicles: Math.round(recentAvg * 1.2), delay: 38 },
        { label: 'Week 4', vehicles: totalVehicles || Math.round(recentAvg), delay: Math.round(metrics.averageWaitTime) },
      ];
    }
    if (chartTab === 'daily') {
      // 7 days summary
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return days.map((day, idx) => {
        const factor = day === 'Sat' || day === 'Sun' ? 0.65 : 1.0;
        return {
          label: day,
          vehicles: Math.round((recentAvg + (idx - 3) * 2) * factor),
          delay: Math.round((metrics.averageWaitTime + (idx - 3) * 3) * factor),
        };
      });
    }
    // Hourly: Map the 12 most recent historicalData entries
    return historicalData.slice(-12).map(d => ({
      label: d.time,
      vehicles: d.vehicles,
      delay: d.delay,
    }));
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* LEFT: Congestion Score & Lane Density */}
      <div className="rounded-xl border border-border bg-card/60 backdrop-blur-md p-5 shadow-lg flex flex-col gap-4">
        <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-2">
          📊 Behavioral Density & Congestion
        </h3>
        
        <div className="flex items-center justify-between gap-4 mt-1">
          {/* Circular Gauge */}
          <div className={`flex flex-col items-center justify-center p-3 rounded-xl border ${congestionBorder} w-[110px] h-[110px] shadow-sm`}>
            <span className={`text-2xl font-mono font-black ${congestionColor}`}>{congestionScore}%</span>
            <span className="text-[9px] uppercase font-bold text-muted-foreground mt-0.5">Congestion</span>
            <Badge variant="outline" className={`text-[8px] mt-1.5 font-bold uppercase ${congestionColor} border-current/30`}>
              {congestionSeverity}
            </Badge>
          </div>

          {/* Trend & Overall Stats */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Load Trend</span>
              <div>{getTrendBadge(trend)}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="bg-background/40 border border-border/50 rounded p-1.5 text-center">
                <span className="text-[9px] text-muted-foreground block uppercase">Active Cars</span>
                <span className="text-sm font-mono font-bold text-foreground">{totalVehicles}</span>
              </div>
              <div className="bg-background/40 border border-border/50 rounded p-1.5 text-center">
                <span className="text-[9px] text-muted-foreground block uppercase">Avg Speed</span>
                <span className="text-sm font-mono font-bold text-[#22c55e]">{Math.round(metrics.averageSpeed)} <span className="text-[9px]">k/h</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Lane Density Progress Bars */}
        <div className="flex flex-col gap-2.5 mt-2">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Lane Density Status</span>
          {lanes.map((lane, index) => {
            const laneDensity = Math.min(100, Math.round((lane.vehicleCount / 30) * 100));
            // Create a text-based progress bar matching the user's request (e.g. ████████ 85%)
            const filledBlocks = Math.round(laneDensity / 10);
            const emptyBlocks = 10 - filledBlocks;
            const barString = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

            return (
              <div key={lane.id} className="flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="font-semibold text-foreground">Lane {index + 1} <span className="font-mono text-[10px] font-normal">({lane.name})</span></span>
                  <span className="font-mono text-foreground font-semibold">{laneDensity}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs tracking-tighter text-[#f97316] font-semibold">{barString}</span>
                  <span className="text-[9px] text-muted-foreground">Q:{lane.queueLength}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MIDDLE: Speed Dials, Queues & Directional Heatmap */}
      <div className="rounded-xl border border-border bg-card/60 backdrop-blur-md p-5 shadow-lg flex flex-col gap-4">
        <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-2">
          🗺️ Directional Heatmap & Speed Log
        </h3>

        <div className="grid grid-cols-2 gap-4 items-center">
          {/* 2D Heatmap Grid Layout */}
          <div className="flex flex-col items-center justify-center gap-2 bg-background/30 border border-border/50 rounded-xl p-3">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Junction Heat Map</span>
            <div className="grid grid-cols-2 gap-1.5 w-[110px] h-[110px] mt-1 relative">
              {/* North */}
              <div className={`border rounded flex flex-col items-center justify-center text-[9px] font-bold ${getHeatmapColor(Math.round(((lanes.find(l => l.direction === 'N')?.vehicleCount ?? 10) / 30) * 100))}`}>
                <span>N</span>
                <span>{lanes.find(l => l.direction === 'N')?.vehicleCount ?? 0}</span>
              </div>
              {/* East */}
              <div className={`border rounded flex flex-col items-center justify-center text-[9px] font-bold ${getHeatmapColor(Math.round(((lanes.find(l => l.direction === 'E')?.vehicleCount ?? 8) / 30) * 100))}`}>
                <span>E</span>
                <span>{lanes.find(l => l.direction === 'E')?.vehicleCount ?? 0}</span>
              </div>
              {/* West */}
              <div className={`border rounded flex flex-col items-center justify-center text-[9px] font-bold ${getHeatmapColor(Math.round(((lanes.find(l => l.direction === 'W')?.vehicleCount ?? 6) / 30) * 100))}`}>
                <span>W</span>
                <span>{lanes.find(l => l.direction === 'W')?.vehicleCount ?? 0}</span>
              </div>
              {/* South */}
              <div className={`border rounded flex flex-col items-center justify-center text-[9px] font-bold ${getHeatmapColor(Math.round(((lanes.find(l => l.direction === 'S')?.vehicleCount ?? 12) / 30) * 100))}`}>
                <span>S</span>
                <span>{lanes.find(l => l.direction === 'S')?.vehicleCount ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Speed & Queue List */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">YOLO Track Specs</span>
            <div className="flex flex-col gap-1.5">
              {lanes.map((lane, index) => {
                const isSlow = lane.averageSpeed < 20;
                return (
                  <div key={lane.id} className="flex items-center justify-between text-[11px] border-b border-border/50 pb-1">
                    <span className="text-muted-foreground">Lane {index + 1} ({lane.direction})</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className={isSlow ? 'text-[#ef4444] font-semibold' : 'text-[#22c55e]'}>
                        {Math.round(lane.averageSpeed)} k/h
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Queue Metrics Note */}
        <div className="bg-secondary/40 border border-border rounded-lg p-2.5 flex items-center justify-between mt-1">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase">Estimated Queue Backlog</span>
            <span className="text-xs font-bold text-foreground font-mono mt-0.5">
              {lanes.reduce((s, l) => s + l.queueLength, 0)} vehicles waiting
            </span>
          </div>
          <span className="text-xs px-2 py-0.5 bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/30 font-semibold rounded">
            QUEUE ACTIVE
          </span>
        </div>
      </div>

      {/* RIGHT: Hourly, Daily, Weekly Charts */}
      <div className="rounded-xl border border-border bg-card/60 backdrop-blur-md p-5 shadow-lg flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            📈 Advanced Trend Analytics
          </h3>
          
          {/* Toggleable Tabs */}
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5 border border-border">
            <button
              onClick={() => setChartTab('hourly')}
              className={`text-[9px] px-2 py-1 rounded font-bold uppercase transition-all duration-200 ${
                chartTab === 'hourly' ? 'bg-[#22c55e] text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Hourly
            </button>
            <button
              onClick={() => setChartTab('daily')}
              className={`text-[9px] px-2 py-1 rounded font-bold uppercase transition-all duration-200 ${
                chartTab === 'daily' ? 'bg-[#22c55e] text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setChartTab('weekly')}
              className={`text-[9px] px-2 py-1 rounded font-bold uppercase transition-all duration-200 ${
                chartTab === 'weekly' ? 'bg-[#22c55e] text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>

        {/* Recharts AreaChart */}
        <div className="h-[175px] w-full mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={getChartData()} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVehicles" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} axisLine={false} />
              <YAxis tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: 10,
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Area 
                type="monotone" 
                dataKey="vehicles" 
                stroke="#22c55e" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorVehicles)" 
                name="Vehicle Load"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default IntelligentAnalytics;
