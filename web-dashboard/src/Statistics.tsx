import React, { useState } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle, Search } from 'lucide-react';

interface Stats {
    timestamp: number;
    total_requests: number;
    requests_by_app: Record<string, number>;
    errors_by_app: Record<string, number>;
}

interface StatsProps {
    stats: Stats | null;
    appConfig: any[];
}

export default function Statistics({ stats, appConfig }: StatsProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'requests' | 'errors' | 'name' | 'group'>('requests');

    if (!stats) {
        return (
            <div className="p-8 text-center text-slate-400">
                <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                <p>No statistics available yet. Start traffic generation to see data.</p>
            </div>
        );
    }

    // Create a lookup map for app -> group
    const appToGroup: Record<string, string> = {};
    if (Array.isArray(appConfig)) {
        appConfig.forEach(cat => {
            if (cat.apps && Array.isArray(cat.apps)) {
                cat.apps.forEach((app: any) => {
                    appToGroup[app.domain] = cat.name;
                });
            }
        });
    }

    // Combine requests and errors data
    const appStats = Object.keys(stats.requests_by_app).map(app => ({
        name: app,
        group: appToGroup[app] || 'Uncategorized',
        requests: stats.requests_by_app[app] || 0,
        errors: stats.errors_by_app[app] || 0,
        successRate: stats.requests_by_app[app] > 0
            ? ((stats.requests_by_app[app] - (stats.errors_by_app[app] || 0)) / stats.requests_by_app[app] * 100).toFixed(1)
            : '100.0'
    }));

    // Filter and sort
    const filteredStats = appStats
        .filter(app =>
            app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.group.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'requests') return b.requests - a.requests;
            if (sortBy === 'errors') return b.errors - a.errors;
            if (sortBy === 'group') {
                const groupComp = a.group.localeCompare(b.group);
                if (groupComp !== 0) return groupComp;
                return a.name.localeCompare(b.name);
            }
            return a.name.localeCompare(b.name);
        });

    const totalErrors = Object.values(stats.errors_by_app).reduce((a, b) => a + b, 0);
    const overallSuccessRate = stats.total_requests > 0
        ? ((stats.total_requests - totalErrors) / stats.total_requests * 100).toFixed(1)
        : '100.0';

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Total Requests</p>
                            <p className="text-3xl font-bold text-blue-400">{stats.total_requests.toLocaleString()}</p>
                        </div>
                        <TrendingUp size={32} className="text-blue-400 opacity-50" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-500/30 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Success Rate</p>
                            <p className="text-3xl font-bold text-green-400">{overallSuccessRate}%</p>
                        </div>
                        <CheckCircle size={32} className="text-green-400 opacity-50" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-500/30 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Total Errors</p>
                            <p className="text-3xl font-bold text-red-400">{totalErrors.toLocaleString()}</p>
                        </div>
                        <AlertTriangle size={32} className="text-red-400 opacity-50" />
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search applications..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-lg pl-10 pr-4 py-2 outline-none focus:border-purple-500"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setSortBy('requests')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${sortBy === 'requests'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        By Requests
                    </button>
                    <button
                        onClick={() => setSortBy('errors')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${sortBy === 'errors'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        By Errors
                    </button>
                    <button
                        onClick={() => setSortBy('group')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${sortBy === 'group'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        By Group
                    </button>
                    <button
                        onClick={() => setSortBy('name')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${sortBy === 'name'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        By Name
                    </button>
                </div>
            </div>

            {/* Statistics Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Application</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Group</th>
                                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-300">Requests</th>
                                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-300">Errors</th>
                                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-300">Success Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredStats.map((app, index) => (
                                <tr key={app.name} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-500 font-mono text-xs">#{index + 1}</span>
                                            <span className="font-medium text-slate-200">{app.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                            {app.group}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-blue-400 font-semibold">{app.requests.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={app.errors > 0 ? 'text-red-400 font-semibold' : 'text-slate-500'}>
                                            {app.errors.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-full transition-all ${parseFloat(app.successRate) >= 95 ? 'bg-green-500' :
                                                        parseFloat(app.successRate) >= 80 ? 'bg-yellow-500' :
                                                            'bg-red-500'
                                                        }`}
                                                    style={{ width: `${app.successRate}%` }}
                                                />
                                            </div>
                                            <span className={`font-semibold min-w-[3rem] ${parseFloat(app.successRate) >= 95 ? 'text-green-400' :
                                                parseFloat(app.successRate) >= 80 ? 'text-yellow-400' :
                                                    'text-red-400'
                                                }`}>
                                                {app.successRate}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredStats.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                        <Search size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No applications found matching "{searchTerm}"</p>
                    </div>
                )}
            </div>

            <div className="text-center text-sm text-slate-500">
                Showing {filteredStats.length} of {appStats.length} applications
            </div>
        </div>
    );
}
