import React, { useState, useEffect } from 'react';
import { Activity, Clock, Shield, Search, ChevronRight, BarChart3, AlertCircle, Info, Play, Pause, Trash2, Zap, Server, Globe, Hash, Plus, Target, X } from 'lucide-react';

interface FailoverProps {
    token: string;
}

export default function Failover({ token }: FailoverProps) {
    const [endpoints, setEndpoints] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTarget, setNewTarget] = useState({ label: '', target: '', port: 6100 });

    const [rate, setRate] = useState(50);
    const [running, setRunning] = useState(false);
    const [activeInterfaces, setActiveInterfaces] = useState<string[]>([]);
    const [currentTest, setCurrentTest] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    const authHeaders = () => ({ 'Authorization': `Bearer ${token}` });

    const fetchEndpoints = async () => {
        try {
            const res = await fetch('/api/convergence/endpoints', { headers: authHeaders() });
            const data = await res.json();
            setEndpoints(data);

            const ifaceRes = await fetch('/api/config/interfaces', { headers: authHeaders() });
            const ifaceData = await ifaceRes.json();
            setActiveInterfaces(ifaceData);
        } catch (e) { }
    };

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/convergence/status', { headers: authHeaders() });
            const data = await res.json();
            setRunning(data.running);
            if (data.running) {
                setCurrentTest(data);
            }
        } catch (e) { }
    };

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/convergence/history', { headers: authHeaders() });
            const data = await res.json();
            setHistory(data);
        } catch (e) { } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchEndpoints();
        fetchStatus();
        fetchHistory();
        const interval = setInterval(() => {
            fetchStatus();
            if (!running) fetchHistory();
        }, 2000);
        return () => clearInterval(interval);
    }, [running]);

    // Fast polling when running
    useEffect(() => {
        if (!running) return;
        const interval = setInterval(fetchStatus, 500);
        return () => clearInterval(interval);
    }, [running]);

    const addEndpoint = async () => {
        if (!newTarget.label || !newTarget.target) return;
        try {
            const res = await fetch('/api/convergence/endpoints', {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(newTarget)
            });
            if (res.ok) {
                fetchEndpoints();
                setShowAddModal(false);
                setNewTarget({ label: '', target: '', port: 6100 });
            }
        } catch (e) { }
    };

    const deleteEndpoint = async (id: string) => {
        if (!confirm('Are you sure you want to delete this target?')) return;
        try {
            await fetch(`/api/convergence/endpoints/${id}`, { method: 'DELETE', headers: authHeaders() });
            fetchEndpoints();
        } catch (e) { }
    };

    const startTest = async (endpoint: any) => {
        try {
            const res = await fetch('/api/convergence/start', {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target: endpoint.target,
                    port: endpoint.port,
                    rate,
                    label: endpoint.label
                })
            });
            const data = await res.json();
            if (data.success) {
                setRunning(true);
            } else {
                alert(data.error);
            }
        } catch (e) { }
    };

    const stopTest = async () => {
        try {
            await fetch('/api/convergence/stop', { method: 'POST', headers: authHeaders() });
            setRunning(false);
            setCurrentTest(null);
            fetchHistory();
        } catch (e) { }
    };

    const getVerdict = (maxBlackout: number) => {
        if (maxBlackout === 0) return { label: 'PERFECT', color: 'text-green-400', bg: 'bg-green-400/10', desc: 'No packet loss detected.' };
        if (maxBlackout < 1000) return { label: 'GOOD', color: 'text-green-400', bg: 'bg-green-400/10', desc: 'Typical SD-WAN failover range. Sessions usually stay up.' };
        if (maxBlackout < 5000) return { label: 'DEGRADED', color: 'text-orange-400', bg: 'bg-orange-400/10', desc: 'Extended outage. Voice calls will likely drop.' };
        return { label: 'CRITICAL', color: 'text-red-400', bg: 'bg-red-400/10', desc: 'Major blackout. Application sessions will disconnect.' };
    };

    const formatMs = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Controls */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${running ? 'bg-blue-500 animate-pulse' : 'bg-slate-800'}`}>
                            <Zap size={24} className={running ? 'text-white' : 'text-slate-400'} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Convergence Lab</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-sm text-slate-400">Manage multiple failover targets for specialized test plans</p>
                                {activeInterfaces.length > 0 && (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-green-400 uppercase tracking-tighter">
                                            {activeInterfaces.join(' + ')} ACTIVE
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">Global Precision (Rate)</label>
                            <select
                                value={rate}
                                onChange={(e) => setRate(parseInt(e.target.value))}
                                disabled={running}
                                className="bg-slate-950 border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                            >
                                <option value="10">10 pps (100ms)</option>
                                <option value="20">20 pps (50ms)</option>
                                <option value="50">50 pps (20ms)</option>
                                <option value="100">100 pps (10ms)</option>
                            </select>
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            disabled={running}
                            className="mt-5 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-bold transition-all border border-slate-700 disabled:opacity-50"
                        >
                            <Plus size={18} /> ADD TARGET
                        </button>
                    </div>
                </div>
            </div>

            {/* Target Grid / Play buttons */}
            {!running && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4">
                    {endpoints.map((e) => (
                        <div key={e.id} className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl group hover:border-blue-500/30 transition-all flex flex-col justify-between">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h4 className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{e.label}</h4>
                                    <p className="text-[10px] text-slate-500 font-mono mt-1">{e.target}:{e.port}</p>
                                </div>
                                <button
                                    onClick={() => deleteEndpoint(e.id)}
                                    className="text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <button
                                onClick={() => startTest(e)}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 rounded-lg font-bold text-xs transition-all"
                            >
                                <Play size={14} fill="currentColor" /> RUN TEST
                            </button>
                        </div>
                    ))}
                    {endpoints.length === 0 && (
                        <div className="col-span-full py-8 text-center bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
                            No targets defined. Click "Add Target" to set up your test plan.
                        </div>
                    )}
                </div>
            )}

            {/* Real-time Dashboard */}
            {running && currentTest && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in slide-in-from-top-4">
                    {/* Live Outage Metric */}
                    <div className="md:col-span-1 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
                        {currentTest.current_blackout_ms > 0 && (
                            <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
                        )}
                        <div className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-widest flex items-center gap-2">
                            Current Outage
                        </div>
                        <div className={`text-5xl font-mono font-bold ${currentTest.current_blackout_ms > 0 ? 'text-red-400' : 'text-slate-600'}`}>
                            {currentTest.current_blackout_ms}ms
                        </div>
                        <div className="mt-4 flex flex-col items-center">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Max Blackout</span>
                            <span className="text-lg font-bold text-orange-400">{currentTest.max_blackout_ms}ms</span>
                        </div>
                    </div>

                    {/* Timeline Chart */}
                    <div className="md:col-span-3 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                    <Hash size={16} className="text-blue-400" /> {currentTest.test_id}
                                </span>
                                <span className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                    <Server size={16} className="text-purple-400" /> Port: {currentTest.source_port}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">SENT: {currentTest.sent}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">RECV: {currentTest.received}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">LOSS: {currentTest.loss_pct}%</span>
                            </div>
                        </div>

                        <div className="h-[120px] w-full flex items-end gap-0.5">
                            {currentTest.history?.map((val: number, i: number) => (
                                <div
                                    key={i}
                                    className={`flex-1 min-w-[2px] transition-all duration-300 ${val === 1 ? 'bg-blue-500 h-full' : 'bg-red-500 h-1/4 animate-pulse'}`}
                                    title={val === 1 ? 'Packet Received' : 'Packet Lost'}
                                />
                            ))}
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 font-bold">LAST 100 PACKETS</span>

                            <button
                                onClick={stopTest}
                                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-extrabold transition-all shadow-lg shadow-red-900/20 flex items-center gap-2"
                            >
                                <Pause size={12} fill="currentColor" /> STOP TEST
                            </button>

                            <span className="text-[10px] text-slate-500 font-bold">REAL-TIME STREAMING</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Verdict Legend & Historical View */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${running ? 'opacity-50 grayscale transition-all' : ''}`}>
                <div className="md:col-span-1 space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Failover Thresholds
                    </h3>
                    <div className="space-y-3">
                        {[
                            { color: 'text-green-400', label: 'GOOD', range: '< 1s', desc: 'Typical SD-WAN sub-second or near-second convergence.' },
                            { color: 'text-orange-400', label: 'DEGRADED', range: '1s - 5s', desc: 'Noticeable outage. Video freeze and voice drops expected.' },
                            { color: 'text-red-400', label: 'CRITICAL', range: '> 5s', desc: 'Major network blackout. Application session risk.' }
                        ].map(v => (
                            <div key={v.label} className="bg-slate-900/30 border border-slate-800 p-3 rounded-xl flex gap-3">
                                <div className={`font-bold text-xs min-w-[70px] ${v.color}`}>{v.label}</div>
                                <div>
                                    <div className="text-[10px] font-bold text-slate-200">{v.range}</div>
                                    <div className="text-[10px] text-slate-500 leading-tight">{v.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={16} /> Test History
                        </h3>
                        {history.length > 0 && (
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{history.length} TESTS RECORDED</span>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900/70 border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase tracking-tight">Date / ID</th>
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase tracking-tight text-center">Verdict</th>
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase tracking-tight text-center">Max Blackout</th>
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase tracking-tight text-center">Loss</th>
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase tracking-tight text-right">Source Port</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {history.map((h, i) => {
                                    const verdict = getVerdict(h.max_blackout_ms);
                                    return (
                                        <tr key={i} className="hover:bg-slate-800/40 group transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-200 font-bold group-hover:text-blue-400 transition-colors uppercase tracking-tight">{h.test_id}</span>
                                                    <span className="text-[10px] text-slate-500 mt-0.5">{new Date(h.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-[10px] border ${verdict.bg} ${verdict.color} border-${verdict.color.split('-')[1]}-500/20`}>
                                                    {verdict.label}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`font-mono text-sm font-bold ${h.max_blackout_ms > 0 ? 'text-orange-400' : 'text-slate-400'}`}>
                                                    {formatMs(h.max_blackout_ms)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-mono text-slate-400">
                                                {h.loss_pct}%
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-slate-500">
                                                {h.source_port}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {history.length === 0 && !loadingHistory && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                            No failover tests recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Info Footer */}
            <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex items-start gap-3">
                <Info size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider">Under the hood</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed italic">
                        This test sends high-frequency UDP packets (millisecond timestamps) to the target server.
                        It calculates failover duration based on <strong>packet sequence gaps</strong>.
                        Use this to validate SD-WAN steering policies and tunnel convergence times during circuit failover events.
                        <span className="block mt-1 font-bold text-slate-500">Correlation tip: Use the TEST ID and Source Port displayed while the test is running to search for logs in your SD-WAN Orchestrator or firewall.</span>
                    </p>
                </div>
            </div>

            {/* Add Target Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Target size={20} className="text-blue-400" /> Add Failover Target
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Target Label</label>
                                <input
                                    type="text"
                                    placeholder="e.g. DC1 - Primary"
                                    value={newTarget.label}
                                    onChange={(e) => setNewTarget({ ...newTarget, label: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">IP / Hostname</label>
                                    <input
                                        type="text"
                                        placeholder="192.168.1.10"
                                        value={newTarget.target}
                                        onChange={(e) => setNewTarget({ ...newTarget, target: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Port</label>
                                    <input
                                        type="number"
                                        value={newTarget.port}
                                        onChange={(e) => setNewTarget({ ...newTarget, port: parseInt(e.target.value) })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl flex gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all text-sm"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={addEndpoint}
                                className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-900/20 text-sm"
                            >
                                SAVE TARGET
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
