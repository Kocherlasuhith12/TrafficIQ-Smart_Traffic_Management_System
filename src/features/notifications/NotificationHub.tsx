import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AnomalyRecord } from '@/data/trafficDetectionDataset';

export interface NotificationSettings {
  voice: boolean;
  toast: boolean;
  email: boolean;
  sms: boolean;
  telegram: boolean;
  whatsapp: boolean;
  emailTarget: string;
  smsTarget: string;
  telegramTarget: string;
  whatsappTarget: string;
}

interface NotificationHubProps {
  isOpen: boolean;
  onClose: () => void;
  anomalies: AnomalyRecord[];
  onTriggerToast: (msg: string, severity: string) => void;
}

interface DispatchLog {
  id: string;
  timestamp: string;
  channel: 'email' | 'sms' | 'telegram' | 'whatsapp' | 'toast' | 'voice';
  target: string;
  message: string;
  status: 'SENT' | 'DELIVERED';
}

const NotificationHub: React.FC<NotificationHubProps> = ({
  isOpen,
  onClose,
  anomalies,
  onTriggerToast,
}) => {
  // Settings state
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem('traffic_notification_settings');
    return saved ? JSON.parse(saved) : {
      voice: true,
      toast: true,
      email: true,
      sms: true,
      telegram: false,
      whatsapp: false,
      emailTarget: 'ops-center@smartcity.gov',
      smsTarget: '+1 (555) 234-5678',
      telegramTarget: '@TrafficIQ_Alert_Bot',
      whatsappTarget: '+1 (555) 987-6543',
    };
  });

  const [logs, setLogs] = useState<DispatchLog[]>([]);
  const processedIds = useRef<Set<string>>(new Set());

  // Save settings on modification
  useEffect(() => {
    localStorage.setItem('traffic_notification_settings', JSON.stringify(settings));
  }, [settings]);

  // Process incoming anomalies and dispatch alerts
  useEffect(() => {
    if (anomalies.length === 0) return;

    // Check last 3 anomalies to detect new ones
    const newAnomalies = anomalies.slice(-3).filter(a => !a.resolved && !processedIds.current.has(a.id));

    if (newAnomalies.length > 0) {
      const newLogs: DispatchLog[] = [];

      newAnomalies.forEach(anomaly => {
        processedIds.current.add(anomaly.id);
        const timeStr = new Date(anomaly.timestamp).toLocaleTimeString();
        const alertMsg = `[ALERT] ${anomaly.type.replace(/_/g, ' ').toUpperCase()}: ${anomaly.description} at ${anomaly.laneId}`;

        // 1. Toast dispatch
        if (settings.toast) {
          onTriggerToast(`${anomaly.type.replace(/_/g, ' ').toUpperCase()}: ${anomaly.description}`, anomaly.severity);
          newLogs.push({
            id: `log-${Date.now()}-toast-${anomaly.id}`,
            timestamp: timeStr,
            channel: 'toast',
            target: 'Web Interface Dashboard',
            message: anomaly.description,
            status: 'SENT',
          });
        }

        // 2. Email dispatch
        if (settings.email) {
          newLogs.push({
            id: `log-${Date.now()}-email-${anomaly.id}`,
            timestamp: timeStr,
            channel: 'email',
            target: settings.emailTarget,
            message: `SMTP Send: Critical Event Alert - ${alertMsg}`,
            status: 'SENT',
          });
        }

        // 3. SMS dispatch
        if (settings.sms) {
          newLogs.push({
            id: `log-${Date.now()}-sms-${anomaly.id}`,
            timestamp: timeStr,
            channel: 'sms',
            target: settings.smsTarget,
            message: `SMS Gateway: ${alertMsg}`,
            status: 'DELIVERED',
          });
        }

        // 4. Telegram dispatch
        if (settings.telegram) {
          newLogs.push({
            id: `log-${Date.now()}-telegram-${anomaly.id}`,
            timestamp: timeStr,
            channel: 'telegram',
            target: settings.telegramTarget,
            message: `Bot API Push: ${alertMsg}`,
            status: 'SENT',
          });
        }

        // 5. WhatsApp dispatch
        if (settings.whatsapp) {
          newLogs.push({
            id: `log-${Date.now()}-whatsapp-${anomaly.id}`,
            timestamp: timeStr,
            channel: 'whatsapp',
            target: settings.whatsappTarget,
            message: `WhatsApp API Message: ${alertMsg}`,
            status: 'DELIVERED',
          });
        }
      });

      if (newLogs.length > 0) {
        setLogs(prev => [...newLogs, ...prev].slice(0, 50)); // limit log ledger size
      }
    }
  }, [anomalies, settings, onTriggerToast]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof Omit<NotificationSettings, 'emailTarget' | 'smsTarget' | 'telegramTarget' | 'whatsappTarget'>) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleInputChange = (key: 'emailTarget' | 'smsTarget' | 'telegramTarget' | 'whatsappTarget', val: string) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return '📧';
      case 'sms': return '💬';
      case 'telegram': return '🤖';
      case 'whatsapp': return '🟢';
      case 'toast': return '💻';
      default: return '🔊';
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-sm bg-[#0a0f1b]/95 border-l border-border backdrop-blur-md shadow-2xl flex flex-col justify-between animate-slide-in">
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/40">
        <div className="flex flex-col">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            🔔 Multi-Channel Notification Hub
          </h3>
          <span className="text-[9px] text-muted-foreground font-mono mt-0.5 uppercase">
            Phase 14 — Active Alerts Router
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-sm font-bold"
        >
          ✕
        </button>
      </div>

      {/* Content Section */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Toggle Channels */}
        <div className="space-y-3">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Alert Routing Channels</p>
          
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'toast', label: 'Toast Popups', emoji: '💻' },
              { id: 'voice', label: 'Voice alerts', emoji: '🔊' },
              { id: 'email', label: 'Email Pushes', emoji: '📧' },
              { id: 'sms',   label: 'SMS Alerts',  emoji: '💬' },
              { id: 'telegram', label: 'Telegram Bot', emoji: '🤖' },
              { id: 'whatsapp', label: 'WhatsApp API', emoji: '🟢' },
            ].map(ch => {
              const active = settings[ch.id as keyof NotificationSettings];
              return (
                <button
                  key={ch.id}
                  onClick={() => handleToggle(ch.id as any)}
                  className={`flex items-center justify-between p-2 rounded-lg border text-left text-xs font-bold transition-all ${
                    active 
                      ? 'bg-primary/10 border-primary/40 text-primary' 
                      : 'bg-secondary/20 border-border/60 text-muted-foreground'
                  }`}
                >
                  <span>{ch.emoji} {ch.label}</span>
                  <span className="text-[9px]">{active ? 'ON' : 'OFF'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Configurations Fields */}
        <div className="space-y-3 pt-4 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Gateway Configuration</p>
          
          <div className="space-y-2.5">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-mono text-muted-foreground uppercase">Operations Email</span>
              <Input
                value={settings.emailTarget}
                onChange={e => handleInputChange('emailTarget', e.target.value)}
                placeholder="ops@city.gov"
                className="h-8 text-xs font-mono bg-background/40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-mono text-muted-foreground uppercase">Duty Mobile (SMS)</span>
              <Input
                value={settings.smsTarget}
                onChange={e => handleInputChange('smsTarget', e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="h-8 text-xs font-mono bg-background/40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-mono text-muted-foreground uppercase">Telegram Channel</span>
              <Input
                value={settings.telegramTarget}
                onChange={e => handleInputChange('telegramTarget', e.target.value)}
                placeholder="@BotChannel"
                className="h-8 text-xs font-mono bg-background/40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-mono text-muted-foreground uppercase">WhatsApp Gateway API</span>
              <Input
                value={settings.whatsappTarget}
                onChange={e => handleInputChange('whatsappTarget', e.target.value)}
                placeholder="+1 (555) 987-6543"
                className="h-8 text-xs font-mono bg-background/40"
              />
            </div>
          </div>
        </div>

        {/* Live Dispatch Logs */}
        <div className="space-y-3 pt-4 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex justify-between items-center">
            <span>Dispatched Alerts Logs</span>
            <span className="text-[8px] font-mono font-normal">REAL TIME</span>
          </p>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-4">No alerts dispatched yet.</p>
            ) : logs.map(log => (
              <div 
                key={log.id} 
                className="p-2 bg-background/40 border border-border/40 rounded text-[10px] font-mono flex flex-col gap-0.5 leading-snug"
              >
                <div className="flex items-center justify-between font-bold">
                  <span>{getChannelIcon(log.channel)} {log.channel.toUpperCase()} → {log.target}</span>
                  <span className={log.status === 'SENT' ? 'text-primary' : 'text-[#22c55e]'}>{log.status}</span>
                </div>
                <p className="text-white/80">{log.message}</p>
                <span className="text-[8px] text-muted-foreground/60 align-right self-end">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer message */}
      <div className="bg-black/60 border-t border-border px-5 py-3 text-[10px] text-muted-foreground text-center">
        Gateways are fully mocked in client mode. SMS and API calls simulate handshakes to operational numbers.
      </div>
    </div>
  );
};

export default NotificationHub;
