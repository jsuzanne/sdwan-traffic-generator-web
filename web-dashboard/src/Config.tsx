import React, { useEffect, useState } from 'react';
import { Edit, Plus, Trash2, Network, Sliders, ChevronDown, ChevronRight, Server, CheckCircle2, Download, Upload, Power } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface AppConfig {
    domain: string;
    weight: number;
    endpoint: string;
}

interface Category {
    name: string;
    apps: AppConfig[];
    expanded?: boolean;
}

interface InterfaceInfo {
    name: string;
    ip: string;
}

interface CustomProbe {
    name: string;
    type: 'HTTP' | 'HTTPS' | 'TCP' | 'PING' | 'DNS' | 'UDP';
    target: string;
    timeout: number;
    enabled?: boolean; // NEW: default true
}

interface ConfigProps {
    token: string;
}

export default function Config({ token }: ConfigProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [interfaces, setInterfaces] = useState<string[]>([]); // Selected interfaces
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState<string | null>(null);
    const [availableInterfaces, setAvailableInterfaces] = useState<string[]>([]); // All detected interfaces

    // Custom Probes State
    const [customProbes, setCustomProbes] = useState<CustomProbe[]>([]);
    const [newProbe, setNewProbe] = useState<CustomProbe>({ name: '', type: 'HTTP', target: '', timeout: 5000 });
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    // Helper to show temporary success message
    const showSuccess = (msg: string) => {
        setSavedMsg(msg);
        setTimeout(() => setSavedMsg(null), 3000);
    };

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    useEffect(() => {
        Promise.all([
            fetch('/api/config/apps', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
            fetch('/api/config/interfaces', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
            fetch('/api/connectivity/custom', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
        ]).then(([catsData, ifaceData, probesData]) => {
            // Initialize expanded state
            const CatsWithState = catsData.map((c: any) => ({ ...c, expanded: true }));
            setCategories(CatsWithState);
            setInterfaces(ifaceData);
            setCustomProbes(probesData || []);

            // Fetch ALL detected interfaces for comparison
            fetch('/api/config/interfaces?all=true', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(r => r.json())
                .then(setAvailableInterfaces)
                .catch(() => { });

            setLoading(false);
        }).catch(() => setLoading(false));
    }, [token]);

    const GLOBAL_TOTAL = 1000;

    const handleAppPercentageChange = (categoryName: string, domain: string, newAppPercent: number) => {
        const category = categories.find(c => c.name === categoryName);
        if (!category) return;

        const categoryApps = category.apps;
        const currentCategoryTotalWeight = categoryApps.reduce((s, a) => s + a.weight, 0) || (GLOBAL_TOTAL / categories.length);

        const newApps = categoryApps.map(a => {
            if (a.domain === domain) {
                return { ...a, weight: Math.round((newAppPercent / 100) * currentCategoryTotalWeight) };
            }

            const otherPercentOriginal = 100 - (categoryApps.find(o => o.domain === domain)?.weight || 0) / currentCategoryTotalWeight * 100;
            const otherPercentTarget = 100 - newAppPercent;

            if (otherPercentOriginal <= 0) {
                // Was 100%, now decreasing. Share the new "slack" equally
                return { ...a, weight: Math.round((otherPercentTarget / (categoryApps.length - 1) / 100) * currentCategoryTotalWeight) };
            }

            // Scale other apps based on their current relative share of the "other" pool
            const currentShareOfOthers = (a.weight / currentCategoryTotalWeight * 100) / otherPercentOriginal;
            return { ...a, weight: Math.round((otherPercentTarget * currentShareOfOthers / 100) * currentCategoryTotalWeight) };
        });

        // Normalize to ensure total matches
        const finalSum = newApps.reduce((s, a) => s + a.weight, 0);
        if (finalSum > 0 && finalSum !== currentCategoryTotalWeight) {
            const ratio = currentCategoryTotalWeight / finalSum;
            newApps.forEach(a => a.weight = Math.round(a.weight * ratio));
        }

        const newCats = categories.map(c => c.name === categoryName ? { ...c, apps: newApps } : c);
        setCategories(newCats);
        saveCategoryBulk(newApps);
    };

    const handleCategoryPercentageChange = (categoryName: string, newGroupPercent: number) => {
        const currentTotal = categories.reduce((sum, c) => sum + c.apps.reduce((asum, a) => asum + a.weight, 0), 0) || GLOBAL_TOTAL;

        const otherCategories = categories.filter(c => c.name !== categoryName);
        const otherCategoriesWeight = otherCategories.reduce((s, c) => s + c.apps.reduce((as, a) => as + a.weight, 0), 0);
        const otherPercentOriginal = (otherCategoriesWeight / currentTotal) * 100;
        const otherPercentTarget = 100 - newGroupPercent;

        const newCats = categories.map(c => {
            const currentCatWeight = c.apps.reduce((s, a) => s + a.weight, 0);
            let targetCatWeight = 0;

            if (c.name === categoryName) {
                targetCatWeight = (newGroupPercent / 100) * currentTotal;
            } else if (otherPercentOriginal <= 0) {
                targetCatWeight = (otherPercentTarget / otherCategories.length / 100) * currentTotal;
            } else {
                const currentShareOfOthers = (currentCatWeight / currentTotal * 100) / otherPercentOriginal;
                targetCatWeight = (otherPercentTarget * currentShareOfOthers / 100) * currentTotal;
            }

            // Distribute targetCatWeight to apps in category
            const appCount = c.apps.length;
            if (currentCatWeight <= 0) {
                return { ...c, apps: c.apps.map(a => ({ ...a, weight: Math.round(targetCatWeight / appCount) })) };
            }

            const scale = targetCatWeight / currentCatWeight;
            return { ...c, apps: c.apps.map(a => ({ ...a, weight: Math.round(a.weight * scale) })) };
        });

        // Final normalization to GLOBAL_TOTAL
        const finalGlobalSum = newCats.reduce((sum, c) => sum + c.apps.reduce((as, a) => as + a.weight, 0), 0);
        if (finalGlobalSum > 0 && finalGlobalSum !== GLOBAL_TOTAL) {
            const globalRatio = GLOBAL_TOTAL / finalGlobalSum;
            newCats.forEach(c => c.apps.forEach(a => a.weight = Math.round(a.weight * globalRatio)));
        }

        setCategories(newCats);
        saveAllBulk(newCats);
    };

    const saveCategoryBulk = async (apps: AppConfig[]) => {
        const updates: Record<string, number> = {};
        apps.forEach(a => updates[a.domain] = a.weight);
        try {
            await fetch('/api/config/apps-bulk', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ updates })
            });
        } catch (e) { console.error("Failed to save category bulk"); }
    };

    const saveAllBulk = async (allCats: Category[]) => {
        const updates: Record<string, number> = {};
        allCats.forEach(c => c.apps.forEach(a => updates[a.domain] = a.weight));
        try {
            await fetch('/api/config/apps-bulk', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ updates })
            });
        } catch (e) { console.error("Failed to save all bulk"); }
    };

    const toggleCategory = (name: string) => {
        setCategories(categories.map(c => c.name === name ? { ...c, expanded: !c.expanded } : c));
    };

    const toggleInterface = (iface: string) => {
        const newInterfaces = interfaces.includes(iface)
            ? interfaces.filter(i => i !== iface)
            : [...interfaces, iface];
        setInterfaces(newInterfaces);
        saveInterfaces(newInterfaces);
    };

    const saveInterfaces = async (newInterfaces: string[]) => {
        try {
            await fetch('/api/config/interfaces', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ interfaces: newInterfaces })
            });
            showSuccess('Interfaces saved');
        } catch (e) {
            console.error('Failed to save interfaces');
        }
    };

    const addProbe = async () => {
        if (!newProbe.name || !newProbe.target) return;

        let formattedTarget = newProbe.target.trim();
        if ((newProbe.type === 'HTTP' || newProbe.type === 'HTTPS') && !formattedTarget.startsWith('http://') && !formattedTarget.startsWith('https://')) {
            formattedTarget = `${newProbe.type.toLowerCase()}://${formattedTarget}`;
        }

        const probeToSave = { ...newProbe, target: formattedTarget, enabled: newProbe.enabled ?? true };
        let updatedProbes: CustomProbe[];

        if (editingIndex !== null) {
            updatedProbes = [...customProbes];
            updatedProbes[editingIndex] = probeToSave;
            setEditingIndex(null);
        } else {
            updatedProbes = [...customProbes, probeToSave];
        }

        await saveProbes(updatedProbes);
        setCustomProbes(updatedProbes);
        setNewProbe({ name: '', type: 'HTTP', target: '', timeout: 5000 });
    };

    const editProbe = (index: number) => {
        const probe = customProbes[index];
        setNewProbe(probe);
        setEditingIndex(index);
        // Scroll to add form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const deleteProbe = async (index: number) => {
        const updatedProbes = customProbes.filter((_, i) => i !== index);
        await saveProbes(updatedProbes);
        setCustomProbes(updatedProbes);
    };

    const saveProbes = async (probes: CustomProbe[]) => {
        try {
            await fetch('/api/connectivity/custom', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ endpoints: probes })
            });
            showSuccess('Probes updated');
        } catch (e) {
            console.error('Failed to save probes');
        }
    };

    const toggleProbeEnabled = async (index: number) => {
        const updatedProbes = [...customProbes];
        updatedProbes[index].enabled = !updatedProbes[index].enabled;
        await saveProbes(updatedProbes);
        setCustomProbes(updatedProbes);
    };

    const toggleAllProbes = async (enabled: boolean) => {
        const updatedProbes = customProbes.map(p => ({ ...p, enabled }));
        await saveProbes(updatedProbes);
        setCustomProbes(updatedProbes);
    };


    if (loading) return <div className="p-8 text-center text-text-muted">Loading configuration...</div>;

    return (
        <div className="space-y-8 max-w-5xl mx-auto relative">
            {/* Toast Notification */}
            {savedMsg && (
                <div className="fixed top-24 right-8 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 z-50">
                    <CheckCircle2 size={18} />
                    <span className="text-[10px] font-black uppercase tracking-[0.15em]">{savedMsg}</span>
                </div>
            )}

            {/* Interfaces Section */}
            <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600/10 rounded-lg text-purple-600 dark:text-purple-400">
                            <Network size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-text-primary uppercase tracking-tight">Network Interfaces</h2>
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1 opacity-70">Physical interfaces for traffic egress</p>
                        </div>
                    </div>
                </div>

                {/* Help Text */}

                <div className="flex flex-col gap-6">
                    {/* Manual Entry Input */}
                    <div className="flex gap-4 items-center">
                        <input
                            type="text"
                            placeholder="inject interface name (e.g. eth0)..."
                            className="flex-1 bg-card-secondary/50 border border-border text-[11px] font-black tracking-widest text-text-primary rounded-xl px-5 py-3 outline-none focus:ring-1 focus:ring-purple-500 transition-all shadow-inner"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const input = e.currentTarget;
                                    const val = input.value.trim();
                                    if (val && !interfaces.includes(val)) {
                                        const newInterfaces = [...interfaces, val];
                                        setInterfaces(newInterfaces);
                                        saveInterfaces(newInterfaces);
                                        input.value = '';
                                    }
                                }
                            }}
                        />
                        <button
                            onClick={(e) => {
                                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                const val = input.value.trim();
                                if (val && !interfaces.includes(val)) {
                                    const newInterfaces = [...interfaces, val];
                                    setInterfaces(newInterfaces);
                                    saveInterfaces(newInterfaces);
                                    input.value = '';
                                }
                            }}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 shadow-lg shadow-purple-900/20"
                        >
                            <Plus size={16} />
                            Register
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                        {availableInterfaces.map(iface => {
                            const isSelected = interfaces.includes(iface);
                            return (
                                <button
                                    key={iface}
                                    onClick={() => toggleInterface(iface)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-black border transition-all flex items-center gap-3 uppercase tracking-widest shadow-sm",
                                        isSelected
                                            ? "bg-purple-600/10 border-purple-500/30 text-purple-600 dark:text-purple-400"
                                            : "bg-card-secondary/30 border-border text-text-muted hover:border-text-muted/30"
                                    )}
                                >
                                    <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-text-muted/30")} />
                                    {iface}
                                    {isSelected && <CheckCircle2 size={12} />}
                                </button>
                            );
                        })}
                        {availableInterfaces.length === 0 && interfaces.map(iface => (
                            <button
                                key={iface}
                                onClick={() => toggleInterface(iface)}
                                className="px-4 py-2 rounded-xl text-[10px] font-black bg-purple-600/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center gap-2.5 uppercase tracking-widest"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                {iface}
                                <Plus size={12} className="rotate-45" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Connectivity Probes Section */}
            <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/10 rounded-lg text-blue-600 dark:text-blue-400">
                            <Network size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-text-primary uppercase tracking-tight">Synthetic Probes (DEM)</h2>
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1 opacity-70">Custom telemetry for real-time monitoring</p>
                        </div>
                    </div>

                    {/* Import/Export Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={async () => {
                                try {
                                    const res = await fetch('/api/connectivity/custom/export', {
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    if (!res.ok) throw new Error('Export failed');
                                    const blob = await res.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'connectivity-custom.json';
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                } catch (e) {
                                    console.error('Export failed', e);
                                    showSuccess('Export failed');
                                }
                            }}
                            className="bg-card hover:bg-card-secondary border border-border text-text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-2 shadow-sm"
                        >
                            <Download size={14} />
                            Export
                        </button>

                        <label className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20 cursor-pointer">
                            <Upload size={14} />
                            Import
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                        try {
                                            const content = event.target?.result;
                                            const res = await fetch('/api/connectivity/custom/import', {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${token}`
                                                },
                                                body: JSON.stringify({ content })
                                            });
                                            if (res.ok) {
                                                const data = await res.json();
                                                showSuccess(`Imported ${data.count} probes`);
                                                // Refresh probes
                                                const probesRes = await fetch('/api/connectivity/custom', { headers: { 'Authorization': `Bearer ${token}` } });
                                                const probes = await probesRes.json();
                                                setCustomProbes(probes);
                                            } else {
                                                console.error('Import failed');
                                                showSuccess('Import failed');
                                            }
                                        } catch (err) {
                                            console.error('Import error', err);
                                            showSuccess('Import error');
                                        }
                                        // Reset input
                                        e.target.value = '';
                                    };
                                    reader.readAsText(file);
                                }}
                            />
                        </label>
                    </div>
                </div>

                <div className="flex flex-col gap-8">
                    {/* Form to add probe */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 bg-card-secondary/30 p-6 rounded-2xl border border-border shadow-inner">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Probe Name</label>
                            <input
                                type="text"
                                placeholder="HQ-GATEWAY"
                                className="w-full bg-card border border-border text-text-primary rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 text-[11px] font-black tracking-widest shadow-sm"
                                value={newProbe.name}
                                onChange={e => setNewProbe({ ...newProbe, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Protocol</label>
                            <select
                                className="w-full bg-card border border-border text-text-primary rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 text-[11px] font-black uppercase tracking-widest shadow-sm"
                                value={newProbe.type}
                                onChange={e => setNewProbe({ ...newProbe, type: e.target.value as any, timeout: e.target.value === 'PING' ? 2000 : 5000 })}
                            >
                                <option value="HTTP">HTTP</option>
                                <option value="HTTPS">HTTPS</option>
                                <option value="PING">ICMP</option>
                                <option value="TCP">TCP</option>
                                <option value="DNS">DNS</option>
                                <option value="UDP">UDP (IPERF3)</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Target URI/IP</label>
                            <input
                                type="text"
                                placeholder={newProbe.type === 'TCP' || newProbe.type === 'UDP' ? '10.0.0.1:5201' : (newProbe.type === 'PING' ? '8.8.8.8' : 'google.com')}
                                className="w-full bg-card border border-border text-text-primary rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 text-[11px] font-black tracking-widest shadow-sm"
                                value={newProbe.target}
                                onChange={e => setNewProbe({ ...newProbe, target: e.target.value })}
                            />
                            <p className="text-[8px] text-text-muted font-bold tracking-widest uppercase opacity-40 ml-1">
                                {newProbe.type === 'HTTP' ? "FQDN or IP" : (newProbe.type === 'UDP' ? "iperf3 host:port" : "IP/FQDN ONLY")}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] ml-1 opacity-0">Action</label>
                            <button
                                onClick={addProbe}
                                disabled={!newProbe.name || !newProbe.target}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-card-secondary disabled:text-text-muted text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                            >
                                <Plus size={16} />
                                {editingIndex !== null ? 'Update' : 'Initialize'}
                            </button>
                        </div>
                    </div>

                    {/* Probes List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Provisioned Endpoints ({customProbes.length})</label>
                            {customProbes.length > 0 && (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => toggleAllProbes(true)}
                                        className="text-[9px] font-black uppercase tracking-widest text-green-600 dark:text-green-400 hover:text-green-500 transition-colors"
                                    >
                                        Enable All
                                    </button>
                                    <span className="text-text-muted opacity-30">|</span>
                                    <button
                                        onClick={() => toggleAllProbes(false)}
                                        className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-gray-400 transition-colors"
                                    >
                                        Disable All
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {customProbes.map((probe, idx) => (
                                <div key={idx} className={cn(
                                    "group bg-card border border-border hover:border-blue-500/30 rounded-2xl p-5 flex items-center justify-between transition-all shadow-sm",
                                    probe.enabled === false && "opacity-50"
                                )}>
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black",
                                            probe.type === 'PING' ? "bg-orange-600/10 text-orange-600 dark:text-orange-400" :
                                                probe.type === 'UDP' ? "bg-purple-600/10 text-purple-600 dark:text-purple-400" :
                                                    "bg-blue-600/10 text-blue-600 dark:text-blue-400"
                                        )}>
                                            {probe.type.substring(0, 3)}
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-black text-text-primary uppercase tracking-tight group-hover:text-blue-600 transition-colors">{probe.name}</div>
                                            <div className="text-[10px] text-text-muted font-mono tracking-tighter truncate max-w-[140px] opacity-70">{probe.target}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => toggleProbeEnabled(idx)}
                                            className={cn(
                                                "p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all",
                                                probe.enabled !== false
                                                    ? "text-green-600 dark:text-green-400 hover:bg-green-600/10"
                                                    : "text-gray-400 dark:text-gray-500 hover:bg-gray-400/10"
                                            )}
                                            title={probe.enabled !== false ? "Disable" : "Enable"}
                                        >
                                            <Power size={14} />
                                        </button>
                                        <button
                                            onClick={() => editProbe(idx)}
                                            className="p-2 text-text-muted hover:text-blue-600 hover:bg-blue-600/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                            title="Edit"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={() => deleteProbe(idx)}
                                            className="p-2 text-text-muted hover:text-red-600 hover:bg-red-600/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                            title="Purge"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {customProbes.length === 0 && (
                                <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-2xl">
                                    <span className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em] opacity-40">No synthetic monitors active</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Applications Section */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/10 rounded-lg text-blue-600 dark:text-blue-400">
                            <Sliders size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-text-primary uppercase tracking-tight">Traffic Distribution</h2>
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1 opacity-70">Adjust weights by category or individual app</p>
                        </div>
                    </div>

                    {/* Import/Export Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={async () => {
                                try {
                                    const res = await fetch('/api/config/applications/export', {
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    const blob = await res.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'applications.txt';
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                    showSuccess('Applications exported');
                                } catch (e) {
                                    console.error('Export failed', e);
                                }
                            }}
                            className="bg-card-secondary/50 hover:bg-card-secondary text-text-primary px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-border flex items-center gap-2 shadow-sm"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export
                        </button>
                        <button
                            onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = '.txt';
                                input.onchange = async (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (!file) return;

                                    const content = await file.text();
                                    try {
                                        const res = await fetch('/api/config/applications/import', {
                                            method: 'POST',
                                            headers: authHeaders,
                                            body: JSON.stringify({ content })
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                            showSuccess('Applications imported successfully');
                                            // Reload categories
                                            const catsData = await fetch('/api/config/apps', {
                                                headers: { 'Authorization': `Bearer ${token}` }
                                            }).then(r => r.json());
                                            const CatsWithState = catsData.map((c: any) => ({ ...c, expanded: true }));
                                            setCategories(CatsWithState);
                                        } else {
                                            alert(data.message || 'Import failed');
                                        }
                                    } catch (e) {
                                        console.error('Import failed', e);
                                        alert('Import failed');
                                    }
                                };
                                input.click();
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Import
                        </button>
                    </div>
                </div>

                {categories.map(category => {
                    const categoryWeight = category.apps.reduce((s, a) => s + a.weight, 0);
                    const categoryPercent = Math.round((categoryWeight / GLOBAL_TOTAL) * 100);

                    return (
                        <div key={category.name} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                            {/* Category Header */}
                            <div className="bg-card-secondary/30 p-5 flex items-center justify-between border-b border-border">
                                <button
                                    onClick={() => toggleCategory(category.name)}
                                    className="flex items-center gap-3 text-[11px] font-black text-text-primary uppercase tracking-widest hover:text-blue-600 transition-colors"
                                >
                                    <div className="p-1.5 bg-card border border-border rounded-lg shadow-sm">
                                        {category.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </div>
                                    {category.name}
                                </button>

                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] uppercase text-text-muted font-black tracking-widest opacity-50">Global Segment</span>
                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400">{categoryPercent}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1" max="100"
                                        className="w-32 accent-blue-600 h-1 bg-card-secondary border border-border rounded-lg"
                                        value={categoryPercent}
                                        onChange={(e) => handleCategoryPercentageChange(category.name, parseInt(e.target.value))}
                                    />
                                </div>
                            </div>

                            {/* Apps List */}
                            {category.expanded && (
                                <div className="p-6 grid gap-6 grid-cols-1 lg:grid-cols-2 bg-card">
                                    {category.apps.map(app => {
                                        const appPercent = categoryWeight > 0 ? Math.round((app.weight / categoryWeight) * 100) : 0;

                                        return (
                                            <div key={app.domain} className="bg-card-secondary/20 border border-border rounded-2xl p-4 flex flex-col gap-4 shadow-sm hover:border-blue-500/20 transition-all group">
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-1">
                                                        <div className="text-[11px] font-black text-text-primary uppercase tracking-tight">{app.domain}</div>
                                                        <div className="text-[10px] text-text-muted font-mono tracking-tighter opacity-50">{app.endpoint}</div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 bg-blue-600/10 border border-blue-500/20 px-2.5 py-1 rounded-xl shadow-sm">
                                                            {appPercent}%
                                                        </span>
                                                        <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest opacity-40">Weight: {app.weight}</span>
                                                    </div>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0" max="100"
                                                    value={appPercent}
                                                    onChange={(e) => handleAppPercentageChange(category.name, app.domain, parseInt(e.target.value))}
                                                    className="w-full accent-blue-600 h-1 bg-card border border-border rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
