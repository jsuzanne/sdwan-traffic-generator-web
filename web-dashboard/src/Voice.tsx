import React, { useState, useEffect } from 'react';
import { Phone, Play, Pause, Server, BarChart2, Save, Plus, Trash2, Clock, Activity, Wifi } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface VoiceProps {
    token: string;
}

interface VoiceCall {
    timestamp: string;
    event: 'start' | 'end' | 'session_start' | 'skipped';
    call_id: string;
    pid: number;
    target: string;
    codec: string;
    duration: number;
    session_id?: string;
}

interface VoiceControl {
    enabled: boolean;
    max_simultaneous_calls: number;
    sleep_between_calls: number;
    interface: string;
}

export default function Voice({ token }: VoiceProps) {
    const [enabled, setEnabled] = useState(false);
    const [config, setConfig] = useState<VoiceControl | null>(null);
    const [rawServers, setRawServers] = useState("");
    const [calls, setCalls] = useState<VoiceCall[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'status' | 'config' | 'stats'>('status');

    useEffect(() => {
        fetchStatus();
        fetchConfig();
        const interval = setInterval(fetchStats, 5000);
        fetchStats();
        return () => clearInterval(interval);
    }, [token]);

    const fetchStatus = async () => {
        try {
            const r = await fetch('/api/voice/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await r.json();
            if (data.success) {
                setEnabled(data.enabled);
                setConfig(data);
            }
        } catch (e) { }
    };

    const fetchConfig = async () => {
        try {
            const r = await fetch('/api/voice/config', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await r.json();
            if (data.success) {
                setRawServers(data.servers);
                setLoading(false);
            }
        } catch (e) {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const r = await fetch('/api/voice/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await r.json();
            if (data.success) {
                setCalls(data.stats);
            }
        } catch (e) { }
    };

    const handleToggle = async () => {
        try {
            const r = await fetch('/api/voice/control', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ enabled: !enabled })
            });
            const data = await r.json();
            if (data.success) {
                setEnabled(data.enabled);
            }
        } catch (e) { }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const r = await fetch('/api/voice/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ servers: rawServers, control: config })
            });
            if (r.ok) {
                // Success
            }
        } catch (e) { }
        setSaving(false);
    };

    // Calculate metrics
    const activeCalls = React.useMemo(() => {
        const active: VoiceCall[] = [];

        // Get all calls that have ended
        const endedIds = new Set(calls.filter(c => c.event === 'end').map(c => c.call_id));

        // Find the latest timestamp in the logs as a reference point
        const latestLogTime = calls.length > 0
            ? Math.max(...calls.map(c => new Date(c.timestamp).getTime()))
            : 0;

        // Find starts that don't have a corresponding end
        calls.forEach(c => {
            if (c.event === 'start' && !endedIds.has(c.call_id)) {
                const startTime = new Date(c.timestamp).getTime();

                // If the call started within a reasonable window (2 hours) of the latest log entry
                // and has no END event, we consider it potentially active.
                const buffer = 2 * 60 * 60 * 1000;
                const isRecent = latestLogTime === 0 || (latestLogTime - startTime) < buffer;

                if (isRecent) {
                    active.push(c);
                }
            }
        });
        return active;
    }, [calls]);

    return (
        <div className="space-y-6">
            {/* Header Control */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-3 rounded-lg shadow-lg transition-all",
                            enabled ? "bg-blue-500/20 text-blue-400" : "bg-slate-800 text-slate-500"
                        )}>
                            <Phone size={24} className={enabled ? "animate-pulse" : ""} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Voice Simulation (RTP)</h2>
                            <p className="text-slate-400 text-sm">
                                Status: <span className={enabled ? "text-blue-400 font-semibold" : "text-slate-500 font-medium"}>
                                    {enabled ? 'Simulating' : 'Stopped'}
                                </span>
                                {enabled && ` • ${activeCalls.length} active calls`}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleToggle}
                        className={cn(
                            "px-8 py-3 rounded-lg font-bold transition-all shadow-lg flex items-center gap-2",
                            enabled
                                ? "bg-red-600 hover:bg-red-500 text-white shadow-red-500/20"
                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                        )}
                    >
                        {enabled ? <><Pause size={20} fill="currentColor" /> Stop Voice</> : <><Play size={20} fill="currentColor" /> Start Voice</>}
                    </button>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex border-b border-slate-800">
                <button
                    onClick={() => setActiveTab('status')}
                    className={cn("px-6 py-3 font-medium transition-all border-b-2",
                        activeTab === 'status' ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500")}
                >
                    Monitoring
                </button>
                <button
                    onClick={() => setActiveTab('config')}
                    className={cn("px-6 py-3 font-medium transition-all border-b-2",
                        activeTab === 'config' ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500")}
                >
                    Servers & Config
                </button>
            </div>

            {activeTab === 'status' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Active Calls Widget */}
                    <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <h3 className="text-slate-200 font-bold mb-4 flex items-center gap-2">
                            <Activity size={18} className="text-blue-400" /> Active Calls
                        </h3>
                        <div className="space-y-3">
                            {activeCalls.length === 0 ? (
                                <div className="text-slate-500 text-sm py-8 text-center bg-slate-800/20 rounded-lg">
                                    No active voice calls
                                </div>
                            ) : (
                                activeCalls.map((call, idx) => (
                                    <div key={idx} className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/30 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-1 rounded">{call.call_id}</span>
                                                <div className="text-xs font-mono text-slate-200">{call.target}</div>
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-1">{call.codec} • {call.duration}s</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping" />
                                            <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Live</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <h3 className="text-slate-200 font-bold mb-4 flex items-center gap-2">
                            <BarChart2 size={18} className="text-blue-400" /> Recent History
                        </h3>
                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                            <table className="w-full text-sm relative">
                                <thead className="text-slate-500 text-left border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                                    <tr>
                                        <th className="pb-3 px-2 font-medium bg-slate-900">Time</th>
                                        <th className="pb-3 px-2 font-medium bg-slate-900">Event</th>
                                        <th className="pb-3 px-2 font-medium bg-slate-900">Target</th>
                                        <th className="pb-3 px-2 font-medium bg-slate-900">Codec</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-400">
                                    {[...calls].reverse().map((call, idx) => (
                                        <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/10">
                                            <td className="py-3 px-2 text-xs font-mono">{new Date(call.timestamp).toLocaleTimeString()}</td>
                                            <td className="py-3 px-2">
                                                <div className="flex flex-col">
                                                    <span className={cn(
                                                        "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded w-fit",
                                                        call.event === 'start' ? "bg-blue-500/10 text-blue-400" : "bg-slate-800 text-slate-500"
                                                    )}>
                                                        {call.event}
                                                    </span>
                                                    <span className="text-[9px] text-slate-600 mt-1">{call.call_id}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2 text-xs font-mono">{call.target}</td>
                                            <td className="py-3 px-2 text-xs">{call.codec}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'config' && (
                <div className="space-y-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-slate-200 font-bold flex items-center gap-2">
                                    <Server size={18} className="text-blue-400" /> Target Configuration
                                </h3>
                                <p className="text-slate-500 text-xs mt-1">Define voice endpoints and traffic distribution weights</p>
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                            >
                                <Save size={16} /> {saving ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50 space-y-4">
                                    <h4 className="text-slate-300 text-sm font-bold mb-2">Simulation Parameters</h4>

                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase font-bold">Simultaneous Calls</label>
                                        <input
                                            type="number"
                                            value={config?.max_simultaneous_calls}
                                            onChange={(e) => setConfig(prev => prev ? { ...prev, max_simultaneous_calls: parseInt(e.target.value) } : null)}
                                            className="w-full bg-slate-900 border-slate-700 text-slate-300 rounded-lg p-2 text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase font-bold">Sleep between calls (sec)</label>
                                        <input
                                            type="number"
                                            value={config?.sleep_between_calls}
                                            onChange={(e) => setConfig(prev => prev ? { ...prev, sleep_between_calls: parseInt(e.target.value) } : null)}
                                            className="w-full bg-slate-900 border-slate-700 text-slate-300 rounded-lg p-2 text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase font-bold">Source Interface</label>
                                        <input
                                            type="text"
                                            value={config?.interface}
                                            onChange={(e) => setConfig(prev => prev ? { ...prev, interface: e.target.value } : null)}
                                            className="w-full bg-slate-900 border-slate-700 text-slate-300 rounded-lg p-2 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 uppercase font-bold">Server List (Raw text)</label>
                                <textarea
                                    value={rawServers}
                                    onChange={(e) => setRawServers(e.target.value)}
                                    rows={10}
                                    className="w-full bg-slate-900 border-slate-700 text-slate-300 rounded-lg p-4 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="host:port|codec|weight|duration_sec"
                                />
                                <p className="text-[10px] text-slate-500 italic">One target per line. Format: host:port|codec|weight|duration</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
