import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '@/config';
import { AnomalyRecord } from '@/data/trafficDetectionDataset';

// ── Extend AnomalyRecord with Phase 3 fields ──────────────────────────────────
interface IncidentRecord extends Omit<AnomalyRecord, 'type'> {
  type: string;
  screenshotPath?: string;
}

interface IncidentTimelineProps {
  anomalies: IncidentRecord[];
  onResolve?: (id: string) => void;
}

// ── Incident Type Metadata ─────────────────────────────────────────────────────
const INCIDENT_META: Record<string, { icon: string; label: string; color: string; border: string; voice: string }> = {
  accident:              { icon: '🚗💥', label: 'Accident',           color: 'text-[#ef4444]', border: 'border-[#ef4444]/40 bg-[#ef4444]/8',  voice: 'Road accident detected' },
  vehicle_collision:     { icon: '💥',   label: 'Collision',          color: 'text-[#ef4444]', border: 'border-[#ef4444]/40 bg-[#ef4444]/8',  voice: 'Vehicle collision detected' },
  vehicle_stopped:       { icon: '🛑',   label: 'Vehicle Stopped',    color: 'text-[#f97316]', border: 'border-[#f97316]/40 bg-[#f97316]/8',  voice: 'Stopped vehicle detected' },
  wrong_way_driving:     { icon: '⛔',   label: 'Wrong Way',          color: 'text-[#ef4444]', border: 'border-[#ef4444]/40 bg-[#ef4444]/8',  voice: 'Wrong-way driving alert' },
  illegal_parking:       { icon: '🚫',   label: 'Illegal Parking',    color: 'text-[#f97316]', border: 'border-[#f97316]/40 bg-[#f97316]/8',  voice: 'Illegal parking detected' },
  vehicle_breakdown:     { icon: '🔧',   label: 'Breakdown',          color: 'text-[#f97316]', border: 'border-[#f97316]/40 bg-[#f97316]/8',  voice: 'Vehicle breakdown detected' },
  road_block:            { icon: '🚧',   label: 'Road Block',         color: 'text-[#ef4444]', border: 'border-[#ef4444]/40 bg-[#ef4444]/8',  voice: 'Road block detected' },
  pedestrian_on_road:    { icon: '🚶',   label: 'Pedestrian',         color: 'text-[#ef4444]', border: 'border-[#ef4444]/40 bg-[#ef4444]/8',  voice: 'Pedestrian on road detected' },
  animal_crossing:       { icon: '🦌',   label: 'Animal Crossing',    color: 'text-[#f97316]', border: 'border-[#f97316]/40 bg-[#f97316]/8',  voice: 'Animal crossing detected' },
  fire:                  { icon: '🔥',   label: 'Fire',               color: 'text-[#ef4444]', border: 'border-[#ef4444]/50 bg-[#ef4444]/10', voice: 'Fire detected! Emergency services dispatched' },
  smoke:                 { icon: '💨',   label: 'Smoke / Haze',       color: 'text-[#f97316]', border: 'border-[#f97316]/40 bg-[#f97316]/8',  voice: 'Smoke or haze detected' },
  flooding:              { icon: '🌊',   label: 'Flooding',           color: 'text-[#3b82f6]', border: 'border-[#3b82f6]/40 bg-[#3b82f6]/8',  voice: 'Flooding detected on road' },
  emergency_vehicle:     { icon: '🚑',   label: 'Emergency Vehicle',  color: 'text-[#ef4444]', border: 'border-[#ef4444]/40 bg-[#ef4444]/8',  voice: 'Emergency vehicle approaching' },
  overspeeding:          { icon: '💨',   label: 'Overspeeding',       color: 'text-[#f97316]', border: 'border-[#f97316]/40 bg-[#f97316]/8',  voice: 'Overspeeding vehicle detected' },
  red_light_violation:   { icon: '🚦',   label: 'Red Light',          color: 'text-[#ef4444]', border: 'border-[#ef4444]/40 bg-[#ef4444]/8',  voice: 'Red light violation' },
  sudden_congestion:     { icon: '🚧',   label: 'Congestion',         color: 'text-[#f97316]', border: 'border-[#f97316]/40 bg-[#f97316]/8',  voice: 'Sudden congestion spike' },
  stopped_vehicle:       { icon: '🛑',   label: 'Stopped Vehicle',    color: 'text-[#f97316]', border: 'border-[#f97316]/40 bg-[#f97316]/8',  voice: 'Stopped vehicle alert' },
  low_confidence_alert:  { icon: '⚠️',  label: 'Low Confidence',     color: 'text-muted-foreground', border: 'border-border bg-secondary/30', voice: 'AI confidence warning' },
};

const DEFAULT_META = { icon: '⚠️', label: 'Incident', color: 'text-[#f97316]', border: 'border-[#f97316]/40 bg-[#f97316]/8', voice: 'Traffic incident detected' };

const getSeverityGlow = (severity: string) => {
  switch (severity) {
    case 'critical': return 'shadow-[0_0_12px_rgba(239,68,68,0.25)]';
    case 'high':     return 'shadow-[0_0_8px_rgba(249,115,22,0.2)]';
    default:         return '';
  }
};

const formatTimestamp = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// ── Voice Alert Engine ─────────────────────────────────────────────────────────
const speak = (text: string) => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    const utterance = new SpeechSynthesisUtterance(`Traffic Alert: ${text}`);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
};

// ── Main Component ─────────────────────────────────────────────────────────────
const IncidentTimeline: React.FC<IncidentTimelineProps> = ({ anomalies, onResolve }) => {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  // Active (unresolved) incidents
  const activeIncidents = anomalies.filter(a => !a.resolved).slice(-30).reverse();
  const criticalCount = activeIncidents.filter(a => a.severity === 'critical').length;

  // Voice alert on new incidents
  useEffect(() => {
    if (!voiceEnabled) return;
    for (const inc of anomalies.slice(-5)) {
      if (!inc.resolved && !seenIds.current.has(inc.id)) {
        seenIds.current.add(inc.id);
        const meta = INCIDENT_META[inc.type] || DEFAULT_META;
        speak(`${meta.voice} on ${inc.laneId}`);
      }
    }
  }, [anomalies, voiceEnabled]);

  const handleResolve = useCallback(async (incident: IncidentRecord) => {
    setResolving(incident.id);
    try {
      await fetch(`${API_BASE_URL}/api/v1/incidents/${incident.id}/resolve`, { method: 'POST' });
      onResolve?.(incident.id);
    } catch (e) {
      console.error('Resolve failed:', e);
    } finally {
      setResolving(null);
      setSelectedIncident(null);
    }
  }, [onResolve]);

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur-md shadow-lg flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/80">
        <div className="flex items-center gap-2.5">
          <span className="text-base">🎥</span>
          <h3 className="text-sm font-bold text-foreground">Incident Detection Timeline</h3>
          {criticalCount > 0 && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#ef4444] text-white font-bold animate-pulse">
              {criticalCount} CRITICAL
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground font-mono">{activeIncidents.length} active</span>
          {/* Voice toggle */}
          <button
            onClick={() => setVoiceEnabled(v => !v)}
            title={voiceEnabled ? 'Mute voice alerts' : 'Enable voice alerts'}
            className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border font-bold transition-all duration-200 ${
              voiceEnabled
                ? 'bg-[#22c55e]/15 border-[#22c55e]/40 text-[#22c55e]'
                : 'bg-secondary border-border text-muted-foreground'
            }`}
          >
            {voiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
          </button>
        </div>
      </div>

      {/* ── Timeline List ── */}
      <div className="flex-1 overflow-y-auto max-h-[420px]">
        {activeIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <span className="text-3xl mb-2">✅</span>
            <p className="text-sm font-semibold">No active incidents</p>
            <p className="text-[11px] mt-1">AI is monitoring all camera feeds</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {activeIncidents.map((incident) => {
              const meta = INCIDENT_META[incident.type] || DEFAULT_META;
              return (
                <div
                  key={incident.id}
                  onClick={() => setSelectedIncident(incident)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/40 transition-all duration-150 border-l-2 ${
                    incident.severity === 'critical' ? 'border-l-[#ef4444]' :
                    incident.severity === 'high' ? 'border-l-[#f97316]' : 'border-l-border'
                  }`}
                >
                  {/* Time */}
                  <div className="flex flex-col items-center min-w-[38px] pt-0.5">
                    <span className="text-[11px] font-mono font-bold text-foreground leading-none">
                      {formatTimestamp(incident.timestamp)}
                    </span>
                    <div className="w-px flex-1 bg-border/50 mt-1.5" />
                  </div>

                  {/* Icon */}
                  <span className="text-lg leading-none mt-0.5 flex-shrink-0">{meta.icon}</span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono">
                        {incident.laneId}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${
                        incident.severity === 'critical' ? 'border-[#ef4444]/40 text-[#ef4444] bg-[#ef4444]/10' :
                        incident.severity === 'high' ? 'border-[#f97316]/40 text-[#f97316] bg-[#f97316]/10' :
                        'border-border text-muted-foreground'
                      }`}>
                        {incident.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{incident.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[9px] text-muted-foreground">View →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Incident Detail Modal ── */}
      {selectedIncident && (
        <IncidentModal
          incident={selectedIncident}
          resolving={resolving === selectedIncident.id}
          onResolve={() => handleResolve(selectedIncident)}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  );
};

// ── Incident Modal ─────────────────────────────────────────────────────────────
interface ModalProps {
  incident: IncidentRecord;
  resolving: boolean;
  onResolve: () => void;
  onClose: () => void;
}

const IncidentModal: React.FC<ModalProps> = ({ incident, resolving, onResolve, onClose }) => {
  const meta = INCIDENT_META[incident.type] || DEFAULT_META;
  const screenshotUrl = `${API_BASE_URL}/api/v1/incidents/screenshot/${incident.id}`;
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-md mx-4 rounded-2xl border bg-card shadow-2xl ${getSeverityGlow(incident.severity)} overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`flex items-center gap-3 px-5 py-4 border-b ${meta.border}`}>
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <h4 className={`font-bold text-sm ${meta.color}`}>{meta.label} Detected</h4>
            <p className="text-[10px] text-muted-foreground font-mono">{incident.id}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Screenshot */}
        <div className="px-5 pt-4">
          <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">CCTV Snapshot</p>
          <div className="rounded-xl overflow-hidden border border-border bg-[#090d16] h-[180px] relative flex items-center justify-center">
            {!imgError ? (
              <img
                src={screenshotUrl}
                alt="Incident Screenshot"
                className="w-full h-full object-cover"
                onError={() => {
                  setImgError(true);
                }}
              />
            ) : (
              <div className="w-full h-full p-4 flex flex-col justify-between font-mono text-[9px] text-[#ef4444] bg-gradient-to-b from-[#ef4444]/10 to-[#000000] relative">
                <div className="flex justify-between items-center text-[#ef4444]/80 z-10">
                  <span>📷 FEED: {incident.cameraId || 'CAM-01'}</span>
                  <span className="animate-pulse">● REC LIVE</span>
                </div>
                
                {/* Visual radar grid graphic */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <div className="w-24 h-24 border border-dashed border-[#ef4444] rounded-full animate-pulse flex items-center justify-center">
                    <div className="w-12 h-12 border border-dotted border-[#ef4444] rounded-full" />
                  </div>
                  <div className="absolute w-32 h-px bg-gradient-to-r from-transparent via-[#ef4444] to-transparent rotate-45" />
                </div>

                <div className="flex flex-col items-center justify-center flex-1 gap-1 z-10">
                  <span className="text-2xl">{meta.icon}</span>
                  <span className="font-bold text-[10px] uppercase text-white tracking-widest">{incident.type.replace(/_/g, ' ')}</span>
                  <span className="text-muted-foreground text-[8px]">{incident.location || incident.laneId}</span>
                </div>

                <div className="flex justify-between items-center text-white/50 text-[8px] z-10">
                  <span>SECURE CHANNEL</span>
                  <span>TS: {new Date(incident.timestamp).toLocaleString()}</span>
                </div>
              </div>
            )}
            
            {/* HUD scan overlay */}
            <div className="absolute inset-0 pointer-events-none border border-[#ef4444]/25 z-20" />
            <div className="absolute top-2 left-2 text-[8px] bg-red-600/90 text-white font-bold px-1.5 py-0.5 rounded font-mono uppercase tracking-wider animate-pulse z-20">
              ALERT LOGGED
            </div>
          </div>
        </div>

        {/* Incident Metadata */}
        <div className="px-5 py-4 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-secondary/50 rounded-lg p-2.5 text-center border border-border">
              <p className="text-[9px] text-muted-foreground uppercase">Time</p>
              <p className="text-xs font-mono font-bold text-foreground">{formatTimestamp(incident.timestamp)}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2.5 text-center border border-border">
              <p className="text-[9px] text-muted-foreground uppercase">Lane</p>
              <p className="text-xs font-mono font-bold text-foreground">{incident.laneId}</p>
            </div>
            <div className={`rounded-lg p-2.5 text-center border ${meta.border}`}>
              <p className="text-[9px] text-muted-foreground uppercase">Severity</p>
              <p className={`text-xs font-bold uppercase ${meta.color}`}>{incident.severity}</p>
            </div>
          </div>

          <div className="rounded-lg bg-secondary/30 border border-border px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Description</p>
            <p className="text-xs text-foreground">{incident.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1">
            {/* Actions: Stored metadata */}
            <div className="rounded-lg bg-secondary/20 border border-border px-3 py-2">
              <p className="text-[9px] text-muted-foreground uppercase">Camera</p>
              <p className="text-[11px] font-mono text-foreground">CAM-01 (Active)</p>
            </div>
            <div className="rounded-lg bg-secondary/20 border border-border px-3 py-2">
              <p className="text-[9px] text-muted-foreground uppercase">Status</p>
              <p className="text-[11px] font-mono text-[#f97316] font-bold">UNRESOLVED</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={onResolve}
            disabled={resolving}
            className="flex-1 py-2.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resolving ? '⏳ Resolving...' : '✅ Resolve Incident'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncidentTimeline;
