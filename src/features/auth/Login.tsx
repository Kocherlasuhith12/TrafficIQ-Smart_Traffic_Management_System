import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type UserRole = 'admin' | 'operator' | 'guest';

export interface User {
  username: string;
  role: UserRole;
}

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

interface RegisteredUser {
  username: string;
  passwordHash: string;
  role: UserRole;
  displayName: string;
}

const DEFAULT_USERS: Record<string, RegisteredUser> = {
  admin: { username: 'admin', passwordHash: 'admin', role: 'admin', displayName: 'Admin Ops' },
  operator: { username: 'operator', passwordHash: 'operator', role: 'operator', displayName: 'Operator Standard' },
  guest: { username: 'guest', passwordHash: 'guest', role: 'guest', displayName: 'Guest Watcher' },
};

const INITIAL_LOGS = [
  '[SYS_INIT] Booting TrafficIQ Core Engine v3.8.4...',
  '[NET_LOAD] Connecting to city camera array (102 active channels)...',
  '[DB_CONN] Connected to Postgres storage cluster on port 5432.',
  '[REDIS_OK] Redis hot-state cache initialized.',
  '[YOLO_INIT] Loading YOLOv11 detection weights (GPU thread active)...',
  '[ML_LOAD] Pre-trained junction congestion matrices parsed.',
  '[SEC_SHIELD] Operational Firewall Level 5 initialized.',
  '[READY] Standing by. Awaiting Operator credentials...'
];

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('operator');
  const [loginRole, setLoginRole] = useState<UserRole>('operator');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Terminal log simulation
  const [logs, setLogs] = useState<string[]>(INITIAL_LOGS);
  // Diagnostic counters
  const [sensorRate, setSensorRate] = useState(98.4);
  const [activeFeeds, setActiveFeeds] = useState(102);

  useEffect(() => {
    const interval = setInterval(() => {
      // Rotate metrics slightly to feel live
      setSensorRate(prev => parseFloat((prev + (Math.random() * 0.4 - 0.2)).toFixed(1)));
      if (Math.random() > 0.7) {
        setActiveFeeds(prev => prev + (Math.random() > 0.5 ? 1 : -1));
      }
      
      // Append a simulated log
      const events = [
        `[FEED_PING] Camera node CAM-${Math.floor(Math.random() * 50 + 10)} frame received.`,
        `[ML_TICK] Recalculating queue lengths at Junction ${Math.floor(Math.random() * 6 + 1)}.`,
        `[ANOMALY_SCAN] Checking streams for stopped vehicles... clear.`,
        `[WEATHER_CHECK] Visibility constant: Clear (94%).`,
        `[AGENT_TICK] Decision Agent sync complete.`
      ];
      const newLog = events[Math.floor(Math.random() * events.length)];
      setLogs(prev => [...prev.slice(-10), `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${newLog}`]);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const getUsersDb = (): Record<string, RegisteredUser> => {
    const saved = localStorage.getItem('traffic_users_db');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUser = username.trim().toLowerCase();
    const normalizedPass = password.trim();

    const db = getUsersDb();
    const matched = db[normalizedUser];

    if (matched && matched.passwordHash === normalizedPass) {
      if (matched.role !== loginRole) {
        setError(`Access denied. Role mismatch: '${normalizedUser}' is registered as ${matched.role.toUpperCase()}, not ${loginRole.toUpperCase()}.`);
        setSuccessMsg(null);
      } else {
        onLoginSuccess({ username: matched.displayName, role: matched.role });
      }
    } else {
      setError('Invalid operator credentials.');
      setSuccessMsg(null);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUser = username.trim().toLowerCase();
    const db = getUsersDb();

    if (db[normalizedUser]) {
      setError('Operator ID already registered in database.');
      return;
    }

    const newUser: RegisteredUser = {
      username: normalizedUser,
      passwordHash: password.trim(),
      role: regRole,
      displayName: displayName.trim() || username.trim(),
    };

    const updatedDb = { ...db, [normalizedUser]: newUser };
    localStorage.setItem('traffic_users_db', JSON.stringify(updatedDb));

    setSuccessMsg('Profile registered! Access granted. Enter credentials to login.');
    setError(null);
    setIsRegistering(false);
    
    // Clear inputs
    setUsername('');
    setPassword('');
    setDisplayName('');
  };

  return (
    <div className="min-h-screen w-full flex bg-[#09090B] text-[#F8FAFC] font-sans antialiased overflow-x-hidden relative">
      {/* Laser Scanning Grid Line Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(39,39,42,0.1)_1px,transparent_1px),linear-gradient(to_right,rgba(39,39,42,0.1)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#f97316]/30 to-transparent animate-pulse pointer-events-none" style={{ animationDuration: '4s' }} />

      {/* Grid container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 w-full min-h-screen relative z-10">
        
        {/* LEFT COLUMN: Telemetry HUD Panel (Tesla Vibe) */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-8 border-r border-[#27272A]/80 bg-gradient-to-b from-[#09090B] via-[#0b0c10] to-[#09090B] relative overflow-hidden">
          {/* Subtle glow nodes */}
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] rounded-full bg-[#f97316]/5 filter blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] rounded-full bg-[#3b82f6]/5 filter blur-[120px] pointer-events-none" />

          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ef4444] via-[#f97316] to-[#22c55e] flex items-center justify-center text-xl shadow-[0_0_20px_rgba(249,115,22,0.25)] relative overflow-hidden">
              <span className="animate-pulse">🚦</span>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-widest text-[#F8FAFC] uppercase font-mono">
                TrafficIQ <span className="text-[#f97316]">AI</span>
              </h1>
              <p className="text-[9px] text-[#A1A1AA] tracking-widest font-mono uppercase">
                Neural Smart City Command Core
              </p>
            </div>
          </div>

          {/* Core Dashboard Visual Simulation */}
          <div className="my-8 flex flex-col gap-6">
            {/* Holographic Radar Ring and Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="glass-card hover-card-trigger rounded-xl p-4 border border-[#27272A]">
                <p className="text-[9px] font-mono text-[#A1A1AA] uppercase tracking-wider">Detection Acc.</p>
                <p className="text-2xl font-bold font-mono text-[#22c55e] mt-1">{sensorRate}%</p>
                <div className="w-full h-1 bg-[#27272A] rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-[#22c55e] rounded-full transition-all duration-500" style={{ width: `${sensorRate}%` }} />
                </div>
              </div>

              <div className="glass-card hover-card-trigger rounded-xl p-4 border border-[#27272A]">
                <p className="text-[9px] font-mono text-[#A1A1AA] uppercase tracking-wider">Active CCTV</p>
                <p className="text-2xl font-bold font-mono text-[#3b82f6] mt-1">{activeFeeds}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] live-glow-green" />
                  <span className="text-[9px] text-[#22c55e] font-mono font-bold">STREAM ONLINE</span>
                </div>
              </div>

              <div className="glass-card hover-card-trigger rounded-xl p-4 border border-[#27272A]">
                <p className="text-[9px] font-mono text-[#A1A1AA] uppercase tracking-wider">Model Load</p>
                <p className="text-2xl font-bold font-mono text-[#f97316] mt-1">4.2 ms</p>
                <div className="w-full h-1 bg-[#27272A] rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-[#f97316] rounded-full" style={{ width: '38%' }} />
                </div>
              </div>
            </div>

            {/* Neural Net Terminal Logs Widget */}
            <div className="glass-card border border-[#27272A] rounded-xl overflow-hidden flex flex-col h-[280px]">
              <div className="bg-[#111827]/80 border-b border-[#27272A] px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] font-mono font-semibold tracking-wider text-[#A1A1AA]">
                  📡 LIVE AGENT TELEMETRY FEED
                </span>
                <span className="w-2 h-2 rounded-full bg-[#22c55e] live-glow-green" />
              </div>
              <div className="p-4 font-mono text-[10px] space-y-2 overflow-y-auto flex-1 text-[#A1A1AA]">
                {logs.map((log, index) => {
                  let colorClass = 'text-[#F8FAFC]/80';
                  if (log.includes('[SYS_')) colorClass = 'text-[#f97316] font-semibold';
                  if (log.includes('[READY') || log.includes('[REDIS_OK') || log.includes('_OK')) colorClass = 'text-[#22c55e]';
                  if (log.includes('[ANOMALY_')) colorClass = 'text-[#3b82f6]';
                  return (
                    <div key={index} className={`leading-relaxed border-l-2 border-transparent pl-2 ${colorClass}`}>
                      {log}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer stats */}
          <div className="flex items-center justify-between text-[10px] text-[#A1A1AA] font-mono uppercase tracking-widest border-t border-[#27272A]/50 pt-4">
            <span>Server: CLOUD-HQ-01</span>
            <span>Latency: 28ms</span>
            <span>Agent Orchestrator: ACTIVE</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Registration & Login Panels */}
        <div className="col-span-1 lg:col-span-5 flex flex-col justify-center items-center p-6 lg:p-12 bg-gradient-to-br from-[#0e1017] to-[#09090B] relative">
          
          <div className="w-full max-w-sm flex flex-col gap-6">
            
            {/* Branding mobile only header */}
            <div className="flex lg:hidden flex-col items-center text-center gap-2 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ef4444] via-[#f97316] to-[#22c55e] flex items-center justify-center text-2xl shadow-lg">
                🚦
              </div>
              <h1 className="text-xl font-black text-white">TrafficIQ AI</h1>
              <p className="text-xs text-[#A1A1AA] font-mono">Neural Smart City Control Core</p>
            </div>

            {/* Main Auth Control Center */}
            <Card className="glass-card border border-[#27272A] p-6 rounded-2xl flex flex-col gap-6 relative shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#f97316] to-[#ef4444]" />

              {/* Title & Toggle buttons */}
              <div className="flex justify-between items-center pb-2 border-b border-[#27272A]">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    {isRegistering ? 'SYS.REGISTER' : 'SYS.AUTHENTICATE'}
                  </h2>
                  <p className="text-[9px] text-[#A1A1AA] font-mono mt-0.5 tracking-wider">
                    {isRegistering ? 'CREATING OPERATOR PROFILE' : 'ACCESS VERIFICATION SHIELD'}
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-[10px] text-[#f97316] hover:text-[#ff8f43] font-bold font-mono transition-colors tracking-wide outline-none"
                >
                  {isRegistering ? 'SIGN_IN' : 'CREATE_ACCOUNT'}
                </button>
              </div>

              {/* Notifications */}
              {error && (
                <div className="text-[11px] font-mono text-[#ef4444] bg-[#ef4444]/10 p-3 rounded-lg border border-[#ef4444]/20 animate-pulse">
                  [ERR_LOG] {error}
                </div>
              )}

              {successMsg && (
                <div className="text-[11px] font-mono text-[#22c55e] bg-[#22c55e]/10 p-3 rounded-lg border border-[#22c55e]/20">
                  [SYS_MSG] {successMsg}
                </div>
              )}

              {!isRegistering ? (
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  {/* Role Selector inside form */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-widest font-mono">
                      System Access Role
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginRole('admin');
                          setError(null);
                        }}
                        className={`h-9 text-[9px] font-mono font-bold rounded-lg border transition-all flex flex-col justify-center items-center gap-0.5 ${
                          loginRole === 'admin'
                            ? 'border-red-500/80 bg-red-500/10 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                            : 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500/70 hover:text-red-500'
                        }`}
                      >
                        <span>👑</span>
                        <span>ADMIN</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginRole('operator');
                          setError(null);
                        }}
                        className={`h-9 text-[9px] font-mono font-bold rounded-lg border transition-all flex flex-col justify-center items-center gap-0.5 ${
                          loginRole === 'operator'
                            ? 'border-blue-500/80 bg-blue-500/10 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                            : 'border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-500/70 hover:text-blue-500'
                        }`}
                      >
                        <span>👷</span>
                        <span>OPERATOR</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginRole('guest');
                          setError(null);
                        }}
                        className={`h-9 text-[9px] font-mono font-bold rounded-lg border transition-all flex flex-col justify-center items-center gap-0.5 ${
                          loginRole === 'guest'
                            ? 'border-zinc-500/80 bg-zinc-500/15 text-zinc-300 shadow-[0_0_10px_rgba(161,161,170,0.2)]'
                            : 'border-zinc-500/20 bg-zinc-500/5 hover:bg-zinc-500/10 text-zinc-400/70 hover:text-zinc-400'
                        }`}
                      >
                        <span>👁️</span>
                        <span>GUEST</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-widest font-mono">
                      {loginRole === 'admin' ? 'Administrator ID' : loginRole === 'operator' ? 'Operator ID' : 'Guest ID'}
                    </label>
                    <Input
                      required
                      placeholder={
                        loginRole === 'admin' ? 'Enter admin username (e.g. admin)' :
                        loginRole === 'operator' ? 'Enter operator username (e.g. operator)' :
                        'Enter guest username (e.g. guest)'
                      }
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="h-10 text-xs bg-[#0b0d13]/70 border-[#27272A] hover:border-[#f97316]/50 focus:border-[#f97316] text-[#F8FAFC] transition-all font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-widest font-mono">
                      Verification Key
                    </label>
                    <Input
                      required
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="h-10 text-xs bg-[#0b0d13]/70 border-[#27272A] hover:border-[#f97316]/50 focus:border-[#f97316] text-[#F8FAFC] transition-all font-mono"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="h-10 text-xs font-bold w-full bg-gradient-to-r from-[#f97316] to-[#ef4444] hover:brightness-110 text-white shadow-[0_4px_12px_rgba(249,115,22,0.2)] transition-all font-mono tracking-widest uppercase mt-2"
                  >
                    Initialize Session
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-widest font-mono">
                      Operator Display Name
                    </label>
                    <Input
                      required
                      placeholder="e.g. Inspector John"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      className="h-10 text-xs bg-[#0b0d13]/70 border-[#27272A] hover:border-[#f97316]/50 focus:border-[#f97316] text-[#F8FAFC] transition-all font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-widest font-mono">
                      Operator ID (Username)
                    </label>
                    <Input
                      required
                      placeholder="Choose operator name"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="h-10 text-xs bg-[#0b0d13]/70 border-[#27272A] hover:border-[#f97316]/50 focus:border-[#f97316] text-[#F8FAFC] transition-all font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-widest font-mono">
                      Verification Key (Password)
                    </label>
                    <Input
                      required
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="h-10 text-xs bg-[#0b0d13]/70 border-[#27272A] hover:border-[#f97316]/50 focus:border-[#f97316] text-[#F8FAFC] transition-all font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-widest font-mono">
                      System Access Role
                    </label>
                    <select
                      value={regRole}
                      onChange={e => setRegRole(e.target.value as UserRole)}
                      className="h-10 rounded-md bg-[#0b0d13]/70 border border-[#27272A] px-3 py-1.5 text-xs text-[#F8FAFC] outline-none focus:border-[#f97316]/50 focus:border-[#f97316] transition-all font-mono"
                    >
                      <option value="operator">👷 Operator (Stream Control)</option>
                      <option value="guest">👁️ Guest (Telemetry Monitoring Only)</option>
                      <option value="admin">👑 Administrator (Total Bypass Control)</option>
                    </select>
                  </div>

                  <Button 
                    type="submit" 
                    className="h-10 text-xs font-bold w-full bg-[#22c55e] hover:bg-[#1ea34d] text-white shadow-[0_4px_12px_rgba(34,197,94,0.2)] transition-all font-mono tracking-widest uppercase mt-2"
                  >
                    Register System Profile
                  </Button>
                </form>
              )}
            </Card>

            {/* Access control details */}
            <div className="glass-card border border-[#27272A] p-4 rounded-xl text-[9px] text-[#A1A1AA] font-mono space-y-3">
              <p className="font-bold text-white text-center uppercase tracking-widest text-[9px]">
                🛡️ Security Protocol Matrices
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between border-b border-[#27272A]/50 pb-1 text-white/50 font-bold">
                  <span>CAPABILITY</span>
                  <span>ADMIN</span>
                  <span>OPERATOR</span>
                </div>
                <div className="flex justify-between">
                  <span>Scenario Override</span>
                  <span className="text-[#22c55e] font-bold">BYPASS_OK</span>
                  <span className="text-[#ef4444] font-bold">NO_PERM</span>
                </div>
                <div className="flex justify-between">
                  <span>Camera Nodes Management</span>
                  <span className="text-[#22c55e] font-bold">BYPASS_OK</span>
                  <span className="text-[#ef4444] font-bold">NO_PERM</span>
                </div>
                <div className="flex justify-between">
                  <span>Emergency Green Corridor</span>
                  <span className="text-[#22c55e] font-bold">BYPASS_OK</span>
                  <span className="text-[#22c55e] font-bold">BYPASS_OK</span>
                </div>
                <div className="flex justify-between">
                  <span>Telemetry Feeds Monitor</span>
                  <span className="text-[#22c55e] font-bold">BYPASS_OK</span>
                  <span className="text-[#22c55e] font-bold">BYPASS_OK</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
