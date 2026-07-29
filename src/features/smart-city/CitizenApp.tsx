/**
 * CitizenApp.tsx — Phase 6
 * Citizen Incident Reporter: mobile-app style reporting panel with live alert feed.
 */
import React, { useState } from 'react';

interface CitizenAppProps {
  anomalies: { id: string; type: string; laneId: string; description: string; severity: string; timestamp: number }[];
  onReport?: (report: CitizenReport) => void;
  junctionSummaries: { id: string; name: string; congestionLevel: number }[];
}

interface CitizenReport {
  id: string;
  type: string;
  description: string;
  location: string;
  photo: boolean;
  timestamp: number;
}

const INCIDENT_TYPES = [
  { value: 'accident',      label: '🚗 Accident' },
  { value: 'pothole',       label: '🕳️ Pothole' },
  { value: 'flooding',      label: '🌊 Flooding' },
  { value: 'signal_fault',  label: '🚦 Signal Fault' },
  { value: 'road_block',    label: '🚧 Road Block' },
  { value: 'animal',        label: '🦌 Animal on Road' },
  { value: 'debris',        label: '🪨 Debris/Obstruction' },
  { value: 'fire',          label: '🔥 Fire' },
];

const ROUTE_ALTS = [
  { from: 'Junction 1', via: 'Ring Road', eta: '4 min faster', congestion: 22 },
  { from: 'Junction 3', via: 'Bypass NH-48', eta: '7 min faster', congestion: 15 },
  { from: 'Junction 5', via: 'Inner Loop', eta: '2 min faster', congestion: 35 },
];

const CitizenApp: React.FC<CitizenAppProps> = ({ anomalies, onReport, junctionSummaries }) => {
  const [activeTab, setActiveTab] = useState<'report' | 'alerts' | 'routes'>('alerts');
  const [form, setForm] = useState({ type: 'accident', description: '', location: '', hasPhoto: false });
  const [submitted, setSubmitted] = useState(false);
  const [photoName, setPhotoName] = useState('');

  const recentAlerts = anomalies
    .filter(a => ['critical', 'high'].includes(a.severity))
    .slice(-12)
    .reverse();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const report: CitizenReport = {
      id: `citizen-${Date.now()}`,
      type: form.type,
      description: form.description,
      location: form.location,
      photo: form.hasPhoto,
      timestamp: Date.now(),
    };
    onReport?.(report);
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setForm({ type: 'accident', description: '', location: '', hasPhoto: false }); setPhotoName(''); }, 3000);
  };

  const tabs = [
    { id: 'alerts' as const, label: '📍 Live Alerts', count: recentAlerts.length },
    { id: 'report' as const, label: '📸 Report',      count: 0 },
    { id: 'routes' as const, label: '🗺️ Routes',      count: 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Mobile app frame */}
      <div className="mx-auto max-w-sm rounded-3xl border-2 border-border bg-card shadow-2xl overflow-hidden">
        {/* Phone status bar */}
        <div className="bg-[#0a0a0f] px-4 py-2 flex items-center justify-between">
          <span className="text-[10px] text-white/60 font-mono">09:41</span>
          <div className="w-20 h-3 bg-black rounded-full" />
          <div className="flex gap-1 items-center">
            <div className="w-4 h-2.5 border border-white/40 rounded-[2px] relative">
              <div className="absolute left-0.5 top-0.5 bottom-0.5 w-2/3 bg-[#22c55e] rounded-[1px]" />
            </div>
          </div>
        </div>

        {/* App header */}
        <div className="bg-gradient-to-r from-[#ef4444] via-[#f97316] to-[#22c55e] px-4 py-3 flex items-center gap-2">
          <span className="text-white text-base">🏙️</span>
          <div>
            <p className="text-white text-xs font-black">TrafficIQ Citizen</p>
            <p className="text-white/70 text-[9px]">Smart City Reporter</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-white/80 text-[9px]">Live</span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border bg-card">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 text-[10px] font-bold py-2.5 px-1 transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#f97316] text-[#f97316]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 bg-[#ef4444] text-white text-[8px] px-1 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-3 min-h-[280px]">
          {/* Live Alerts */}
          {activeTab === 'alerts' && (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {recentAlerts.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">✅ No active alerts</div>
              ) : recentAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`rounded-xl p-2.5 border text-xs ${
                    alert.severity === 'critical'
                      ? 'bg-[#ef4444]/8 border-[#ef4444]/30'
                      : 'bg-[#f97316]/8 border-[#f97316]/25'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${alert.severity === 'critical' ? 'bg-[#ef4444]' : 'bg-[#f97316]'} animate-pulse`} />
                    <span className={`text-[9px] font-bold uppercase ${alert.severity === 'critical' ? 'text-[#ef4444]' : 'text-[#f97316]'}`}>
                      {alert.severity}
                    </span>
                    <span className="text-[9px] text-muted-foreground ml-auto">{alert.laneId}</span>
                  </div>
                  <p className="text-[10px] text-foreground leading-tight">{alert.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Report Form */}
          {activeTab === 'report' && (
            submitted ? (
              <div className="flex flex-col items-center justify-center h-[280px] gap-3">
                <span className="text-4xl">✅</span>
                <p className="text-sm font-bold text-[#22c55e]">Report Submitted!</p>
                <p className="text-[10px] text-muted-foreground text-center">Traffic control has been notified. Thank you for keeping roads safe.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2.5">
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase font-semibold">Incident Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full mt-1 bg-secondary/40 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none"
                  >
                    {INCIDENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase font-semibold">Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Junction 3 — MG Road"
                    value={form.location}
                    onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                    className="w-full mt-1 bg-secondary/40 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:border-[#f97316]/50 placeholder-muted-foreground"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase font-semibold">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Briefly describe what you see..."
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full mt-1 bg-secondary/40 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none resize-none focus:border-[#f97316]/50 placeholder-muted-foreground"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer text-[10px] text-muted-foreground">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) { setPhotoName(f.name); setForm(p => ({ ...p, hasPhoto: true })); }
                      }}
                      id="photo-upload"
                    />
                    <span className="px-3 py-1.5 rounded-lg border border-border bg-secondary/40 text-xs hover:bg-secondary transition-all">
                      📸 {photoName ? photoName.slice(0, 20) + '…' : 'Upload Photo'}
                    </span>
                  </label>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-[#f97316] to-[#ef4444] text-white text-xs font-bold hover:opacity-90 transition-all shadow-lg"
                >
                  🚨 Submit Report
                </button>
              </form>
            )
          )}

          {/* Alternate Routes */}
          {activeTab === 'routes' && (
            <div className="space-y-2.5">
              <p className="text-[9px] text-muted-foreground uppercase font-semibold">Suggested Alternate Routes</p>
              {ROUTE_ALTS.map((r, i) => (
                <div key={i} className="rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/5 p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground">Via {r.via}</span>
                    <span className="text-[9px] text-[#22c55e] font-bold">{r.eta}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-[#22c55e] rounded-full" style={{ width: `${100 - r.congestion}%` }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground">{r.congestion}% congested</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1">From {r.from}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* App store badges */}
      <div className="flex justify-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-secondary/30 text-xs text-muted-foreground">
          <span>🍎</span> <span>App Store</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-secondary/30 text-xs text-muted-foreground">
          <span>🤖</span> <span>Google Play</span>
        </div>
      </div>
    </div>
  );
};

export default CitizenApp;
