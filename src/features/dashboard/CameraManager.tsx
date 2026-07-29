import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';

export interface CameraSource {
  id: string;
  name: string;
  type: string; // 'webcam' | 'rtsp' | 'ip' | 'cctv' | 'file'
  source: string;
  is_active: boolean;
}

interface CameraManagerProps {
  activeCameraId: string | null;
  onActiveCameraChange: (camId: string) => void;
}

const CameraManager: React.FC<CameraManagerProps> = ({ activeCameraId, onActiveCameraChange }) => {
  const [cameras, setCameras] = useState<CameraSource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Add Camera Form State
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<string>('webcam');
  const [source, setSource] = useState<string>('0');
  const [uploading, setUploading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch cameras
  const fetchCameras = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/v1/cameras');
      if (!res.ok) throw new Error('Failed to fetch cameras');
      const data = await res.json();
      setCameras(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error loading cameras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
    const interval = setInterval(fetchCameras, 4000); // refresh list
    return () => clearInterval(interval);
  }, []);

  // Handle active change
  const handleSetActive = async (camId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/cameras/${camId}/active`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to set active camera');
      onActiveCameraChange(camId);
      fetchCameras();
    } catch (err: any) {
      alert(err.message || 'Error changing active camera');
    }
  };

  // Handle start/stop camera
  const handleToggleRunning = async (cam: CameraSource) => {
    const action = cam.is_active ? 'stop' : 'start';
    try {
      const res = await fetch(`http://localhost:8000/api/v1/cameras/${cam.id}/${action}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`Failed to ${action} camera`);
      fetchCameras();
    } catch (err: any) {
      alert(err.message || `Error executing ${action}`);
    }
  };

  // Handle Delete
  const handleDelete = async (camId: string) => {
    if (!confirm('Are you sure you want to delete this camera source?')) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/cameras/${camId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete camera');
      fetchCameras();
    } catch (err: any) {
      alert(err.message || 'Error deleting camera');
    }
  };

  // File upload handler
  const handleFileUpload = async (file: File): Promise<string> => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('http://localhost:8000/api/v1/cameras/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Video upload failed');
      const data = await res.json();
      return data.file_path;
    } finally {
      setUploading(false);
    }
  };

  // Handle submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalSource = source;

    try {
      if (type === 'file') {
        if (!selectedFile) {
          alert('Please select a video file to upload.');
          return;
        }
        finalSource = await handleFileUpload(selectedFile);
      }

      const res = await fetch('http://localhost:8000/api/v1/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, source: finalSource }),
      });

      if (!res.ok) throw new Error('Failed to add camera');
      
      // Reset form
      setName('');
      setType('webcam');
      setSource('0');
      setSelectedFile(null);
      setIsOpen(false);
      fetchCameras();
    } catch (err: any) {
      alert(err.message || 'Error adding camera');
    }
  };

  return (
    <div className="glass-card hover-card-trigger rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
          📹 Traffic Camera Manager
        </h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 text-[10px] font-semibold bg-[#22c55e] hover:bg-[#1ea34d] text-white">
              + Add Camera
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card text-foreground border border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">Add New Camera Source</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Camera Name</label>
                <Input
                  required
                  placeholder="e.g. North Avenue HD"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Source Type</label>
                <Select value={type} onValueChange={val => {
                  setType(val);
                  if (val === 'webcam') setSource('0');
                  else if (val === 'rtsp') setSource('rtsp://');
                  else setSource('');
                }}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="webcam" className="text-xs">Webcam / USB Camera</SelectItem>
                    <SelectItem value="file" className="text-xs">Video File Upload</SelectItem>
                    <SelectItem value="rtsp" className="text-xs">RTSP Stream</SelectItem>
                    <SelectItem value="ip" className="text-xs">IP Camera URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {type === 'file' ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Select Video File</label>
                  <Input
                    required
                    type="file"
                    accept="video/*"
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="h-9 text-xs file:bg-secondary file:text-foreground file:border-0 file:rounded-md file:text-[10px] file:px-2 cursor-pointer"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Connection Source</label>
                  <Input
                    required
                    placeholder={type === 'webcam' ? 'Webcam index (0, 1)' : 'e.g. rtsp://192.168.1.50/live'}
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}

              <DialogFooter className="mt-2 flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={uploading} className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                  {uploading ? 'Uploading Video...' : 'Add Camera'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <div className="text-xs text-[#ef4444] bg-[#ef4444]/10 p-2 rounded-md">{error}</div>}

      <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
        {cameras.map(cam => {
          const isActiveFeed = activeCameraId === cam.id;
          return (
            <div 
              key={cam.id} 
              className={`flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200 ${
                isActiveFeed 
                  ? 'border-[#22c55e]/40 bg-[#22c55e]/5 shadow-[0_0_8px_rgba(34,197,94,0.05)]' 
                  : 'border-border bg-background/50 hover:border-border/80'
              }`}
            >
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  {isActiveFeed && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] live-glow-green inline-block" />
                  )}
                  <span className="font-semibold text-xs text-foreground truncate">{cam.name}</span>
                  <Badge variant={cam.is_active ? 'default' : 'secondary'} className="text-[8px] h-4 px-1 font-mono uppercase font-bold">
                    {cam.type}
                  </Badge>
                </div>
                <span className="text-[9px] text-muted-foreground font-mono truncate">{cam.source}</span>
              </div>

              <div className="flex items-center gap-1.5 ml-2">
                {/* Active Indicator Button */}
                <Button 
                  size="sm" 
                  variant={isActiveFeed ? 'default' : 'outline'}
                  onClick={() => handleSetActive(cam.id)}
                  className={`h-6 text-[9px] px-2 font-bold ${
                    isActiveFeed 
                      ? 'bg-[#22c55e] text-white hover:bg-[#22c55e]' 
                      : 'hover:bg-[#22c55e]/10 hover:text-[#22c55e] hover:border-[#22c55e]/30'
                  }`}
                >
                  {isActiveFeed ? '✓ Active Feed' : 'Set Active'}
                </Button>

                {/* Start / Stop Toggle */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleRunning(cam)}
                  className="h-6 w-12 text-[9px] px-1 font-medium hover:bg-accent/10"
                >
                  {cam.is_active ? '⏸ Pause' : '▶ Run'}
                </Button>

                {/* Delete button (only for added cameras) */}
                {parseInt(cam.id.split('-')[1]) > 4 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(cam.id)}
                    className="h-6 w-6 p-0 text-[#ef4444] hover:bg-[#ef4444]/15"
                  >
                    🗑
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {cameras.length === 0 && !loading && (
          <div className="text-xs text-muted-foreground text-center py-4">No camera sources configured.</div>
        )}
      </div>
    </div>
  );
};

export default CameraManager;
