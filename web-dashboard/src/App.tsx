import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Server, AlertCircle, LayoutDashboard, Settings, LogOut, Key, UserPlus, BarChart3, Wifi, Shield, ChevronDown, CheckCircle, XCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Config from './Config';
import Login from './Login';
import Statistics from './Statistics';
import Security from './Security';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// 🔥 MODIFICATION: Ajout de requests_per_minute dans l'interface
interface Stats {
    timestamp: number;
    total_requests: number;
    requests_per_minute: number; // ⬅️ NOUVEAU
    requests_by_app: Record<string, number>;
    errors_by_app: Record<string, number>;
}

export default function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [username, setUsername] = useState(localStorage.getItem('username'));
    const [view, setView] = useState<'dashboard' | 'config' | 'statistics' | 'security'>('dashboard');
    const [stats, setStats] = useState<Stats | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    
    // 🔥 MODIFICATION: Nouveau state pour l'historique des taux
    const [rateHistory, setRateHistory] = useState<Array<{time: string, rate: number}>>([]);
    
    const [status, setStatus] = useState<'running' | 'stopped' | 'unknown'>('unknown');
    const [logs, setLogs] = useState<string[]>([]);
    const [showPwdModal, setShowPwdModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [trafficRunning, setTrafficRunning] = useState(false);
    const [configValid, setConfigValid] = useState(false);
    const [version, setVersion] = useState('');
    const [connectivity, setConnectivity] = useState<any>(null);
    const [dockerStats, setDockerStats] = useState<any>(null);
    const [networkExpanded, setNetworkExpanded] = useState(false);

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

    // 🔥 MODIFICATION: Mise à jour du fetchStats pour inclure rateHistory
    const fetchStats = async () => {
        if (!token) return;
        try {
            const res = await fetch('/api/stats', { headers: authHeaders() });
            if (res.status === 403 || res.status === 401) logout();
            const data = await res.json();
            if (data.timestamp) {
                setStats(data);
                
                // Mise à jour de l'historique des requêtes totales
                setHistory(prev => {
                    const newEntry = {
                        time: new Date(data.timestamp * 1000).toLocaleTimeString(),
                        requests: data.total_requests,
                        ...data.requests_by_app
                    };
                    const newHistory = [...prev, newEntry];
                    if (newHistory.length > 20) newHistory.shift();
                    return newHistory;
                });
                
                // 🔥 NOUVEAU: Mise à jour de l'historique du taux (req/min)
                setRateHistory(prev => {
                    const newRateEntry = {
                        time: new Date().toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            second: '2-digit'
                        }),
                        rate: data.requests_per_minute || 0
                    };
                    const newRateHistory = [...prev, newRateEntry];
                    if (newRateHistory.length > 15) newRateHistory.shift(); // Garder 15 points
                    return newRateHistory;
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
    };

    const fetchVersion = async () => {
        try {
            const res = await fetch('/api/version');
            const data = await res.json();
            if (data.version) setVersion(data.version);
        } catch (e) {
            console.error("Failed to fetch version");
        }
    };

    const fetchConnectivity = async () => {
        if (!token) return;
        try {
            const res = await fetch('/api/connectivity/test', { headers: authHeaders() });
            const data = await res.json();
            setConnectivity(data);
        } catch (e) {
            console.error("Failed to fetch connectivity");
        }
    };

    const fetchDockerStats = async () => {
        if (!token) return;
        try {
            const res = await fetch('/api/connectivity/docker-stats', { headers: authHeaders() });
            const data = await res.json();
            setDockerStats(data);
        } catch (e) {
            console.error("Failed to fetch Docker stats");
        }
    };

    useEffect(() => {
        if (!token) return;
        
        fetchStats();
        fetchLogs();
        fetchTrafficStatus();
        checkConfigValid();
        fetchVersion();
        fetchConnectivity();
        fetchDockerStats();

        const interval = setInterval(() => {
            fetchStats();
            fetchLogs();
            fetchTrafficStatus();
            fetchDockerStats();
        }, 2000);

        const connectivityInterval = setInterval(() => {
            fetchConnectivity();
        }, 30000);

        return () => {
            clearInterval(interval);
            clearInterval(connectivityInterval);
        };
    }, [token]);

    const totalErrors = stats ? Object.values(stats.errors_by_app).reduce((a, b) => a + b, 0) : 0;
    const successRate = stats ? ((stats.total_requests - totalErrors) / stats.total_requests * 100).toFixed(1) : '100';

    if (!token) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
            {/* Add User Modal */}
            {showAddUserModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-96">
                        <h3 className="text-xl font-bold mb-4">Add New User</h3>
                        <input
                            type="text"
                            placeholder="Username"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mb-2 focus:border-blue-500 outline-none"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={newUserPassword}
                            onChange={(e) => setNewUserPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mb-4 focus:border-blue-500 outline-none"
                        />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowAddUserModal(false)} className="px-4 py-2 text-slate-400 hover:text-slate-200">Cancel</button>
                            <button onClick={addUser} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Modal */}
            {showPwdModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-96">
                        <h3 className="text-xl font-bold mb-4">Change Password</h3>
                        <input
                            type="password"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mb-4 focus:border-blue-500 outline-none"
                        />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowPwdModal(false)} className="px-4 py-2 text-slate-400 hover:text-slate-200">Cancel</button>
                            <button onClick={changePassword} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Activity className="text-blue-500" size={32} />
                        <div>
                            <h1 className="text-xl font-bold">SD-WAN Traffic Generator</h1>
                            {version && <p className="text-xs text-slate-500">v{version}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {username === 'admin' && (
                            <button onClick={() => setShowAddUserModal(true)} title="Add User" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-green-400 transition-colors">
                                <UserPlus size={20} />
                            </button>
                        )}
                        <button onClick={() => setShowPwdModal(true)} title="Change Password" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-400 transition-colors">
                            <Key size={20} />
                        </button>
                        <button onClick={logout} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
                            <LogOut size={20} />
                            <span>Logout ({username})</span>
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="max-w-7xl mx-auto px-6 flex gap-1">
                    <button
                        onClick={() => setView('dashboard')}
                        className={cn(
                            "px-4 py-3 flex items-center gap-2 font-medium border-b-2 transition-colors",
                            view === 'dashboard' ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"
                        )}
                    >
                        <LayoutDashboard size={18} />
                        Dashboard
                    </button>
                    <button
                        onClick={() => setView('statistics')}
                        className={cn(
                            "px-4 py-3 flex items-center gap-2 font-medium border-b-2 transition-colors",
                            view === 'statistics' ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"
                        )}
                    >
                        <BarChart3 size={18} />
                        Statistics
                    </button>
                    <button
                        onClick={() => setView('config')}
                        className={cn(
                            "px-4 py-3 flex items-center gap-2 font-medium border-b-2 transition-colors",
                            view === 'config' ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"
                        )}
                    >
                        <Settings size={18} />
                        Configuration
                    </button>
                    <button
                        onClick={() => setView('security')}
                        className={cn(
                            "px-4 py-3 flex items-center gap-2 font-medium border-b-2 transition-colors",
                            view === 'security' ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"
                        )}
                    >
                        <Shield size={18} />
                        Security
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                {view === 'dashboard' ? (
                    <>
                        {/* Traffic Control Panel */}
                        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-100 mb-2">Traffic Generation</h2>
                                <p className="text-slate-400">
                                    Status: <span className={trafficRunning ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>{trafficRunning ? 'Active' : 'Paused'}</span>
                                    {' • '}
                                    Configuration: <span className={configValid ? 'text-green-400 font-semibold' : 'text-yellow-400 font-semibold'}>{configValid ? 'Valid' : 'Required'}</span>
                                </p>
                            </div>
                            <button
                                onClick={handleTrafficToggle}
                                disabled={!configValid}
                                className={cn(
                                    "px-6 py-3 rounded-lg font-semibold transition-colors",
                                    !configValid && "opacity-50 cursor-not-allowed",
                                    trafficRunning 
                                        ? "bg-red-600 hover:bg-red-700 text-white" 
                                        : "bg-green-600 hover:bg-green-700 text-white"
                                )}
                            >
                                {trafficRunning ? '⏸ Stop Traffic' : '▶ Start Traffic'}
                            </button>
                        </div>

                        {!configValid && (
                            <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-xl p-4 flex items-start gap-3">
                                <AlertCircle className="text-yellow-400 flex-shrink-0" size={24} />
                                <p className="text-yellow-200">
                                    Please configure at least one network interface in the <button onClick={() => setView('config')} className="underline font-semibold hover:text-yellow-300">Configuration tab</button> before starting traffic generation.
                                </p>
                            </div>
                        )}

                        {/* Network Monitoring */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                                    <Wifi size={18} className="text-blue-400" />
                                    Network Status
                                </h3>
                                <button
                                    onClick={() => setNetworkExpanded(!networkExpanded)}
                                    className="text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    <ChevronDown size={20} className={cn("transition-transform", networkExpanded && "rotate-180")} />
                                </button>
                            </div>

                            {/* Compact Summary */}
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                {/* Connectivity Status */}
                                {connectivity && (
                                    <div className="flex items-center gap-2">
                                        {connectivity.connected ? (
                                            <>
                                                <CheckCircle size={16} className="text-green-400" />
                                                <span className="text-green-400">{connectivity.results?.filter((r: any) => r.status === 'connected').length || 0}/{connectivity.results?.length || 0} endpoints</span>
                                                {connectivity.latency && (
                                                    <span className="text-slate-500">({Math.round(connectivity.latency)}ms avg)</span>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <XCircle size={16} className="text-red-400" />
                                                <span className="text-red-400">{connectivity.results?.filter((r: any) => r.status !== 'connected').length || 0} offline</span>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Docker Stats */}
                                {dockerStats?.success && (
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <span>↓ {dockerStats.stats.received_mb} MB</span>
                                        <span>↑ {dockerStats.stats.transmitted_mb} MB</span>
                                    </div>
                                )}
                            </div>

                            {/* Expanded Details */}
                            {networkExpanded && connectivity?.results && (
                                <div className="mt-4 space-y-2">
                                    {connectivity.results.map((result: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-800/50 rounded text-sm">
                                            <div className="flex items-center gap-2">
                                                {result.status === 'connected' ? (
                                                    <CheckCircle size={14} className="text-green-400" />
                                                ) : (
                                                    <XCircle size={14} className="text-red-400" />
                                                )}
                                                <span className="font-medium">{result.name}</span>
                                                <span className="text-slate-500 text-xs">{result.type || 'http'}</span>
                                            </div>
                                            <div>
                                                {result.status === 'connected' && result.latency && (
                                                    <span className="text-green-400">{Math.round(result.latency)}ms</span>
                                                )}
                                                {result.status !== 'connected' && result.error && (
                                                    <span className="text-red-400 text-xs">{result.error}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 🔥 MODIFICATION: Metrics Grid avec req/min en principal */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <Card 
                                title="Requêtes / minute" 
                                value={stats?.requests_per_minute || 0}
                                subValue={`Total: ${stats?.total_requests?.toLocaleString() || 0}`}
                                icon={<Activity className="text-blue-400" />} 
                            />
                            <Card 
                                title="Success Rate" 
                                value={`${successRate}%`} 
                                subValue={`${totalErrors} Errors`}
                                icon={<Server className="text-green-400" />} 
                            />
                            <Card 
                                title="Active Apps" 
                                value={stats ? Object.keys(stats.requests_by_app).length : 0} 
                                icon={<BarChart3 className="text-purple-400" />} 
                            />
                            <Card 
                                title="Total Requests" 
                                value={stats?.total_requests?.toLocaleString() || 0} 
                                icon={<BarChart3 className="text-slate-400" />} 
                            />
                        </div>

                        {/* 🔥 NOUVEAU: Graphique du taux de requêtes par minute */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            <h3 className="text-lg font-semibold mb-4 text-slate-200">Taux de requêtes (req/min)</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={rateHistory}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="time" stroke="#64748b" style={{ fontSize: '12px' }} />
                                    <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                        labelStyle={{ color: '#94a3b8' }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="rate" 
                                        stroke="#3b82f6" 
                                        strokeWidth={2} 
                                        dot={{ fill: '#3b82f6', r: 3 }}
                                        name="Req/min"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Main Chart - Traffic Volume */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            <h3 className="text-lg font-semibold mb-4 text-slate-200">Traffic Volume</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="time" stroke="#64748b" style={{ fontSize: '12px' }} />
                                    <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                        labelStyle={{ color: '#94a3b8' }}
                                    />
                                    <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} name="Total Requests" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Logs Terminal */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            <h3 className="text-lg font-semibold mb-4 text-slate-200">Live Logs</h3>
                            <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-green-400 h-64 overflow-y-auto space-y-1">
                                {logs.map((log, i) => (
                                    <div key={i}>{log}</div>
                                ))}
                                {logs.length === 0 && <div className="text-slate-600">Waiting for logs... (Make sure traffic logs exist)</div>}
                            </div>
                        </div>
                    </>
                ) : view === 'statistics' ? (
                    <Statistics stats={stats} />
                ) : view === 'security' ? (
                    <Security token={token} />
                ) : (
                    <Config token={token} />
                )}
            </div>
        </div>
    );
}

function Card({ title, value, icon, subValue }: { title: string, value: string | number, icon: React.ReactNode, subValue?: string }) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm text-slate-400 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-slate-100">{value}</p>
                    {subValue && (
                        <p className="text-xs text-slate-500 mt-1">{subValue}</p>
                    )}
                </div>
                <div className="opacity-50">
                    {React.cloneElement(icon as React.ReactElement, { size: 32 })}
                </div>
            </div>
        </div>
    );
}

