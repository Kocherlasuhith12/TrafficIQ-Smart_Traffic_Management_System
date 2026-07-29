/**
 * GreenCorridor.tsx — Phase 6
 * Emergency Green Corridor: auto-clears all signals for ambulance/fire truck routing.
 */
import React, { useState, useEffect } from 'react';

interface GreenCorridorProps {
  emergencyActive: boolean;
  emergencyLane: string | null;
  onActivate?: () => void;
}

const CORRIDOR_SIGNALS = [
  { id: 'sig-1', name: 'Signal 1', junction: 'Junction 1 — MG Road' },
  { id: 'sig-2', name: 'Signal 2', junction: 'Junction 2 — Ring Road' },
  { id: 'sig-3', name: 'Signal 3', junction: 'Junction 3 — Hospital Gate' },
];

const GreenCorridor: React.FC<GreenCorridorProps> = ({ emergencyActive, emergencyLane, onActivate }) => {
  const [demoActive, setDemoActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [activeSignalIdx, setActiveSignalIdx] = useState(-1);

  const isActive = emergencyActive || demoActive;

  // Cascade animation through signals when active
  useEffect(() => {
    if (!isActive) {
      setActiveSignalIdx(-1);
      setCountdown(0);
      return;
    }
    // Wave animation: each signal goes green one after another
    setCountdown(45);
    let idx = 0;
    setActiveSignalIdx(0);
    const timer = setInterval(() => {
      idx = (idx + 1) % CORRIDOR_SIGNALS.length;
      setActiveSignalIdx(idx);
    }, 1200);
    const cdTimer = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => { clearInterval(timer); clearInterval(cdTimer); };
  }, [isActive]);

  const handleDemo = () => {
    setDemoActive(true);
    setTimeout(() => setDemoActive(false), 20000);
    onActivate?.();
  };

  return (
    <div className="space-y-5">
      {/* Status Banner */}
      <div className={`flex items-center justify-between rounded-xl px-5 py-4 border transition-all duration-500 ${
        isActive
          ? 'bg-[#22c55e]/10 border-[#22c55e]/40 shadow-[0_0_24px_rgba(34,197,94,0.2)]'
          : 'bg-secondary/30 border-border'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
            isActive ? 'bg-[#22c55e] shadow-[0_0_12px_#22c55e] animate-pulse' : 'bg-muted-foreground/30'
          }`} />
          <div>
            <p className={`text-sm font-bold ${isActive ? 'text-[#22c55e]' : 'text-muted-foreground'}`}>
              {isActive ? '🚑 CORRIDOR ACTIVE — All Signals GREEN' : 'Green Corridor Standby'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {isActive
                ? `Emergency vehicle on ${emergencyLane || 'active lane'} — ETA ${countdown}s`
                : 'Auto-activates when ambulance or fire truck is detected'}
            </p>
          </div>
        </div>
        {!emergencyActive && (
          <button
            onClick={handleDemo}
            disabled={demoActive}
            className="text-xs px-4 py-2 rounded-lg bg-[#22c55e]/15 border border-[#22c55e]/40 text-[#22c55e] hover:bg-[#22c55e]/25 font-bold transition-all disabled:opacity-50"
          >
            {demoActive ? '⏳ Active...' : '▶ Demo Corridor'}
          </button>
        )}
      </div>

      {/* Corridor Pipeline */}
      <div className="flex flex-col gap-2">
        {/* Source */}
        <div className="flex items-center gap-3 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 px-4 py-3">
          <span className="text-2xl">🚑</span>
          <div>
            <p className="text-xs font-bold text-[#ef4444]">Emergency Vehicle Detected</p>
            <p className="text-[10px] text-muted-foreground">{emergencyLane || 'Ambulance / Fire Truck'} — Requesting Priority Route</p>
          </div>
          {isActive && <div className="ml-auto w-3 h-3 rounded-full bg-[#ef4444] animate-ping" />}
        </div>

        {/* Cascade arrow + signals */}
        {CORRIDOR_SIGNALS.map((sig, idx) => (
          <React.Fragment key={sig.id}>
            {/* Arrow */}
            <div className="flex items-center justify-center">
              <div className={`w-0.5 h-6 transition-all duration-300 ${
                isActive && activeSignalIdx >= idx ? 'bg-[#22c55e] shadow-[0_0_6px_#22c55e]' : 'bg-border'
              }`} />
              <span className={`text-xs ml-1 transition-all ${isActive && activeSignalIdx >= idx ? 'text-[#22c55e]' : 'text-muted-foreground'}`}>↓</span>
            </div>
            {/* Signal Box */}
            <div className={`flex items-center gap-4 rounded-xl px-4 py-3 border transition-all duration-500 ${
              isActive
                ? 'bg-[#22c55e]/10 border-[#22c55e]/50 shadow-[0_0_16px_rgba(34,197,94,0.15)]'
                : 'bg-secondary/20 border-border'
            }`}>
              {/* Traffic light visual */}
              <div className="flex flex-col gap-1 items-center">
                <div className={`w-4 h-4 rounded-full border transition-all duration-300 ${
                  isActive ? 'bg-transparent border-[#ef4444]/30' : 'bg-[#ef4444] shadow-[0_0_8px_#ef4444]'
                }`} />
                <div className="w-4 h-4 rounded-full bg-[#f97316]/20 border border-[#f97316]/30" />
                <div className={`w-4 h-4 rounded-full border transition-all duration-300 ${
                  isActive ? 'bg-[#22c55e] shadow-[0_0_12px_#22c55e] animate-pulse' : 'bg-transparent border-[#22c55e]/30'
                }`} />
              </div>
              <div className="flex-1">
                <p className={`text-xs font-bold transition-colors ${isActive ? 'text-[#22c55e]' : 'text-foreground'}`}>
                  {sig.name} — {isActive ? 'GREEN ✓' : 'Normal'}
                </p>
                <p className="text-[10px] text-muted-foreground">{sig.junction}</p>
              </div>
              {isActive && (
                <div className={`text-[9px] px-2 py-1 rounded-full font-bold border ${
                  activeSignalIdx === idx
                    ? 'bg-[#22c55e] text-white border-transparent animate-pulse'
                    : 'bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/40'
                }`}>
                  {activeSignalIdx === idx ? 'NOW PASSING' : 'CLEARED ✓'}
                </div>
              )}
            </div>
          </React.Fragment>
        ))}

        {/* Destination */}
        <div className="flex items-center justify-center">
          <div className={`w-0.5 h-6 ${isActive ? 'bg-[#22c55e]' : 'bg-border'}`} />
        </div>
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all ${
          isActive ? 'bg-blue-500/10 border-blue-500/30' : 'bg-secondary/20 border-border'
        }`}>
          <span className="text-2xl">🏥</span>
          <div>
            <p className="text-xs font-bold text-foreground">Destination: City Hospital</p>
            <p className="text-[10px] text-muted-foreground">
              {isActive ? `ETA ${countdown}s — Corridor fully cleared` : 'Standby'}
            </p>
          </div>
          {isActive && countdown > 0 && (
            <div className="ml-auto text-2xl font-black text-[#22c55e] font-mono">{countdown}s</div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Corridors Today', value: '7' },
          { label: 'Avg Clearance', value: '28s' },
          { label: 'Lives Assisted', value: '4' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-secondary/30 rounded-xl border border-border p-3 text-center">
            <p className="text-lg font-black text-[#22c55e]">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GreenCorridor;
