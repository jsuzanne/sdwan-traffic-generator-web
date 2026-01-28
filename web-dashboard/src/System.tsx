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

export default function System({ token }: { token: string }) {
    const [status, setStatus] = useState<MaintenanceStatus | null>(null);
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

    useEffect(() => {
        fetchStatus();
    }, [token]);

    const handleUpgrade = async () => {
        if (!status?.latest) return;
        if (!confirm(`This will pull v${status.latest} images and restart the dashboard. Proceed?`)) return;

        setUpgrading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/maintenance/upgrade', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ version: status.latest })
            });
            const data = await res.json();

            if (res.ok) {
                setSuccess(`Upgrade to v${status.latest} started! The system will restart in a few seconds. Refresh the page shortly.`);
            } else {
                setError(data.details || data.error || 'Upgrade failed');
                setUpgrading(false);
            }
        } catch (e) {
            setError('Connection lost during upgrade');
            setUpgrading(false);
        }
    };

    if (loading) return <div className="text-slate-400 animate-pulse">Checking system status...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Maintenance / Version Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                            <RefreshCw size={24} className={upgrading ? "animate-spin" : ""} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold text-slate-100">System Maintenance</h3>
                                <BetaBadge />
                            </div>
                            <p className="text-slate-400 text-xs text-balance">Update system logic and engine to the latest stable release (Validation in Progress).</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                            <span className="text-sm text-slate-400 font-medium">Current Version</span>
                            <span className="text-sm font-mono text-blue-400 font-bold">v{status?.current}</span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                            <span className="text-sm text-slate-400 font-medium">Latest Available</span>
                            <span className="text-sm font-mono text-green-400 font-bold">v{status?.latest}</span>
                        </div>

                        {status?.updateAvailable && !success && (
                            <div className={cn(
                                "p-4 rounded-lg flex gap-3 border transition-colors",
                                status.dockerReady ? "bg-amber-500/10 border-amber-500/30" : "bg-blue-500/10 border-blue-500/30"
                            )}>
                                {status.dockerReady
                                    ? <AlertCircle className="text-amber-500 shrink-0" size={20} />
                                    : <RefreshCw className="text-blue-400 animate-spin shrink-0" size={20} />
                                }
                                <div className="space-y-2">
                                    <p className={cn(
                                        "text-xs leading-relaxed font-medium",
                                        status.dockerReady ? "text-amber-200" : "text-blue-200"
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
                                            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg",
                                            (upgrading || !status.dockerReady)
                                                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20"
                                        )}
                                    >
                                        {upgrading ? <RefreshCw className="animate-spin" size={14} /> : <Download size={14} />}
                                        {upgrading ? 'Upgrading...' : status.dockerReady ? 'Update to Latest Stable' : 'Waiting for Docker...'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {!status?.updateAvailable && (
                            <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
                                <CheckCircle size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">System is Up to Date</span>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-medium">
                                ❌ {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-4 bg-green-600/20 border border-green-500/30 rounded-lg text-green-200 text-xs font-medium leading-relaxed">
                                🚀 {success}
                            </div>
                        )}
                    </div>
                </div>

                {/* Configuration Backup & Restore */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                            <Download size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-100">Configuration Backup</h3>
                            <p className="text-slate-400 text-xs">Export or Restore your entire system settings.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                            <h4 className="text-sm font-bold text-slate-300 mb-2">Export Configuration</h4>
                            <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
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
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all border border-slate-700"
                            >
                                <Download size={14} /> Download Backup Bundle
                            </button>
                        </div>

                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                            <h4 className="text-sm font-bold text-slate-300 mb-2">Restore Configuration</h4>
                            <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
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
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs font-bold transition-all border border-blue-500/30"
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
