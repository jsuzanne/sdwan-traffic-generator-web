import React, { useState, useEffect } from 'react';
import { Gauge, Activity, Clock, Filter, Download, Zap, Shield, Search, ChevronRight, BarChart3, AlertCircle, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface ConnectivityPerformanceProps {
    token: string;
}

export default function ConnectivityPerformance({ token }: ConnectivityPerformanceProps) {
    const [results, setResults] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('24h');
    const [filterType, setFilterType] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEndpoint, setSelectedEndpoint] = useState<any>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const authHeaders = () => ({ 'Authorization': `Bearer ${token}` });

    const formatMs = (val: number | undefined | null) => {
        if (val === undefined || val === null) return '0';
        return val < 10 ? val.toFixed(2) : val.toFixed(1);
    };

    const fetchData = async () => {
        try {
            const statsRes = await fetch('/api/connectivity/stats', { headers: authHeaders() });
            const statsData = await statsRes.json();
            setStats(statsData);

            const resultsRes = await fetch(`/api/connectivity/results?timeRange=${timeRange}&limit=500`, { headers: authHeaders() });
            const resultsData = await resultsRes.json();
            setResults(resultsData.results || []);
        } catch (e) {
            console.error("Failed to fetch connectivity data", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [timeRange]);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-400 bg-green-400/10 border-green-400/20';
        if (score >= 50) return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
        if (score > 0) return 'text-red-400 bg-red-400/10 border-red-400/20';
        return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    };

    const formatTimestamp = (ts: number) => {
        return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Aggregate data for table
    const endpoints = Array.from(new Set(results.map(r => r.endpointId))).map(id => {
        const endpointResults = results.filter(r => r.endpointId === id);
        const last = endpointResults[0];
        const reachable = endpointResults.filter(r => r.reachable);

        return {
            id,
            name: last?.endpointName,
            type: last?.endpointType,
            lastScore: last?.score,
            avgScore: reachable.length > 0 ? Math.round(reachable.reduce((acc, r) => acc + r.score, 0) / reachable.length) : 0,
            avgLatency: reachable.length > 0 ? Math.round(reachable.reduce((acc, r) => acc + r.metrics.total_ms, 0) / reachable.length) : 0,
            maxLatency: reachable.length > 0 ? Math.max(...reachable.map(r => r.metrics.total_ms)) : 0,
            checks: endpointResults.length,
            successRate: Math.round((reachable.length / endpointResults.length) * 100),
            lastResult: last
        };
    }).filter(e => {
        if (filterType !== 'ALL' && e.type !== filterType) return false;
        if (searchQuery && !e.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    // Prepare chart data
    const chartData = results.slice(0, 50).reverse().map(r => ({
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        score: r.score,
        total: parseFloat(r.metrics.total_ms.toFixed(1)),
        ttfb: parseFloat((r.metrics.ttfb_ms || 0).toFixed(1)),
        tls: parseFloat((r.metrics.tls_ms || 0).toFixed(1)),
        tcp: parseFloat((r.metrics.tcp_ms || 0).toFixed(1)),
        dns: parseFloat((r.metrics.dns_ms || 0).toFixed(1)),
        endpointName: r.endpointName
    }));

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                    <div className="text-slate-400 text-sm font-medium mb-2 uppercase tracking-wider flex items-center gap-2">
                        <Gauge size={16} /> Global Experience
                    </div>
                    <div className={cn("text-5xl font-bold mb-1", stats?.globalHealth >= 80 ? "text-green-400" : stats?.globalHealth >= 50 ? "text-orange-400" : "text-red-400")}>
                        {stats?.globalHealth || 0}<span className="text-xl text-slate-500">/100</span>
                    </div>
                    <div className="text-xs text-slate-500 tracking-tight">Avg. Scoring across all probes</div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                    <div className="text-slate-400 text-sm font-medium mb-2 uppercase tracking-wider flex items-center gap-2">
                        <Activity size={16} /> HTTP Coverage
                    </div>
                    <div className="text-4xl font-bold text-blue-400 mb-1">
                        {stats?.httpEndpoints?.total || 0}
                    </div>
                    <div className="text-xs text-slate-500 tracking-tight">Active Synthetic Endpoints</div>
                </div>

                <div className="md:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                    <div className="text-slate-400 text-sm font-medium mb-4 uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 size={16} /> Recent Performance Trends
                    </div>
                    <div className="h-[100px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="score" stroke="#22c55e" fillOpacity={1} fill="url(#colorScore)" />
                                <ReTooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                    itemStyle={{ color: '#94a3b8' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Filters & Export */}
            <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex items-start gap-3 mb-2">
                <Info size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider">How is the score calculated?</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed italic">
                        The performance score (0-100) is a weighted calculation for SD-WAN path quality:
                        <span className="text-blue-400 font-semibold ml-1">Total Latency (30%)</span>,
                        <span className="text-blue-400 font-semibold ml-1">TTFB (35%)</span>, and
                        <span className="text-blue-400 font-semibold ml-1">TLS Handshake (25%)</span>.
                        Errors/Timeouts result in a score of <span className="text-red-400 font-bold">0</span>.
                    </p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/60 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search endpoint..."
                            className="bg-slate-900 border-slate-700 text-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm w-full md:w-64 focus:ring-1 focus:ring-blue-500 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex p-1 bg-slate-900 rounded-lg border border-slate-700">
                        {['ALL', 'HTTP', 'HTTPS', 'PING', 'TCP'].map(t => (
                            <button
                                key={t}
                                onClick={() => setFilterType(t)}
                                className={cn(
                                    "px-3 py-1 rounded-md text-[11px] font-bold transition-all",
                                    filterType === t ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 mr-4">
                        <Clock size={14} className="text-slate-500" />
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="bg-transparent border-none text-slate-400 text-xs font-semibold focus:ring-0 cursor-pointer hover:text-slate-200"
                        >
                            <option value="1h">Last Hour</option>
                            <option value="6h">Last 6 Hours</option>
                            <option value="24h">Last 24 Hours</option>
                            <option value="7d">Last 7 Days</option>
                        </select>
                    </div>
                    <button className="flex items-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-lg text-xs font-bold transition-all">
                        <Download size={14} /> EXPORT
                    </button>
                </div>
            </div>

            {/* Metrics Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
                <table className="w-full text-left">
                    <thead className="bg-slate-800/50 border-b border-slate-700">
                        <tr>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Endpoint</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Type</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Last Score</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Avg Latency</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Reliability</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {endpoints.map(e => (
                            <tr key={e.id} className="hover:bg-slate-800/40 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">{e.name}</span>
                                        <span className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">{e.lastResult.url}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded text-[10px] font-bold border",
                                        e.type === 'HTTPS' ? "text-purple-400 bg-purple-400/10 border-purple-400/20" :
                                            e.type === 'HTTP' ? "text-blue-400 bg-blue-400/10 border-blue-400/20" :
                                                "text-orange-400 bg-orange-400/10 border-orange-400/20"
                                    )}>
                                        {e.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className={cn(
                                        "inline-flex items-center justify-center w-12 h-8 rounded-lg border font-bold text-sm shadow-sm",
                                        getScoreColor(e.lastScore)
                                    )}>
                                        {e.lastScore}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-sm font-mono text-slate-300">{formatMs(e.avgLatency)}ms</span>
                                        <span className="text-[10px] text-slate-500">Max: {formatMs(e.maxLatency)}ms</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col items-center gap-1.5">
                                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                                            <div
                                                className={cn("h-full transition-all duration-1000", e.successRate > 95 ? "bg-green-500" : e.successRate > 80 ? "bg-orange-500" : "bg-red-500")}
                                                style={{ width: `${e.successRate}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-semibold text-slate-400">{e.successRate}% Uptime</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right px-8">
                                    <button
                                        onClick={() => { setSelectedEndpoint(e); setShowDetailModal(true); }}
                                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400 transition-all border border-transparent hover:border-slate-600"
                                    >
                                        <BarChart3 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {endpoints.length === 0 && (
                    <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3 bg-slate-900/40">
                        <Activity size={48} className="text-slate-700 opacity-50" />
                        <div className="text-sm font-medium">No performance data captured yet</div>
                        <div className="text-xs max-w-xs leading-relaxed">Synthetic checks run every 5 minutes and store metrics for the historical reporting.</div>
                    </div>
                )}
            </div>

            {/* Detailed Modal */}
            {showDetailModal && selectedEndpoint && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300" onClick={() => setShowDetailModal(false)}>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-blue-500/10" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">
                            <div className="flex items-center gap-4">
                                <div className={cn("p-3 rounded-xl", getScoreColor(selectedEndpoint.lastScore))}>
                                    <Gauge size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{selectedEndpoint.name}</h3>
                                    <p className="text-sm text-slate-400 font-mono">{selectedEndpoint.lastResult.url}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Detailed Timing Breakdown (Stacked Area Chart) */}
                            {selectedEndpoint.type.includes('HTTP') && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Zap size={16} className="text-yellow-400" /> Timing Analysis (ms)
                                        </h4>
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> <span className="text-[10px] text-slate-400 font-bold">DNS</span></div>
                                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-500" /> <span className="text-[10px] text-slate-400 font-bold">TCP</span></div>
                                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500" /> <span className="text-[10px] text-slate-400 font-bold">TLS</span></div>
                                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500" /> <span className="text-[10px] text-slate-400 font-bold">TTFB</span></div>
                                        </div>
                                    </div>
                                    <div className="h-[250px] w-full bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={results.filter(r => r.endpointId === selectedEndpoint.id).slice(0, 30).reverse().map(r => ({
                                                time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                                DNS: Math.round(r.metrics.dns_ms || 0),
                                                TCP: Math.round(r.metrics.tcp_ms || 0),
                                                TLS: Math.round(r.metrics.tls_ms || 0),
                                                TTFB: Math.round(r.metrics.ttfb_ms || 0)
                                            }))}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                                <ReTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                                                <Area type="monotone" dataKey="DNS" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                                                <Area type="monotone" dataKey="TCP" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} />
                                                <Area type="monotone" dataKey="TLS" stackId="1" stroke="#a855f7" fill="#a855f7" fillOpacity={0.6} />
                                                <Area type="monotone" dataKey="TTFB" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.6} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex items-start gap-3">
                                        <Info className="text-blue-400 flex-shrink-0" size={18} />
                                        <p className="text-xs text-slate-400 leading-relaxed italic">
                                            High **TLS** timing often indicates SASE inspection or poor network path quality. **TTFB** (Time to First Byte) reflects backend application responsiveness after the handshake.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Recent Checks Table */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Activity size={16} /> Recent Captures
                                </h4>
                                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-800/40">
                                            <tr>
                                                <th className="px-4 py-3 text-slate-500 font-bold uppercase tracking-tight">Time</th>
                                                <th className="px-4 py-3 text-slate-500 font-bold uppercase tracking-tight text-center">Score</th>
                                                <th className="px-4 py-3 text-slate-500 font-bold uppercase tracking-tight text-center">Total</th>
                                                <th className="px-4 py-3 text-slate-500 font-bold uppercase tracking-tight text-center">IP Address</th>
                                                <th className="px-4 py-3 text-slate-500 font-bold uppercase tracking-tight text-right">HTTP Code</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {results.filter(r => r.endpointId === selectedEndpoint.id).slice(0, 10).map((r, i) => (
                                                <tr key={i} className="hover:bg-slate-800/20">
                                                    <td className="px-4 py-3 text-slate-300 font-medium">{formatTimestamp(r.timestamp)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={cn("font-bold px-2 py-0.5 rounded", r.score >= 80 ? "text-green-400" : "text-red-400")}>
                                                            {r.score}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-mono text-slate-400">{formatMs(r.metrics.total_ms)}ms</td>
                                                    <td className="px-4 py-3 text-center text-slate-500 font-mono truncate max-w-[120px]">{r.remoteIp || '-'}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded font-bold",
                                                            r.httpCode === 200 ? "text-green-500 bg-green-500/10" : "text-orange-500 bg-orange-500/10"
                                                        )}>
                                                            {r.httpCode || 'N/A'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Utility icon components
function XCircle({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x-circle">
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
        </svg>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
