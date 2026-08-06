/**
 * MultiCameraGrid.tsx — Phase 6
 * 100+ camera support: grid view with status dots, active highlight, grid size selector.
 */
import React, { useState } from 'react';
import { API_BASE_URL } from '@/config';

const normalizeCamId = (id: string | null | undefined): string => {
  if (!id) return '';
  const num = id.match(/\d+/)?.[0];
  return num ? `cam-${parseInt(num, 10)}` : id;
};

interface Camera {
  id: string;
  name: string;
  location: string;
  status: 'live' | 'offline' | 'recording';
  fps: number;
}

interface MultiCameraGridProps {
  activeCameraId?: string | null;
  streamBaseUrl?: string;
}

// Generate a set of 100 simulated cameras
const generateCameras = (): Camera[] =>
  Array.from({ length: 100 }, (_, i) => {
    const id = `cam-${String(i + 1).padStart(3, '0')}`;
    const statuses: Camera['status'][] = ['live', 'live', 'live', 'recording', 'offline'];
    return {
      id,
      name: `CAM-${String(i + 1).padStart(3, '0')}`,
      location: [
        'Junction 1', 'Junction 2', 'Junction 3', 'Junction 4', 'Junction 5',
        'Ring Road', 'MG Road', 'NH-48', 'Hospital Gate', 'Market Square',
      ][i % 10],
      status: statuses[i % statuses.length],
      fps: 18 + Math.round(Math.sin(i) * 8),
    };
  });

const ALL_CAMERAS = generateCameras();

type GridSize = '2x2' | '3x3' | '4x4';
const GRID_SIZES: { label: GridSize; cols: number }[] = [
  { label: '2x2', cols: 2 },
  { label: '3x3', cols: 3 },
  { label: '4x4', cols: 4 },
];

const STATUS_COLORS: Record<Camera['status'], string> = {
  live:      'bg-[#22c55e] shadow-[0_0_6px_#22c55e]',
  recording: 'bg-[#ef4444] animate-pulse',
  offline:   'bg-muted-foreground/40',
};
const STATUS_LABELS: Record<Camera['status'], string> = {
  live: 'LIVE', recording: 'REC', offline: 'OFF',
};

const MultiCameraGrid: React.FC<MultiCameraGridProps> = ({ activeCameraId, streamBaseUrl = API_BASE_URL }) => {
  const [gridSize, setGridSize] = useState<GridSize>('3x3');
  const [filter, setFilter] = useState<'all' | 'live' | 'offline'>('all');
  const [selectedCam, setSelectedCam] = useState<Camera | null>(null);
  const [page, setPage] = useState(0);

  const { cols } = GRID_SIZES.find(g => g.label === gridSize)!;
  const perPage = cols * cols;

  const filtered = ALL_CAMERAS.filter(c =>
    filter === 'all' ? true : filter === 'live' ? c.status !== 'offline' : c.status === 'offline'
  );
  const totalPages = Math.ceil(filtered.length / perPage);
  const pageCams = filtered.slice(page * perPage, (page + 1) * perPage);

  const liveCount = ALL_CAMERAS.filter(c => c.status === 'live').length;
  const recCount  = ALL_CAMERAS.filter(c => c.status === 'recording').length;
  const offCount  = ALL_CAMERAS.filter(c => c.status === 'offline').length;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: ALL_CAMERAS.length, color: 'text-foreground' },
          { label: 'Live',      value: liveCount,           color: 'text-[#22c55e]' },
          { label: 'Recording', value: recCount,            color: 'text-[#ef4444]' },
          { label: 'Offline',   value: offCount,            color: 'text-muted-foreground' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-secondary/30 rounded-xl border border-border p-2.5 text-center">
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-[9px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Grid size */}
        <div className="flex gap-1.5">
          {GRID_SIZES.map(g => (
            <button
              key={g.label}
              onClick={() => { setGridSize(g.label); setPage(0); }}
              className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-bold transition-all ${
                gridSize === g.label
                  ? 'bg-[#f97316]/15 border-[#f97316]/40 text-[#f97316]'
                  : 'bg-secondary/40 border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        {/* Status filter */}
        <div className="flex gap-1.5">
          {(['all', 'live', 'offline'] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(0); }}
              className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-bold capitalize transition-all ${
                filter === f
                  ? 'bg-secondary border-border text-foreground'
                  : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">
          {filtered.length} cameras • page {page + 1}/{totalPages}
        </span>
      </div>

      {/* Camera grid */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {pageCams.map(cam => {
          const isActive = normalizeCamId(cam.id) === normalizeCamId(activeCameraId);
          const isSelected = selectedCam?.id === cam.id;
          return (
            <button
              key={cam.id}
              onClick={() => setSelectedCam(isSelected ? null : cam)}
              className={`relative aspect-video rounded-xl border overflow-hidden flex flex-col items-center justify-center text-center transition-all duration-200 group ${
                isActive
                  ? 'border-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                  : isSelected
                  ? 'border-[#f97316] shadow-[0_0_8px_rgba(249,115,22,0.2)]'
                  : 'border-border hover:border-border/80'
              } ${cam.status === 'offline' ? 'bg-secondary/20 opacity-60' : 'bg-black'}`}
            >
              {/* Live stream (only for active camera) */}
              {isActive && activeCameraId && cam.status !== 'offline' ? (
                <img
                  src={`${streamBaseUrl}/api/v1/cameras/${activeCameraId}/stream`}
                  alt={cam.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : cam.status !== 'offline' ? (
                // Simulated video noise for non-active cameras
                <div className="w-full h-full relative overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      background: `radial-gradient(ellipse at ${30 + (parseInt(cam.id.slice(-3)) * 13) % 60}% ${20 + (parseInt(cam.id.slice(-3)) * 7) % 60}%, rgba(34,197,94,0.4) 0%, transparent 70%)`,
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                    <span className="text-[10px] text-[#22c55e]/60 font-mono">{cam.name}</span>
                    <span className="text-[8px] text-white/30">{cam.fps}fps</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-sm opacity-30">📷</span>
                  <span className="text-[8px] text-muted-foreground">OFFLINE</span>
                </div>
              )}

              {/* Overlay info */}
              <div className="absolute top-1 left-1 flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[cam.status]}`} />
                <span className="text-[7px] text-white/70 font-bold">{STATUS_LABELS[cam.status]}</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[8px] text-white font-mono truncate">{cam.name} — {cam.location}</p>
              </div>
              {isActive && (
                <div className="absolute top-1 right-1 text-[7px] bg-[#22c55e] text-white px-1 rounded font-bold">ACTIVE</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary/40 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
          >
            ← Prev
          </button>
          {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`text-[10px] w-7 h-7 rounded-lg border font-bold transition-all ${
                page === i ? 'bg-[#f97316] border-[#f97316] text-white' : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary/40 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
          >
            Next →
          </button>
        </div>
      )}

      {/* Selected camera detail */}
      {selectedCam && (
        <div className="rounded-xl border border-[#f97316]/30 bg-[#f97316]/5 px-4 py-3 flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${STATUS_COLORS[selectedCam.status]}`} />
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">{selectedCam.name}</p>
            <p className="text-[10px] text-muted-foreground">{selectedCam.location} • {selectedCam.fps} FPS • {selectedCam.status.toUpperCase()}</p>
          </div>
          <button
            onClick={() => setSelectedCam(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default MultiCameraGrid;
