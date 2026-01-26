import React, { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Statistics from './Statistics';
import Security from './Security';
import Voice from './Voice';
import Config from './Config';
import Login from './Login';
import ConnectivityPerformance from './ConnectivityPerformance';
import Failover from './Failover';
import System from './System';
import { Activity, Server, AlertCircle, LayoutDashboard, Settings, LogOut, Key, UserPlus, BarChart3, Wifi, Shield, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, Play, Pause, Phone, Gauge, Network, Plus, Zap, Monitor } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function formatBitrate(mbpsStr: string) {
  const mbps = parseFloat(mbpsStr);
  if (isNaN(mbps)) return '0.00 Mbps';
  if (mbps < 1 && mbps > 0) {
    return `${(mbps * 1000).toFixed(0)} Kbps`;
  }
  return `${mbps.toFixed(2)} Mbps`;
}

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
  const [view, setView] = useState<'dashboard' | 'config' | 'statistics' | 'security' | 'voice' | 'performance' | 'failover' | 'system'>('performance');
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
  const [trafficRate, setTrafficRate] = useState(1.0);
  const [updatingRate, setUpdatingRate] = useState(false);
  const [configValid, setConfigValid] = useState(false);

  // Version State
  const [version, setVersion] = useState<string>('');

  // Network Monitoring State
  const [connectivity, setConnectivity] = useState<any>(null);
  const [dockerStats, setDockerStats] = useState<any>(null);
  const [networkExpanded, setNetworkExpanded] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(1000);
  const [appConfig, setAppConfig] = useState<any[]>([]);
  const [speedtestResult, setSpeedtestResult] = useState<any>(null);
  const [runningSpeedtest, setRunningSpeedtest] = useState(false);
  const [iperfResult, setIperfResult] = useState<any>(null);
  const [runningIperf, setRunningIperf] = useState(false);
  const [showIperfModal, setShowIperfModal] = useState(false);
  const [iperfTarget, setIperfTarget] = useState('192.168.203.100');
  const [iperfServerInfo, setIperfServerInfo] = useState<any>(null);

  // Maintenance State
  const [maintenance, setMaintenance] = useState<{ updateAvailable: boolean } | null>(null);

  // Rate Calculation State - Use Refs to avoid stale closures in setInterval
  const prevTotalRequestsRef = useRef<number | null>(null);
  const prevTimestampRef = useRef<number | null>(null);
  const [currentRpm, setCurrentRpm] = useState<number>(0);

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

  const authHeaders = () => ({ 'Authorization': `Bearer ${token}` });

  const resetTrafficStats = async () => {
    if (!token) return;
    if (!confirm('Are you sure you want to reset all traffic statistics?')) return;
    try {
      const res = await fetch('/api/stats', {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (res.ok) {
        fetchStats();
      } else {
        alert('Failed to reset statistics');
      }
    } catch (e) {
      alert('Error resetting statistics');
    }
  };

  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/stats', { headers: authHeaders() });
      if (res.status === 403 || res.status === 401) logout();
      const data = await res.json();
      if (data.timestamp) {
        setStats(data);

        // Calculate RPM
        let calculatedRpm = currentRpm; // Start with last known RPM

        if (prevTotalRequestsRef.current !== null && prevTimestampRef.current !== null) {
          const deltaReq = data.total_requests - prevTotalRequestsRef.current;
          const deltaTime = data.timestamp - prevTimestampRef.current;

          if (deltaTime > 0) {
            // RPM = (Delta Requests / Delta Seconds) * 60
            const rpm = (deltaReq / deltaTime) * 60;

            // If deltaReq is 0, it might be because the stats file hasn't updated yet.
            // We only update RPM if we have new data, or after some timeout.
            if (deltaReq > 0) {
              calculatedRpm = rpm;
              setCurrentRpm(rpm);
            } else if (deltaTime > 15) {
              // If more than 15s without new requests, it's probably really stopped
              calculatedRpm = 0;
              setCurrentRpm(0);
            }
          }
        }

        // Update previous state ONLY if data actually changed
        if (data.total_requests !== prevTotalRequestsRef.current) {
          prevTotalRequestsRef.current = data.total_requests;
          prevTimestampRef.current = data.timestamp;

          // Only add to history if the timestamp has progressed
          setHistory(prev => {
            // Check if this timestamp is already the last one to avoid "dancing" graph
            if (prev.length > 0 && prev[prev.length - 1].rawTimestamp === data.timestamp) {
              return prev;
            }

            const newEntry = {
              time: new Date(data.timestamp * 1000).toLocaleTimeString(),
              rawTimestamp: data.timestamp,
              requests: Math.round(calculatedRpm),
              total: data.total_requests,
              ...data.requests_by_app
            };

            const newHistory = [...prev, newEntry];
            if (newHistory.length > 30) newHistory.shift();
            return newHistory;
          });
        }
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
      if (data.sleep_interval) setTrafficRate(data.sleep_interval);
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
        if (data.sleep_interval) setTrafficRate(data.sleep_interval);
      }
    } catch (e) {
      console.error('Failed to toggle traffic');
    }
  };

  const updateTrafficRate = async (val: number) => {
    if (!token) return;
    setUpdatingRate(true);
    try {
      const res = await fetch('/api/traffic/settings', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ sleep_interval: val })
      });
      if (res.ok) {
        setTrafficRate(val);
      }
    } catch (e) {
      console.error('Failed to update traffic rate');
    } finally {
      setUpdatingRate(false);
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
    if (!token) return;
    try {
      const res = await fetch('/api/connectivity/test', { headers: authHeaders() });
      const data = await res.json();
      setConnectivity(data);
    } catch (e) {
      console.error("Failed to fetch connectivity");
    }
  }

  const fetchDockerStats = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/connectivity/docker-stats', { headers: authHeaders() });
      const data = await res.json();
      setDockerStats(data);
    } catch (e) {
      console.error("Failed to fetch Docker stats");
    }
  }

  const fetchConfigUi = async () => {
    try {
      const res = await fetch('/api/config/ui');
      const data = await res.json();
      if (data.refreshInterval) setRefreshInterval(data.refreshInterval);
    } catch (e) {
      console.error("Failed to fetch UI config");
    }
  }

  const fetchAppConfig = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/config/apps', { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setAppConfig(data);
    } catch (e) {
      console.error("Failed to fetch app config");
    }
  };

  const runSpeedtest = async () => {
    if (!token || runningSpeedtest) return;
    setRunningSpeedtest(true);
    setSpeedtestResult(null);
    try {
      const res = await fetch('/api/connectivity/speedtest', { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setSpeedtestResult(data);
      }
    } catch (e) {
      console.error("Speedtest failed");
    } finally {
      setRunningSpeedtest(false);
    }
  };

  const runIperf = async () => {
    if (!token || runningIperf) return;
    setRunningIperf(true);
    setIperfResult(null);
    try {
      const res = await fetch('/api/connectivity/iperf/client', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: iperfTarget })
      });
      const data = await res.json();
      if (data.success) {
        setIperfResult(data.result);
        setShowIperfModal(false);
      } else {
        alert(data.error || 'Iperf test failed');
      }
    } catch (e) {
      console.error("Iperf failed");
    } finally {
      setRunningIperf(false);
    }
  };

  const fetchIperfStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/connectivity/iperf/server', { headers: authHeaders() });
      const data = await res.json();
      setIperfServerInfo(data);
    } catch (e) { }
  };

  const fetchMaintenance = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/maintenance/version', { headers: authHeaders() });
      const data = await res.json();
      setMaintenance(data);
    } catch (e) { }
  };


  useEffect(() => {
    if (!token) return;
    // Initial fetch
    fetchStats();
    fetchLogs();
    fetchTrafficStatus();
    checkConfigValid();
    fetchVersion();
    fetchConnectivity();
    fetchDockerStats();
    fetchConfigUi();
    fetchAppConfig();
    fetchIperfStatus();
    fetchMaintenance();

    // Poll every refreshInterval (default 1s)
    const interval = setInterval(() => {
      fetchStats();
      fetchLogs();
      fetchTrafficStatus();
      fetchDockerStats(); // Poll Docker stats for real-time bandwidth
    }, refreshInterval);

    // Poll connectivity every 30s (less frequent)
    const connectivityInterval = setInterval(() => {
      fetchConnectivity();
      fetchIperfStatus();
    }, 30000);

    const maintenanceInterval = setInterval(() => {
      fetchMaintenance();
    }, 3600000); // Check once per hour

    return () => {
      clearInterval(interval);
      clearInterval(connectivityInterval);
      clearInterval(maintenanceInterval);
    };
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

      {/* Iperf Client Modal */}
      {showIperfModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                <Activity size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100">Iperf Client Test</h3>
                <p className="text-slate-400 text-xs">Test bandwidth against an iperf3 server</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Target IP / Hostname</label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.100"
                  value={iperfTarget}
                  onChange={e => setIperfTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                />
              </div>

              {/* Show last result if exists */}
              {iperfResult && (
                <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-purple-400" />
                    <span className="text-xs text-slate-300">Last Test ({iperfResult.target}):</span>
                  </div>
                  <span className="text-sm font-bold text-purple-300">
                    {Math.round(iperfResult.received_mbps || iperfResult.sent_mbps)} Mbps
                  </span>
                </div>
              )}

              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-800">
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  Note: The test will run for 5 seconds using TCP. Results will also appear in the top Network Status bar.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowIperfModal(false)}
                className="px-6 py-2.5 text-slate-400 hover:text-slate-200 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={runIperf}
                disabled={runningIperf || !iperfTarget}
                className={cn(
                  "px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg",
                  runningIperf
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20"
                )}
              >
                {runningIperf ? <><Gauge size={18} className="animate-spin" /> Running...</> : 'Launch Test'}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-800">
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
        <button
          onClick={() => setView('performance')}
          className={cn(
            "px-4 py-3 flex items-center gap-2 font-medium border-b-2 transition-colors",
            view === 'performance' ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Gauge size={18} /> Performance
        </button>
        <button
          onClick={() => setView('voice')}
          className={cn(
            "px-4 py-3 flex items-center gap-2 font-medium border-b-2 transition-colors",
            view === 'voice' ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Phone size={18} /> Voice
        </button>
        <button
          onClick={() => setView('failover')}
          className={cn(
            "px-4 py-3 flex items-center gap-2 font-medium border-b-2 transition-colors",
            view === 'failover' ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Zap size={18} /> Failover
        </button>
        {username === 'admin' && (
          <button
            onClick={() => setView('system')}
            className={cn(
              "px-4 py-3 flex items-center gap-2 font-medium border-b-2 transition-colors relative",
              view === 'system' ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            <Monitor size={18} /> System
            {maintenance?.updateAvailable && (
              <span className="absolute top-2 right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse border border-slate-950" />
            )}
          </button>
        )}
      </div>

      {view === 'dashboard' ? (
        <>
          {/* Traffic Control Panel */}
          <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-5 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Part 1: Status */}
              <div className="min-w-[200px]">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity size={20} className={trafficRunning ? "text-green-400 animate-pulse" : "text-slate-500"} />
                  Traffic Generation
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  Status: <span className={trafficRunning ? "text-green-400 font-semibold" : "text-slate-500"}>{trafficRunning ? 'Active' : 'Paused'}</span>
                  {' • '}
                  Config: <span className={configValid ? "text-green-400" : "text-yellow-400"}>{configValid ? 'Valid' : 'Required'}</span>
                </p>
              </div>

              {/* Part 2: Integrated Slider */}
              <div className="flex-1 max-w-md bg-slate-900/40 p-3 rounded-lg border border-white/5">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Speed Control</span>
                    <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                      {trafficRate <= 0.5 ? '🚀 Turbo' : trafficRate <= 2 ? '⚡ Fast' : trafficRate <= 5 ? '📱 Normal' : '🐢 Slow'}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">{trafficRate}s delay</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-lg">🚀</span>
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.5"
                    value={trafficRate}
                    disabled={updatingRate}
                    onChange={(e) => updateTrafficRate(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                  />
                  <span className="text-lg">🐢</span>
                </div>
              </div>

              {/* Part 3: Action Button */}
              <button
                onClick={handleTrafficToggle}
                disabled={!configValid}
                className={cn(
                  "px-6 py-3 rounded-lg font-bold transition-all shadow-lg flex items-center gap-2 min-w-[160px] justify-center",
                  trafficRunning
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20'
                    : 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/20 disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none disabled:cursor-not-allowed'
                )}
              >
                {trafficRunning ? <><Pause size={18} fill="currentColor" /> Stop Traffic</> : <><Play size={18} fill="currentColor" /> Start Traffic</>}
              </button>
            </div>

            {!configValid && (
              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-400 text-xs flex items-center gap-2">
                  <AlertCircle size={14} />
                  Configure an interface in <button onClick={() => setView('config')} className="underline font-semibold hover:text-yellow-300 ml-1">Configuration</button> to enable traffic.
                </p>
              </div>
            )}
          </div>

          {/* Network Monitoring */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <Wifi size={20} className="text-blue-400" />
                Network Status

                {/* Iperf Status Badge */}
                {iperfServerInfo?.running && (
                  <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-[10px] font-bold text-green-400">
                    <Server size={10} /> IPERF SERVER UP (5201)
                  </div>
                )}
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={runSpeedtest}
                  disabled={runningSpeedtest}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    runningSpeedtest
                      ? "bg-blue-500/10 text-blue-400 cursor-not-allowed"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                  )}
                >
                  <Gauge size={14} className={runningSpeedtest ? "animate-spin" : ""} />
                  {runningSpeedtest ? 'Testing...' : 'Speedtest'}
                </button>

                <button
                  onClick={() => setShowIperfModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
                >
                  <Activity size={14} />
                  Iperf Client
                </button>

                <button
                  onClick={() => setView('config')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 transition-all"
                >
                  <Plus size={14} />
                  Manage
                </button>

                <button
                  onClick={() => setNetworkExpanded(!networkExpanded)}
                  className="text-slate-400 hover:text-slate-200 transition-colors ml-2"
                >
                  <ChevronDown size={18} className={`transform transition-transform ${networkExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Compact Summary */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                {/* Connectivity Status */}
                {connectivity && (
                  <div className="flex items-center gap-2">
                    {connectivity.connected ? (
                      <>
                        <CheckCircle size={14} className="text-green-400" />
                        <span className="text-slate-300">
                          {connectivity.results?.filter((r: any) => r.status === 'connected').length || 0}/{connectivity.results?.length || 0} endpoints
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle size={14} className="text-orange-400" />
                        <span className="text-orange-300">
                          {connectivity.results?.filter((r: any) => r.status !== 'connected').length || 0} offline
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Speedtest Result */}
                {speedtestResult && (
                  <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                    <Gauge size={12} className="text-blue-400" />
                    <span className="text-blue-300 font-bold">{speedtestResult.download_mbps} <span className="text-[10px] opacity-70">Mbps</span></span>
                  </div>
                )}

                {/* Iperf Result */}
                {iperfResult && (
                  <div className="flex items-center gap-2 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                    <Activity size={12} className="text-purple-400" />
                    <span className="text-purple-300 font-bold">{Math.round(iperfResult.received_mbps || iperfResult.sent_mbps)} <span className="text-[10px] opacity-70">Mbps (iperf)</span></span>
                  </div>
                )}

                {/* Docker Stats: Network Bitrate */}
                {dockerStats?.success && dockerStats.stats.network && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-slate-950/50 px-3 py-1 rounded-full border border-slate-800">
                      <span className="flex items-center gap-1.5 font-mono text-[11px]">
                        <ChevronDown size={14} className={cn("transition-colors", parseFloat(dockerStats.stats.network.rx_mbps) > 5 ? "text-green-400" : "text-blue-400")} />
                        <span className="text-slate-200 font-bold min-w-[60px]">{formatBitrate(dockerStats.stats.network.rx_mbps)}</span>
                      </span>
                      <div className="w-px h-3 bg-slate-800" />
                      <span className="flex items-center gap-1.5 font-mono text-[11px]">
                        <ChevronUp size={14} className={cn("transition-colors", parseFloat(dockerStats.stats.network.tx_mbps) > 5 ? "text-green-400" : "text-purple-400")} />
                        <span className="text-slate-200 font-bold min-w-[60px]">{formatBitrate(dockerStats.stats.network.tx_mbps)}</span>
                      </span>
                    </div>
                    <div className="hidden lg:flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                      <span>TOT: {dockerStats.stats.network.rx_mb || dockerStats.stats.network.received_mb} MB</span>
                      <span>/</span>
                      <span>{dockerStats.stats.network.tx_mb || dockerStats.stats.network.transmitted_mb} MB</span>
                    </div>
                  </div>
                )}

                {/* Docker Stats: Resource Monitoring */}
                {dockerStats?.success && (
                  <div className="hidden md:flex items-center gap-6">
                    {/* CPU */}
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <span className="text-[10px] text-slate-500 uppercase font-bold w-8">CPU</span>
                      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full transition-all duration-500",
                            parseFloat(dockerStats.stats.cpu.percent) > 80 ? "bg-red-500" : "bg-blue-500")}
                          style={{ width: `${dockerStats.stats.cpu.percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono w-8 text-right">{dockerStats.stats.cpu.percent}%</span>
                    </div>

                    {/* RAM */}
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <span className="text-[10px] text-slate-500 uppercase font-bold w-8">RAM</span>
                      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full transition-all duration-500",
                            parseFloat(dockerStats.stats.memory.percent) > 80 ? "bg-red-500" : "bg-purple-500")}
                          style={{ width: `${dockerStats.stats.memory.percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono w-8 text-right">{dockerStats.stats.memory.percent}%</span>
                    </div>

                    {/* DISK (Host) */}
                    {dockerStats.host?.disk && (
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <span className="text-[10px] text-slate-500 uppercase font-bold w-8">DISK</span>
                        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full transition-all duration-500",
                              dockerStats.host.disk.percent > 85 ? "bg-red-500" : "bg-orange-500")}
                            style={{ width: `${dockerStats.host.disk.percent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono w-8 text-right">{dockerStats.host.disk.percent}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Container Breakdown (Expanded) */}
            {networkExpanded && dockerStats?.containers && (
              <div className="mt-4 pt-4 border-t border-slate-800 animate-in slide-in-from-top-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {dockerStats.containers.map((c: any) => (
                    <div key={c.name} className="bg-slate-950/40 border border-slate-800/60 p-4 rounded-xl flex flex-col gap-3 group hover:border-blue-500/30 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", c.fallback ? "bg-orange-500" : "bg-green-500")} />
                          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">{c.name.replace('sdwan-', '')}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{c.id || 'LOCAL'}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Bitrate</span>
                          <div className="flex flex-col text-[11px] font-mono whitespace-nowrap">
                            <span className="text-blue-400">↓ {formatBitrate(c.network.rx_mbps)}</span>
                            <span className="text-purple-400">↑ {formatBitrate(c.network.tx_mbps)}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">CPU / RAM</span>
                          <div className="flex flex-col text-[11px] font-mono text-slate-300">
                            <span>{c.cpu.percent}% CPU</span>
                            <span>{c.memory.percent}% RAM</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-1 h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500/50 transition-all duration-500"
                          style={{ width: `${Math.min(100, (parseFloat(c.network.rx_mbps) + parseFloat(c.network.tx_mbps)) * 5)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expanded Details */}
            {networkExpanded && connectivity?.results && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-1">
                {connectivity.results.map((result: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-xs py-1">
                    {result.status === 'connected' ? (
                      <CheckCircle size={12} className="text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle size={12} className="text-red-400 flex-shrink-0" />
                    )}
                    <span className="text-slate-300 font-medium">{result.name}</span>
                    <span className="text-slate-500 uppercase text-[10px] px-1.5 py-0.5 bg-slate-800 rounded">
                      {result.type || 'http'}
                    </span>
                    {result.status === 'connected' && result.latency && (
                      <div className="flex items-center gap-3 ml-auto">
                        {result.score !== undefined && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold border flex items-center gap-1",
                            result.score >= 80 ? "text-green-400 bg-green-400/10 border-green-400/20" :
                              result.score >= 50 ? "text-orange-400 bg-orange-400/10 border-orange-400/20" :
                                "text-red-400 bg-red-400/10 border-red-400/20"
                          )}>
                            <Gauge size={10} /> {result.score}
                          </span>
                        )}
                        <span className="text-slate-400 font-mono">{Math.round(result.latency)}ms</span>
                      </div>
                    )}
                    {result.status !== 'connected' && result.error && (
                      <span className="text-red-400 ml-auto text-[10px]">{result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card
              title="Traffic Rate"
              value={`${Math.round(currentRpm)} req/min`}
              icon={<Activity />}
              subValue={`Total: ${stats?.total_requests || 0}`}
            />
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
      ) : view === 'performance' ? (
        <ConnectivityPerformance token={token!} onManage={() => setView('config')} />
      ) : view === 'statistics' ? (
        <Statistics stats={stats} appConfig={appConfig} onReset={resetTrafficStats} />
      ) : view === 'security' ? (
        <Security token={token!} />
      ) : view === 'voice' ? (
        <Voice token={token!} />
      ) : view === 'failover' ? (
        <Failover token={token!} />
      ) : view === 'system' ? (
        <System token={token!} />
      ) : (
        <Config token={token!} />
      )}
    </div >
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
