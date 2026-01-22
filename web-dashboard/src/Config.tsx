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

interface ConfigProps {
    token: string;
}

export default function Config({ token }: ConfigProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [interfaces, setInterfaces] = useState<string[]>([]); // Selected interfaces
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState<string | null>(null);

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
            fetch('/api/config/interfaces', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
        ]).then(([catsData, ifaceData]) => {
            // Initialize expanded state
            const CatsWithState = catsData.map((c: any) => ({ ...c, expanded: true }));
            setCategories(CatsWithState);
            setInterfaces(ifaceData);
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
                        {interfaces.map(iface => (
                            <div key={iface} className="group relative bg-slate-950 border border-purple-500/30 text-purple-300 px-4 py-2 rounded-lg flex items-center gap-3">
                                <span className="font-mono text-sm">{iface}</span>
                                <button
                                    onClick={() => toggleInterface(iface)}
                                    className="hover:text-red-400 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        {interfaces.length === 0 && <span className="text-slate-500 italic text-sm">No interfaces configured</span>}
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
