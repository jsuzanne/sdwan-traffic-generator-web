import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { Activity, Gauge, Play, Pause, AlertCircle, Clock, Zap, Target, Network, Shield, Cpu, ChevronRight, BarChart3, Info, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Props {
    token: string;
}

interface XfrInterval {
    timestamp: string;
    sent_mbps: number;
    received_mbps: number;
    loss_percent: number;
}

interface XfrSummary {
    protocol: string;
    duration_sec: number;
    sent_mbps: number;
    received_mbps: number;
    loss_percent: number;
    rtt_ms_avg: number;
    rtt_ms_min: number;
    rtt_ms_max: number;
    jitter_ms_avg: number;
}

interface XfrJob {
    id: string;
    sequence_id: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    params: any;
    started_at: string | null;
    finished_at: string | null;
    summary: XfrSummary | null;
    intervals: XfrInterval[];
    error: string | null;
}

export default function Speedtest({ token }: Props) {
    const [mode, setMode] = useState<'default' | 'custom'>('default');
    const [targetHost, setTargetHost] = useState('');
    const [targetPort, setTargetPort] = useState(5201);
    const [psk, setPsk] = useState('');

    // Custom params
    const [protocol, setProtocol] = useState<'tcp' | 'udp' | 'quic'>('tcp');
    const [direction, setDirection] = useState<'client-to-server' | 'server-to-client' | 'bidirectional'>('client-to-server');
    const [duration, setDuration] = useState(10);
    const [bitrate, setBitrate] = useState('200M');
    const [streams, setStreams] = useState(4);

    const [activeJob, setActiveJob] = useState<XfrJob | null>(null);
    const [history, setHistory] = useState<XfrJob[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const sseRef = useRef<EventSource | null>(null);

    const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    useEffect(() => {
        fetchHistory();
        const interval = setInterval(fetchHistory, 5000);
        return () => {
            if (sseRef.current) sseRef.current.close();
            clearInterval(interval);
        };
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/tests/xfr', { headers: authHeaders });
            const data = await res.json();
            if (res.ok) setHistory(data);
        } catch (e) { }
    };

    const runTest = async () => {
        if (!targetHost) {
            toast.error('Host is required');
            return;
        }

        const body = mode === 'default' ? {
            mode: 'default',
            target: { host: targetHost, port: targetPort }
        } : {
            mode: 'custom',
            target: { host: targetHost, port: targetPort, psk },
            protocol,
            direction,
            duration_sec: duration,
            bitrate,
            parallel_streams: streams
        };

        try {
            const res = await fetch('/api/tests/xfr', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Test started: ${data.id}`);
                pollJob(data.id);
                subscribeToStream(data.id);
                fetchHistory();
            } else {
                toast.error(data.error || 'Failed to start test');
            }
        } catch (e) {
            toast.error('Network error starting test');
        }
    };

    const pollJob = async (id: string) => {
        try {
            const res = await fetch(`/api/tests/xfr/${id}`, { headers: authHeaders });
            const data = await res.json();
            if (res.ok) {
                setActiveJob(data);
                if (data.status === 'running' || data.status === 'queued') {
                    setTimeout(() => pollJob(id), 2000);
                } else {
                    fetchHistory();
                }
            }
        } catch (e) { }
    };

    const subscribeToStream = (id: string) => {
        if (sseRef.current) sseRef.current.close();
        setChartData([]);

        // We can't set headers on EventSource, so we rely on the session/token in query if needed.
        // Our server expects authenticateToken (Bearer). 
        // Usually we'd use a cookie-based auth or a signed URL for SSE.
        // For now, let's just use the URL directly, assuming the server might allow token in query.
        const sse = new EventSource(`/api/tests/xfr/${id}/stream?token=${token}`);
        sseRef.current = sse;

        sse.addEventListener('interval', (e: any) => {
            const data = JSON.parse(e.data);
            const timeStr = new Date(data.timestamp).toLocaleTimeString([], { second: '2-digit' });
            setChartData(prev => [...prev, { ...data, time: timeStr }].slice(-60));
        });

        sse.addEventListener('done', (e: any) => {
            const data = JSON.parse(e.data);
            toast.success(`Test ${data.status}`);
            sse.close();
            fetchHistory();
        });

        sse.onerror = () => {
            sse.close();
        };
    };

    const isRunning = activeJob?.status === 'running' || activeJob?.status === 'queued';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Configuration Side */}
                <div className="w-full md:w-96 space-y-6">
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Gauge size={120} />
                        </div>

                        <h2 className="text-xl font-black text-text-primary flex items-center gap-2 mb-6 uppercase tracking-tight">
                            <Zap className="text-blue-500" size={24} />
                            Speedtest Config
                        </h2>

                        <div className="flex p-1 bg-card-secondary rounded-xl mb-6 border border-border/50">
                            <button
                                onClick={() => setMode('default')}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'default' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-text-muted hover:text-text-primary'}`}
                            >
                                Default
                            </button>
                            <button
                                onClick={() => setMode('custom')}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'custom' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-text-muted hover:text-text-primary'}`}
                            >
                                Custom
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 block">Target Host</label>
                                <div className="relative">
                                    <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/50" size={16} />
                                    <input
                                        type="text"
                                        value={targetHost}
                                        onChange={e => setTargetHost(e.target.value)}
                                        placeholder="e.g. 1.2.3.4"
                                        className="w-full bg-card-secondary border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 block">Port</label>
                                <input
                                    type="number"
                                    value={targetPort}
                                    onChange={e => setTargetPort(parseInt(e.target.value))}
                                    className="w-full bg-card-secondary border border-border rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                                />
                            </div>

                            {mode === 'custom' && (
                                <div className="space-y-4 pt-2 border-t border-border/50 animate-in fade-in duration-300">
                                    <div>
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 block">Protocol</label>
                                        <select
                                            value={protocol}
                                            onChange={e => setProtocol(e.target.value as any)}
                                            className="w-full bg-card-secondary border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                                        >
                                            <option value="tcp">TCP</option>
                                            <option value="udp">UDP</option>
                                            <option value="quic">QUIC</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 block">Bitrate</label>
                                        <input
                                            type="text"
                                            value={bitrate}
                                            onChange={e => setBitrate(e.target.value)}
                                            placeholder="e.g. 100M, 1G, 0"
                                            className="w-full bg-card-secondary border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 block">Duration (s)</label>
                                            <input
                                                type="number"
                                                value={duration}
                                                onChange={e => setDuration(parseInt(e.target.value))}
                                                className="w-full bg-card-secondary border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 block">Streams</label>
                                            <input
                                                type="number"
                                                value={streams}
                                                onChange={e => setStreams(parseInt(e.target.value))}
                                                className="w-full bg-card-secondary border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 block">PSK (Optional)</label>
                                        <input
                                            type="password"
                                            value={psk}
                                            onChange={e => setPsk(e.target.value)}
                                            className="w-full bg-card-secondary border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={runTest}
                                disabled={isRunning || !targetHost}
                                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-xl ${isRunning ? 'bg-card-secondary text-text-muted cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 shadow-blue-900/30'}`}
                            >
                                {isRunning ? (
                                    <>
                                        <Activity size={20} className="animate-spin" />
                                        Running Test...
                                    </>
                                ) : (
                                    <>
                                        <Play size={20} fill="currentColor" />
                                        Launch Speedtest
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="bg-blue-600/5 border border-blue-500/20 rounded-2xl p-5">
                        <div className="flex gap-3">
                            <Info className="text-blue-500 shrink-0" size={20} />
                            <div>
                                <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">About xfr</h4>
                                <p className="text-[10px] text-text-muted leading-relaxed">
                                    xfr is a high-performance transport testing tool supporting TCP, UDP, and QUIC.
                                    In Default mode, it runs a 10s TCP test with 4 parallel streams at 200 Mbps.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Metrics & Results */}
                <div className="flex-1 space-y-6">
                    {/* Chart Card */}
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[400px] flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-black text-text-primary uppercase tracking-tight flex items-center gap-2">
                                    <BarChart3 className="text-blue-500" size={20} />
                                    Live Throughput
                                </h3>
                                <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mt-0.5">
                                    {isRunning ? 'Real-time analysis in progress' : 'Waiting for test session'}
                                </p>
                            </div>

                            {activeJob && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-card-secondary rounded-full border border-border">
                                    <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-text-muted'}`} />
                                    <span className="text-[10px] font-black text-text-muted uppercase tracking-tighter">
                                        Job: {activeJob.id.slice(-8)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorRecv" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                                    <XAxis
                                        dataKey="time"
                                        stroke="#64748b"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#64748b"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `${val}M`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '10px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                                    <Area
                                        type="monotone"
                                        dataKey="sent_mbps"
                                        name="Sent (Mbps)"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorSent)"
                                        animationDuration={300}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="received_mbps"
                                        name="Received (Mbps)"
                                        stroke="#06b6d4"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorRecv)"
                                        animationDuration={300}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Results Summary */}
                    {activeJob?.status === 'completed' && activeJob.summary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in zoom-in-95 duration-500">
                            <ResultCard label="Throughput" value={activeJob.summary.received_mbps.toFixed(1)} unit="Mbps" icon={<Gauge size={20} />} color="blue" />
                            <ResultCard label="Packet Loss" value={activeJob.summary.loss_percent.toFixed(2)} unit="%" icon={<AlertCircle size={20} />} color="red" />
                            <ResultCard label="Latency (Avg)" value={activeJob.summary.rtt_ms_avg.toFixed(1)} unit="ms" icon={<Clock size={20} />} color="cyan" />
                            <ResultCard label="Jitter" value={activeJob.summary.jitter_ms_avg.toFixed(2)} unit="ms" icon={<Activity size={20} />} color="purple" />
                        </div>
                    )}

                    {activeJob?.status === 'failed' && (
                        <div className="bg-red-600/10 border border-red-500/20 rounded-2xl p-6 flex items-center gap-4 animate-in slide-in-from-top-4">
                            <XCircle className="text-red-500" size={32} />
                            <div>
                                <h3 className="font-black text-red-500 uppercase tracking-widest text-sm">Test Failed</h3>
                                <p className="text-xs text-text-muted mt-1">{activeJob.error || 'The xfr process exited with an error.'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ResultCard({ label, value, unit, icon, color }: { label: string, value: string, unit: string, icon: any, color: 'blue' | 'red' | 'cyan' | 'purple' }) {
    const colors = {
        blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-blue-900/10',
        red: 'text-red-500 bg-red-500/10 border-red-500/20 shadow-red-900/10',
        cyan: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20 shadow-cyan-900/10',
        purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20 shadow-purple-900/10'
    };

    return (
        <div className={`bg-card border rounded-2xl p-4 shadow-sm flex flex-col items-center text-center ${colors[color]}`}>
            <div className="mb-2 opacity-80">{icon}</div>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black tabular-nums">{value}</span>
                <span className="text-[10px] font-bold uppercase opacity-60">{unit}</span>
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">{label}</div>
        </div>
    );
}
