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
    onReset?: () => void;
}

export default function Statistics({ stats, appConfig, onReset }: StatsProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'requests' | 'errors' | 'name' | 'group' | 'successRate'>('requests');

    if (!stats) {
        return (
            <div className="p-8 text-center text-text-muted">
                <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                <p>No statistics available yet. Start traffic generation to see data.</p>
            </div>
        );
    }

    // Create a lookup map for app -> group
    const appToGroup: Record<string, string> = {};
    const truncatedToGroup: Record<string, string> = {};

    const normalizeAppName = (name: string) => name.replace(/^https?:\/\//, '');

    if (Array.isArray(appConfig)) {
        appConfig.forEach(cat => {
            if (cat.apps && Array.isArray(cat.apps)) {
                cat.apps.forEach((app: any) => {
                    const cleanName = normalizeAppName(app.domain);
                    appToGroup[cleanName] = cat.name;
                    appToGroup[app.domain] = cat.name; // Keep original as fallback

                    // Fallback for truncated names in existing stats
                    const hostPart = cleanName.split('.')[0];
                    if (hostPart && !truncatedToGroup[hostPart]) {
                        truncatedToGroup[hostPart] = cat.name;
                    }
                });
            }
        });
    }

    // Combine requests and errors data
    const appStats = Object.keys(stats.requests_by_app).map(app => {
        const cleanApp = normalizeAppName(app);
        return {
            name: app,
            group: appToGroup[cleanApp] || appToGroup[app] || truncatedToGroup[cleanApp] || 'Uncategorized',
            requests: stats.requests_by_app[app] || 0,
            errors: stats.errors_by_app[app] || 0,
            successRate: stats.requests_by_app[app] > 0
                ? ((stats.requests_by_app[app] - (stats.errors_by_app[app] || 0)) / stats.requests_by_app[app] * 100).toFixed(1)
                : '100.0'
        };
    });

    // Filter and sort
    const filteredStats = appStats
        .filter(app =>
            app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.group.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'requests') return b.requests - a.requests;
            if (sortBy === 'errors') return b.errors - a.errors;
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'group') {
                const groupComp = a.group.localeCompare(b.group);
                if (groupComp !== 0) return groupComp;
                return a.name.localeCompare(b.name);
            }
            if (sortBy === 'successRate') return parseFloat(b.successRate) - parseFloat(a.successRate);
            return 0;
        });

    const totalErrors = Object.values(stats.errors_by_app).reduce((a, b) => a + b, 0);
    const overallSuccessRate = stats.total_requests > 0
        ? ((stats.total_requests - totalErrors) / stats.total_requests * 100).toFixed(1)
        : '100.0';

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-500/20 dark:border-blue-500/30 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-text-muted text-sm mb-1 font-medium">Total Requests</p>
                            <p className="text-3xl font-bold text-blue-500 dark:text-blue-400">{stats.total_requests.toLocaleString()}</p>
                        </div>
                        <TrendingUp size={32} className="text-blue-500 dark:text-blue-400 opacity-40" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 dark:from-green-900/20 dark:to-green-800/10 border border-green-500/20 dark:border-green-500/30 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-text-muted text-sm mb-1 font-medium">Success Rate</p>
                            <p className="text-3xl font-bold text-green-500 dark:text-green-400">{overallSuccessRate}%</p>
                        </div>
                        <CheckCircle size={32} className="text-green-500 dark:text-green-400 opacity-40" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 dark:from-red-900/20 dark:to-red-800/10 border border-red-500/20 dark:border-red-500/30 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-text-muted text-sm mb-1 font-medium">Total Errors</p>
                            <p className="text-3xl font-bold text-red-500 dark:text-red-400">{totalErrors.toLocaleString()}</p>
                        </div>
                        <AlertTriangle size={32} className="text-red-500 dark:text-red-400 opacity-40" />
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                        type="text"
                        placeholder="Search applications..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-card-secondary border border-border text-text-primary rounded-lg pl-10 pr-4 py-2 outline-none focus:border-purple-500 transition-colors"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setSortBy('requests')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${sortBy === 'requests'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-card-secondary text-text-muted hover:bg-card hover:text-text-primary border border-border'
                            }`}
                    >
                        By Requests
                    </button>
                    <button
                        onClick={() => setSortBy('errors')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${sortBy === 'errors'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-card-secondary text-text-muted hover:bg-card hover:text-text-primary border border-border'
                            }`}
                    >
                        By Errors
                    </button>
                    <button
                        onClick={() => setSortBy('group')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${sortBy === 'group'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-card-secondary text-text-muted hover:bg-card hover:text-text-primary border border-border'
                            }`}
                    >
                        By Group
                    </button>
                    <button
                        onClick={() => setSortBy('name')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${sortBy === 'name'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-card-secondary text-text-muted hover:bg-card hover:text-text-primary border border-border'
                            }`}
                    >
                        By Name
                    </button>
                    {onReset && (
                        <button
                            onClick={onReset}
                            className="px-4 py-2 rounded-lg font-medium bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/20 transition-all ml-2 text-sm shadow-sm"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Statistics Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-card-secondary/50">
                            <tr>
                                <th
                                    className="text-left px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider cursor-pointer hover:bg-card-hover transition-colors"
                                    onClick={() => setSortBy('name')}
                                >
                                    Application {sortBy === 'name' && '↓'}
                                </th>
                                <th
                                    className="text-left px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider cursor-pointer hover:bg-card-hover transition-colors"
                                    onClick={() => setSortBy('group')}
                                >
                                    Group {sortBy === 'group' && '↓'}
                                </th>
                                <th
                                    className="text-right px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider cursor-pointer hover:bg-card-hover transition-colors"
                                    onClick={() => setSortBy('requests')}
                                >
                                    Requests {sortBy === 'requests' && '↓'}
                                </th>
                                <th
                                    className="text-right px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider cursor-pointer hover:bg-card-hover transition-colors"
                                    onClick={() => setSortBy('errors')}
                                >
                                    Errors {sortBy === 'errors' && '↓'}
                                </th>
                                <th
                                    className="text-right px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider cursor-pointer hover:bg-card-hover transition-colors"
                                    onClick={() => setSortBy('successRate')}
                                >
                                    Success Rate {sortBy === 'successRate' && '↓'}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredStats.map((app, index) => (
                                <tr key={app.name} className="hover:bg-card-secondary transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-text-muted font-mono text-xs">#{index + 1}</span>
                                            <span className="font-semibold text-text-primary">{app.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs px-2 py-1 rounded bg-card-secondary text-text-muted border border-border">
                                            {app.group}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-blue-500 dark:text-blue-400 font-bold">{app.requests.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={app.errors > 0 ? 'text-red-500 dark:text-red-400 font-bold' : 'text-text-muted opacity-50'}>
                                            {app.errors.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-24 bg-card-secondary border border-border rounded-full h-2 overflow-hidden shadow-inner">
                                                <div
                                                    className={`h-full transition-all ${parseFloat(app.successRate) >= 95 ? 'bg-green-500' :
                                                        parseFloat(app.successRate) >= 80 ? 'bg-yellow-500' :
                                                            'bg-red-500'
                                                        }`}
                                                    style={{ width: `${app.successRate}%` }}
                                                />
                                            </div>
                                            <span className={`font-bold min-w-[3.5rem] text-sm ${parseFloat(app.successRate) >= 95 ? 'text-green-500 dark:text-green-400' :
                                                parseFloat(app.successRate) >= 80 ? 'text-yellow-600 dark:text-yellow-400' :
                                                    'text-red-600 dark:text-red-400'
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
                    <div className="p-12 text-center text-text-muted">
                        <Search size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg">No applications found matching "<span className="text-text-primary font-semibold">{searchTerm}</span>"</p>
                    </div>
                )}
            </div>

            <div className="text-center text-xs text-text-muted font-medium pb-4">
                Showing {filteredStats.length} of {appStats.length} applications
            </div>
        </div>
    );
}
