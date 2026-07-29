import React, { useState } from 'react';
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

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('operator');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      onLoginSuccess({ username: matched.displayName, role: matched.role });
    } else {
      setError('Invalid username or password.');
      setSuccessMsg(null);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUser = username.trim().toLowerCase();
    const db = getUsersDb();

    if (db[normalizedUser]) {
      setError('Operator ID already exists.');
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

    setSuccessMsg('Account registered successfully! Please log in.');
    setError(null);
    setIsRegistering(false);
    
    // Clear inputs
    setUsername('');
    setPassword('');
    setDisplayName('');
  };

  const handleQuickLogin = (role: UserRole) => {
    const names: Record<UserRole, string> = {
      admin: 'Administrator',
      operator: 'Control Operator',
      guest: 'Guest Monitor',
    };
    onLoginSuccess({ username: names[role], role });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#070b13] p-4 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#f97316]/5 filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#3b82f6]/5 filter blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md flex flex-col gap-6 z-10 animate-fade-in">
        {/* Branding header */}
        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ef4444] via-[#f97316] to-[#22c55e] flex items-center justify-center text-2xl shadow-lg">
            🚦
          </div>
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            TrafficIQ Hub
          </h1>
          <p className="text-xs text-muted-foreground font-mono">
            Autonomous Smart City Traffic Control & ML Analytics
          </p>
        </div>

        {/* Form Card */}
        <Card className="p-6 bg-card/60 border border-border backdrop-blur-md shadow-2xl flex flex-col gap-5">
          <div className="border-b border-border pb-2 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {isRegistering ? 'Create Operator Account' : 'Operator Authentication'}
              </h2>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5 uppercase">
                {isRegistering ? 'Smart city terminal registry' : 'Secure access control shield'}
              </p>
            </div>
            
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-[10px] text-[#f97316] font-bold hover:underline bg-transparent border-0 outline-none"
            >
              {isRegistering ? 'Sign In Instead' : 'Create Account'}
            </button>
          </div>

          {error && (
            <div className="text-xs text-[#ef4444] bg-[#ef4444]/10 p-2.5 rounded-lg border border-[#ef4444]/25">
              ⚠️ {error}
            </div>
          )}

          {successMsg && (
            <div className="text-xs text-[#22c55e] bg-[#22c55e]/10 p-2.5 rounded-lg border border-[#22c55e]/25">
              ✓ {successMsg}
            </div>
          )}

          {!isRegistering ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">Operator ID</label>
                <Input
                  required
                  placeholder="Username (e.g. admin)"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="h-9 text-xs bg-background/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">Verification Key</label>
                <Input
                  required
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-9 text-xs bg-background/50"
                />
              </div>

              <Button type="submit" className="h-9 text-xs font-bold w-full bg-[#f97316] hover:bg-[#e0620f] text-white">
                Log In to Terminal
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">Full Display Name</label>
                <Input
                  required
                  placeholder="e.g. Senior Officer John"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="h-9 text-xs bg-background/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">Desired Operator ID</label>
                <Input
                  required
                  placeholder="Username to log in"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="h-9 text-xs bg-background/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">Security Password</label>
                <Input
                  required
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-9 text-xs bg-background/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">Operational Access Role</label>
                <select
                  value={regRole}
                  onChange={e => setRegRole(e.target.value as UserRole)}
                  className="h-9 rounded-md bg-[#0a0f1b] border border-border px-3 py-1.5 text-xs text-white outline-none focus:border-[#f97316]/50"
                >
                  <option value="operator">👷 Operator (Incident checks & live feeds)</option>
                  <option value="guest">👁️ Guest (Read-only data monitor)</option>
                  <option value="admin">👑 Administrator (Full controller access)</option>
                </select>
              </div>

              <Button type="submit" className="h-9 text-xs font-bold w-full bg-[#22c55e] hover:bg-[#1ea34d] text-white">
                Register Operator Profile
              </Button>
            </form>
          )}

          {/* Quick presets */}
          <div className="flex flex-col gap-2.5 pt-3 border-t border-border/50">
            <p className="text-[9px] text-muted-foreground font-mono text-center uppercase">Demonstration Quick Logins</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('admin')}
                className="h-7 text-[9px] font-bold border-red-500/20 hover:bg-red-500/10 text-red-500"
              >
                👑 Admin Preset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('operator')}
                className="h-7 text-[9px] font-bold border-blue-500/20 hover:bg-blue-500/10 text-blue-500"
              >
                👷 Ops Preset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('guest')}
                className="h-7 text-[9px] font-bold border-zinc-500/20 hover:bg-zinc-500/10 text-zinc-400"
              >
                👁️ Guest Preset
              </Button>
            </div>
          </div>
        </Card>

        {/* Roles Details */}
        <Card className="p-4 bg-[#0B1120]/40 border border-border/80 text-[10px] text-muted-foreground">
          <p className="font-bold text-white/90 text-center uppercase tracking-wider mb-2 font-mono text-[9px]">
            Role Permissions Shield
          </p>
          <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-1.5 font-bold text-white/70">
            <span>Action</span>
            <span>Admin</span>
            <span>Operator</span>
          </div>
          <div className="space-y-1 mt-1.5 font-mono text-[9px]">
            <div className="grid grid-cols-3">
              <span>Weather/Scenarios</span><span className="text-[#22c55e]">✔</span><span className="text-[#ef4444]">✘</span>
            </div>
            <div className="grid grid-cols-3">
              <span>Add/Delete Camera</span><span className="text-[#22c55e]">✔</span><span className="text-[#ef4444]">✘</span>
            </div>
            <div className="grid grid-cols-3">
              <span>Emergency override</span><span className="text-[#22c55e]">✔</span><span className="text-[#22c55e]">✔</span>
            </div>
            <div className="grid grid-cols-3">
              <span>Resolve Incident</span><span className="text-[#22c55e]">✔</span><span className="text-[#22c55e]">✔</span>
            </div>
            <div className="grid grid-cols-3">
              <span>Live Monitor</span><span className="text-[#22c55e]">✔</span><span className="text-[#22c55e]">✔</span>
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground/80 mt-2 text-center">
            *Guest is read-only (all interactive control components are disabled)
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Login;
