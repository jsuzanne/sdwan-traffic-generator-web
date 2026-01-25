import React, { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Network, Sliders, ChevronDown, ChevronRight, Server, CheckCircle2 } from 'lucide-react';
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

        const probeToSave = { ...newProbe, target: formattedTarget };
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


    if (loading) return <div className="p-8 text-center text-slate-400">Loading configuration...</div>;

    return (
        <div className="space-y-8 max-w-5xl mx-auto relative">
            {/* Toast Notification */}
            {savedMsg && (
                <div className="fixed top-24 right-8 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg flex items-center gap-3 shadow-xl backdrop-blur-sm animate-in fade-in slide-in-from-top-4 z-50">
                    <CheckCircle2 size={20} />
                    <span className="font-medium">{savedMsg}</span>
                </div>
            )}

            {/* Interfaces Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3 text-slate-200">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                            <Network size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Network Interfaces</h2>
                            <p className="text-sm text-slate-400">Manually specify physical interfaces for traffic generation</p>
                        </div>
                    </div>
                </div>

                {/* Help Text */}
                <div className="mb-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h3 className="text-blue-400 font-semibold text-sm mb-2 flex items-center gap-2">
                        <Server size={16} />
                        How to find your network interface name:
                    </h3>
                    <div className="text-sm text-slate-300 space-y-2">
                        <div>
                            <span className="font-semibold text-blue-300">Linux:</span>
                            <code className="ml-2 bg-slate-950 px-2 py-1 rounded text-xs font-mono">ip link show</code>
                            <span className="ml-2 text-slate-400">or</span>
                            <code className="ml-2 bg-slate-950 px-2 py-1 rounded text-xs font-mono">ifconfig</code>
                        </div>
                        <div>
                            <span className="font-semibold text-blue-300">Windows:</span>
                            <code className="ml-2 bg-slate-950 px-2 py-1 rounded text-xs font-mono">ipconfig</code>
                            <span className="ml-2 text-slate-400">(look for "Ethernet adapter" or "Wi-Fi")</span>
                        </div>
                        <div>
                            <span className="font-semibold text-blue-300">macOS:</span>
                            <code className="ml-2 bg-slate-950 px-2 py-1 rounded text-xs font-mono">ifconfig</code>
                            <span className="ml-2 text-slate-400">or</span>
                            <code className="ml-2 bg-slate-950 px-2 py-1 rounded text-xs font-mono">networksetup -listallhardwareports</code>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Common names: <code className="bg-slate-950 px-1 rounded">eth0</code>, <code className="bg-slate-950 px-1 rounded">ens33</code>, <code className="bg-slate-950 px-1 rounded">en0</code>, <code className="bg-slate-950 px-1 rounded">wlan0</code>
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    {/* Manual Entry Input */}
                    <div className="flex gap-4 items-center">
                        <input
                            type="text"
                            placeholder="Type interface name (e.g., eth0, ens33, en0)"
                            className="flex-1 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-4 py-2 outline-none focus:border-purple-500"
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
                            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Add
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {availableInterfaces.map(iface => {
                            const isSelected = interfaces.includes(iface);
                            return (
                                <button
                                    key={iface}
                                    onClick={() => toggleInterface(iface)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2",
                                        isSelected
                                            ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                                            : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600"
                                    )}
                                >
                                    <div className={cn("w-2 h-2 rounded-full", isSelected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-slate-600")} />
                                    {iface}
                                    {isSelected && <CheckCircle2 size={12} />}
                                </button>
                            );
                        })}
                        {availableInterfaces.length === 0 && interfaces.map(iface => (
                            <button
                                key={iface}
                                onClick={() => toggleInterface(iface)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/20 border border-purple-500/50 text-purple-400 flex items-center gap-2"
                            >
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                {iface}
                                <Plus size={12} className="rotate-45" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Connectivity Probes Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3 text-slate-200">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <Network size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Connectivity Probes (DEM)</h2>
                            <p className="text-sm text-slate-400">Add custom synthetic endpoints for real-time monitoring</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Form to add probe */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Name</label>
                            <input
                                type="text"
                                placeholder="Branch-Office"
                                className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm"
                                value={newProbe.name}
                                onChange={e => setNewProbe({ ...newProbe, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Type</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm"
                                value={newProbe.type}
                                onChange={e => setNewProbe({ ...newProbe, type: e.target.value as any, timeout: e.target.value === 'PING' ? 2000 : 5000 })}
                            >
                                <option value="HTTP">HTTP (Scoring)</option>
                                <option value="HTTPS">HTTPS (Scoring)</option>
                                <option value="PING">ICMP Ping</option>
                                <option value="TCP">TCP Port</option>
                                <option value="DNS">DNS Resolution</option>
                                <option value="UDP">UDP Quality (iperf3)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Target</label>
                            <input
                                type="text"
                                placeholder={newProbe.type === 'TCP' || newProbe.type === 'UDP' ? '12.34.56.78:5201' : (newProbe.type === 'PING' ? '8.8.8.8' : (newProbe.type === 'DNS' ? '8.8.8.8' : 'google.com'))}
                                className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm"
                                value={newProbe.target}
                                onChange={e => setNewProbe({ ...newProbe, target: e.target.value })}
                            />
                            <p className="text-[9px] text-slate-500 ml-1 italic">
                                {newProbe.type === 'HTTP' || newProbe.type === 'HTTPS' ?
                                    "Domain or IP (http:// added if missing)" :
                                    (newProbe.type === 'UDP' ? "IP:Port (Server must run iperf3 -s -u)" : "IP or Domain only")}
                            </p>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={addProbe}
                                disabled={!newProbe.name || !newProbe.target}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <Plus size={18} />
                                {editingIndex !== null ? 'Update Probe' : 'Add Probe'}
                            </button>
                        </div>
                    </div>

                    {/* Probes List */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Active Custom Probes</label>
                        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {customProbes.map((probe, idx) => (
                                <div key={idx} className="group bg-slate-950 border border-slate-800 hover:border-blue-500/30 rounded-xl p-4 flex items-center justify-between transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold",
                                            probe.type === 'PING' ? "bg-orange-500/10 text-orange-400" :
                                                probe.type === 'UDP' ? "bg-purple-500/10 text-purple-400" :
                                                    "bg-blue-500/10 text-blue-400"
                                        )}>
                                            {probe.type.substring(0, 1)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">{probe.name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">{probe.target}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => editProbe(idx)}
                                            className="p-2 text-slate-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all"
                                            title="Edit probe"
                                        >
                                            <Save size={14} />
                                        </button>
                                        <button
                                            onClick={() => deleteProbe(idx)}
                                            className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                            title="Delete probe"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {customProbes.length === 0 && (
                                <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-800 rounded-xl">
                                    <span className="text-slate-500 text-sm">No custom probes added yet. These will appear alongside endpoints from your environment files.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Applications Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 text-slate-200">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <Sliders size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Traffic Distribution</h2>
                            <p className="text-sm text-slate-400">Adjust weights by category or individual app</p>
                        </div>
                    </div>

                    {/* Import/Export Buttons */}
                    <div className="flex gap-2">
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
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-semibold transition-colors text-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
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
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Import
                        </button>
                    </div>
                </div>

                {categories.map(category => {
                    const categoryWeight = category.apps.reduce((s, a) => s + a.weight, 0);
                    const categoryPercent = Math.round((categoryWeight / GLOBAL_TOTAL) * 100);

                    return (
                        <div key={category.name} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                            {/* Category Header */}
                            <div className="bg-slate-800/50 p-4 flex items-center justify-between">
                                <button
                                    onClick={() => toggleCategory(category.name)}
                                    className="flex items-center gap-3 font-semibold text-slate-200 hover:text-white"
                                >
                                    {category.expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    {category.name}
                                </button>

                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-end mr-2">
                                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Group Share</span>
                                        <span className="text-sm font-mono text-blue-400">{categoryPercent}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1" max="100"
                                        className="w-32 accent-blue-500"
                                        value={categoryPercent}
                                        onChange={(e) => handleCategoryPercentageChange(category.name, parseInt(e.target.value))}
                                    />
                                </div>
                            </div>

                            {/* Apps List */}
                            {category.expanded && (
                                <div className="p-4 grid gap-4 grid-cols-1 md:grid-cols-2">
                                    {category.apps.map(app => {
                                        const appPercent = categoryWeight > 0 ? Math.round((app.weight / categoryWeight) * 100) : 0;

                                        return (
                                            <div key={app.domain} className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-medium text-slate-200">{app.domain}</div>
                                                        <div className="text-xs text-slate-500 font-mono">{app.endpoint}</div>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-sm font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                                                            {appPercent}%
                                                        </span>
                                                        <span className="text-[9px] text-slate-600 mt-1">Weight: {app.weight}</span>
                                                    </div>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0" max="100"
                                                    value={appPercent}
                                                    onChange={(e) => handleAppPercentageChange(category.name, app.domain, parseInt(e.target.value))}
                                                    className="w-full accent-blue-600 h-1 bg-slate-800 rounded-lg appearance-none"
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
