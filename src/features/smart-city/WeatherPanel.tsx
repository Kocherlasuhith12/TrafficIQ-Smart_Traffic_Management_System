/**
 * WeatherPanel.tsx — Phase 6
 * Weather Intelligence: adjust signal timing based on real-world conditions.
 */
import React from 'react';
import { WeatherCondition } from '@/hooks/useTrafficSimulation';

interface WeatherPanelProps {
  current: WeatherCondition;
  onSelect: (w: WeatherCondition) => void;
  averageSpeed: number;
}

const WEATHER_CONFIG: Record<WeatherCondition, {
  icon: string; label: string; color: string; border: string;
  greenMultiplier: number; speedEffect: number; description: string;
}> = {
  clear:  { icon: '☀️', label: 'Clear',  color: 'text-[#f97316]', border: 'border-[#f97316]/40 bg-[#f97316]/8',  greenMultiplier: 1.0,  speedEffect: 0,   description: 'Optimal conditions. Standard signal timing.' },
  rain:   { icon: '🌧️', label: 'Rain',   color: 'text-[#3b82f6]', border: 'border-[#3b82f6]/40 bg-[#3b82f6]/8',  greenMultiplier: 1.25, speedEffect: -12, description: 'Wet roads. +25% green time, reduced speed limits.' },
  fog:    { icon: '🌫️', label: 'Fog',    color: 'text-slate-400',  border: 'border-slate-400/40 bg-slate-400/8',  greenMultiplier: 1.35, speedEffect: -18, description: 'Low visibility. +35% green time, warning signals active.' },
  night:  { icon: '🌙', label: 'Night',  color: 'text-indigo-400', border: 'border-indigo-400/40 bg-indigo-400/8', greenMultiplier: 1.15, speedEffect: -8,  description: 'Reduced visibility. +15% green time, street lights activated.' },
  snow:   { icon: '❄️', label: 'Snow',   color: 'text-cyan-400',   border: 'border-cyan-400/40 bg-cyan-400/8',    greenMultiplier: 1.5,  speedEffect: -22, description: 'Slippery surface. +50% green time, salt trucks deployed.' },
  dust:   { icon: '🌪️', label: 'Dust',   color: 'text-amber-400',  border: 'border-amber-400/40 bg-amber-400/8',  greenMultiplier: 1.2,  speedEffect: -10, description: 'Dust storm. +20% green time, variable message signs active.' },
};

const WeatherPanel: React.FC<WeatherPanelProps> = ({ current, onSelect, averageSpeed }) => {
  const cfg = WEATHER_CONFIG[current];
  const adjustedSpeed = Math.max(5, averageSpeed + cfg.speedEffect);

  return (
    <div className="space-y-5">
      {/* Current condition hero */}
      <div className={`rounded-xl border px-5 py-4 flex items-center gap-4 ${cfg.border} transition-all duration-500`}>
        <span className="text-5xl">{cfg.icon}</span>
        <div className="flex-1">
          <p className={`text-lg font-black ${cfg.color}`}>{cfg.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase">Green Multiplier</p>
          <p className={`text-2xl font-black ${cfg.color}`}>{cfg.greenMultiplier}×</p>
        </div>
      </div>

      {/* Weather selector grid */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">Select Condition</p>
        <div className="grid grid-cols-3 gap-2.5">
          {(Object.entries(WEATHER_CONFIG) as [WeatherCondition, typeof cfg][]).map(([cond, meta]) => (
            <button
              key={cond}
              onClick={() => onSelect(cond)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border font-bold text-xs transition-all duration-200 ${
                current === cond
                  ? `${meta.border} ${meta.color} scale-105 shadow-lg`
                  : 'bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/60'
              }`}
            >
              <span className="text-2xl">{meta.icon}</span>
              <span>{meta.label}</span>
              {current === cond && (
                <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded-full">{meta.greenMultiplier}×</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Live effect metrics */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">Live Signal Adjustments</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Green Time',      value: `+${Math.round((cfg.greenMultiplier - 1) * 100)}%`, color: '#22c55e' },
            { label: 'Speed Limit',     value: `${adjustedSpeed.toFixed(0)} km/h`,                 color: cfg.speedEffect < 0 ? '#f97316' : '#22c55e' },
            { label: 'Visibility',      value: ['fog','dust','snow'].includes(current) ? 'Low' : 'Normal', color: ['fog','dust','snow'].includes(current) ? '#ef4444' : '#22c55e' },
            { label: 'Alert Status',    value: current === 'clear' ? 'None' : 'Active',             color: current === 'clear' ? '#22c55e' : '#f97316' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-secondary/30 rounded-xl border border-border px-3 py-2.5">
              <p className="text-[9px] text-muted-foreground uppercase">{label}</p>
              <p className="text-sm font-black mt-0.5" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Weather timeline */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">24h Forecast</p>
        <div className="flex items-end gap-1 h-16 bg-secondary/20 rounded-xl px-3 pt-2 border border-border overflow-hidden">
          {['☀️','☀️','🌤','🌦','🌧','🌧','🌫','🌙','🌙','❄️','❄️','🌙'].map((icon, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
              <span className="text-[10px]">{icon}</span>
              <div
                className="w-full rounded-t"
                style={{ height: `${20 + Math.sin(i * 0.8) * 14}px`, background: 'rgba(249,115,22,0.4)' }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1 px-1">
          <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
        </div>
      </div>
    </div>
  );
};

export default WeatherPanel;
