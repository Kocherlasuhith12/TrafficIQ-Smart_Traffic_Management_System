/**
 * MultiAgentPanel.tsx — Phase 6
 * Multi-Agent AI: six specialised agents, each with a live metric + pipeline flow animation.
 */
import React, { useState, useEffect } from 'react';
import { SimulationState } from '@/hooks/useTrafficSimulation';

interface MultiAgentPanelProps {
  simState: SimulationState;
}

type AgentStatus = 'active' | 'processing' | 'idle';

interface AgentDef {
  id: string;
  name: string;
  icon: string;
  role: string;
  color: string;
  border: string;
}

const AGENTS: AgentDef[] = [
  { id: 'vision',     name: 'Vision Agent',      icon: '👁️',  role: 'Real-time YOLO detection & tracking',          color: '#f97316', border: 'border-[#f97316]/40' },
  { id: 'analytics',  name: 'Analytics Agent',   icon: '📊',  role: 'Traffic flow analysis & heatmaps',              color: '#3b82f6', border: 'border-[#3b82f6]/40' },
  { id: 'prediction', name: 'Prediction Agent',  icon: '🔮',  role: 'ML-based 5-minute traffic forecasting',         color: '#8b5cf6', border: 'border-[#8b5cf6]/40' },
  { id: 'decision',   name: 'Decision Agent',    icon: '⚡',  role: 'Adaptive signal timing & priority routing',     color: '#22c55e', border: 'border-[#22c55e]/40' },
  { id: 'voice',      name: 'Voice Agent',       icon: '🔊',  role: 'Speech synthesis & operator notifications',     color: '#ef4444', border: 'border-[#ef4444]/40' },
  { id: 'report',     name: 'Report Agent',      icon: '📋',  role: 'Incident logging & dashboard reporting',        color: '#f59e0b', border: 'border-[#f59e0b]/40' },
];

// Message pipeline between agents
const PIPELINE_MESSAGES = [
  'Detection event → Vision Agent',
  'Vision Agent → Analytics Agent: 42 objects/frame',
  'Analytics Agent → Prediction Agent: congestion 68%',
  'Prediction Agent → Decision Agent: +3min ETA',
  'Decision Agent → Voice Agent: signal adjusted',
  'Voice Agent → Report Agent: alert announced',
  'Report Agent: event logged',
];

const MultiAgentPanel: React.FC<MultiAgentPanelProps> = ({ simState }) => {
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({
    vision: 'active', analytics: 'active', prediction: 'processing',
    decision: 'active', voice: 'idle', report: 'active',
  });
  const [pipelineStep, setPipelineStep] = useState(0);
  const [activityBars, setActivityBars] = useState<Record<string, number[]>>({});

  const { detections, junctionSummaries, anomalies, predictions, averageSpeed, elapsedSeconds } = simState;

  const totalVehicles = junctionSummaries.reduce((s, j) => s + j.vehicleCount, 0);
  const avgCongestion = junctionSummaries.reduce((s, j) => s + j.congestionLevel, 0) / Math.max(junctionSummaries.length, 1);
  const criticalAlerts = anomalies.filter(a => !a.resolved && a.severity === 'critical').length;

  // Agent live metrics
  const agentMetrics: Record<string, string> = {
    vision:     `${detections.length} obj tracked • ${(detections.length * 1.4).toFixed(1)}/s`,
    analytics:  `Congestion ${avgCongestion.toFixed(0)}% • ${junctionSummaries.length} junctions`,
    prediction: `Next 5min: +${Math.round(totalVehicles * 0.08)} vehicles • Δ${(avgCongestion * 0.12).toFixed(1)}%`,
    decision:   `${Math.round(elapsedSeconds / 12)} adjustments • ${simState.isRunning ? 'Adaptive ON' : 'Paused'}`,
    voice:      `${criticalAlerts} alerts • ${simState.voiceEnabled === false ? 'Muted' : 'Speaking'}`,
    report:     `${anomalies.length} events • ${anomalies.filter(a => a.resolved).length} resolved`,
  };

  // Cycle pipeline messages
  useEffect(() => {
    const t = setInterval(() => setPipelineStep(s => (s + 1) % PIPELINE_MESSAGES.length), 1400);
    return () => clearInterval(t);
  }, []);

  // Rotate agent statuses realistically
  useEffect(() => {
    const t = setInterval(() => {
      setAgentStatuses(prev => {
        const keys = Object.keys(prev);
        const k = keys[Math.floor(Math.random() * keys.length)];
        const next: AgentStatus = prev[k] === 'active' ? 'processing' : prev[k] === 'processing' ? 'idle' : 'active';
        return { ...prev, [k]: next };
      });
    }, 2200);
    return () => clearInterval(t);
  }, []);

  // Animate activity bars
  useEffect(() => {
    const t = setInterval(() => {
      setActivityBars(prev => {
        const updated: Record<string, number[]> = {};
        AGENTS.forEach(a => {
          const bars = prev[a.id] || Array(8).fill(30);
          updated[a.id] = [...bars.slice(1), 15 + Math.random() * 85];
        });
        return updated;
      });
    }, 400);
    return () => clearInterval(t);
  }, []);

  const statusColor: Record<AgentStatus, string> = {
    active: 'text-[#22c55e]',
    processing: 'text-[#f97316]',
    idle: 'text-muted-foreground',
  };
  const statusDot: Record<AgentStatus, string> = {
    active: 'bg-[#22c55e] animate-pulse shadow-[0_0_8px_#22c55e]',
    processing: 'bg-[#f97316] animate-ping',
    idle: 'bg-muted-foreground/40',
  };

  return (
    <div className="space-y-5">
      {/* Pipeline message ticker */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 px-4 py-2.5 overflow-hidden">
        <span className="text-xs font-mono text-[#f97316] font-bold flex-shrink-0">PIPELINE</span>
        <div className="flex-1 overflow-hidden">
          <p className="text-xs text-foreground font-mono animate-pulse truncate">
            → {PIPELINE_MESSAGES[pipelineStep]}
          </p>
        </div>
        <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping flex-shrink-0" />
      </div>

      {/* Agent cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {AGENTS.map(agent => {
          const status = agentStatuses[agent.id] || 'active';
          const bars = activityBars[agent.id] || Array(8).fill(30);
          return (
            <div
              key={agent.id}
              className={`rounded-xl border bg-secondary/20 p-3.5 flex flex-col gap-2.5 hover:bg-secondary/40 transition-all duration-300 ${agent.border}`}
            >
              {/* Header */}
              <div className="flex items-center gap-2">
                <span className="text-xl">{agent.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{agent.name}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{agent.role}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${statusDot[status]}`} />
                  <span className={`text-[9px] font-bold uppercase ${statusColor[status]}`}>{status}</span>
                </div>
              </div>

              {/* Activity bar */}
              <div className="flex items-end gap-0.5 h-8 bg-black/20 rounded-lg px-1.5 pt-1.5 overflow-hidden">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t transition-all duration-300"
                    style={{ height: `${h}%`, background: agent.color, opacity: 0.6 + (i / bars.length) * 0.4 }}
                  />
                ))}
              </div>

              {/* Live metric */}
              <p className="text-[10px] font-mono text-muted-foreground bg-black/20 rounded-lg px-2 py-1.5 truncate">
                {agentMetrics[agent.id]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Pipeline flow diagram */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">Agent Pipeline Flow</p>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {AGENTS.map((a, idx) => (
            <React.Fragment key={a.id}>
              <div className={`flex flex-col items-center gap-1 flex-shrink-0 rounded-lg border px-2.5 py-2 min-w-[60px] transition-all duration-300 ${
                pipelineStep === idx + 1
                  ? `${a.border} shadow-lg scale-105`
                  : 'border-border bg-secondary/20'
              }`}>
                <span className="text-base">{a.icon}</span>
                <span className="text-[8px] text-muted-foreground text-center leading-tight">{a.name.replace(' Agent', '')}</span>
              </div>
              {idx < AGENTS.length - 1 && (
                <div className={`h-0.5 w-4 flex-shrink-0 rounded transition-all ${
                  pipelineStep > idx + 1 ? 'bg-[#22c55e]' : 'bg-border'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MultiAgentPanel;
