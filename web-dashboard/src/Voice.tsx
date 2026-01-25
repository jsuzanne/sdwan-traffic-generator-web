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
    loss_pct?: number;
    avg_rtt_ms?: number;
    jitter_ms?: number;
    mos_score?: number;
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
    const [activeTab, setActiveTab] = useState<'status' | 'config'>('status');
    const [searchTerm, setSearchTerm] = useState('');
    const [qualityFilter, setQualityFilter] = useState<'all' | 'excellent' | 'fair' | 'poor'>('all');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'timestamp', direction: 'desc' });

    // New Guided Editor State
    const [newProbe, setNewProbe] = useState({
        host: '',
        port: '6100',
        codec: 'G.711-ulaw',
        weight: '50',
        duration: '30'
    });
    const [showGuided, setShowGuided] = useState(true);

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

    const resetLogs = async () => {
        if (!confirm('Are you sure you want to reset all voice call history?')) return;
        try {
            const res = await fetch('/api/voice/stats', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                // Next poll will clear it
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

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedCalls = React.useMemo(() => {
        if (!sortConfig) return calls;
        return [...calls].sort((a: any, b: any) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [calls, sortConfig]);

    const addProbeFromForm = () => {
        const { host, port, codec, weight, duration } = newProbe;
        if (!host || !port) return alert("Host and Port are required");

        const newLine = `${host}:${port}|${codec}|${weight}|${duration}`;
        setRawServers(prev => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed}\n${newLine}` : newLine;
        });
        setNewProbe({ ...newProbe, host: '' }); // Clear host for next entry
    };

    const removeProbeAt = (lineIndex: number) => {
        const lines = rawServers.split('\n');
        const newLines = lines.filter((_, i) => i !== lineIndex);
        setRawServers(newLines.join('\n'));
    };

    const parsedProbes = React.useMemo(() => {
        return rawServers.split('\n')
            .map((line, index) => ({ line, index }))
            .filter(item => item.line.trim() && !item.line.trim().startsWith('#'))
            .map(item => {
                const parts = item.line.trim().split('|');
                const targetParts = parts[0]?.split(':') || [];
                return {
                    id: item.index,
                    target: parts[0],
                    host: targetParts[0],
                    port: targetParts[1],
                    codec: parts[1] || 'default',
                    weight: parts[2] || '—',
                    duration: parts[3] ? `${parts[3]}s` : '—',
                    raw: item.line
                };
            });
    }, [rawServers]);

    // Calculate metrics
    const activeCalls = React.useMemo(() => {
        const active: VoiceCall[] = [];
        const endedIds = new Set(calls.filter(c => c.event === 'end').map(c => c.call_id));

        calls.forEach(c => {
            if (c.event === 'start' && !endedIds.has(c.call_id)) {
                active.push(c);
            }
        });
        return active;
    }, [calls]);

    // Calculate history metrics (Summary)
    const qosSummary = React.useMemo(() => {
        const finishedCalls = calls.filter(c => c.event === 'end' && c.loss_pct !== undefined);
        if (finishedCalls.length === 0) return null;

        const totalLoss = finishedCalls.reduce((acc, c) => acc + (c.loss_pct || 0), 0);
        const rtts = finishedCalls.map(c => c.avg_rtt_ms || 0).filter(v => v > 0);
        const jitters = finishedCalls.map(c => c.jitter_ms || 0).filter(v => v > 0);

        return {
            totalCalls: finishedCalls.length,
            avgLoss: (totalLoss / finishedCalls.length).toFixed(1),
            avgRtt: rtts.length > 0 ? (rtts.reduce((a, b) => a + b, 0) / rtts.length).toFixed(1) : '0',
            minRtt: rtts.length > 0 ? Math.min(...rtts).toFixed(1) : '0',
            maxRtt: rtts.length > 0 ? Math.max(...rtts).toFixed(1) : '0',
            avgJitter: jitters.length > 0 ? (jitters.reduce((a, b) => a + b, 0) / jitters.length).toFixed(1) : '0'
        };
    }, [calls]);

    // Newest history first with Filters
    const filteredHistory = React.useMemo(() => {
        return [...calls]
            .filter(c => c.event === 'start' || c.event === 'end' || c.event === 'skipped')
            .filter(c => {
                // Search filter
                const matchesSearch = c.call_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    c.target.toLowerCase().includes(searchTerm.toLowerCase());

                if (!matchesSearch) return false;

                // Quality filter (only applies to 'end' events)
                if (qualityFilter !== 'all' && c.event === 'end') {
                    const loss = c.loss_pct || 0;
                    const rtt = c.avg_rtt_ms || 0;
                    const quality = (loss < 1 && rtt < 100) ? 'excellent' :
                        (loss < 5 && rtt < 200) ? 'fair' : 'poor';
                    return quality === qualityFilter;
                }

                return true;
            })
            .sort((a, b) => {
                if (!sortConfig) {
                    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                }
                const aVal = a[sortConfig.key as keyof typeof a];
                const bVal = b[sortConfig.key as keyof typeof b];
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
    }, [calls, searchTerm, qualityFilter, sortConfig]);

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

                {/* QoS Summary Widget */}
                {qosSummary && (
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="bg-slate-950/40 border border-slate-800/50 rounded-lg p-3">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Total Calls</div>
                            <div className="text-lg font-bold text-white">{qosSummary.totalCalls}</div>
                        </div>
                        <div className="bg-slate-950/40 border border-slate-800/50 rounded-lg p-3">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Avg Loss</div>
                            <div className={cn("text-lg font-bold", parseFloat(qosSummary.avgLoss) < 1 ? "text-green-400" : "text-yellow-400")}>
                                {qosSummary.avgLoss}%
                            </div>
                        </div>
                        <div className="bg-slate-950/40 border border-slate-800/50 rounded-lg p-3">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Avg RTT</div>
                            <div className="text-lg font-bold text-blue-400">{qosSummary.avgRtt}ms</div>
                        </div>
                        <div className="bg-slate-950/40 border border-slate-800/50 rounded-lg p-3">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Min / Max RTT</div>
                            <div className="text-sm font-bold text-slate-300">
                                {qosSummary.minRtt} <span className="text-slate-600">/</span> {qosSummary.maxRtt}ms
                            </div>
                        </div>
                        <div className="bg-slate-950/40 border border-slate-800/50 rounded-lg p-3">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Avg Jitter</div>
                            <div className="text-lg font-bold text-purple-400">{qosSummary.avgJitter}ms</div>
                        </div>
                    </div>
                )}
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
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <h3 className="text-slate-200 font-bold flex items-center gap-2">
                                <BarChart2 size={18} className="text-blue-400" /> Recent History
                            </h3>

                            <div className="flex flex-1 max-w-md gap-2">
                                <div className="relative flex-1">
                                    <Clock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Search calls..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-blue-500"
                                    />
                                </div>
                                <select
                                    value={qualityFilter}
                                    onChange={(e) => setQualityFilter(e.target.value as any)}
                                    className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500"
                                >
                                    <option value="all">All Qualities</option>
                                    <option value="excellent">Excellent 🟢</option>
                                    <option value="fair">Fair 🟡</option>
                                    <option value="poor">Poor 🔴</option>
                                </select>
                            </div>

                            <button
                                onClick={resetLogs}
                                className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 border border-red-500/30 rounded-lg transition-colors"
                            >
                                <Trash2 size={12} />
                                Reset
                            </button>
                        </div>
                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                            <table className="w-full text-sm relative">
                                <thead className="text-slate-500 text-left border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                                    <tr className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                                        {[
                                            { key: 'timestamp', label: 'Time' },
                                            { key: 'event', label: 'Event' },
                                            { key: 'target', label: 'Target' },
                                            { key: 'loss_pct', label: 'Loss / MOS' },
                                            { key: 'avg_rtt_ms', label: 'RTT / Jitter' }
                                        ].map(col => (
                                            <th
                                                key={col.key}
                                                onClick={() => handleSort(col.key)}
                                                className={`pb-3 px-2 font-medium bg-slate-900 cursor-pointer hover:text-blue-400 transition-colors ${col.key === 'avg_rtt_ms' ? 'text-right' : ''}`}
                                            >
                                                <div className={`flex items-center gap-1 ${col.key === 'avg_rtt_ms' ? 'justify-end' : ''}`}>
                                                    {col.label}
                                                    {sortConfig?.key === col.key && (
                                                        <Activity size={10} className={`text-blue-400 transform transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                                                    )}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="text-slate-400">
                                    {sortedHistory.map((call, idx) => (
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
                                            <td className="py-3 px-2">
                                                {call.event === 'end' && call.loss_pct !== undefined ? (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={cn(
                                                                "h-2 w-2 rounded-full",
                                                                call.loss_pct < 1 ? "bg-green-500" :
                                                                    call.loss_pct < 5 ? "bg-yellow-500" : "bg-red-500"
                                                            )} />
                                                            <span className={cn(
                                                                "text-[10px] font-bold",
                                                                call.loss_pct < 1 ? "text-green-400" :
                                                                    call.loss_pct < 5 ? "text-yellow-400" : "text-red-400"
                                                            )}>
                                                                {call.loss_pct}% loss
                                                            </span>
                                                        </div>
                                                        {call.mos_score !== undefined && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={cn(
                                                                    "text-[10px] font-black px-1 rounded",
                                                                    call.mos_score >= 4.0 ? "bg-green-500/20 text-green-400" :
                                                                        call.mos_score >= 3.0 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
                                                                )}>
                                                                    MOS: {call.mos_score}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-600">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-2 text-right">
                                                {call.event === 'end' && call.avg_rtt_ms !== undefined ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className={cn(
                                                            "text-[11px] font-medium",
                                                            call.avg_rtt_ms < 100 ? "text-slate-200" :
                                                                call.avg_rtt_ms < 200 ? "text-yellow-400" : "text-red-400"
                                                        )}>
                                                            {call.avg_rtt_ms}ms
                                                        </span>
                                                        <span className="text-[9px] text-slate-500">Jitter: {call.jitter_ms}ms</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-600">—</span>
                                                )}
                                            </td>
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

                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold">Guided Probe Editor</label>
                                    <button
                                        onClick={() => setShowGuided(!showGuided)}
                                        className="text-[10px] text-blue-400 hover:text-blue-300 font-bold"
                                    >
                                        {showGuided ? 'Hide Form' : 'Show Form'}
                                    </button>
                                </div>

                                {showGuided && (
                                    <div className="bg-slate-950/40 border border-slate-800/50 p-4 rounded-xl space-y-4 animate-in slide-in-from-top-2 duration-300">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 uppercase font-bold">Target IP / Host</label>
                                                <input
                                                    type="text"
                                                    placeholder="192.168.1.1"
                                                    value={newProbe.host}
                                                    onChange={e => setNewProbe({ ...newProbe, host: e.target.value })}
                                                    className="w-full bg-slate-900 border-slate-700 text-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 uppercase font-bold">Port</label>
                                                <input
                                                    type="text"
                                                    placeholder="5060"
                                                    value={newProbe.port}
                                                    onChange={e => setNewProbe({ ...newProbe, port: e.target.value })}
                                                    className="w-full bg-slate-900 border-slate-700 text-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 uppercase font-bold">Codec</label>
                                                <select
                                                    value={newProbe.codec}
                                                    onChange={e => setNewProbe({ ...newProbe, codec: e.target.value })}
                                                    className="w-full bg-slate-900 border-slate-700 text-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                                >
                                                    <option value="G.711-ulaw">G.711-ulaw</option>
                                                    <option value="G.711-alaw">G.711-alaw</option>
                                                    <option value="G.729">G.729</option>
                                                    <option value="OPUS">OPUS</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 uppercase font-bold">Weight (1-100)</label>
                                                <input
                                                    type="number"
                                                    value={newProbe.weight}
                                                    onChange={e => setNewProbe({ ...newProbe, weight: e.target.value })}
                                                    className="w-full bg-slate-900 border-slate-700 text-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 uppercase font-bold">Duration (sec)</label>
                                                <input
                                                    type="number"
                                                    value={newProbe.duration}
                                                    onChange={e => setNewProbe({ ...newProbe, duration: e.target.value })}
                                                    className="w-full bg-slate-900 border-slate-700 text-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={addProbeFromForm}
                                            className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus size={14} /> Add Target to List
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] text-slate-500 uppercase font-bold">Raw Configuration (JSONL-like)</label>
                                        <span className="text-[9px] text-slate-600 italic">Advanced users only</span>
                                    </div>
                                    <textarea
                                        value={rawServers}
                                        onChange={(e) => setRawServers(e.target.value)}
                                        rows={8}
                                        className="w-full bg-slate-900 border-slate-700 text-slate-300 rounded-lg p-3 text-[10px] font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                                        placeholder="host:port|codec|weight|duration_sec"
                                    />

                                    <div className="space-y-2 mt-4">
                                        <label className="text-[10px] text-slate-500 uppercase font-bold">Configured Probes ({parsedProbes.length})</label>
                                        <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1">
                                            {parsedProbes.map((p, i) => (
                                                <div key={i} className="flex items-center justify-between bg-slate-800/30 border border-slate-700/30 px-3 py-1.5 rounded-lg group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-[10px] font-mono text-slate-300">{p.target}</div>
                                                        <div className="text-[9px] font-bold text-slate-500 bg-slate-800 px-1 rounded">{p.codec}</div>
                                                        <div className="text-[9px] text-slate-600">Weight: {p.weight}</div>
                                                        <div className="text-[9px] text-slate-600">{p.duration}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeProbeAt(p.id)}
                                                        className="p-1 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                            {parsedProbes.length === 0 && (
                                                <div className="text-center py-4 text-[10px] text-slate-600 italic border border-dashed border-slate-800 rounded-lg">
                                                    No targets defined
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
