import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Server, AlertCircle, LayoutDashboard, Settings, LogOut, Key, UserPlus, BarChart3, Wifi, Shield } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Config from './Config';
import Login from './Login';
import Statistics from './Statistics';
import Security from './Security';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Types
interface Stats {
  timestamp: number;
  total_requests: number;
  requests_by_app: Record<string, number>;
  errors_by_app: Record<string, number>;
}



export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  const [view, setView] = useState<'dashboard' | 'config' | 'statistics' | 'security'>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [status, setStatus] = useState<'running' | 'stopped' | 'unknown'>('unknown');
  const [logs, setLogs] = useState<string[]>([]);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Add User State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Traffic Control State
  const [trafficRunning, setTrafficRunning] = useState(false);
  const [configValid, setConfigValid] = useState(false);

  // Version State
  const [version, setVersion] = useState<string>('');

  // Connectivity State
  const [internetConnected, setInternetConnected] = useState<boolean | null>(null);
  const [speedTest, setSpeedTest] = useState<{ mbps: number; timestamp: number } | null>(null);
  const [speedTesting, setSpeedTesting] = useState(false);

  const addUser = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: newUsername, password: newUserPassword })
      });
      const data = await res.json();
      if (res.ok) {
        alert('User created successfully');
        setShowAddUserModal(false);
        setNewUsername('');
        setNewUserPassword('');
      } else {
        alert(data.error || 'Failed to create user');
      }
    } catch (e) { alert('Error creating user'); }
  };
  //...
  // Inside JSX, after Logout button:
  /* 
      {username === 'admin' && (
          <button onClick={() => setShowAddUserModal(true)} title="Add User" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-green-400 transition-colors">
              <UserPlus size={18} />
          </button>
      )}
  */
  // And the Modal


  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
  };

  const handleLogin = (t: string, u: string) => {
    localStorage.setItem('token', t);
    localStorage.setItem('username', u);
    setToken(t);
    setUsername(u);
  };

  const changePassword = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });
      if (res.ok) {
        alert('Password changed successfully');
        setShowPwdModal(false);
        setNewPassword('');
      } else {
        alert('Failed to change password');
      }
    } catch (e) { alert('Error changing password'); }
  };

  // Auth Headers helper
  const authHeaders = () => ({ 'Authorization': `Bearer ${token}` });

  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/stats', { headers: authHeaders() });
      if (res.status === 403 || res.status === 401) logout();
      const data = await res.json();
      if (data.timestamp) {
        setStats(data);
        setHistory(prev => {
          const newEntry = {
            time: new Date(data.timestamp * 1000).toLocaleTimeString(),
            requests: data.total_requests,
            ...data.requests_by_app
          };
          // Keep last 20 points
          const newHistory = [...prev, newEntry];
          if (newHistory.length > 20) newHistory.shift();
          return newHistory;
        });
      }
    } catch (e) {
      console.error('Failed to fetch stats');
    }
  };

  const fetchStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/status', { headers: authHeaders() });
      const data = await res.json();
      setStatus(data.status);
    } catch (e) {
      setStatus('unknown');
    }
  };

  const fetchTrafficStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/traffic/status', { headers: authHeaders() });
      const data = await res.json();
      setTrafficRunning(data.running || false);
    } catch (e) {
      console.error('Failed to fetch traffic status');
    }
  };

  const checkConfigValid = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/config/interfaces', { headers: authHeaders() });
      const interfaces = await res.json();
      setConfigValid(interfaces && interfaces.length > 0);
    } catch (e) {
      setConfigValid(false);
    }
  };

  const handleTrafficToggle = async () => {
    if (!token) return;
    const endpoint = trafficRunning ? '/api/traffic/stop' : '/api/traffic/start';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        setTrafficRunning(data.running);
      }
    } catch (e) {
      console.error('Failed to toggle traffic');
    }
  };

  const fetchLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/logs', { headers: authHeaders() });
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch (e) {
      console.error("Failed to fetch logs");
    }
  }

  const fetchVersion = async () => {
    try {
      const res = await fetch('/api/version');
      const data = await res.json();
      if (data.version) setVersion(data.version);
    } catch (e) {
      console.error("Failed to fetch version");
    }
  }

  const fetchConnectivity = async () => {
    try {
      const res = await fetch('/api/connectivity/status');
      const data = await res.json();
      setInternetConnected(data.connected || false);
    } catch (e) {
      console.error("Failed to fetch connectivity");
      setInternetConnected(false);
    }
  }

  const runSpeedTest = async () => {
    setSpeedTesting(true);
    try {
      const res = await fetch('/api/connectivity/speedtest');
      const data = await res.json();
      if (data.success) {
        setSpeedTest({
          mbps: data.download_mbps,
          timestamp: data.timestamp
        });
      }
    } catch (e) {
      console.error("Speed test failed");
    } finally {
      setSpeedTesting(false);
    }
  }


  useEffect(() => {
    if (!token) return;
    // Initial fetch
    fetchStats();
    fetchLogs();
    fetchTrafficStatus();
    checkConfigValid();
    fetchVersion();
    // Don't auto-fetch connectivity - only on manual button click

    // Poll every 2s
    const interval = setInterval(() => {
      fetchStats();
      fetchLogs();
      fetchTrafficStatus();
      // Don't poll connectivity automatically
    }, 2000);
    return () => clearInterval(interval);
  }, [token]);


  const totalErrors = stats ? Object.values(stats.errors_by_app).reduce((a, b) => a + b, 0) : 0;
  const successRate = stats ? ((stats.total_requests - totalErrors) / stats.total_requests * 100).toFixed(1) : '100';

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            SD-WAN Traffic Generator
          </h1>
          <p className="text-slate-400 mt-1">
            Real-time Control Center {version && <span className="text-slate-500">• v{version}</span>}
          </p>
        </div>



        <div className="flex gap-4 items-center">
          <span className="text-sm font-medium text-slate-300">{username}</span>

          {username === 'admin' && (
            <button onClick={() => setShowAddUserModal(true)} title="Add User" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-green-400 transition-colors">
              <UserPlus size={18} />
            </button>
          )}

          <button onClick={() => setShowPwdModal(true)} title="Change Password" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-400 transition-colors">
            <Key size={18} />
          </button>
          <button onClick={logout} title="Sign Out" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Add New User</h3>
            <input
              type="text"
              placeholder="Username"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mb-2 focus:border-blue-500 outline-none"
            />
            <input
              type="password"
              placeholder="Password (min 5 chars)"
              value={newUserPassword}
              onChange={e => setNewUserPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mb-4 focus:border-blue-500 outline-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddUserModal(false)} className="px-4 py-2 text-slate-400 hover:text-slate-200">Cancel</button>
              <button onClick={addUser} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPwdModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Change Password</h3>
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mb-4 focus:border-blue-500 outline-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPwdModal(false)} className="px-4 py-2 text-slate-400 hover:text-slate-200">Cancel</button>
              <button onClick={changePassword} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}



      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-8 border-b border-slate-800">
        <button
          onClick={() => setView('dashboard')}
          className={cn(
            "px-4 py-3 flex items-center gap-2 font-medium border-b-2 transition-colors",
            view === 'dashboard' ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <LayoutDashboard size={18} /> Dashboard
        </button>
        <button
          onClick={() => setView('statistics')}
          className={cn(
            "px-4 py-3 flex items-center gap-2 font-medium border-b-2 transition-colors",
            view === 'statistics' ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <BarChart3 size={18} /> Statistics
        </button>
        <button
          onClick={() => setView('config')}
          className={cn(
            "px-4 py-3 flex items-center gap-2 font-medium border-b-2 transition-colors",
            view === 'config' ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Settings size={18} /> Configuration
        </button>
        <button
          onClick={() => setView('security')}
          className={cn(
            "px-4 py-3 flex items-center gap-2 font-medium border-b-2 transition-colors",
            view === 'security' ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Shield size={18} /> Security
        </button>
      </div>

      {view === 'dashboard' ? (
        <>
          {/* Traffic Control Panel */}
          <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity size={24} className={trafficRunning ? "text-green-400" : "text-slate-500"} />
                  Traffic Generation
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  Status: <span className={trafficRunning ? "text-green-400 font-semibold" : "text-slate-500"}>{trafficRunning ? 'Active' : 'Paused'}</span>
                  {' • '}
                  Configuration: <span className={configValid ? "text-green-400" : "text-yellow-400"}>{configValid ? 'Valid' : 'Required'}</span>
                </p>
              </div>

              <button
                onClick={handleTrafficToggle}
                disabled={!configValid}
                className={cn(
                  "px-8 py-3 rounded-lg font-semibold transition-all shadow-lg",
                  trafficRunning
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20'
                    : 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/20 disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed'
                )}
              >
                {trafficRunning ? '⏸ Stop Traffic' : '▶ Start Traffic'}
              </button>
            </div>

            {!configValid && (
              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-400 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  Please configure at least one network interface in the <button onClick={() => setView('config')} className="underline font-semibold hover:text-yellow-300">Configuration</button> tab before starting traffic generation.
                </p>
              </div>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card title="Total Requests" value={stats?.total_requests || 0} icon={<Activity />} />
            <Card title="Success Rate" value={`${successRate}%`} icon={<Server />} subValue={`${totalErrors} Errors`} />
            <Card title="Active Apps" value={stats ? Object.keys(stats.requests_by_app).length : 0} icon={<AlertCircle />} />
          </div>

          {/* Main Chart */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-4 text-slate-200">Traffic Volume</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                  />
                  <Line type="monotone" dataKey="requests" stroke="#38bdf8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Logs Terminal */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-sm leading-6">
            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center gap-2 text-slate-400">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2">Live Logs</span>
            </div>
            <div className="p-4 h-[300px] overflow-y-auto text-slate-300">
              {logs.map((log, i) => (
                <div key={i} className="border-b border-slate-900/50 py-1">
                  {log}
                </div>
              ))}
              {logs.length === 0 && <div className="text-slate-600 italic">Waiting for logs... (Make sure traffic logs exist)</div>}
            </div>
          </div>
        </>
      ) : view === 'statistics' ? (
        <Statistics stats={stats} />
      ) : view === 'security' ? (
        <Security token={token!} />
      ) : (
        <Config token={token!} />
      )}
    </div>
  );
}

function Card({ title, value, icon, subValue }: { title: string, value: string | number, icon: React.ReactNode, subValue?: string }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform scale-150">
        {/* @ts-ignore */}
        {React.cloneElement(icon as React.ReactElement, { size: 48 })}
      </div>
      <div className="flex items-center gap-3 mb-2 text-slate-400">
        {icon}
        <span className="font-medium text-sm text-slate-400">{title}</span>
      </div>
      <div className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
        {value}
      </div>
      {subValue && (
        <div className="text-sm text-slate-500 mt-1">{subValue}</div>
      )}
    </div>
  );
}
