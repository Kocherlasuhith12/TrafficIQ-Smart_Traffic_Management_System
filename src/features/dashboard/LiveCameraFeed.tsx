import React, { useState, useEffect, useRef, MouseEvent } from 'react';
import { API_BASE_URL } from '@/config';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DetectionEvent, AnomalyRecord, VehicleType } from '@/data/trafficDetectionDataset';

interface LiveCameraFeedProps {
  activeCameraId: string | null;
  detections: DetectionEvent[];
  anomalies: AnomalyRecord[];
  cameraStats?: {
    fps: number;
    latencyMs: number;
    cpuUsage: number;
    gpuUsage: number;
  };
  userRole?: string;
}

interface TrackedObject {
  id: number;
  type: VehicleType;
  history: { x: number; y: number }[];
  lastSeen: number;
  color: string;
}

interface RecordedClip {
  id: string;
  name: string;
  timestamp: string;
  durationSec: number;
  fileSizeMb: number;
}

const CLASS_COLORS: Record<VehicleType, string> = {
  car: '#3b82f6',
  truck: '#f97316',
  bus: '#8b5cf6',
  motorcycle: '#a855f7',
  bicycle: '#ec4899',
  emergency: '#ef4444',
  bike: '#a855f7',
  pedestrian: '#10b981',
  ambulance: '#ef4444',
  'fire truck': '#dc2626',
  'police vehicle': '#2563eb',
  animal: '#d97706',
  'traffic cone': '#f59e0b',
  'traffic light': '#10b981',
  'road block': '#b91c1c',
};

const LiveCameraFeed: React.FC<LiveCameraFeedProps> = ({
  activeCameraId,
  detections,
  anomalies,
  cameraStats,
  userRole,
}) => {
  // Feed status states
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isStopped, setIsStopped] = useState<boolean>(false);

  // Zoom & Pan states
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Filter adjustments
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);

  // Health and Telemetry states
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [ping, setPing] = useState<number>(45);
  const [jitter, setJitter] = useState<number>(1.5);
  const [packetLoss, setPacketLoss] = useState<number>(0.0);

  // Local Recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [clips, setClips] = useState<RecordedClip[]>([]);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Entry/Exit counts (simulated per camera)
  const [entryCount, setEntryCount] = useState<number>(142);
  const [exitCount, setExitCount] = useState<number>(138);

  // Ref container for fullscreen & canvas mapping
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Historical paths for tracking visualization
  const trackerRef = useRef<Record<number, TrackedObject>>({});

  // 1. Telemetry jitter simulation
  useEffect(() => {
    if (isStopped || isPaused || isReconnecting) return;
    const interval = setInterval(() => {
      setPing(prev => Math.max(10, Math.min(150, prev + Math.floor(Math.random() * 10 - 5))));
      setJitter(prev => Math.max(0.5, Math.min(8, Number((prev + (Math.random() * 0.4 - 0.2)).toFixed(2)))));
      setPacketLoss(prev => Math.random() < 0.05 ? Number((Math.random() * 0.4).toFixed(2)) : 0.0);
    }, 1500);
    return () => clearInterval(interval);
  }, [isStopped, isPaused, isReconnecting]);

  // 2. Reconnection sequence
  const handleReconnect = () => {
    setIsReconnecting(true);
    setPing(120);
    setJitter(5.5);
    setPacketLoss(2.5);
    setTimeout(() => {
      setIsReconnecting(false);
      setPing(35);
      setJitter(1.1);
      setPacketLoss(0.0);
      setIsStopped(false);
      setIsPaused(false);
      setIsPlaying(true);
    }, 2000);
  };

  // 3. Local Recording sequence
  useEffect(() => {
    if (isRecording) {
      recordIntervalRef.current = setInterval(() => {
        setRecordSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }
      setRecordSeconds(0);
    }
    return () => {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    };
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      // Save Clip
      const duration = recordSeconds;
      const newClip: RecordedClip = {
        id: `clip-${Date.now()}`,
        name: `CAM_${activeCameraId || 'MAIN'}_REC_${new Date().toISOString().split('T')[0]}_${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toLocaleTimeString(),
        durationSec: duration,
        fileSizeMb: Number((duration * 0.45 + Math.random() * 0.2).toFixed(2)),
      };
      setClips(prev => [newClip, ...prev]);
      setIsRecording(false);
      
      // Auto download alert
      alert(`Recording complete! Clip saved: ${newClip.name}.mp4 (${newClip.durationSec}s)`);
    } else {
      if (isStopped) {
        alert('Cannot record while stream is stopped.');
        return;
      }
      setIsRecording(true);
    }
  };

  const handleDownloadClip = (clip: RecordedClip) => {
    const textData = `TrafficIQ Video Clip Log\nCamera: ${activeCameraId}\nClip Name: ${clip.name}\nTimestamp: ${clip.timestamp}\nDuration: ${clip.durationSec} seconds\nFile Size: ${clip.fileSizeMb} MB\nDetections monitored: ${detections.length}`;
    const blob = new Blob([textData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${clip.name}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 4. Bounding Box & Trajectory Trail Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isStopped || isReconnecting) {
      return; // Draw nothing on top
    }

    // Adapt sizing
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    const scaleX = canvas.width / 800; // mock generated with range 0-800
    const scaleY = canvas.height / 600; // mock generated with range 0-600

    // Virtual Gate lines coordinate
    const entryY = canvas.height * 0.65;
    const exitY = canvas.height * 0.35;

    // Draw Virtual Entry Gate
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(10, entryY);
    ctx.lineTo(canvas.width - 10, entryY);
    ctx.stroke();
    ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('ENTRY COUNT LINE', 15, entryY - 6);

    // Draw Virtual Exit Gate
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.beginPath();
    ctx.moveTo(10, exitY);
    ctx.lineTo(canvas.width - 10, exitY);
    ctx.stroke();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.fillText('EXIT COUNT LINE', 15, exitY - 6);
    ctx.setLineDash([]); // Reset line dash

    // Process tracking matching
    if (!isPaused) {
      const now = Date.now();
      const activeIds = new Set<number>();

      detections.forEach(det => {
        const id = det.trackId || Math.floor(Math.random() * 1000) + 2000;
        activeIds.add(id);

        const cx = (det.boundingBox.x + det.boundingBox.w / 2) * scaleX;
        const cy = (det.boundingBox.y + det.boundingBox.h / 2) * scaleY;

        if (trackerRef.current[id]) {
          const track = trackerRef.current[id];
          const prevPos = track.history[track.history.length - 1];

          // Check line crossing
          if (prevPos) {
            // Check Entry line crossing
            if (prevPos.y < entryY && cy >= entryY) {
              setEntryCount(c => c + 1);
            }
            // Check Exit line crossing
            if (prevPos.y > exitY && cy <= exitY) {
              setExitCount(c => c + 1);
            }
          }

          track.history.push({ x: cx, y: cy });
          if (track.history.length > 15) track.history.shift(); // truncate trail
          track.lastSeen = now;
        } else {
          // New Tracker Object
          trackerRef.current[id] = {
            id,
            type: det.vehicleType,
            history: [{ x: cx, y: cy }],
            lastSeen: now,
            color: CLASS_COLORS[det.vehicleType] || '#ffffff',
          };
        }
      });

      // Clear stale trackers (after 5 seconds)
      Object.keys(trackerRef.current).forEach(key => {
        const trackId = Number(key);
        if (now - trackerRef.current[trackId].lastSeen > 5000) {
          delete trackerRef.current[trackId];
        }
      });
    }

    // Render Trajectory trails & boxes
    Object.values(trackerRef.current).forEach(track => {
      // 1. Draw track line trail
      if (track.history.length > 1) {
        ctx.strokeStyle = track.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(track.history[0].x, track.history[0].y);
        for (let j = 1; j < track.history.length; j++) {
          ctx.lineTo(track.history[j].x, track.history[j].y);
        }
        ctx.stroke();

        // Trail dots
        track.history.forEach((pt, idx) => {
          ctx.fillStyle = track.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    });

    // Draw active bounding boxes
    detections.forEach(det => {
      const bx = det.boundingBox.x * scaleX;
      const by = det.boundingBox.y * scaleY;
      const bw = det.boundingBox.w * scaleX;
      const bh = det.boundingBox.h * scaleY;
      const color = CLASS_COLORS[det.vehicleType] || '#ffffff';

      // Box outline
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);

      // Corner brackets (YOLO visual flavor)
      ctx.fillStyle = color;
      const len = Math.min(bw, bh) * 0.25;
      ctx.fillRect(bx - 1, by - 1, len, 3);
      ctx.fillRect(bx - 1, by - 1, 3, len);
      ctx.fillRect(bx + bw - len + 1, by - 1, len, 3);
      ctx.fillRect(bx + bw - 2, by - 1, 3, len);
      ctx.fillRect(bx - 1, by + bh - 2, len, 3);
      ctx.fillRect(bx - 1, by + bh - len + 1, 3, len);
      ctx.fillRect(bx + bw - len + 1, by + bh - 2, len, 3);
      ctx.fillRect(bx + bw - 2, by + bh - len + 1, 3, len);

      // Bounding box Label tag
      const label = `ID #${det.trackId || 'NEW'} | ${det.vehicleType.toUpperCase()} ${Math.round(det.confidence * 100)}%`;
      ctx.font = '9px system-ui, -apple-system, sans-serif';
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = color;
      ctx.fillRect(bx - 1, by - 12, textWidth + 8, 12);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, bx + 3, by - 3);
    });

  }, [detections, isStopped, isPaused, isReconnecting]);

  // 5. Snapshot Capture Action
  const handleSnapshot = () => {
    if (isStopped) {
      alert('Cannot capture snapshot. Stream is stopped.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background (CCTV static or image fallback)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (imgRef.current && imgRef.current.style.display !== 'none') {
      try {
        ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
      } catch (e) {
        // draw simulated grid if cross-origin fails
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } else {
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Apply brightness/contrast filter simulation on canvas
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    // Redraw detections in high resolution
    detections.forEach(det => {
      const scaleX = canvas.width / 800;
      const scaleY = canvas.height / 600;
      const bx = det.boundingBox.x * scaleX;
      const by = det.boundingBox.y * scaleY;
      const bw = det.boundingBox.w * scaleX;
      const bh = det.boundingBox.h * scaleY;
      const color = CLASS_COLORS[det.vehicleType] || '#ffffff';

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, bw, bh);

      ctx.fillStyle = color;
      ctx.fillRect(bx - 1, by - 16, 180, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`ID #${det.trackId} | ${det.vehicleType.toUpperCase()} ${Math.round(det.confidence * 100)}%`, bx + 5, by - 4);
    });

    // Render snapshot HUD info
    ctx.filter = 'none'; // reset filter
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    ctx.fillStyle = '#10b981';
    ctx.font = '12px monospace';
    ctx.fillText(`TrafficIQ AI Snapshot • CAMERA: ${activeCameraId || 'DEFAULT'} • timestamp: ${new Date().toLocaleString()}`, 20, canvas.height - 15);
    ctx.fillText(`IN: ${entryCount} | OUT: ${exitCount} | Zoom: ${zoom}x`, canvas.width - 250, canvas.height - 15);

    // Download file
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `TrafficIQ_Snapshot_${activeCameraId || 'MAIN'}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 6. Fullscreen handler
  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen().catch(err => {
          alert(`Error entering fullscreen: ${err.message}`);
        });
      }
    }
  };

  // 7. Drag-Pan logic
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1.0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging || zoom <= 1.0) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    // Bound constraints
    const maxBound = (zoom - 1) * 200;
    setPan({
      x: Math.max(-maxBound, Math.min(maxBound, dx)),
      y: Math.max(-maxBound, Math.min(maxBound, dy)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Health Rating calculation
  const getHealthRating = () => {
    if (isStopped) return { label: 'OFFLINE', color: 'text-muted-foreground bg-secondary' };
    if (isPaused) return { label: 'PAUSED', color: 'text-yellow-500 bg-yellow-500/10' };
    if (packetLoss > 1.5) return { label: 'DEGRADED', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' };
    return { label: 'EXCELLENT', color: 'text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20' };
  };

  const health = getHealthRating();

  return (
    <div className="flex flex-col gap-4">
      {/* Visual Frame Wrapper */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative aspect-video rounded-xl overflow-hidden border border-border bg-[#090d16] flex items-center justify-center select-none ${
          zoom > 1.0 ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        {/* Stream image */}
        {activeCameraId && !isStopped && (
          <img
            ref={imgRef}
            src={`${API_BASE_URL}/api/v1/cameras/${activeCameraId}/stream`}
            alt="Live YOLO Detection"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              filter: `brightness(${brightness}%) contrast(${contrast}%)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
            className="w-full h-full object-contain pointer-events-none"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}

        {/* Overlay Bounding Box Layer */}
        {activeCameraId && !isStopped && (
          <canvas
            ref={canvasRef}
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
          />
        )}

        {/* HUD Overlay Stats: Top Right */}
        {activeCameraId && !isStopped && !isReconnecting && (
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-20 pointer-events-none">
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono ${health.color}`}>
              HEALTH: {health.label}
            </span>
            <div className="text-[9px] text-white/70 font-mono bg-black/60 px-1.5 py-0.5 rounded flex gap-2">
              <span>RTT: {ping}ms</span>
              <span>Jitter: {jitter}ms</span>
              <span>Loss: {packetLoss}%</span>
            </div>
            <div className="text-[9px] text-[#22c55e] font-mono bg-black/60 px-1.5 py-0.5 rounded">
              FPS: {cameraStats?.fps || 30} • Latency: {cameraStats?.latencyMs || 40}ms
            </div>
          </div>
        )}

        {/* HUD Overlay Count Tracker: Top Left */}
        {activeCameraId && !isStopped && !isReconnecting && (
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-20 pointer-events-none">
            <div className="text-[10px] text-white font-bold bg-black/75 border border-white/10 px-2 py-1 rounded-md flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              <span>ENTRY: <span className="font-mono text-[#22c55e]">{entryCount}</span></span>
              <span className="text-white/30">|</span>
              <span>EXIT: <span className="font-mono text-destructive">{exitCount}</span></span>
            </div>
          </div>
        )}

        {/* Bottom Status bar - Blinking Rec indicator */}
        {isRecording && (
          <div className="absolute bottom-16 left-3 bg-red-600/90 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 z-20">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
            <span>● REC {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:{String(recordSeconds % 60).padStart(2, '0')}</span>
          </div>
        )}

        {/* Screen State overlays */}
        {(!activeCameraId || isStopped) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#0B1120] text-center gap-3 z-30">
            <div className="text-4xl animate-pulse">📼</div>
            <p className="text-xs font-semibold text-foreground">
              {isStopped ? 'CCTV FEED SHUTDOWN (STOPPED)' : 'CCTV STREAM STANDBY'}
            </p>
            <p className="text-[10px] text-muted-foreground max-w-xs">
              {isStopped 
                ? 'The video acquisition channel has been stopped. Click "Play" or "Reconnect" below to restore transmission.' 
                : 'Please select a camera source from the manager to activate real-time YOLOv11 tracking.'}
            </p>
          </div>
        )}

        {isPaused && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center z-30 pointer-events-none">
            <span className="text-3xl text-yellow-500 font-bold tracking-wider drop-shadow-md">⏸ PAUSED</span>
            <span className="text-[9px] text-white/50 uppercase mt-1 font-mono">Frame Buffer Frozen</span>
          </div>
        )}

        {isReconnecting && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-2.5 z-30">
            <div className="w-6 h-6 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-[#f97316] tracking-wide animate-pulse">RECONNECTING CHANNEL...</span>
            <span className="text-[9px] text-white/40 font-mono">Resetting model bindings...</span>
          </div>
        )}
      </div>

      {/* Camera Interactive Controls and Sliders */}
      {activeCameraId && (
        <Card className="p-3 bg-card/60 border border-border flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            {/* Play controls */}
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={userRole === 'guest'}
                className={`h-7 px-2.5 text-[10px] gap-1 font-bold ${
                  isPlaying && !isPaused && !isStopped ? 'bg-primary/10 border-primary/30 text-primary' : ''
                }`}
                onClick={() => {
                  setIsStopped(false);
                  setIsPaused(false);
                  setIsPlaying(true);
                }}
              >
                ▶ Play
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={userRole === 'guest'}
                className={`h-7 px-2.5 text-[10px] gap-1 font-bold ${
                  isPaused ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : ''
                }`}
                onClick={() => {
                  setIsPaused(true);
                  setIsPlaying(false);
                }}
              >
                ⏸ Pause
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={userRole === 'guest'}
                className={`h-7 px-2.5 text-[10px] gap-1 font-bold ${
                  isStopped ? 'bg-red-500/10 border-red-500/30 text-red-500' : ''
                }`}
                onClick={() => {
                  setIsStopped(true);
                  setIsPaused(false);
                  setIsPlaying(false);
                  if (isRecording) toggleRecording();
                }}
              >
                🛑 Stop
              </Button>
            </div>

            {/* Snapshot & Record */}
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={userRole === 'guest'}
                onClick={handleReconnect}
                className="h-7 px-2.5 text-[10px] bg-secondary/50"
              >
                🔄 Reconnect
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={userRole === 'guest'}
                onClick={handleSnapshot}
                className="h-7 px-2.5 text-[10px] gap-1 font-medium hover:bg-primary/10"
              >
                📸 Snapshot
              </Button>
              <Button
                size="sm"
                disabled={userRole === 'guest'}
                onClick={toggleRecording}
                className={`h-7 px-2.5 text-[10px] gap-1 font-bold text-white transition-all ${
                  isRecording 
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                    : 'bg-primary hover:bg-primary/95 shadow-md shadow-primary/10'
                }`}
              >
                📹 {isRecording ? 'Stop Rec' : 'Local Record'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleFullscreen}
                className="h-7 w-7 p-0 text-xs hover:bg-accent/10"
                title="Toggle Fullscreen"
              >
                ⛶
              </Button>
            </div>
          </div>

          {/* Adjustments: Zoom, Brightness, Contrast */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1.5 border-t border-border/50 text-[10px] text-muted-foreground uppercase font-semibold">
            {/* Zoom slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span>Zoom Scale</span>
                <span className="font-mono text-primary text-xs">{zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="4.0"
                step="0.1"
                value={zoom}
                disabled={userRole === 'guest'}
                onChange={e => {
                  const z = parseFloat(e.target.value);
                  setZoom(z);
                  if (z <= 1.0) setPan({ x: 0, y: 0 });
                }}
                className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
              />
            </div>

            {/* Brightness */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span>Brightness</span>
                <span className="font-mono text-xs">{brightness}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="180"
                step="5"
                value={brightness}
                disabled={userRole === 'guest'}
                onChange={e => setBrightness(parseInt(e.target.value))}
                className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
              />
            </div>

            {/* Contrast */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span>Contrast</span>
                <span className="font-mono text-xs">{contrast}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="180"
                step="5"
                value={contrast}
                disabled={userRole === 'guest'}
                onChange={e => setContrast(parseInt(e.target.value))}
                className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Recording clips history log */}
      {clips.length > 0 && (
        <Card className="p-3 bg-card/60 border border-border flex flex-col gap-2">
          <h4 className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            📁 Local Recorded Clips Database ({clips.length})
          </h4>
          <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
            {clips.map(clip => (
              <div key={clip.id} className="flex items-center justify-between text-[11px] p-2 rounded bg-background/50 border border-border/40">
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-foreground font-semibold truncate max-w-xs">{clip.name}.mp4</span>
                  <span className="text-[9px] text-muted-foreground">
                    Saved at {clip.timestamp} • Duration: {clip.durationSec}s • Size: {clip.fileSizeMb} MB
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownloadClip(clip)}
                  className="h-6 text-[9px] px-2 text-primary hover:bg-primary/10"
                >
                  Download File
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default LiveCameraFeed;
