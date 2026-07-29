/**
 * SmartCityHub.tsx — Phase 6
 * Container tab bar that hosts all 6 Smart City panels.
 */
import React, { useState } from 'react';
import { SimulationState, WeatherCondition } from '@/hooks/useTrafficSimulation';
import GreenCorridor from './GreenCorridor';
import WeatherPanel from './WeatherPanel';
import ANPRPanel from './ANPRPanel';
import CitizenApp from './CitizenApp';
import MultiAgentPanel from './MultiAgentPanel';
import MultiCameraGrid from './MultiCameraGrid';

interface SmartCityHubProps {
  simState: SimulationState;
  onWeatherChange: (w: WeatherCondition) => void;
}

const TABS = [
  { id: 'corridor',   icon: '🚑', label: 'Green Corridor',  badge: '' },
  { id: 'weather',    icon: '🌦️', label: 'Weather',         badge: '' },
  { id: 'anpr',       icon: '📷', label: 'ANPR',            badge: '' },
  { id: 'citizen',    icon: '📱', label: 'Citizen App',     badge: '' },
  { id: 'agents',     icon: '🤖', label: 'AI Agents',       badge: '6' },
  { id: 'cameras',    icon: '🎥', label: 'Camera Grid',     badge: '100+' },
] as const;

type TabId = typeof TABS[number]['id'];

const SmartCityHub: React.FC<SmartCityHubProps> = ({ simState, onWeatherChange }) => {
  const [activeTab, setActiveTab] = useState<TabId>('corridor');

  const {
    emergencyActive, emergencyLane, anomalies, detections,
    junctionSummaries, weatherCondition, averageSpeed, activeCameraId,
  } = simState;

  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md shadow-xl overflow-hidden">
      {/* Hub Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-gradient-to-r from-[#f97316]/5 via-transparent to-[#8b5cf6]/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#f97316] to-[#8b5cf6] flex items-center justify-center">
            <span className="text-sm">🏙️</span>
          </div>
          <div>
            <p className="text-sm font-black text-foreground">Smart City Platform</p>
            <p className="text-[9px] text-muted-foreground font-mono">Phase 6 — Autonomous Traffic Intelligence</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-[10px] text-[#22c55e] font-bold">ONLINE</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto border-b border-border bg-secondary/20 scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all duration-200 flex-shrink-0 ${
              activeTab === tab.id
                ? 'border-[#f97316] text-[#f97316] bg-[#f97316]/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            }`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge && (
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab.id ? 'bg-[#f97316] text-white' : 'bg-secondary text-muted-foreground'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Panel Content */}
      <div className="p-5">
        {activeTab === 'corridor' && (
          <GreenCorridor
            emergencyActive={emergencyActive}
            emergencyLane={emergencyLane}
          />
        )}

        {activeTab === 'weather' && (
          <WeatherPanel
            current={weatherCondition}
            onSelect={onWeatherChange}
            averageSpeed={averageSpeed}
          />
        )}

        {activeTab === 'anpr' && (
          <ANPRPanel
            detections={detections}
            anomalies={anomalies}
          />
        )}

        {activeTab === 'citizen' && (
          <CitizenApp
            anomalies={anomalies}
            junctionSummaries={junctionSummaries}
            onReport={(report) => {
              console.info('[CitizenReport]', report);
            }}
          />
        )}

        {activeTab === 'agents' && (
          <MultiAgentPanel simState={simState} />
        )}

        {activeTab === 'cameras' && (
          <MultiCameraGrid activeCameraId={activeCameraId} />
        )}
      </div>
    </div>
  );
};

export default SmartCityHub;
