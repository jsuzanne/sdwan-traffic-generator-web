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

    const handleAppWeightChange = async (domain: string, weight: number) => {
        // Update local state deep clone
        const newCats = categories.map(c => ({
            ...c,
            apps: c.apps.map(a => a.domain === domain ? { ...a, weight } : a)
        }));
        setCategories(newCats);

        try {
            await fetch('/api/config/apps', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ domain, weight })
            });
            // We generally don't show toast for every slider move as it's noisy, but user asked for confirmation.
            // Maybe a subtle indicator? Or just for the bulk/critical actions.
            // Let's add a "Saved" indicator that fades in/out.
        } catch (e) {
            console.error('Failed to save');
        }
    };

    const handleCategoryWeightChange = async (categoryName: string, weight: number) => {
        const category = categories.find(c => c.name === categoryName);
        if (!category) return;

        const updates: Record<string, number> = {};
        // Set all apps in category to this weight
        const newCats = categories.map(c => {
            if (c.name === categoryName) {
                const newApps = c.apps.map(a => {
                    updates[a.domain] = weight;
                    return { ...a, weight };
                });
                return { ...c, apps: newApps };
            }
            return c;
        });
        setCategories(newCats);

        try {
            await fetch('/api/config/category', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ updates }) // Send bulk updates
            });
            showSuccess(`Category '${categoryName}' updated`);
        } catch (e) { console.error("Failed to save category"); }
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
                <div className="flex items-center gap-3 text-slate-200 mb-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                        <Sliders size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Traffic Distribution</h2>
                        <p className="text-sm text-slate-400">Adjust weights by category or individual app</p>
                    </div>
                </div>

                {categories.map(category => (
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
                                <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">Group Weight</span>
                                <input
                                    type="range"
                                    min="0" max="100"
                                    className="w-32 accent-blue-500"
                                    onChange={(e) => handleCategoryWeightChange(category.name, parseInt(e.target.value))}
                                    // Value? It's hard to set a single value if apps differ. 
                                    // We default to 50 or average? 
                                    // Better: Don't bind value, just use it as "set all to X".
                                    defaultValue={50}
                                />
                            </div>
                        </div>

                        {/* Apps List */}
                        {category.expanded && (
                            <div className="p-4 grid gap-4 grid-cols-1 md:grid-cols-2">
                                {category.apps.map(app => (
                                    <div key={app.domain} className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-medium text-slate-200">{app.domain}</div>
                                                <div className="text-xs text-slate-500 font-mono">{app.endpoint}</div>
                                            </div>
                                            <span className="text-sm font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                                                {app.weight}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0" max="100"
                                            value={app.weight}
                                            onChange={(e) => handleAppWeightChange(app.domain, parseInt(e.target.value))}
                                            className="w-full accent-blue-600 h-1 bg-slate-800 rounded-lg appearance-none"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
