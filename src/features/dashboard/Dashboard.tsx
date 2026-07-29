import { useState, useEffect, useCallback } from 'react';
import { useTrafficSimulation } from '@/hooks/useTrafficSimulation';
import KpiCards from './KpiCards';
import TrafficMap from './TrafficMap';
import Analytics from '@/features/analytics/Analytics';
import { trafficScenarios } from '@/data/scenarios';
import CameraManager from './CameraManager';
import PerformanceMonitor from './PerformanceMonitor';
import LiveCameraFeed from './LiveCameraFeed';
import SmartCityMap from './SmartCityMap';
import AIAssistant from '@/features/ai-assistant/AIAssistant';
import { CommandAction } from '@/features/ai-assistant/aiEngine';
import { User } from '@/features/auth/Login';
import NotificationHub from '@/features/notifications/NotificationHub';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const sim = useTrafficSimulation();
  const [mapMode, setMapMode] = useState<boolean>(false);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);

  interface ActiveToast {
    id: string;
    message: string;
    severity: string;
  }
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  const triggerToast = useCallback((message: string, severity: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, severity }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // ── AI Assistant Command Dispatcher ─────────────────────────────────────
  const handleAICommand = useCallback((action: CommandAction) => {
    switch (action.type) {
      case 'OPEN_JUNCTION': {
        const el = document.getElementById(action.junctionId);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.classList.add('ring-2', 'ring-[#f97316]', 'ring-offset-2');
        setTimeout(() => el?.classList.remove('ring-2', 'ring-[#f97316]', 'ring-offset-2'), 3000);
        break;
      }
      case 'SHOW_CAMERAS':
        document.getElementById('camera-manager-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'SHOW_INCIDENTS':
        document.getElementById('incident-timeline-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'SHOW_ANALYTICS':
        document.getElementById('analytics-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'EMERGENCY_MODE':
        sim.toggleEmergency?.();
        break;
      case 'PAUSE_SIMULATION':
        if (sim.isRunning) sim.toggleSimulation();
        break;
      case 'RESUME_SIMULATION':
        if (!sim.isRunning) sim.toggleSimulation();
        break;
      case 'MUTE_ALERTS':
        break;
      case 'UNMUTE_ALERTS':
        break;
      default:
        break;
    }
  }, [sim]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/40 backdrop-blur-md py-4 px-6 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5 bg-black/40 border border-white/10 rounded-full px-2.5 py-1">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-pulse shadow-[0_0_8px_#ef4444]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#f97316] animate-pulse shadow-[0_0_8px_#f97316] [animation-delay:0.2s]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-pulse shadow-[0_0_8px_#22c55e] [animation-delay:0.4s]" />
            </div>
            <h1 className="text-lg font-black tracking-tight text-foreground">TrafficIQ Hub</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold uppercase tracking-wider">
              v14.0 — Smart City
            </span>
          </div>
          <div className="flex items-center gap-3">
            {sim.emergencyActive && (
              <span className="text-xs px-2 py-1 rounded-md bg-destructive/20 text-destructive border border-destructive/30 animate-pulse font-medium">
                🚨 Emergency Override
              </span>
            )}
            <span className="text-[10px] font-mono text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md hidden md:inline-block">
              {sim.intersections.length} Junctions
            </span>
            <select
              value={sim.activeScenario}
              onChange={e => sim.setScenario(e.target.value)}
              disabled={user.role !== 'admin'}
              className="text-xs bg-secondary text-secondary-foreground border border-border rounded-md px-2 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {trafficScenarios.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button
              onClick={sim.toggleSimulation}
              disabled={user.role === 'guest'}
              className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                sim.isRunning
                  ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
                  : 'bg-secondary text-secondary-foreground border-border hover:bg-accent/20'
              }`}
            >
              {sim.isRunning ? '⏸ Pause' : '▶ Resume'}
            </button>
            <button
              onClick={() => setIsNotifOpen(true)}
              className="text-xs font-medium px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-accent/15 text-foreground transition-all duration-200 flex items-center gap-1"
            >
              🔔 Alerts Settings
            </button>
            <button
              onClick={toggleTheme}
              className="text-xs font-medium px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-accent/15 text-foreground transition-all duration-200"
              title="Toggle Light/Dark Theme"
            >
              {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </button>
            
            {/* User role & logout */}
            <div className="flex items-center gap-2 border-l border-border pl-3">
              <div className="flex items-center gap-1 bg-secondary/80 border border-border px-2.5 py-1 rounded-md">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  user.role === 'admin' ? 'bg-red-500' : user.role === 'operator' ? 'bg-blue-500' : 'bg-zinc-500'
                }`} />
                <span className="text-[10px] font-bold text-foreground font-mono uppercase">
                  {user.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="text-xs font-bold text-muted-foreground hover:text-foreground px-2 py-1.5 rounded border border-transparent hover:border-border transition-all"
              >
                Logout 
              </button>
            </div>
            
            <span className="text-xs font-mono text-muted-foreground hidden lg:inline-block">
              {Math.floor(sim.elapsedSeconds / 60)}:{(sim.elapsedSeconds % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </header>
 
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* ML Insight Banner */}
        <div className="flex items-center gap-2.5 rounded-lg border border-[#f97316]/20 bg-[#f97316]/5 px-4 py-2.5 shadow-[0_0_15px_rgba(249,115,22,0.03)] transition-all duration-300">
          <span className="text-xs animate-bounce">🧠</span>
          <p className="text-xs text-foreground font-medium">{sim.mlInsight}</p>
          <span className="ml-auto text-[10px] font-mono text-[#f97316] font-semibold tracking-wider">ML LAYER</span>
        </div>

        {/* AI Vision Panel (Phase 1) */}
        <div id="camera-manager-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed or Smart City Map */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card/60 backdrop-blur-md p-4 shadow-lg flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                {sim.activeCameraId && !mapMode ? '🎥 Real-Time YOLOv11 Detections' : '🗺️ Smart City Control Map'}
              </h3>
              <div className="flex items-center gap-2">
                {sim.activeCameraId && (
                  <button
                    onClick={() => setMapMode(m => !m)}
                    className="text-[9px] font-bold px-2 py-0.5 rounded border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-all uppercase"
                  >
                    {mapMode ? '📹 Show CCTV Feed' : '🗺️ Show City Map'}
                  </button>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  sim.activeCameraId && !mapMode ? 'text-white bg-[#22c55e] animate-pulse' : 'text-muted-foreground bg-secondary'
                }`}>
                  {sim.activeCameraId && !mapMode ? 'Live Feed' : 'Map Mode'}
                </span>
              </div>
            </div>
            
            {(!sim.activeCameraId || mapMode) ? (
              <SmartCityMap
                intersections={sim.intersections}
                junctionSummaries={sim.junctionSummaries}
                activeCameraId={sim.activeCameraId || null}
                onCameraSelect={(camId) => {
                  const num = camId.match(/\d+/)?.[0];
                  const numericId = num ? parseInt(num, 10) : 1;
                  const finalCamId = `camera-${numericId}`;
                  sim.setActiveCameraId?.(finalCamId);
                  setMapMode(false); // Auto switch to feed view when camera is selected
                  fetch(`http://localhost:8000/api/v1/cameras/${finalCamId}/active`, { method: 'POST' }).catch(() => {});
                }}
                emergencyActive={sim.emergencyActive}
                emergencyLane={sim.emergencyLane}
              />
            ) : (
              <LiveCameraFeed
                activeCameraId={sim.activeCameraId}
                detections={sim.detections}
                anomalies={sim.anomalies}
                cameraStats={sim.cameraStats}
                userRole={user.role}
              />
            )}
          </div>

          {/* Camera Manager & Performance */}
          <div className="flex flex-col gap-6">
            <CameraManager 
              activeCameraId={sim.activeCameraId || null}
              onActiveCameraChange={() => {}}
            />
            {sim.activeCameraId && (
              <PerformanceMonitor stats={sim.cameraStats} />
            )}
          </div>
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
        <section id="analytics-section">
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
            simState={sim}
            onWeatherChange={sim.setWeather}
          />
        </section>
      </main>

      {/* ── Phase 4: AI Voice Assistant ── */}
      <AIAssistant simState={sim} onCommand={handleAICommand} />

      {/* Notifications Hub Drawer */}
      <NotificationHub
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        anomalies={sim.anomalies}
        onTriggerToast={triggerToast}
      />

      {/* Floating Toast Container */}
      <div className="fixed top-20 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-lg border shadow-xl flex items-start gap-2.5 bg-[#0a0f1b]/95 backdrop-blur-md animate-slide-in-right ${
              t.severity === 'critical' ? 'border-red-500/60 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]' :
              t.severity === 'high' ? 'border-orange-500/60 text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.1)]' :
              'border-border text-foreground shadow-black/40'
            }`}
          >
            <span className="text-sm">{t.severity === 'critical' ? '🚨' : '⚠️'}</span>
            <div>
              <p className="text-[9px] font-bold font-mono uppercase tracking-wider text-muted-foreground">ALERT DETECTED</p>
              <p className="text-xs font-semibold mt-0.5 text-white">{t.message}</p>
            </div>
          </div>
        ))}
      </div>
      
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
