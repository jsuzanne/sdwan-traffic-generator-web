import React, { useState, useEffect } from 'react';
import { Activity, Clock, Shield, Search, ChevronRight, BarChart3, AlertCircle, Info, Play, Pause, Trash2, Zap, Server, Globe, Hash, Plus, Target, X, Square } from 'lucide-react';

interface FailoverProps {
    token: string;
}

export default function Failover({ token }: FailoverProps) {
    const [endpoints, setEndpoints] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTarget, setNewTarget] = useState({ label: '', target: '', port: 6100 });

    const [rate, setRate] = useState(50);
    const [selectedEndpoints, setSelectedEndpoints] = useState<string[]>([]);
    const [activeTests, setActiveTests] = useState<any[]>([]);
    const [activeInterfaces, setActiveInterfaces] = useState<string[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'timestamp', direction: 'desc' });

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
            setActiveTests(data);
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
            if (activeTests.length === 0) fetchHistory();
        }, 2000);
        return () => clearInterval(interval);
    }, [activeTests.length === 0]);

    // Fast polling when tests are active
    useEffect(() => {
        if (activeTests.length === 0) return;
        const interval = setInterval(fetchStatus, 500);
        return () => clearInterval(interval);
    }, [activeTests.length]);

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
            // Fix selection counter: remove from selected if deleted
            setSelectedEndpoints(prev => prev.filter(eId => eId !== id));
        } catch (e) { }
    };

    const startTest = async (endpointIds: string[]) => {
        const targets = endpoints.filter(e => endpointIds.includes(e.id));

        // Immediate UI feedback: Clear selection and show loading if needed
        // Running tests in parallel for speed
        try {
            await Promise.all(targets.map(endpoint =>
                fetch('/api/convergence/start', {
                    method: 'POST',
                    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        target: endpoint.target,
                        port: endpoint.port,
                        rate,
                        label: endpoint.label
                    })
                })
            ));
        } catch (e) { }

        fetchStatus();
        setSelectedEndpoints([]);
    };

    const stopTest = async (testId?: string) => {
        try {
            await fetch('/api/convergence/stop', {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ testId })
            });
            fetchStatus();
            fetchHistory();
        } catch (e) { }
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedHistory = React.useMemo(() => {
        if (!sortConfig) return history;
        return [...history].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [history, sortConfig]);

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

    const selectedCount = endpoints.filter(e => selectedEndpoints.includes(e.id)).length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Controls */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${activeTests.length > 0 ? 'bg-blue-500 animate-pulse' : 'bg-slate-800'}`}>
                            <Zap size={24} className={activeTests.length > 0 ? 'text-white' : 'text-slate-400'} />
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
                                disabled={activeTests.length > 0}
                                className="bg-slate-950 border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                            >
                                <option value="1">1 pps (1s)</option>
                                <option value="5">5 pps (200ms)</option>
                                <option value="10">10 pps (100ms)</option>
                                <option value="20">20 pps (50ms)</option>
                                <option value="50">50 pps (20ms)</option>
                                <option value="100">100 pps (10ms)</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-4">
                            {activeTests.length > 0 && (
                                <button
                                    onClick={() => stopTest()}
                                    className="mt-5 flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-sm font-bold transition-all border border-red-500/30 shadow-lg shadow-red-900/20 group"
                                >
                                    <Square size={16} fill="currentColor" className="group-hover:animate-pulse" /> STOP ALL PROBES
                                </button>
                            )}
                            {selectedCount > 0 && (
                                <button
                                    onClick={() => startTest(selectedEndpoints)}
                                    className="mt-5 flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-900/40 border border-blue-400/30"
                                >
                                    <Play size={18} fill="currentColor" /> START {selectedCount} {selectedCount === 1 ? 'TEST' : 'TESTS'}
                                </button>
                            )}
                            <button
                                onClick={() => setShowAddModal(true)}
                                disabled={activeTests.length > 0}
                                className="mt-5 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-bold transition-all border border-slate-700 disabled:opacity-50"
                            >
                                <Plus size={18} /> ADD TARGET
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4">
                {endpoints.map((e) => {
                    const isSelected = selectedEndpoints.includes(e.id);
                    return (
                        <div
                            key={e.id}
                            onClick={() => {
                                if (isSelected) setSelectedEndpoints(selectedEndpoints.filter(id => id !== e.id));
                                else setSelectedEndpoints([...selectedEndpoints, e.id]);
                            }}
                            className={`bg-slate-900/40 border p-4 rounded-xl group cursor-pointer transition-all flex flex-col justify-between ${isSelected ? 'border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/10' : 'border-slate-800 hover:border-slate-700'}`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 border-blue-400' : 'bg-slate-950 border-slate-700'}`}>
                                        {isSelected && <Zap size={12} className="text-white" fill="currentColor" />}
                                    </div>
                                    <div>
                                        <h4 className={`font-bold transition-colors uppercase tracking-tight ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>{e.label}</h4>
                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{e.target}:{e.port}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={(e_stop) => { e_stop.stopPropagation(); deleteEndpoint(e.id); }}
                                    className="text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <div className="w-full flex items-center justify-center gap-2 py-2 bg-slate-950/50 text-slate-400 border border-slate-800 rounded-lg font-bold text-[10px] uppercase tracking-wider">
                                {isSelected ? 'READY TO START' : 'SELECT TARGET'}
                            </div>
                        </div>
                    );
                })}
                {endpoints.length === 0 && (
                    <div className="col-span-full py-8 text-center bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
                        No targets defined. Click "Add Target" to set up your test plan.
                    </div>
                )}
            </div>

            {/* Active Tests Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-top-4">
                {activeTests.map((test) => (
                    <div key={test.testId} className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col md:flex-row">
                        {/* Live Outage Metric */}
                        <div className="md:w-1/3 p-6 flex flex-col items-center justify-center text-center relative border-b md:border-b-0 md:border-r border-slate-800">
                            {test.current_blackout_ms > 0 && (
                                <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
                            )}
                            <div className="text-slate-400 text-[10px] font-bold mb-2 uppercase tracking-widest flex items-center gap-2">
                                <Activity size={12} className="text-blue-400" /> Current Outage
                            </div>
                            <div className={`text-4xl font-mono font-bold ${test.current_blackout_ms > 0 ? 'text-red-400' : 'text-slate-600'}`}>
                                {test.current_blackout_ms}ms
                            </div>
                            <div className="mt-4 flex flex-col items-center">
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Max Blackout</span>
                                <span className="text-lg font-bold text-orange-400">{test.max_blackout_ms}ms</span>
                            </div>
                        </div>

                        {/* Timeline Chart */}
                        <div className="flex-1 p-6 relative">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white uppercase tracking-tighter">
                                            {test.testId}
                                        </span>
                                        <span className="text-sm font-bold text-slate-200 uppercase tracking-tight">
                                            {test.test_id?.split(' (')[0] || 'Loading...'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                                        <Server size={10} /> Source Port: {test.source_port}
                                    </span>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex gap-1.5">
                                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 uppercase">SENT: {test.sent}</span>
                                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">RECV: {test.received}</span>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-900 border border-slate-800 text-slate-300">
                                            TOTAL: {test.loss_pct}%
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                            ↑ TX {test.tx_loss_pct}%
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            ↓ RX {test.rx_loss_pct}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="h-[60px] w-full flex items-end gap-0.5 mb-4">
                                {test.history?.map((val: number, i: number) => (
                                    <div
                                        key={i}
                                        className={`flex-1 min-w-[1px] transition-all duration-300 ${val === 1 ? 'bg-blue-500 h-full' : 'bg-red-500 h-1/4 animate-pulse'}`}
                                    />
                                ))}
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Live Sequence Monitoring</span>
                                <button
                                    onClick={() => stopTest(test.testId)}
                                    className="px-3 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded border border-red-500/30 text-[9px] font-bold transition-all flex items-center gap-2"
                                >
                                    <Pause size={10} fill="currentColor" /> STOP PROBE
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Verdict Legend & Historical View */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${activeTests.length > 0 ? 'opacity-50 grayscale transition-all text-xs' : ''}`}>
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
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase tracking-tight text-center">Loss (↑TX / ↓RX)</th>
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase tracking-tight text-right">PPS</th>
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase tracking-tight text-right">SOURCE PORT</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {history.map((test, idx) => {
                                    const verdict = getVerdict(test.max_blackout_ms);
                                    return (
                                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-200 flex items-center gap-2">
                                                    <span className="bg-blue-500/10 text-blue-400 text-[9px] px-1.5 py-0.5 rounded font-bold border border-blue-500/20">{test.test_id?.match(/\((CONV-\d+)\)/)?.[1] || 'CONV-??'}</span>
                                                    <span>{test.label || test.test_id?.split(' (')[0]}</span>
                                                </div>
                                                <div className="text-xs text-slate-500">{new Date(test.timestamp).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-[10px] border ${verdict.bg.replace('/10', '/30')} ${verdict.color}`}>
                                                    {verdict.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`font-mono text-sm font-bold ${test.max_blackout_ms > 0 ? 'text-orange-400' : 'text-slate-400'}`}>
                                                    {formatMs(test.max_blackout_ms)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={`font-mono text-sm font-bold ${test.loss_pct > 2 ? 'text-red-400' : 'text-slate-400'}`}>
                                                        {test.loss_pct}%
                                                    </span>
                                                    <div className="flex gap-2 text-[9px] mt-1 font-mono">
                                                        <span className="text-red-400/70" title="Uplink Loss">↑ {test.tx_loss_pct || 0}% ({test.tx_loss_ms || 0}ms)</span>
                                                        <span className="text-blue-400/70" title="Downlink Loss">↓ {test.rx_loss_pct || 0}% ({test.rx_loss_ms || 0}ms)</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-blue-400 font-mono text-xs">{test.rate_pps || test.rate || '--'} pps</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-slate-500 font-mono text-xs">{test.source_port}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {history.length === 0 && !loadingHistory && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
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
