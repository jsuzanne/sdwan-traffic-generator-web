import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, AlertCircle, CheckCircle, Shield, Globe, Lock, Terminal } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface MaintenanceStatus {
    current: string;
    latest: string;
    updateAvailable: boolean;
    dockerReady?: boolean;
}

const BetaBadge = ({ className }: { className?: string }) => (
    <span className={cn(
        "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30",
        className
    )}>
        Beta
    </span>
);

interface UpgradeStatus {
    inProgress: boolean;
    version: string | null;
    stage: 'idle' | 'pulling' | 'restarting' | 'failed' | 'complete';
    logs: string[];
    error: string | null;
    startTime: number | null;
}

export default function System({ token }: { token: string }) {
    const [status, setStatus] = useState<MaintenanceStatus | null>(null);
    const [upgradeStatus, setUpgradeStatus] = useState<UpgradeStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/admin/maintenance/version', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setStatus(data);
            } else {
                setError(data.error || 'Failed to fetch version');
            }
        } catch (e) {
            setError('Connection lost during version check');
        } finally {
            setLoading(false);
        }
    };

    const fetchUpgradeStatus = async () => {
        try {
            const res = await fetch('/api/admin/maintenance/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setUpgradeStatus(data);
                if (data.inProgress) {
                    setUpgrading(true);
                } else if (data.stage === 'complete') {
                    setSuccess("Upgrade complete! System is restarting...");
                    setUpgrading(false);
                } else if (data.stage === 'failed') {
                    setError(data.error || 'Upgrade failed');
                    setUpgrading(false);
                }
            }
        } catch (e) {
            console.error('Failed to fetch upgrade status');
        }
    };

    useEffect(() => {
        fetchStatus();
        fetchUpgradeStatus();

        const interval = setInterval(() => {
            fetchUpgradeStatus();
        }, 2000);

        return () => clearInterval(interval);
    }, [token]);

    const handleUpgrade = async () => {
        if (!status?.latest) return;
        if (!confirm(`This will pull v${status.latest} images and restart the dashboard. Proceed?`)) return;

        setUpgrading(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch('/api/admin/maintenance/upgrade', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ version: status.latest })
            });

            if (res.ok) {
                setSuccess(`Upgrade to v${status.latest} started in background. Monitor progress below.`);
            } else {
                const data = await res.json();
                setError(data.details || data.error || 'Upgrade failed');
                setUpgrading(false);
            }
        } catch (e) {
            setError('Connection lost during upgrade initiation');
            setUpgrading(false);
        }
    };

    if (loading) return <div className="text-text-muted animate-pulse font-bold uppercase tracking-widest text-xs">Checking system status...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Maintenance / Version Card */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-600/10 rounded-lg text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <RefreshCw size={24} className={upgrading ? "animate-spin" : ""} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold text-text-primary uppercase tracking-tight">System Maintenance</h3>
                                <BetaBadge />
                            </div>
                            <p className="text-text-muted text-xs text-balance mt-0.5">Update system logic and engine to the latest stable release.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-card-secondary/50 rounded-lg border border-border">
                            <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Current Version</span>
                            <span className="text-sm font-mono text-blue-600 dark:text-blue-400 font-bold">v{status?.current}</span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-card-secondary/50 rounded-lg border border-border">
                            <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Latest Available</span>
                            <span className="text-sm font-mono text-green-600 dark:text-green-400 font-bold">v{status?.latest}</span>
                        </div>

                        {status?.updateAvailable && !success && (
                            <div className={cn(
                                "p-4 rounded-lg flex gap-3 border transition-colors shadow-sm",
                                status.dockerReady ? "bg-amber-500/5 border-amber-500/30" : "bg-blue-600/5 border-blue-500/30"
                            )}>
                                {status.dockerReady
                                    ? <AlertCircle className="text-amber-500 shrink-0" size={20} />
                                    : <RefreshCw className="text-blue-600 dark:text-blue-400 animate-spin shrink-0" size={20} />
                                }
                                <div className="space-y-2">
                                    <p className={cn(
                                        "text-[11px] leading-relaxed font-bold",
                                        status.dockerReady ? "text-amber-600 dark:text-amber-200" : "text-blue-600 dark:text-blue-200"
                                    )}>
                                        {status.dockerReady
                                            ? `A newer version (v${status.latest}) is available on GitHub and ready to pull from Docker Hub.`
                                            : `Version v${status.latest} is live on GitHub. Waiting for Docker Hub sync...`
                                        }
                                    </p>
                                    <button
                                        onClick={handleUpgrade}
                                        disabled={upgrading || !status.dockerReady}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg uppercase tracking-widest",
                                            (upgrading || !status.dockerReady)
                                                ? "bg-card-secondary text-text-muted border border-border cursor-not-allowed opacity-50"
                                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40"
                                        )}
                                    >
                                        {upgrading ? <RefreshCw className="animate-spin" size={14} /> : <Download size={14} />}
                                        {upgrading ? 'Upgrading...' : status.dockerReady ? 'Update to Latest Stable' : 'Waiting for Docker...'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {!status?.updateAvailable && (
                            <div className="flex items-center gap-2 px-4 py-3 bg-green-500/5 border border-green-500/20 rounded-lg text-green-600 dark:text-green-400 shadow-sm">
                                <CheckCircle size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">System is Up to Date</span>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-500/5 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-tight shadow-sm">
                                ❌ {error}
                            </div>
                        )}

                        {success && !upgrading && (
                            <div className="p-4 bg-green-600/10 border border-green-500/30 rounded-lg text-green-700 dark:text-green-200 text-xs font-bold leading-relaxed shadow-sm">
                                🚀 {success}
                            </div>
                        )}

                        {upgrading && upgradeStatus && (
                            <div className="mt-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-black text-blue-600 dark:text-blue-400">
                                        <RefreshCw size={14} className="animate-spin" />
                                        <span className="uppercase tracking-widest">
                                            {upgradeStatus.stage === 'pulling' ? 'Pulling Images...' : 'Restarting Services...'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-text-muted font-bold">
                                        {Math.floor((Date.now() - (upgradeStatus.startTime || Date.now())) / 1000)}s elapsed
                                    </span>
                                </div>

                                <div className="bg-card-secondary/20 rounded-xl border border-border overflow-hidden shadow-xl">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-card-secondary/80 border-b border-border">
                                        <Terminal size={12} className="text-text-muted" />
                                        <span className="text-[10px] font-black text-text-muted uppercase tracking-tighter">Upgrade Monitor</span>
                                    </div>
                                    <div className="p-3 h-48 overflow-y-auto font-mono text-[10px] leading-relaxed scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                                        {upgradeStatus.logs.map((log, i) => (
                                            <div key={i} className={cn(
                                                "border-l-2 pl-2 mb-1",
                                                log.startsWith('[WARN]') ? "border-amber-500/50 text-amber-600 dark:text-amber-300/80" :
                                                    log.startsWith('[ERROR]') ? "border-red-500/50 text-red-600 dark:text-red-300" :
                                                        log.includes('✅') ? "border-green-500/50 text-green-600 dark:text-green-300" :
                                                            "border-border text-text-muted opacity-80"
                                            )}>
                                                {log}
                                            </div>
                                        ))}
                                        <div className="animate-pulse inline-block w-1.5 h-3 bg-blue-600 dark:bg-blue-500 ml-1 translate-y-0.5" />
                                    </div>
                                </div>
                                <p className="text-[10px] text-text-muted font-bold italic text-center uppercase tracking-tight">
                                    Do not close this tab. The dashboard will automatically reconnect once the restart is complete.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Configuration Backup & Restore */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-green-600/10 rounded-lg text-green-600 dark:text-green-400 border border-green-500/20">
                            <Download size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-text-primary uppercase tracking-tight">Configuration Backup</h3>
                            <p className="text-text-muted text-xs mt-0.5">Export or Restore your entire system settings.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-card-secondary/40 border border-border rounded-lg shadow-inner">
                            <h4 className="text-xs font-black text-text-muted uppercase tracking-widest mb-2">Export Configuration</h4>
                            <p className="text-[10px] text-text-muted mb-3 leading-relaxed italic opacity-80">
                                Download a JSON bundle containing your applications, security tests, connectivity probes, and user accounts.
                            </p>
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await fetch('/api/admin/config/export', {
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        });
                                        if (res.ok) {
                                            const data = await res.json();
                                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `sdwan-config-${new Date().toISOString().split('T')[0]}.json`;
                                            a.click();
                                        } else {
                                            const err = await res.json();
                                            alert(`Export failed: ${err.error || 'Unknown error'}\n\nPath checked: ${err.path || 'N/A'}`);
                                        }
                                    } catch (e) { alert('Export request failed. Check network connection.'); }
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-card-secondary hover:bg-card-hover text-text-primary rounded-lg text-xs font-bold transition-all border border-border uppercase tracking-widest shadow-sm"
                            >
                                <Download size={14} /> Download Backup Bundle
                            </button>
                        </div>

                        <div className="p-4 bg-card-secondary/40 border border-border rounded-lg shadow-inner">
                            <h4 className="text-xs font-black text-text-muted uppercase tracking-widest mb-2">Restore Configuration</h4>
                            <p className="text-[10px] text-text-muted mb-3 leading-relaxed italic opacity-80">
                                Upload a backup bundle to restore settings. <strong>This will overwrite current settings and restart the system.</strong>
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="file"
                                    id="config-upload"
                                    className="hidden"
                                    accept=".json"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        if (!confirm('Are you sure you want to RESTORE this configuration? Current settings will be lost.')) return;

                                        const reader = new FileReader();
                                        reader.onload = async (event) => {
                                            try {
                                                const bundle = JSON.parse(event.target?.result as string);
                                                const res = await fetch('/api/admin/config/import', {
                                                    method: 'POST',
                                                    headers: {
                                                        'Authorization': `Bearer ${token}`,
                                                        'Content-Type': 'application/json'
                                                    },
                                                    body: JSON.stringify({ bundle })
                                                });
                                                if (res.ok) {
                                                    alert('Configuration restored! System is restarting...');
                                                    window.location.reload();
                                                } else {
                                                    const err = await res.json();
                                                    alert('Restore failed: ' + err.message);
                                                }
                                            } catch (err) { alert('Invalid backup file'); }
                                        };
                                        reader.readAsText(file);
                                    }}
                                />
                                <button
                                    onClick={() => document.getElementById('config-upload')?.click()}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold transition-all border border-blue-500/30 uppercase tracking-widest shadow-sm"
                                >
                                    <RefreshCw size={14} /> Upload & Restore Bundle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
