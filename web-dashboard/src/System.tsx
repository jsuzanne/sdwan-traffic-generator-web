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
}

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
            setStatus(data);
        } catch (e) {
            setError('Failed to fetch system status');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, [token]);

    const handleUpgrade = async () => {
        if (!confirm('This will pull the latest stable images and restart the dashboard. Proceed?')) return;

        setUpgrading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/maintenance/upgrade', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok) {
                setSuccess('Upgrade started! The system will restart in a few seconds. Refresh the page shortly.');
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
                            <h3 className="text-xl font-bold text-slate-100">System Maintenance</h3>
                            <p className="text-slate-400 text-xs text-balance">Update system logic and engine to the latest stable release.</p>
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
                            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg flex gap-3">
                                <AlertCircle className="text-amber-500 shrink-0" size={20} />
                                <div className="space-y-2">
                                    <p className="text-xs text-amber-200 leading-relaxed font-medium">
                                        A newer version (v{status.latest}) is available on GitHub. This update includes new features and stability fixes.
                                    </p>
                                    <button
                                        onClick={handleUpgrade}
                                        disabled={upgrading}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg",
                                            upgrading
                                                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20"
                                        )}
                                    >
                                        {upgrading ? <RefreshCw className="animate-spin" size={14} /> : <Download size={14} />}
                                        {upgrading ? 'Upgrading...' : 'Update to Latest Stable'}
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

                {/* Remote Access Guidelines */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                            <Globe size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-100">Remote Access</h3>
                            <p className="text-slate-400 text-xs">Access this dashboard securely from anywhere.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <a
                            href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/"
                            target="_blank"
                            className="group block p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-orange-500/50 transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400 group-hover:scale-110 transition-transform">
                                        <Lock size={18} />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-slate-200">Cloudflare Tunnel</span>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Secure reverse proxy without port forwarding.</p>
                                    </div>
                                </div>
                            </div>
                        </a>

                        <a
                            href="https://tailscale.com/kb/1017/install/"
                            target="_blank"
                            className="group block p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-cyan-500/50 transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400 group-hover:scale-110 transition-transform">
                                        <Shield size={18} />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-slate-200">Tailscale (Recommended)</span>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Zero-config Mesh VPN for private access.</p>
                                    </div>
                                </div>
                            </div>
                        </a>

                        <div className="p-4 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                            <div className="flex items-center gap-2 text-slate-400 mb-2">
                                <Terminal size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Quick Note</span>
                            </div>
                            <p className="text-[11px] text-slate-500 italic leading-relaxed">
                                Deploying behind a corporate SD-WAN? Ensure port 8080 (or your configured port) is permitted in your security policies or use a management VLAN.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
