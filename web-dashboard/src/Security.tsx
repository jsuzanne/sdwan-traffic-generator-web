import React, { useState, useEffect } from 'react';
import { Shield, Play, AlertTriangle, CheckCircle, XCircle, Clock, Download, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { URL_CATEGORIES, DNS_TEST_DOMAINS } from './data/security-categories';

interface SecurityProps {
    token: string;
}

interface TestResult {
    timestamp: number;
    testType: string;
    testName: string;
    result: any;
}

interface SecurityConfig {
    url_filtering: {
        enabled_categories: string[];
        protocol: 'http' | 'https';
    };
    dns_security: {
        enabled_tests: string[];
    };
    threat_prevention: {
        enabled: boolean;
        eicar_endpoint: string;
    };
    scheduled_execution?: {
        enabled: boolean;
        interval_minutes: number;
        run_url_tests: boolean;
        run_dns_tests: boolean;
        run_threat_tests: boolean;
        next_run_time: number | null;
        last_run_time: number | null;
    };
    statistics?: {
        total_tests_run: number;
        url_tests_blocked: number;
        url_tests_allowed: number;
        dns_tests_blocked: number;
        dns_tests_sinkholed: number;
        dns_tests_allowed: number;
        threat_tests_blocked: number;
        threat_tests_allowed: number;
        last_test_time: number | null;
    };
    test_history: TestResult[];
}

export default function Security({ token }: SecurityProps) {
    const [config, setConfig] = useState<SecurityConfig | null>(null);
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState<{ [key: string]: boolean }>({});
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Collapsible sections
    const [urlExpanded, setUrlExpanded] = useState(true);
    const [dnsExpanded, setDnsExpanded] = useState(true);
    const [threatExpanded, setThreatExpanded] = useState(true);
    const [resultsExpanded, setResultsExpanded] = useState(true);

    // EICAR endpoint input
    const [eicarEndpoint, setEicarEndpoint] = useState('http://192.168.203.100/eicar.com.txt');

    const authHeaders = () => ({ 'Authorization': `Bearer ${token}` });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Load configuration
    useEffect(() => {
        fetchConfig();
        fetchResults();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/security/config', { headers: authHeaders() });
            const data = await res.json();
            setConfig(data);
            if (data.threat_prevention?.eicar_endpoint) {
                setEicarEndpoint(data.threat_prevention.eicar_endpoint);
            }
        } catch (e) {
            console.error('Failed to fetch security config:', e);
        }
    };

    const fetchResults = async () => {
        try {
            const res = await fetch('/api/security/results', { headers: authHeaders() });
            const data = await res.json();
            setTestResults(data.results || []);
        } catch (e) {
            console.error('Failed to fetch test results:', e);
        }
    };

    const saveConfig = async (newConfig: Partial<SecurityConfig>) => {
        try {
            const res = await fetch('/api/security/config', {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });
            const data = await res.json();
            if (data.success) {
                setConfig(data.config);
            }
        } catch (e) {
            console.error('Failed to save config:', e);
        }
    };

    const toggleURLCategory = (categoryId: string) => {
        if (!config) return;
        const enabled = config.url_filtering.enabled_categories;
        const newEnabled = enabled.includes(categoryId)
            ? enabled.filter(id => id !== categoryId)
            : [...enabled, categoryId];

        saveConfig({
            url_filtering: { ...config.url_filtering, enabled_categories: newEnabled }
        });
    };

    const toggleDNSTest = (testId: string) => {
        if (!config) return;
        const enabled = config.dns_security.enabled_tests;
        const newEnabled = enabled.includes(testId)
            ? enabled.filter(id => id !== testId)
            : [...enabled, testId];

        saveConfig({
            dns_security: { ...config.dns_security, enabled_tests: newEnabled }
        });
    };

    const runURLTest = async (category: typeof URL_CATEGORIES[0]) => {
        setTesting({ ...testing, [`url-${category.id}`]: true });
        try {
            const res = await fetch('/api/security/url-test', {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: category.url, category: category.name })
            });
            const result = await res.json();
            await fetchResults();
        } catch (e) {
            console.error('URL test failed:', e);
        } finally {
            setTesting({ ...testing, [`url-${category.id}`]: false });
        }
    };

    const runURLBatchTest = async () => {
        if (!config) return;
        setLoading(true);
        showToast(`Running ${config.url_filtering.enabled_categories.length} URL filtering tests...`, 'info');
        try {
            const enabledCategories = URL_CATEGORIES.filter(cat =>
                config.url_filtering.enabled_categories.includes(cat.id)
            );

            const tests = enabledCategories.map(cat => ({ url: cat.url, category: cat.name }));

            const res = await fetch('/api/security/url-test-batch', {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ tests })
            });
            await fetchResults();
            await fetchConfig();
            showToast('URL filtering tests completed!', 'success');
        } catch (e) {
            console.error('Batch URL test failed:', e);
            showToast('URL filtering tests failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const runDNSTest = async (test: typeof DNS_TEST_DOMAINS[0]) => {
        setTesting({ ...testing, [`dns-${test.id}`]: true });
        try {
            const res = await fetch('/api/security/dns-test', {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: test.domain, testName: test.name })
            });
            await fetchResults();
        } catch (e) {
            console.error('DNS test failed:', e);
        } finally {
            setTesting({ ...testing, [`dns-${test.id}`]: false });
        }
    };

    const runDNSBatchTest = async () => {
        if (!config) return;
        setLoading(true);
        showToast(`Running ${config.dns_security.enabled_tests.length} DNS security tests...`, 'info');
        try {
            const enabledTests = DNS_TEST_DOMAINS.filter(test =>
                config.dns_security.enabled_tests.includes(test.id)
            );

            const tests = enabledTests.map(test => ({ domain: test.domain, testName: test.name }));

            const res = await fetch('/api/security/dns-test-batch', {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ tests })
            });
            await fetchResults();
            await fetchConfig();
            showToast('DNS security tests completed!', 'success');
        } catch (e) {
            console.error('Batch DNS test failed:', e);
            showToast('DNS security tests failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const runThreatTest = async () => {
        setLoading(true);
        showToast('Running EICAR threat test...', 'info');
        try {
            const res = await fetch('/api/security/threat-test', {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: eicarEndpoint })
            });
            await fetchResults();
            showToast('EICAR threat test completed!', 'success');

            // Save endpoint to config
            if (config) {
                saveConfig({
                    threat_prevention: { ...config.threat_prevention, eicar_endpoint: eicarEndpoint }
                });
            }
        } catch (e) {
            console.error('Threat test failed:', e);
        } finally {
            setLoading(false);
        }
    };

    const clearHistory = async () => {
        if (!confirm('Clear all test history?')) return;
        try {
            await fetch('/api/security/results', {
                method: 'DELETE',
                headers: authHeaders()
            });
            setTestResults([]);
        } catch (e) {
            console.error('Failed to clear history:', e);
        }
    };

    const exportResults = () => {
        const dataStr = JSON.stringify(testResults, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `security-test-results-${Date.now()}.json`;
        link.click();
    };

    const getStatusBadge = (result: any) => {
        if (!result) return null;

        const status = result.status || (result.success ? 'allowed' : 'blocked');

        if (status === 'blocked') {
            return <span className="flex items-center gap-1 text-red-400 text-sm"><XCircle size={14} /> Blocked</span>;
        } else if (status === 'allowed' || status === 'resolved') {
            return <span className="flex items-center gap-1 text-green-400 text-sm"><CheckCircle size={14} /> Allowed</span>;
        } else {
            return <span className="flex items-center gap-1 text-yellow-400 text-sm"><Clock size={14} /> Pending</span>;
        }
    };

    if (!config) {
        return <div className="p-8 text-center text-slate-400">Loading security configuration...</div>;
    }

    const basicDNSTests = DNS_TEST_DOMAINS.filter(t => t.category === 'basic');
    const advancedDNSTests = DNS_TEST_DOMAINS.filter(t => t.category === 'advanced');

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in ${toast.type === 'success' ? 'bg-green-500/90 text-white' :
                    toast.type === 'error' ? 'bg-red-500/90 text-white' :
                        'bg-blue-500/90 text-white'
                    }`}>
                    {toast.type === 'success' && <CheckCircle size={20} />}
                    {toast.type === 'error' && <XCircle size={20} />}
                    {toast.type === 'info' && <Clock size={20} />}
                    <span className="font-medium">{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                    <Shield size={32} className="text-red-400" />
                    <h2 className="text-2xl font-bold text-white">Security Testing</h2>
                </div>
                <p className="text-slate-300">
                    Test Palo Alto Networks firewall security policies: URL Filtering, DNS Security, and Threat Prevention
                </p>
                <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-yellow-300 text-sm">
                        <strong>Warning:</strong> These tests will trigger firewall security alerts and blocks. Use only in demo/POC environments.
                    </p>
                </div>
            </div>

            {/* Statistics Dashboard */}
            {config.statistics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-sm">Total Tests</span>
                            <Shield size={16} className="text-blue-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">{config.statistics.total_tests_run}</div>
                        {config.statistics.last_test_time && (
                            <div className="text-xs text-slate-500 mt-1">
                                Last: {new Date(config.statistics.last_test_time).toLocaleTimeString()}
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-sm">URL Filtering</span>
                            <Shield size={16} className="text-blue-400" />
                        </div>
                        <div className="flex items-center gap-3">
                            <div>
                                <div className="text-lg font-bold text-red-400">{config.statistics.url_tests_blocked}</div>
                                <div className="text-xs text-slate-500">Blocked</div>
                            </div>
                            <div className="text-slate-600">/</div>
                            <div>
                                <div className="text-lg font-bold text-green-400">{config.statistics.url_tests_allowed}</div>
                                <div className="text-xs text-slate-500">Allowed</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-sm">DNS Security</span>
                            <Shield size={16} className="text-purple-400" />
                        </div>
                        <div className="flex items-center gap-2">
                            <div>
                                <div className="text-lg font-bold text-red-400">{config.statistics.dns_tests_blocked}</div>
                                <div className="text-xs text-slate-500">Blocked</div>
                            </div>
                            <div className="text-slate-600">/</div>
                            <div>
                                <div className="text-lg font-bold text-yellow-400">{config.statistics.dns_tests_sinkholed || 0}</div>
                                <div className="text-xs text-slate-500">Sinkholed</div>
                            </div>
                            <div className="text-slate-600">/</div>
                            <div>
                                <div className="text-lg font-bold text-green-400">{config.statistics.dns_tests_allowed}</div>
                                <div className="text-xs text-slate-500">Resolved</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-sm">Threat Prevention</span>
                            <Shield size={16} className="text-red-400" />
                        </div>
                        <div className="flex items-center gap-3">
                            <div>
                                <div className="text-lg font-bold text-red-400">{config.statistics.threat_tests_blocked}</div>
                                <div className="text-xs text-slate-500">Blocked</div>
                            </div>
                            <div className="text-slate-600">/</div>
                            <div>
                                <div className="text-lg font-bold text-green-400">{config.statistics.threat_tests_allowed}</div>
                                <div className="text-xs text-slate-500">Allowed</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Scheduled Execution */}
            {config.scheduled_execution && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Clock size={20} className="text-blue-400" />
                                Scheduled Execution
                            </h3>
                            <p className="text-sm text-slate-400 mt-1">
                                Automatically run enabled tests at regular intervals
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.scheduled_execution.enabled}
                                onChange={(e) => {
                                    if (config.scheduled_execution) {
                                        saveConfig({
                                            scheduled_execution: {
                                                ...config.scheduled_execution,
                                                enabled: e.target.checked
                                            }
                                        });
                                    }
                                }}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {config.scheduled_execution.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Interval (minutes)
                                </label>
                                <input
                                    type="number"
                                    min="5"
                                    max="1440"
                                    value={config.scheduled_execution.interval_minutes}
                                    onChange={(e) => {
                                        if (config.scheduled_execution) {
                                            saveConfig({
                                                scheduled_execution: {
                                                    ...config.scheduled_execution,
                                                    interval_minutes: parseInt(e.target.value) || 60
                                                }
                                            });
                                        }
                                    }}
                                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-4 py-2 focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Test Types
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.scheduled_execution.run_url_tests}
                                        onChange={(e) => {
                                            if (config.scheduled_execution) {
                                                saveConfig({
                                                    scheduled_execution: {
                                                        ...config.scheduled_execution,
                                                        run_url_tests: e.target.checked
                                                    }
                                                });
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-600"
                                    />
                                    URL Filtering Tests
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.scheduled_execution.run_dns_tests}
                                        onChange={(e) => {
                                            if (config.scheduled_execution) {
                                                saveConfig({
                                                    scheduled_execution: {
                                                        ...config.scheduled_execution,
                                                        run_dns_tests: e.target.checked
                                                    }
                                                });
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-purple-600"
                                    />
                                    DNS Security Tests
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.scheduled_execution.run_threat_tests}
                                        onChange={(e) => {
                                            if (config.scheduled_execution) {
                                                saveConfig({
                                                    scheduled_execution: {
                                                        ...config.scheduled_execution,
                                                        run_threat_tests: e.target.checked
                                                    }
                                                });
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-red-600"
                                    />
                                    Threat Prevention Tests
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* URL Filtering Tests */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button
                    onClick={() => setUrlExpanded(!urlExpanded)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Shield size={20} className="text-blue-400" />
                        <h3 className="text-lg font-semibold text-white">URL Filtering Tests</h3>
                        <span className="text-sm text-slate-400">
                            ({config.url_filtering.enabled_categories.length} / {URL_CATEGORIES.length} enabled)
                        </span>
                    </div>
                    {urlExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {urlExpanded && (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-slate-400 text-sm">
                                Test URL filtering policies using Palo Alto Networks test pages
                            </p>
                            <button
                                onClick={runURLBatchTest}
                                disabled={loading || config.url_filtering.enabled_categories.length === 0}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <Play size={16} /> Run All Enabled
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                            {URL_CATEGORIES.map(category => {
                                const isEnabled = config.url_filtering.enabled_categories.includes(category.id);
                                const isTesting = testing[`url-${category.id}`];
                                const lastResult = testResults.find(r =>
                                    r.testType === 'url_filtering' && r.testName === category.name
                                );

                                return (
                                    <div
                                        key={category.id}
                                        className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={isEnabled}
                                                onChange={() => toggleURLCategory(category.id)}
                                                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                                            />
                                            <span className="text-sm text-slate-200 truncate">{category.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {lastResult && getStatusBadge(lastResult.result)}
                                            <button
                                                onClick={() => runURLTest(category)}
                                                disabled={isTesting}
                                                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-50"
                                                title="Run test"
                                            >
                                                <Play size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* DNS Security Tests */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button
                    onClick={() => setDnsExpanded(!dnsExpanded)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Shield size={20} className="text-purple-400" />
                        <h3 className="text-lg font-semibold text-white">DNS Security Tests</h3>
                        <span className="text-sm text-slate-400">
                            ({config.dns_security.enabled_tests.length} / {DNS_TEST_DOMAINS.length} enabled)
                        </span>
                    </div>
                    {dnsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {dnsExpanded && (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-slate-400 text-sm">
                                Test DNS Security policies using Palo Alto Networks test domains
                            </p>
                            <button
                                onClick={runDNSBatchTest}
                                disabled={loading || config.dns_security.enabled_tests.length === 0}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <Play size={16} /> Run All Enabled
                            </button>
                        </div>

                        {/* Basic DNS Tests */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-300 mb-2">Basic DNS Security</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                                {basicDNSTests.map(test => {
                                    const isEnabled = config.dns_security.enabled_tests.includes(test.id);
                                    const isTesting = testing[`dns-${test.id}`];
                                    const lastResult = testResults.find(r =>
                                        r.testType === 'dns_security' && r.testName === test.name
                                    );

                                    return (
                                        <div
                                            key={test.id}
                                            className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={isEnabled}
                                                    onChange={() => toggleDNSTest(test.id)}
                                                    className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900"
                                                />
                                                <span className="text-sm text-slate-200 truncate">{test.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {lastResult && getStatusBadge(lastResult.result)}
                                                <button
                                                    onClick={() => runDNSTest(test)}
                                                    disabled={isTesting}
                                                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-purple-400 transition-colors disabled:opacity-50"
                                                    title="Run test"
                                                >
                                                    <Play size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Advanced DNS Tests */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-300 mb-2">Advanced DNS Security</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                                {advancedDNSTests.map(test => {
                                    const isEnabled = config.dns_security.enabled_tests.includes(test.id);
                                    const isTesting = testing[`dns-${test.id}`];
                                    const lastResult = testResults.find(r =>
                                        r.testType === 'dns_security' && r.testName === test.name
                                    );

                                    return (
                                        <div
                                            key={test.id}
                                            className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={isEnabled}
                                                    onChange={() => toggleDNSTest(test.id)}
                                                    className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900"
                                                />
                                                <span className="text-sm text-slate-200 truncate">{test.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {lastResult && getStatusBadge(lastResult.result)}
                                                <button
                                                    onClick={() => runDNSTest(test)}
                                                    disabled={isTesting}
                                                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-purple-400 transition-colors disabled:opacity-50"
                                                    title="Run test"
                                                >
                                                    <Play size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Threat Prevention Tests */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button
                    onClick={() => setThreatExpanded(!threatExpanded)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Shield size={20} className="text-red-400" />
                        <h3 className="text-lg font-semibold text-white">Threat Prevention (EICAR)</h3>
                    </div>
                    {threatExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {threatExpanded && (
                    <div className="p-6 space-y-4">
                        <p className="text-slate-400 text-sm">
                            Test IPS/Threat Prevention by downloading EICAR test file
                        </p>

                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <div className="flex items-start gap-2 mb-3">
                                <AlertTriangle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-red-300 text-sm font-semibold">EICAR Test File</p>
                                    <p className="text-red-300/80 text-xs mt-1">
                                        This test downloads a harmless EICAR test file to trigger IPS alerts. The file is automatically deleted after the test.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        EICAR Endpoint URL
                                    </label>
                                    <input
                                        type="text"
                                        value={eicarEndpoint}
                                        onChange={(e) => setEicarEndpoint(e.target.value)}
                                        placeholder="http://192.168.203.100/eicar.com.txt"
                                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-4 py-2 focus:border-red-500 outline-none"
                                    />
                                </div>

                                <button
                                    onClick={runThreatTest}
                                    disabled={loading || !eicarEndpoint}
                                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Play size={18} /> Run EICAR Test
                                </button>

                                {testResults.find(r => r.testType === 'threat_prevention') && (
                                    <div className="mt-3">
                                        {getStatusBadge(testResults.find(r => r.testType === 'threat_prevention')?.result)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Test Results */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button
                    onClick={() => setResultsExpanded(!resultsExpanded)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Shield size={20} className="text-green-400" />
                        <h3 className="text-lg font-semibold text-white">Test Results</h3>
                        <span className="text-sm text-slate-400">({testResults.length} results)</span>
                    </div>
                    {resultsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {resultsExpanded && (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-slate-400 text-sm">Recent test execution history</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={exportResults}
                                    disabled={testResults.length === 0}
                                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <Download size={14} /> Export
                                </button>
                                <button
                                    onClick={clearHistory}
                                    disabled={testResults.length === 0}
                                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <Trash2 size={14} /> Clear
                                </button>
                            </div>
                        </div>

                        {testResults.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <Shield size={48} className="mx-auto mb-3 opacity-30" />
                                <p>No test results yet. Run some tests to see results here.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-800/50">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Timestamp</th>
                                            <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Test Type</th>
                                            <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Test Name</th>
                                            <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Result</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {testResults.slice(0, 20).map((result, index) => (
                                            <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3 text-sm text-slate-400">
                                                    {new Date(result.timestamp).toLocaleTimeString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${result.testType === 'url_filtering' ? 'bg-blue-500/20 text-blue-400' :
                                                        result.testType === 'dns_security' ? 'bg-purple-500/20 text-purple-400' :
                                                            'bg-red-500/20 text-red-400'
                                                        }`}>
                                                        {result.testType === 'url_filtering' ? 'URL Filtering' :
                                                            result.testType === 'dns_security' ? 'DNS Security' :
                                                                'Threat Prevention'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-200">{result.testName}</td>
                                                <td className="px-4 py-3 text-sm">{getStatusBadge(result.result)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
