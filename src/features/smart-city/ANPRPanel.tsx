/**
 * ANPRPanel.tsx — Phase 6
 * Automatic Number Plate Recognition: live log of detected vehicles.
 */
import React, { useState, useEffect, useRef } from 'react';
import { DetectionEvent } from '@/data/trafficDetectionDataset';

interface ANPRPanelProps {
  detections: DetectionEvent[];
  anomalies: { id: string; type: string; laneId: string; description: string }[];
}

interface ANPRRecord {
  plate: string;
  vehicleType: string;
  camera: string;
  time: string;
  location: string;
  flagged: boolean;
  confidence: number;
}

// Deterministic plate generator from a detection's trackId
const STATE_CODES = ['MH', 'KA', 'TN', 'DL', 'GJ', 'UP', 'AP', 'RJ'];
const generatePlate = (trackId: number): string => {
  const state = STATE_CODES[trackId % STATE_CODES.length];
  const district = String(10 + (trackId % 30)).padStart(2, '0');
  const letter1 = String.fromCharCode(65 + (trackId % 26));
  const letter2 = String.fromCharCode(65 + ((trackId * 3) % 26));
  const number = String(1000 + (trackId * 7) % 9000).padStart(4, '0');
  return `${state}-${district}-${letter1}${letter2}-${number}`;
};

const formatTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

const ANPRPanel: React.FC<ANPRPanelProps> = ({ detections, anomalies }) => {
  const [records, setRecords] = useState<ANPRRecord[]>([]);
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(true);
  const scanLineRef = useRef<number>(0);

  const flaggedLanes = new Set(anomalies.filter(a => a.type !== 'low_confidence_alert').map(a => a.laneId));

  // Build ANPR records from live detections
  useEffect(() => {
    const newRecords: ANPRRecord[] = detections.slice(-60).map(d => ({
      plate: generatePlate(d.trackId),
      vehicleType: d.vehicleType,
      camera: `CAM-${String((d.trackId % 8) + 1).padStart(2, '0')}`,
      time: formatTime(d.timestamp),
      location: d.laneId.replace('lane-', 'Lane '),
      flagged: flaggedLanes.has(d.laneId) && (d.trackId % 5 === 0),
      confidence: Math.round(d.confidence * 100),
    }));
    setRecords(newRecords.reverse());
  }, [detections, anomalies]);

  // Scanning animation
  useEffect(() => {
    const t = setInterval(() => {
      scanLineRef.current = (scanLineRef.current + 1) % 100;
      setScanning(s => !s || true);
    }, 80);
    return () => clearInterval(t);
  }, []);

  const filtered = records.filter(r =>
    !search || r.plate.toLowerCase().includes(search.toLowerCase()) || r.location.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const header = 'Plate,Vehicle,Camera,Time,Location,Confidence,Flagged';
    const rows = records.map(r =>
      `${r.plate},${r.vehicleType},${r.camera},${r.time},${r.location},${r.confidence}%,${r.flagged}`
    ).join('\n');
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'anpr_log.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* ANPR Scanner Visual */}
      <div className="relative rounded-xl border border-border bg-black h-20 overflow-hidden flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="text-[#22c55e] font-mono text-sm font-bold tracking-[0.3em]">
            {records[0]?.plate || 'MH-12-AB-3421'}
          </div>
          <div className={`w-2 h-2 rounded-full ${records.length > 0 ? 'bg-[#22c55e] animate-ping' : 'bg-muted-foreground'}`} />
        </div>
        {/* Scan line */}
        <div
          className="absolute left-0 right-0 h-0.5 bg-[#22c55e]/60 shadow-[0_0_8px_#22c55e]"
          style={{ top: `${(Date.now() / 50) % 100}%`, transition: 'top 80ms linear' }}
        />
        <div className="absolute top-1 left-2 text-[9px] text-[#22c55e]/60 font-mono">ANPR ACTIVE</div>
        <div className="absolute top-1 right-2 text-[9px] text-[#22c55e]/60 font-mono">
          {records.length} plates logged
        </div>
        {/* Corner brackets */}
        {[['top-2 left-2 border-t border-l',''],['top-2 right-2 border-t border-r',''],
          ['bottom-2 left-2 border-b border-l',''],['bottom-2 right-2 border-b border-r','']].map(([cls], i) => (
          <div key={i} className={`absolute w-4 h-4 border-[#22c55e]/50 ${cls}`} />
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search plate or location..."
          className="flex-1 bg-secondary/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-[#f97316]/50"
        />
        <button
          onClick={exportCSV}
          className="px-3 py-2 text-xs rounded-lg border border-border bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all font-medium"
        >
          ⬇ CSV
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total Scanned', value: records.length },
          { label: 'Flagged',       value: records.filter(r => r.flagged).length, color: '#ef4444' },
          { label: 'Unique Plates', value: new Set(records.map(r => r.plate)).size },
          { label: 'Cameras',       value: new Set(records.map(r => r.camera)).size },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-secondary/30 rounded-xl border border-border p-2.5 text-center">
            <p className="text-base font-black" style={{ color: color || 'hsl(var(--foreground))' }}>{value}</p>
            <p className="text-[9px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] text-[9px] uppercase font-semibold text-muted-foreground bg-secondary/40 px-3 py-2 gap-3 border-b border-border">
          <span>Plate</span><span>Vehicle</span><span>Camera</span><span>Time</span><span>Conf</span>
        </div>
        <div className="max-h-[260px] overflow-y-auto divide-y divide-border/50">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No plates matched</div>
          ) : filtered.slice(0, 40).map((r, i) => (
            <div
              key={i}
              className={`grid grid-cols-[1fr_auto_auto_auto_auto] items-center px-3 py-2 gap-3 text-[11px] hover:bg-secondary/30 transition-colors ${
                r.flagged ? 'bg-[#ef4444]/5 border-l-2 border-[#ef4444]' : ''
              }`}
            >
              <span className={`font-mono font-bold ${r.flagged ? 'text-[#ef4444]' : 'text-foreground'}`}>
                {r.flagged && '⚠️ '}{r.plate}
              </span>
              <span className="text-muted-foreground capitalize text-[10px]">{r.vehicleType}</span>
              <span className="text-muted-foreground font-mono text-[10px]">{r.camera}</span>
              <span className="text-muted-foreground font-mono text-[10px]">{r.time}</span>
              <span className={`text-[10px] font-bold ${r.confidence > 90 ? 'text-[#22c55e]' : r.confidence > 75 ? 'text-[#f97316]' : 'text-[#ef4444]'}`}>
                {r.confidence}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ANPRPanel;
