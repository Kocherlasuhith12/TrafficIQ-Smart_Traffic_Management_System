import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Intersection, HistoricalDataPoint } from '@/types/traffic';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface AnalyticsReportsProps {
  intersections: Intersection[];
  historicalData: HistoricalDataPoint[];
  metrics?: {
    averageWaitTime: number;
    averageSpeed: number;
    congestionLevel: number;
  };
}

type ReportType = 'hourly' | 'daily' | 'weekly' | 'monthly';
type ChartType = 'vehicles' | 'speed' | 'congestion' | 'wait' | 'throughput';

const AnalyticsReports: React.FC<AnalyticsReportsProps> = ({
  intersections,
  historicalData,
  metrics,
}) => {
  const [reportType, setReportType] = useState<ReportType>('hourly');
  const [activeChart, setActiveChart] = useState<ChartType>('vehicles');

  // Generate mock dataset matching the selected report type
  const getReportData = () => {
    const baseCount = historicalData.length > 0 ? historicalData[0].vehicleCount : 15;
    const baseSpeed = metrics?.averageSpeed || 35;
    const baseWait = metrics?.averageWaitTime || 40;
    const baseCong = Math.round((metrics?.congestionLevel || 0.45) * 100);

    if (reportType === 'hourly') {
      // 12 hours
      return Array.from({ length: 12 }, (_, i) => {
        const hr = (new Date().getHours() - 11 + i + 24) % 24;
        const rushFactor = (hr >= 7 && hr <= 9) || (hr >= 17 && hr <= 19) ? 1.7 : hr < 5 ? 0.4 : 1.0;
        return {
          time: `${String(hr).padStart(2, '0')}:00`,
          vehicles: Math.round(baseCount * rushFactor + Math.random() * 5),
          speed: Math.round(baseSpeed * (2 - rushFactor) + Math.random() * 4),
          congestion: Math.min(100, Math.round(baseCong * rushFactor + Math.random() * 6)),
          waitTime: Math.round(baseWait * rushFactor + Math.random() * 5),
          throughput: Math.round((baseCount * 1.5 * rushFactor) + Math.random() * 10),
        };
      });
    }

    if (reportType === 'daily') {
      // Last 7 days
      const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return Array.from({ length: 7 }, (_, i) => {
        const dayIdx = (new Date().getDay() - 6 + i + 7) % 7;
        const weekendFactor = dayIdx === 0 || dayIdx === 6 ? 0.7 : 1.1;
        return {
          time: DAYS[dayIdx],
          vehicles: Math.round(baseCount * 22 * weekendFactor + Math.random() * 40),
          speed: Math.round(baseSpeed + Math.random() * 6 - 3),
          congestion: Math.min(100, Math.round(baseCong * weekendFactor + Math.random() * 8)),
          waitTime: Math.round(baseWait * weekendFactor + Math.random() * 6),
          throughput: Math.round(baseCount * 30 * weekendFactor + Math.random() * 50),
        };
      });
    }

    if (reportType === 'weekly') {
      // Last 4 weeks
      return Array.from({ length: 4 }, (_, i) => ({
        time: `Week ${i + 1}`,
        vehicles: Math.round(baseCount * 150 + Math.random() * 100),
        speed: Math.round(baseSpeed + Math.random() * 4 - 2),
        congestion: Math.min(100, Math.round(baseCong + Math.random() * 10 - 5)),
        waitTime: Math.round(baseWait + Math.random() * 10 - 5),
        throughput: Math.round(baseCount * 220 + Math.random() * 120),
      }));
    }

    // Monthly (last 6 months)
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Array.from({ length: 6 }, (_, i) => {
      const mIdx = (new Date().getMonth() - 5 + i + 12) % 12;
      return {
        time: MONTHS[mIdx],
        vehicles: Math.round(baseCount * 650 + Math.random() * 300),
        speed: Math.round(baseSpeed + Math.random() * 5 - 2.5),
        congestion: Math.min(100, Math.round(baseCong + Math.random() * 12 - 6)),
        waitTime: Math.round(baseWait + Math.random() * 12 - 6),
        throughput: Math.round(baseCount * 900 + Math.random() * 400),
      };
    });
  };

  const currentData = getReportData();

  // Export functions
  const handleExportCSV = () => {
    const headers = 'Timeframe,Vehicles Monitored,Avg Speed (km/h),Avg Congestion (%),Avg Wait Time (s),Throughput (veh/min)';
    const rows = currentData.map(d =>
      `${d.time},${d.vehicles},${d.speed},${d.congestion}%,${d.waitTime},${d.throughput}`
    ).join('\n');

    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TrafficIQ_Report_${reportType.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    // XLS compatible XML tab-separated values
    let xml = 'Timeframe\tVehicles\tAvg Speed\tCongestion %\tAvg Wait Time\tThroughput\n';
    currentData.forEach(d => {
      xml += `${d.time}\t${d.vehicles}\t${d.speed}\t${d.congestion}\t${d.waitTime}\t${d.throughput}\n`;
    });

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TrafficIQ_Report_${reportType.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    // Generates a print preview of the report summary in a new window or as a download
    const printableContent = `
      <html>
        <head>
          <title>TrafficIQ Operations Report - ${reportType.toUpperCase()}</title>
          <style>
            body { font-family: monospace; padding: 30px; background: #ffffff; color: #111827; }
            h2 { border-bottom: 2px solid #f97316; padding-bottom: 10px; color: #f97316; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f3f4f6; }
            .footer { margin-top: 40px; font-size: 10px; color: #6b7280; text-align: center; }
          </style>
        </head>
        <body>
          <h2>TRAFFICIQ AI SYSTEM REPORT (${reportType.toUpperCase()})</h2>
          <p>Export Date: ${new Date().toLocaleString()}</p>
          <p>Junction Nodes: ${intersections.length} Monitored</p>
          <p>System Status: Active Adaptive Control Loops</p>
          
          <table>
            <thead>
              <tr>
                <th>Timeframe</th>
                <th>Vehicles Monitored</th>
                <th>Avg Speed (km/h)</th>
                <th>Congestion %</th>
                <th>Avg Wait Time (s)</th>
                <th>Throughput (veh/min)</th>
              </tr>
            </thead>
            <tbody>
              ${currentData.map(d => `
                <tr>
                  <td><b>${d.time}</b></td>
                  <td>${d.vehicles}</td>
                  <td>${d.speed} km/h</td>
                  <td>${d.congestion}%</td>
                  <td>${d.waitTime}s</td>
                  <td>${d.throughput}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            TrafficIQ • Vision Intelligent Operations • Confidential System Log Watermark
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printableContent);
      printWindow.document.close();
    } else {
      alert('Popup blocker prevented PDF Print Window from launching. Please allow popups.');
    }
  };

  const getChartConfig = () => {
    switch (activeChart) {
      case 'speed':
        return { dataKey: 'speed', stroke: '#3b82f6', fill: '#3b82f6', label: 'Average Speed (km/h)' };
      case 'congestion':
        return { dataKey: 'congestion', stroke: '#ef4444', fill: 'url(#colorCong)', label: 'Congestion Level (%)' };
      case 'wait':
        return { dataKey: 'waitTime', stroke: '#f97316', fill: '#f97316', label: 'Average Wait Time (s)' };
      case 'throughput':
        return { dataKey: 'throughput', stroke: '#10b981', fill: '#10b981', label: 'Throughput (veh/min)' };
      default:
        return { dataKey: 'vehicles', stroke: '#8b5cf6', fill: 'url(#colorVeh)', label: 'Vehicle Density Count' };
    }
  };

  const config = getChartConfig();

  return (
    <Card className="rounded-xl border border-border bg-card/60 backdrop-blur-md p-5 shadow-lg flex flex-col gap-4">
      {/* Header controls: report & export selection */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-border pb-3 gap-3">
        <div>
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            📊 Traffic Analytics Reports Core
          </h3>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
            Phase 11 — Interactive Reporting & Multi-Format Exporters
          </p>
        </div>

        {/* Report tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['hourly', 'daily', 'weekly', 'monthly'] as const).map(tab => (
            <Button
              key={tab}
              size="sm"
              variant={reportType === tab ? 'default' : 'outline'}
              onClick={() => setReportType(tab)}
              className="h-7 text-[10px] uppercase font-bold"
            >
              {tab}
            </Button>
          ))}
        </div>

        {/* Exporters */}
        <div className="flex items-center gap-1.5 ml-auto lg:ml-0">
          <Button size="sm" onClick={handleExportPDF} className="h-7 text-[10px] bg-red-600/90 hover:bg-red-700 text-white font-bold">
            📄 PDF
          </Button>
          <Button size="sm" onClick={handleExportCSV} className="h-7 text-[10px] bg-secondary/80 hover:bg-secondary text-foreground font-bold">
            📝 CSV
          </Button>
          <Button size="sm" onClick={handleExportExcel} className="h-7 text-[10px] bg-[#10b981] hover:bg-[#0e9d6d] text-white font-bold">
             Excel
          </Button>
        </div>
      </div>

      {/* Chart variable selector */}
      <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none border-b border-border/40">
        {[
          { id: 'vehicles',   label: '🚗 Count',       color: 'hover:text-[#8b5cf6]' },
          { id: 'speed',      label: '⚡ Speed',       color: 'hover:text-[#3b82f6]' },
          { id: 'congestion', label: '🛑 Congestion',  color: 'hover:text-[#ef4444]' },
          { id: 'wait',       label: '⏳ Wait Time',   color: 'hover:text-[#f97316]' },
          { id: 'throughput', label: '📈 Throughput',  color: 'hover:text-[#10b981]' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveChart(item.id as ChartType)}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
              activeChart === item.id
                ? 'bg-secondary text-foreground border-border/80'
                : `bg-transparent text-muted-foreground border-transparent ${item.color}`
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Recharts Plot Frame */}
      <div className="h-64 relative">
        <ResponsiveContainer width="100%" height="100%">
          {activeChart === 'vehicles' || activeChart === 'congestion' ? (
            <AreaChart data={currentData}>
              <defs>
                <linearGradient id="colorVeh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCong" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} axisLine={false} />
              <YAxis tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(9, 13, 22, 0.95)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  fontSize: 11,
                  color: '#ffffff',
                }}
              />
              <Area 
                type="monotone" 
                dataKey={config.dataKey} 
                stroke={config.stroke} 
                fill={config.fill} 
                strokeWidth={2}
                name={config.label}
              />
            </AreaChart>
          ) : activeChart === 'wait' ? (
            <BarChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} axisLine={false} />
              <YAxis tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(9, 13, 22, 0.95)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  fontSize: 11,
                  color: '#ffffff',
                }}
              />
              <Bar 
                dataKey={config.dataKey} 
                fill={config.fill} 
                radius={[4, 4, 0, 0]} 
                name={config.label}
              />
            </BarChart>
          ) : (
            <LineChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} axisLine={false} />
              <YAxis tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(9, 13, 22, 0.95)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  fontSize: 11,
                  color: '#ffffff',
                }}
              />
              <Line 
                type="monotone" 
                dataKey={config.dataKey} 
                stroke={config.stroke} 
                strokeWidth={2.5}
                activeDot={{ r: 6 }}
                name={config.label}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Grid summarizing report details */}
      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/40 text-center">
        {[
          { label: 'Total Density',   value: currentData.reduce((s, d) => s + d.vehicles, 0) },
          { label: 'Avg Speed Limit', value: `${Math.round(currentData.reduce((s, d) => s + d.speed, 0) / currentData.length)} km/h` },
          { label: 'Peak Congestion', value: `${Math.max(...currentData.map(d => d.congestion))}%` },
          { label: 'Peak Delay Time', value: `${Math.max(...currentData.map(d => d.waitTime))}s` },
        ].map(item => (
          <div key={item.label} className="bg-secondary/20 border border-border/40 rounded-lg p-2">
            <p className="text-sm font-black text-foreground">{item.value}</p>
            <p className="text-[8px] text-muted-foreground uppercase">{item.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default AnalyticsReports;
