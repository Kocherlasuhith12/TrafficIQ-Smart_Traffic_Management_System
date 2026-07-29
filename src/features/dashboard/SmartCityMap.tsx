import React from 'react';
import { Intersection, JunctionSummary } from '@/types/traffic';
import { Card } from '@/components/ui/card';

interface SmartCityMapProps {
  intersections: Intersection[];
  junctionSummaries: JunctionSummary[];
  activeCameraId: string | null;
  onCameraSelect: (camId: string) => void;
  emergencyActive: boolean;
  emergencyLane: string | null;
}

interface MapJunction {
  id: string;
  name: string;
  x: number;
  y: number;
  camId: string;
}

const MAP_JUNCTIONS: MapJunction[] = [
  { id: 'int-1', name: 'Main St & 1st Ave', x: 160, y: 120, camId: 'cam-001' },
  { id: 'int-2', name: 'Broadway & Oak Dr', x: 420, y: 120, camId: 'cam-002' },
  { id: 'int-3', name: 'Park Ave & 5th St', x: 160, y: 320, camId: 'cam-003' },
  { id: 'int-4', name: 'Central Blvd & Elm Rd', x: 420, y: 320, camId: 'cam-004' },
  { id: 'int-5', name: 'Highway 7 & Ring Rd', x: 680, y: 220, camId: 'cam-005' },
  { id: 'int-6', name: 'Station Rd & Lake Ave', x: 420, y: 480, camId: 'cam-006' },
];

const SmartCityMap: React.FC<SmartCityMapProps> = ({
  intersections,
  junctionSummaries,
  activeCameraId,
  onCameraSelect,
  emergencyActive,
  emergencyLane,
}) => {
  const getJunctionColor = (level: number) => {
    if (level > 75) return '#ef4444'; // Red
    if (level > 40) return '#f97316'; // Orange
    return '#22c55e'; // Green
  };

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border bg-[#0B1120] flex flex-col justify-between">
      {/* Top Map HUD info */}
      <div className="absolute top-3 left-3 flex gap-2 z-10 pointer-events-none">
        <div className="bg-black/80 border border-border px-2.5 py-1.5 rounded-lg flex flex-col gap-0.5">
          <span className="text-[10px] text-white/50 uppercase font-mono leading-none">Smart City Platform</span>
          <span className="text-xs font-black text-foreground">Interactive City Map Grid</span>
        </div>
        {emergencyActive && (
          <div className="bg-[#22c55e]/15 border border-[#22c55e]/40 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e] animate-ping" />
            <span className="text-[10px] font-black text-[#22c55e] tracking-wider uppercase font-mono">
              Green Corridor Active
            </span>
          </div>
        )}
      </div>

      {/* SVG Canvas Map */}
      <svg className="w-full h-full min-h-[360px]" viewBox="0 0 840 560">
        <defs>
          {/* Neon Glow patterns */}
          <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <feGaussianBlur stdDeviation="4" result="blur" />
          <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Road Networks / Grids */}
        {/* Horizontal Main Road */}
        <line x1="60" y1="120" x2="780" y2="120" stroke="hsl(217, 19%, 20%)" strokeWidth="24" strokeLinecap="round" />
        <line x1="60" y1="120" x2="780" y2="120" stroke="hsl(215, 27%, 8%)" strokeWidth="2" strokeDasharray="6, 6" />

        {/* Horizontal Ring Road */}
        <line x1="60" y1="320" x2="780" y2="320" stroke="hsl(217, 19%, 20%)" strokeWidth="24" strokeLinecap="round" />
        <line x1="60" y1="320" x2="780" y2="320" stroke="hsl(215, 27%, 8%)" strokeWidth="2" strokeDasharray="6, 6" />

        {/* Vertical Main Boulevard */}
        <line x1="160" y1="60" x2="160" y2="440" stroke="hsl(217, 19%, 20%)" strokeWidth="24" strokeLinecap="round" />
        <line x1="160" y1="60" x2="160" y2="440" stroke="hsl(215, 27%, 8%)" strokeWidth="2" strokeDasharray="6, 6" />

        {/* Vertical Station Rd */}
        <line x1="420" y1="60" x2="420" y2="520" stroke="hsl(217, 19%, 20%)" strokeWidth="24" strokeLinecap="round" />
        <line x1="420" y1="60" x2="420" y2="520" stroke="hsl(215, 27%, 8%)" strokeWidth="2" strokeDasharray="6, 6" />

        {/* Highway 7 Bypass (Curve connection) */}
        <path d="M 420,120 Q 680,120 680,220 T 680,480" fill="none" stroke="hsl(217, 19%, 20%)" strokeWidth="24" strokeLinecap="round" />
        <path d="M 420,120 Q 680,120 680,220 T 680,480" fill="none" stroke="hsl(215, 27%, 8%)" strokeWidth="2" strokeDasharray="6, 6" />

        {/* Connector Roads */}
        <line x1="160" y1="320" x2="420" y2="480" stroke="hsl(217, 19%, 16%)" strokeWidth="16" />

        {/* 2. Highlight Emergency Corridor Route (Corridor Routing) */}
        {emergencyActive && (
          <path 
            d="M 160,320 L 420,320 Q 680,320 680,220" 
            fill="none" 
            stroke="#22c55e" 
            strokeWidth="6" 
            strokeLinecap="round"
            strokeDasharray="8, 8"
            className="animate-[dash_1.5s_linear_infinite]"
            filter="url(#glow-green)"
            style={{
              strokeDashoffset: 100,
            }}
          />
        )}

        <style>{`
          @keyframes dash {
            to {
              stroke-dashoffset: 0;
            }
          }
        `}</style>

        {/* 3. Render Junction Nodes */}
        {MAP_JUNCTIONS.map(mj => {
          const intersection = intersections.find(i => i.id === mj.id);
          const summary = junctionSummaries.find(s => s.id === mj.id);
          const signalColor = intersection?.signalState === 'GREEN' ? '#22c55e' : intersection?.signalState === 'YELLOW' ? '#f97316' : '#ef4444';
          const congestionLevel = summary?.congestionLevel || 20;
          const heatColor = getJunctionColor(congestionLevel);
          const totalVehicles = summary?.totalVehicles || 0;

          const isCameraActive = activeCameraId === mj.camId;

          return (
            <g key={mj.id} className="transition-all duration-300">
              {/* Congestion heatmap glow ring */}
              <circle
                cx={mj.x}
                cy={mj.y}
                r={25 + congestionLevel * 0.3}
                fill={heatColor}
                opacity={0.12}
                className="animate-ping"
                style={{ animationDuration: `${3 - (congestionLevel / 50)}s` }}
              />
              <circle
                cx={mj.x}
                cy={mj.y}
                r={20 + congestionLevel * 0.25}
                fill={heatColor}
                opacity={0.08}
              />

              {/* Node core housing */}
              <circle cx={mj.x} cy={mj.y} r="14" fill="#1e293b" stroke="hsl(217, 19%, 30%)" strokeWidth="2.5" />
              
              {/* Dynamic Traffic Signal light */}
              <circle cx={mj.x} cy={mj.y} r="6" fill={signalColor} />

              {/* Text tooltip box */}
              <g transform={`translate(${mj.x - 50}, ${mj.y - 45})`}>
                <rect x="0" y="0" width="100" height="24" rx="4" fill="rgba(11, 17, 32, 0.9)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <text x="50" y="10" fill="#94a3b8" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  {mj.name.split(' & ')[0]}
                </text>
                <text x="50" y="18" fill={heatColor} fontSize="8" fontWeight="black" textAnchor="middle" fontFamily="monospace">
                  {totalVehicles} VEH / {congestionLevel}%
                </text>
              </g>

              {/* Camera Icon nodes */}
              <g 
                onClick={() => onCameraSelect(mj.camId)}
                className="cursor-pointer group pointer-events-auto"
              >
                {/* Camera backing */}
                <circle 
                  cx={mj.x + 22} 
                  cy={mj.y + 22} 
                  r="9" 
                  fill={isCameraActive ? '#f97316' : '#1e293b'} 
                  stroke={isCameraActive ? '#f97316' : 'rgba(255,255,255,0.2)'} 
                  strokeWidth="1.5"
                  className="transition-colors group-hover:fill-[#f97316] group-hover:stroke-[#f97316]"
                />
                {/* Camera icon text */}
                <text 
                  x={mj.x + 22} 
                  y={mj.y + 25} 
                  fill="#ffffff" 
                  fontSize="8" 
                  textAnchor="middle"
                  className="select-none"
                >
                  📷
                </text>
                {/* Camera label tooltip */}
                <g 
                  transform={`translate(${mj.x + 5}, ${mj.y + 36})`}
                  className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                >
                  <rect x="0" y="0" width="45" height="13" rx="3" fill="#0f172a" stroke="#f97316" strokeWidth="0.5" />
                  <text x="22" y="9" fill="#f97316" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    ACTIVATE
                  </text>
                </g>
              </g>
            </g>
          );
        })}

        {/* Legend Overlay: Bottom Right */}
        <g transform="translate(600, 420)">
          <rect x="0" y="0" width="180" height="110" rx="6" fill="rgba(11, 17, 32, 0.95)" stroke="hsl(217, 19%, 20%)" strokeWidth="1.5" />
          <text x="15" y="18" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">MAP LEGEND</text>
          
          {/* Green light */}
          <circle cx="20" cy="35" r="4" fill="#22c55e" />
          <text x="32" y="38" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">Signal Green / Low Flow</text>

          {/* Orange light */}
          <circle cx="20" cy="52" r="4" fill="#f97316" />
          <text x="32" y="55" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">Signal Yellow / Moderate</text>

          {/* Red light */}
          <circle cx="20" cy="69" r="4" fill="#ef4444" />
          <text x="32" y="72" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">Signal Red / Congested</text>

          {/* Camera node */}
          <circle cx="20" cy="88" r="5" fill="#1e293b" stroke="#f97316" strokeWidth="1" />
          <text x="20" y="91" fill="#ffffff" fontSize="5" textAnchor="middle">📷</text>
          <text x="32" y="91" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">YOLO Camera Node (Click)</text>
        </g>
      </svg>

      {/* Bottom map summary details */}
      <div className="bg-black/60 border-t border-border px-4 py-3 flex justify-between items-center text-xs">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
            <span className="text-muted-foreground text-[10px]">Normal: 4 junctions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#f97316]" />
            <span className="text-muted-foreground text-[10px]">Heavy: 2 junctions</span>
          </div>
        </div>
        <span className="text-[9px] text-muted-foreground font-mono">
          Click any camera node 📷 to lock YOLO live computer vision tracking onto that segment.
        </span>
      </div>
    </div>
  );
};

export default SmartCityMap;
