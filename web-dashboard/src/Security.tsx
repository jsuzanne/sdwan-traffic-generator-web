import React, { useState, useEffect } from 'react';
import { Shield, Play, AlertTriangle, CheckCircle, XCircle, Clock, Download, Trash2, ChevronDown, ChevronUp, Copy, Filter, Link, Upload, RefreshCcw } from 'lucide-react';
import { URL_CATEGORIES, DNS_TEST_DOMAINS } from '../shared/security-categories';

interface SecurityProps {
    token: string;
}

interface TestResult {
    testId?: number;
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
        eicar_endpoints?: string[];
    };
    scheduled_execution?: {
        url: { enabled: boolean; interval_minutes: number; last_run_time?: number | null; next_run_time?: number | null };
        dns: { enabled: boolean; interval_minutes: number; last_run_time?: number | null; next_run_time?: number | null };
        threat: { enabled: boolean; interval_minutes: number; last_run_time?: number | null; next_run_time?: number | null };
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
    edlTesting: {
        ipList: { remoteUrl: string | null; lastSyncTime: number; elementsCount?: number };
        urlList: { remoteUrl: string | null; lastSyncTime: number; elementsCount?: number };
        dnsList: { remoteUrl: string | null; lastSyncTime: number; elementsCount?: number };
        testMode: 'sequential' | 'random';
        randomSampleSize: number;
        maxElementsPerRun: number;
    };
}

// Sub-component for scheduler settings to avoid unmounting on parent re-render
const SchedulerSettings = ({
    type,
    title,
    config,
    onUpdate
}: {
    type: 'url' | 'dns' | 'threat',
    title: string,
    config: SecurityConfig | null,
    onUpdate: (type: 'url' | 'dns' | 'threat', enabled: boolean, minutes: number) => Promise<void>
}) => {
    if (!config?.scheduled_execution) return null;

    // Robustness: ensure we have the expected structure
    const schedule = (config.scheduled_execution as any)[type] || { enabled: false, interval_minutes: 15 };

    const formatTime = (ts: number | null | undefined) => {
        if (!ts) return null;
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-4 bg-card-secondary p-2 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                    <Clock size={14} className={schedule.enabled ? "text-blue-400" : "text-text-muted"} />
                    <span className="text-xs font-medium text-text-secondary">{title} Schedule:</span>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={schedule.interval_minutes}
                        onChange={(e) => onUpdate(type, schedule.enabled, parseInt(e.target.value))}
                        disabled={!schedule.enabled}
                        className="bg-card-secondary border-border text-text-primary text-[10px] rounded p-0.5 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {[5, 10, 15, 30, 45, 60].map(m => (
                            <option key={m} value={m}>{m}m</option>
                        ))}
                    </select>

                    <button
                        onClick={() => onUpdate(type, !schedule.enabled, schedule.interval_minutes)}
                        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${schedule.enabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                        <span className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${schedule.enabled ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>
            {schedule.enabled && schedule.next_run_time && (
                <div className="flex items-center gap-1 text-[10px] text-blue-400/80 font-medium px-2">
                    <Clock size={10} />
                    Next test at {formatTime(schedule.next_run_time)}
                </div>
            )}
        </div>
    );
};

export default function Security({ token }: SecurityProps) {
    const [config, setConfig] = useState<SecurityConfig | null>(null);
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [batchProcessingUrl, setBatchProcessingUrl] = useState(false);
    const [batchProcessingDns, setBatchProcessingDns] = useState(false);
    const [testing, setTesting] = useState<{ [key: string]: boolean }>({});
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Collapsible sections
    const [urlExpanded, setUrlExpanded] = useState(true);
    const [dnsExpanded, setDnsExpanded] = useState(true);
    const [threatExpanded, setThreatExpanded] = useState(true);
    const [edlExpanded, setEdlExpanded] = useState(true);
    const [resultsExpanded, setResultsExpanded] = useState(true);

    const [edlResults, setEdlResults] = useState<{ [key: string]: { results: any[], summary?: any } }>({
        ip: { results: [] },
        url: { results: [] },
        dns: { results: [] }
    });
    const [edlSyncing, setEdlSyncing] = useState<{ [key: string]: boolean }>({});
    const [edlTestingState, setEdlTestingState] = useState<{ [key: string]: boolean }>({});

    // Test results filter
    const [testTypeFilter, setTestTypeFilter] = useState<'all' | 'url_filtering' | 'dns_security' | 'threat_prevention'>('all');

    // Search and pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [totalResults, setTotalResults] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Detailed log viewer
    const [selectedTest, setSelectedTest] = useState<any>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [modalSearchQuery, setModalSearchQuery] = useState('');

    // System health
    const [systemHealth, setSystemHealth] = useState<any>(null);


    // EICAR endpoint input
    const [eicarEndpoint, setEicarEndpoint] = useState('http://192.168.203.100/eicar.com.txt');

    const authHeaders = () => ({ 'Authorization': `Bearer ${token}` });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const copyToClipboard = (text: string) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                showToast('Command copied to clipboard!', 'success');
            }).catch(() => {
                fallbackCopyTextToClipboard(text);
            });
        } else {
            fallbackCopyTextToClipboard(text);
        }
    };

    const fallbackCopyTextToClipboard = (text: string) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // Ensure the textarea is not visible
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showToast('Command copied to clipboard!', 'success');
            } else {
                showToast('Failed to copy command', 'error');
            }
        } catch (err) {
            showToast('Failed to copy command', 'error');
        }

        document.body.removeChild(textArea);
    };

    // Load configuration and start polling
    useEffect(() => {
        fetchConfig();
        fetchResults();
        fetchHealth();

        // Background polling for statistics (refreshes counters from scheduled tests)
        const pollInterval = setInterval(() => {
            fetchConfig();
            fetchHealth();
        }, 30000); // 30 seconds

        return () => clearInterval(pollInterval);
    }, []);

    const fetchHealth = async () => {
        try {
            const res = await fetch('/api/system/health', { headers: authHeaders() });
            const data = await res.json();
            setSystemHealth(data);
        } catch (e) {
            console.error('Failed to fetch system health:', e);
        }
    };


    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/security/config', { headers: authHeaders() });
            if (!res.ok) {
                console.error(`Failed to fetch security config: ${res.status} ${res.statusText}`);
                return;
            }
            const data = await res.json();

            if (!data) {
                console.error('Security config data is empty');
                return;
            }

            // Ensure scheduled_execution has the new structure if it's from an old config
            if (data.scheduled_execution) {
                if (typeof data.scheduled_execution !== 'object' || !data.scheduled_execution.url) {
                    console.log('Migrating scheduled_execution in frontend...');
                    data.scheduled_execution = {
                        url: data.scheduled_execution?.url || { enabled: false, interval_minutes: 15 },
                        dns: data.scheduled_execution?.dns || { enabled: false, interval_minutes: 15 },
                        threat: data.scheduled_execution?.threat || { enabled: false, interval_minutes: 30 }
                    };
                }
            } else {
                data.scheduled_execution = {
                    url: { enabled: false, interval_minutes: 15 },
                    dns: { enabled: false, interval_minutes: 15 },
                    threat: { enabled: false, interval_minutes: 30 }
                };
            }

            setConfig(data);
            if (data.threat_prevention?.eicar_endpoint) {
                setEicarEndpoint(data.threat_prevention.eicar_endpoint);
            }
        } catch (e) {
            console.error('Failed to fetch security config:', e);
        }
    };

    const updateSchedule = async (type: 'url' | 'dns' | 'threat', enabled: boolean, minutes: number) => {
        if (!config) return;

        const newConfig = { ...config };
        if (!newConfig.scheduled_execution) {
            newConfig.scheduled_execution = {
                url: { enabled: false, interval_minutes: 15 },
                dns: { enabled: false, interval_minutes: 15 },
                threat: { enabled: false, interval_minutes: 30 }
            };
        }

        newConfig.scheduled_execution[type] = { enabled, interval_minutes: minutes };

        try {
            const res = await fetch('/api/security/config', {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });
            const data = await res.json();
            if (data.success) {
                setConfig(data.config);
                showToast(`${type.toUpperCase()} test schedule updated`, 'success');
            }
        } catch (e) {
            showToast('Failed to update schedule', 'error');
        }
    };


    const fetchResults = async (offset = 0, append = false) => {
        try {
            const params = new URLSearchParams({
                limit: '50',
                offset: offset.toString(),
                ...(searchQuery && { search: searchQuery }),
                ...(testTypeFilter !== 'all' && { type: testTypeFilter })
            });

            const res = await fetch(`/api/security/results?${params}`, { headers: authHeaders() });
            const data = await res.json();

            // Map id to testId for frontend compatibility
            const mappedResults = (data.results || []).map((r: any) => ({
                ...r,
                testId: r.id,
                testType: r.type,
                testName: r.name,
                result: { status: r.status } // For getStatusBadge compatibility
            }));

            if (append) {
                setTestResults(prev => [...prev, ...mappedResults]);
            } else {
                setTestResults(mappedResults);
            }

            setTotalResults(data.total || 0);
            setHasMore((data.results?.length || 0) === 50);
        } catch (e) {
            console.error('Failed to fetch test results:', e);
        }
    };

    const loadMore = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        await fetchResults(testResults.length, true);
        setLoadingMore(false);
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setTestResults([]);
    };

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchResults(0, false);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, testTypeFilter]);

    const viewTestDetails = async (testId: number) => {
        setModalSearchQuery('');
        try {
            const response = await fetch(`/api/security/results/${testId}`, {
                headers: authHeaders()
            });
            const data = await response.json();
            setSelectedTest(data);
            setShowDetailModal(true);
        } catch (e) {
            console.error('Failed to fetch test details:', e);
            showToast('Failed to load test details', 'error');
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

    const toggleAllURLCategories = () => {
        if (!config) return;
        const allIds = URL_CATEGORIES.map(cat => cat.id);
        const allEnabled = config.url_filtering.enabled_categories.length === allIds.length;

        saveConfig({
            url_filtering: { ...config.url_filtering, enabled_categories: allEnabled ? [] : allIds }
        });
    };

    const toggleAllDNSTests = () => {
        if (!config) return;
        const allIds = DNS_TEST_DOMAINS.map(test => test.id);
        const allEnabled = config.dns_security.enabled_tests.length === allIds.length;

        saveConfig({
            dns_security: { ...config.dns_security, enabled_tests: allEnabled ? [] : allIds }
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
            await fetchConfig();
        } catch (e) {
            console.error('URL test failed:', e);
        } finally {
            setTesting({ ...testing, [`url-${category.id}`]: false });
        }
    };

    const runURLBatchTest = async () => {
        if (!config || batchProcessingUrl) return;
        setBatchProcessingUrl(true);
        showToast(`Running ${config.url_filtering.enabled_categories.length} URL filtering tests...`, 'info');
        try {
            const enabledCategories = URL_CATEGORIES.filter(cat =>
                config.url_filtering.enabled_categories.includes(cat.id)
            );

            const tests = enabledCategories.map(cat => ({ url: cat.url, category: cat.name }));

            await fetch('/api/security/url-test-batch', {
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
            setBatchProcessingUrl(false);
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
            await fetchConfig();
        } catch (e) {
            console.error('DNS test failed:', e);
        } finally {
            setTesting({ ...testing, [`dns-${test.id}`]: false });
        }
    };

    const runDNSBatchTest = async () => {
        if (!config || batchProcessingDns) return;
        setBatchProcessingDns(true);
        showToast(`Running ${config.dns_security.enabled_tests.length} DNS security tests...`, 'info');
        try {
            const enabledTests = DNS_TEST_DOMAINS.filter(test =>
                config.dns_security.enabled_tests.includes(test.id)
            );

            const tests = enabledTests.map(test => ({ domain: test.domain, testName: test.name }));

            await fetch('/api/security/dns-test-batch', {
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
            setBatchProcessingDns(false);
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
            await fetchConfig();
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

    const syncEdl = async (type: 'ip' | 'url' | 'dns') => {
        setEdlSyncing(prev => ({ ...prev, [type]: true }));
        try {
            const res = await fetch('/api/security/edl-sync', {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ type })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`EDL ${type.toUpperCase()} synced: ${data.elementsCount} elements`, 'success');
                fetchConfig(); // Refresh counts
            } else {
                showToast(data.message || 'Sync failed', 'error');
            }
        } catch (e) {
            showToast('Sync failed', 'error');
        } finally {
            setEdlSyncing(prev => ({ ...prev, [type]: false }));
        }
    };

    const uploadEdl = async (type: 'ip' | 'url' | 'dns', file: File) => {
        const formData = new FormData();
        formData.append('type', type);
        formData.append('file', file);

        setEdlSyncing(prev => ({ ...prev, [type]: true }));
        try {
            const res = await fetch('/api/security/edl-upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }, // No content-type for FormData
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                showToast(`EDL ${type.toUpperCase()} uploaded: ${data.elementsCount} elements`, 'success');
                fetchConfig(); // Refresh counts
            } else {
                showToast(data.message || 'Upload failed', 'error');
            }
        } catch (e) {
            showToast('Upload failed', 'error');
        } finally {
            setEdlSyncing(prev => ({ ...prev, [type]: false }));
        }
    };

    const updateEdlConfig = async (updates: any) => {
        try {
            const res = await fetch('/api/security/edl-config', {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            const data = await res.json();
            if (data.success) {
                showToast('EDL configuration saved', 'success');
                fetchConfig();
            }
        } catch (e) {
            showToast('Failed to save EDL config', 'error');
        }
    };

    const runEdlTest = async (type: 'ip' | 'url' | 'dns') => {
        setEdlTestingState(prev => ({ ...prev, [type]: true }));
        try {
            const res = await fetch('/api/security/edl-test', {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ type })
            });
            const data = await res.json();
            if (data.success) {
                setEdlResults(prev => ({
                    ...prev,
                    [type]: {
                        results: data.results || [],
                        summary: {
                            testedCount: data.testedCount,
                            allowedCount: data.allowedCount,
                            blockedCount: data.blockedCount,
                            errorCount: data.errorCount,
                            successRate: data.successRate
                        }
                    }
                }));
                const summary = `${data.testedCount} tested – ${data.allowedCount} allowed, ${data.blockedCount} blocked (${(data.successRate * 100).toFixed(0)}% OK)`;
                showToast(`EDL ${type.toUpperCase()} test completed: ${summary}`, 'success');
                fetchResults(); // Update global log
            } else {
                showToast(data.error || 'Test failed', 'error');
            }
        } catch (e) {
            showToast('Test failed', 'error');
        } finally {
            setEdlTestingState(prev => ({ ...prev, [type]: false }));
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

    const resetCounters = async () => {
        if (!confirm('Are you sure you want to reset all security statistics, clear the entire test history, and reset the test counter to #1? This action cannot be undone.')) return;
        setLoading(true);
        try {
            const res = await fetch('/api/security/statistics', {
                method: 'DELETE',
                headers: authHeaders()
            });
            const data = await res.json();
            if (data.success) {
                await fetchConfig();
                await fetchResults();
                showToast('Statistics and history reset successfully', 'success');
            }
        } catch (e) {
            console.error('Failed to reset statistics:', e);
            showToast('Failed to reset statistics', 'error');
        } finally {
            setLoading(false);
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
        } else if (status === 'sinkholed') {
            return <span className="flex items-center gap-1 text-yellow-400 text-sm"><AlertTriangle size={14} /> Sinkholed</span>;
        } else if (status === 'allowed' || status === 'resolved') {
            return <span className="flex items-center gap-1 text-green-400 text-sm"><CheckCircle size={14} /> Allowed </span>;
        } else if (status === 'unreachable') {
            return <span className="flex items-center gap-1 text-orange-400 text-sm"><AlertTriangle size={14} /> Unreachable</span>;
        } else if (status === 'error') {
            return <span className="flex items-center gap-1 text-orange-400 text-sm"><XCircle size={14} /> Error</span>;
        } else {
            // This should never happen - log it for debugging
            console.warn('Unknown test status:', status);
            return <span className="flex items-center gap-1 text-text-muted text-sm"><Clock size={14} /> Unknown</span>;
        }
    };

    if (!config) {
        return <div className="p-8 text-center text-text-secondary">Loading security configuration...</div>;
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
            <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <Shield size={32} className="text-red-400" />
                    <h2 className="text-2xl font-bold text-foreground">Security Testing</h2>
                </div>
                <p className="text-text-primary">
                    Test Palo Alto Networks firewall security policies: URL Filtering, DNS Security, and Threat Prevention
                </p>
                <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-yellow-300 text-sm">
                        <strong>Warning:</strong> These tests will trigger firewall security alerts and blocks. Use only in demo/POC environments.
                    </p>
                </div>

                {/* System Health Status */}
                {systemHealth && (
                    <div className={`mt-3 rounded-lg p-3 flex items-start gap-2 ${systemHealth.ready
                        ? 'bg-green-500/10 border border-green-500/30'
                        : 'bg-red-500/10 border border-red-500/30'
                        }`}>
                        {systemHealth.ready ? (
                            <>
                                <CheckCircle size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
                                <div className="text-green-300 text-sm">
                                    <strong>System Ready</strong> - All required commands available ({systemHealth.platform})
                                </div>
                            </>
                        ) : (
                            <>
                                <XCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                                <div className="text-red-300 text-sm">
                                    <strong>System Not Ready</strong> - Missing commands: {
                                        Object.entries(systemHealth.commands)
                                            .filter(([_, cmd]: any) => !cmd.available)
                                            .map(([name]: any) => name)
                                            .join(', ')
                                    }. Tests may fail. Deploy in Docker for full functionality.
                                </div>
                            </>
                        )}
                    </div>
                )}


            </div>

            {/* Statistics Dashboard */}
            {config.statistics && (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Test Statistics</h3>
                        <button
                            onClick={resetCounters}
                            className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 border border-red-500/30 rounded-lg transition-colors"
                        >
                            <Trash2 size={12} />
                            Reset Counters
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-text-secondary text-sm">Total Tests</span>
                                <Shield size={16} className="text-blue-400" />
                            </div>
                            <div className="text-2xl font-bold text-foreground">{config.statistics.total_tests_run}</div>
                            {config.statistics.last_test_time && (
                                <div className="text-xs text-text-muted mt-1">
                                    Last: {new Date(config.statistics.last_test_time).toLocaleTimeString()}
                                </div>
                            )}
                        </div>

                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-text-secondary text-sm">URL Filtering</span>
                                <Shield size={16} className="text-blue-400" />
                            </div>
                            <div className="flex items-center gap-3">
                                <div>
                                    <div className="text-lg font-bold text-red-400">{config.statistics.url_tests_blocked}</div>
                                    <div className="text-xs text-text-muted">Blocked</div>
                                </div>
                                <div className="text-border">/</div>
                                <div>
                                    <div className="text-lg font-bold text-green-400">{config.statistics.url_tests_allowed}</div>
                                    <div className="text-xs text-text-muted">Allowed</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-text-secondary text-sm">DNS Security</span>
                                <Shield size={16} className="text-purple-400" />
                            </div>
                            <div className="flex items-center gap-2">
                                <div>
                                    <div className="text-lg font-bold text-red-400">{config.statistics.dns_tests_blocked}</div>
                                    <div className="text-xs text-text-muted">Blocked</div>
                                </div>
                                <div className="text-border">/</div>
                                <div>
                                    <div className="text-lg font-bold text-yellow-400">{config.statistics.dns_tests_sinkholed || 0}</div>
                                    <div className="text-xs text-text-muted">Sinkholed</div>
                                </div>
                                <div className="text-border">/</div>
                                <div>
                                    <div className="text-lg font-bold text-green-400">{config.statistics.dns_tests_allowed}</div>
                                    <div className="text-xs text-text-muted">Resolved</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-text-secondary text-sm">Threat Prevention</span>
                                <Shield size={16} className="text-red-400" />
                            </div>
                            <div className="flex items-center gap-3">
                                <div>
                                    <div className="text-lg font-bold text-red-400">{config.statistics.threat_tests_blocked}</div>
                                    <div className="text-xs text-text-muted">Blocked</div>
                                </div>
                                <div className="text-border">/</div>
                                <div>
                                    <div className="text-lg font-bold text-green-400">{config.statistics.threat_tests_allowed}</div>
                                    <div className="text-xs text-text-muted">Allowed</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* URL Filtering Tests */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <button
                    onClick={() => setUrlExpanded(!urlExpanded)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-card-secondary hover:bg-card-hover transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Shield size={20} className="text-blue-400" />
                        <h3 className="text-lg font-semibold text-foreground">URL Filtering Tests</h3>
                        <span className="text-sm text-text-secondary">
                            ({config.url_filtering.enabled_categories.length} / {URL_CATEGORIES.length} enabled)
                        </span>
                    </div>
                    {urlExpanded ? <ChevronUp size={20} className="text-text-secondary" /> : <ChevronDown size={20} className="text-text-secondary" />}
                </button>

                {urlExpanded && (
                    <div className="p-6 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={config.url_filtering.enabled_categories.length === URL_CATEGORIES.length}
                                        onChange={toggleAllURLCategories}
                                        className="w-4 h-4 rounded border-border bg-card-secondary text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-text-secondary group-hover:text-foreground transition-colors">Select All</span>
                                </label>

                                <SchedulerSettings type="url" title="URL" config={config} onUpdate={updateSchedule} />

                                <p className="text-text-muted text-sm hidden lg:block">
                                    Test URL filtering policies using Palo Alto Networks test pages
                                </p>
                            </div>
                            <button
                                onClick={runURLBatchTest}
                                disabled={loading || batchProcessingUrl || config.url_filtering.enabled_categories.length === 0 || (systemHealth && !systemHealth.ready)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-card-secondary disabled:text-text-muted text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                title={systemHealth && !systemHealth.ready ? 'System not ready - missing required commands' : ''}
                            >
                                {batchProcessingUrl ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Testing...
                                    </>
                                ) : (
                                    <>
                                        <Play size={16} /> Run All Enabled
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                            {URL_CATEGORIES.map(category => {
                                const isEnabled = config.url_filtering.enabled_categories.includes(category.id);
                                const isTesting = testing[`url-${category.id}`];
                                const lastResult = testResults.find(r =>
                                    (r.testType === 'url_filtering' || r.testType === 'url') && r.testName === category.name
                                );

                                return (
                                    <div
                                        key={category.id}
                                        className="bg-card-secondary border border-border rounded-lg p-3 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={isEnabled}
                                                onChange={() => toggleURLCategory(category.id)}
                                                className="w-4 h-4 rounded border-border bg-card-secondary text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-text-primary truncate">{category.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {lastResult && getStatusBadge(lastResult.result)}
                                            <button
                                                onClick={() => copyToClipboard(`docker exec sdwan-web-ui sh -c "curl -fsS --max-time 10 -o /dev/null -w '%{http_code}' '${category.url}'"`)}
                                                className="p-1 hover:bg-card border border-transparent hover:border-border rounded text-text-muted hover:text-blue-400 transition-colors"
                                                title="Copy CLI command"
                                            >
                                                <Copy size={14} />
                                            </button>
                                            <button
                                                onClick={() => runURLTest(category)}
                                                disabled={isTesting}
                                                className="p-1 hover:bg-card border border-transparent hover:border-border rounded text-text-muted hover:text-purple-400 transition-colors disabled:opacity-50"
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
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <button
                    onClick={() => setDnsExpanded(!dnsExpanded)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-card-secondary hover:bg-card-hover transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Shield size={20} className="text-purple-400" />
                        <h3 className="text-lg font-semibold text-foreground">DNS Security Tests</h3>
                        <span className="text-sm text-text-secondary">
                            ({config.dns_security.enabled_tests.length} / {DNS_TEST_DOMAINS.length} enabled)
                        </span>
                    </div>
                    {dnsExpanded ? <ChevronUp size={20} className="text-text-secondary" /> : <ChevronDown size={20} className="text-text-secondary" />}
                </button>

                {dnsExpanded && (
                    <div className="p-6 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={config.dns_security.enabled_tests.length === DNS_TEST_DOMAINS.length}
                                        onChange={toggleAllDNSTests}
                                        className="w-4 h-4 rounded border-border bg-card-secondary text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-sm font-medium text-text-secondary group-hover:text-foreground transition-colors">Select All</span>
                                </label>

                                <SchedulerSettings type="dns" title="DNS" config={config} onUpdate={updateSchedule} />

                                <p className="text-text-muted text-sm hidden lg:block">
                                    Test DNS Security policies using Palo Alto Networks test domains
                                </p>
                            </div>
                            <button
                                onClick={runDNSBatchTest}
                                disabled={loading || batchProcessingDns || config.dns_security.enabled_tests.length === 0 || (systemHealth && !systemHealth.ready)}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-card-secondary disabled:text-text-muted text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                title={systemHealth && !systemHealth.ready ? 'System not ready - missing required commands' : ''}
                            >
                                {batchProcessingDns ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Testing...
                                    </>
                                ) : (
                                    <>
                                        <Play size={16} /> Run All Enabled
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Basic DNS Tests */}
                        <div>
                            <h4 className="text-sm font-semibold text-text-secondary mb-2">Basic DNS Security</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                                {basicDNSTests.map(test => {
                                    const isEnabled = config.dns_security.enabled_tests.includes(test.id);
                                    const isTesting = testing[`dns-${test.id}`];
                                    const lastResult = testResults.find(r =>
                                        (r.testType === 'dns_security' || r.testType === 'dns') && r.testName === test.name
                                    );

                                    return (
                                        <div
                                            key={test.id}
                                            className="bg-card-secondary border border-border rounded-lg p-3 flex items-center justify-between shadow-sm"
                                        >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={isEnabled}
                                                    onChange={() => toggleDNSTest(test.id)}
                                                    className="w-4 h-4 rounded border-border bg-card-secondary text-purple-600 focus:ring-purple-500"
                                                />
                                                <span
                                                    className="text-sm text-text-primary truncate cursor-help"
                                                    title={`Domain: ${test.domain}\nCommand: getent ahosts ${test.domain}`}
                                                >{test.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {lastResult && getStatusBadge(lastResult.result)}
                                                <button
                                                    onClick={() => copyToClipboard(`docker exec sdwan-web-ui sh -c "getent ahosts ${test.domain}"`)}
                                                    className="p-1 hover:bg-card border border-transparent hover:border-border rounded text-text-muted hover:text-blue-400 transition-colors"
                                                    title="Copy CLI command"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                                <button
                                                    onClick={() => runDNSTest(test)}
                                                    disabled={isTesting}
                                                    className="p-1 hover:bg-card border border-transparent hover:border-border rounded text-text-muted hover:text-purple-400 transition-colors disabled:opacity-50"
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
                            <h4 className="text-sm font-semibold text-text-secondary mb-2">Advanced DNS Security</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                                {advancedDNSTests.map(test => {
                                    const isEnabled = config.dns_security.enabled_tests.includes(test.id);
                                    const isTesting = testing[`dns-${test.id}`];
                                    const lastResult = testResults.find(r =>
                                        (r.testType === 'dns_security' || r.testType === 'dns') && r.testName === test.name
                                    );

                                    return (
                                        <div
                                            key={test.id}
                                            className="bg-card-secondary border border-border rounded-lg p-3 flex items-center justify-between shadow-sm"
                                        >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={isEnabled}
                                                    onChange={() => toggleDNSTest(test.id)}
                                                    className="w-4 h-4 rounded border-border bg-card-secondary text-purple-600 focus:ring-purple-500"
                                                />
                                                <span
                                                    className="text-sm text-text-primary truncate cursor-help"
                                                    title={`Domain: ${test.domain}\nCommand: getent ahosts ${test.domain}`}
                                                >{test.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {lastResult && getStatusBadge(lastResult.result)}
                                                <button
                                                    onClick={() => copyToClipboard(`docker exec sdwan-web-ui sh -c "getent ahosts ${test.domain}"`)}
                                                    className="p-1 hover:bg-card border border-transparent hover:border-border rounded text-text-muted hover:text-blue-400 transition-colors"
                                                    title="Copy CLI command"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                                <button
                                                    onClick={() => runDNSTest(test)}
                                                    disabled={isTesting}
                                                    className="p-1 hover:bg-card border border-transparent hover:border-border rounded text-text-muted hover:text-purple-400 transition-colors disabled:opacity-50"
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
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <button
                    onClick={() => setThreatExpanded(!threatExpanded)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-card-secondary hover:bg-card-hover transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Shield size={20} className="text-red-400" />
                        <h3 className="text-lg font-semibold text-foreground">Threat Prevention (EICAR)</h3>
                    </div>
                    {threatExpanded ? <ChevronUp size={20} className="text-text-secondary" /> : <ChevronDown size={20} className="text-text-secondary" />}
                </button>

                {threatExpanded && (
                    <div className="p-6 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <p className="text-text-muted text-sm">
                                Test IPS/Threat Prevention by downloading EICAR test file
                            </p>
                            <SchedulerSettings type="threat" title="Threat" config={config} onUpdate={updateSchedule} />
                        </div>

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
                                    <label className="block text-sm font-medium text-text-secondary mb-2">
                                        EICAR Endpoint URL
                                    </label>
                                    <input
                                        type="text"
                                        value={eicarEndpoint}
                                        onChange={(e) => setEicarEndpoint(e.target.value)}
                                        placeholder="http://192.168.203.100/eicar.com.txt"
                                        className="w-full bg-card-secondary border border-border text-text-primary rounded-lg px-4 py-2 focus:border-red-500 outline-none"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => copyToClipboard(`docker exec sdwan-web-ui sh -c "curl -fsS --max-time 20 ${eicarEndpoint} -o /tmp/eicar.com.txt && rm -f /tmp/eicar.com.txt"`)}
                                        className="px-4 py-3 bg-card-hover hover:bg-card border border-border text-text-primary rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                        title="Copy CLI command"
                                    >
                                        <Copy size={18} /> Copy Command
                                    </button>
                                    <button
                                        onClick={runThreatTest}
                                        disabled={loading || !eicarEndpoint || (systemHealth && !systemHealth.ready)}
                                        className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 disabled:bg-card-secondary disabled:text-text-muted text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Play size={18} /> Run EICAR Test
                                    </button>
                                </div>

                                {testResults.find(r => r.testType === 'threat_prevention' || r.testType === 'threat') && (
                                    <div className="mt-3">
                                        {getStatusBadge(testResults.find(r => r.testType === 'threat_prevention' || r.testType === 'threat')?.result)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* EDL Lists (IP / URL / DNS) */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <button
                    onClick={() => setEdlExpanded(!edlExpanded)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-card-secondary hover:bg-card-hover transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Filter size={20} className="text-orange-400" />
                        <h3 className="text-lg font-semibold text-foreground">EDL Lists (IP / URL / DNS)</h3>
                        <span className="text-sm text-text-secondary">
                            (Dynamic External Lists testing)
                        </span>
                    </div>
                    {edlExpanded ? <ChevronUp size={20} className="text-text-secondary" /> : <ChevronDown size={20} className="text-text-secondary" />}
                </button>

                {edlExpanded && (
                    <div className="p-6 space-y-8">
                        {/* 3 Columns for Lists */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {(['ip', 'url', 'dns'] as const).map(type => {
                                const listName = `${type}List` as keyof typeof config.edlTesting;
                                const list = config.edlTesting[listName] as any;
                                const isSyncing = edlSyncing[type];

                                return (
                                    <div key={type} className="bg-card-secondary border border-border rounded-xl p-5 space-y-4 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">{type.toUpperCase()} EDL</h4>
                                            <span className="text-[10px] font-mono bg-card border border-border text-text-secondary px-2 py-0.5 rounded">
                                                {list.elementsCount || 0} Elements
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-text-muted mb-1 ml-1">Remote URL</label>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                                        <input
                                                            type="text"
                                                            value={list.remoteUrl || ''}
                                                            onChange={(e) => updateEdlConfig({ [listName]: { remoteUrl: e.target.value } })}
                                                            placeholder="https://..."
                                                            className="w-full bg-card border border-border text-text-primary text-xs rounded-lg pl-9 pr-3 py-2 outline-none focus:border-orange-500"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => syncEdl(type)}
                                                        disabled={isSyncing || !list.remoteUrl}
                                                        className="p-2 bg-card border border-border hover:bg-card-hover disabled:opacity-50 text-orange-400 rounded-lg transition-colors"
                                                        title="Sync from URL"
                                                    >
                                                        <RefreshCcw size={16} className={isSyncing ? 'animate-spin' : ''} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="pt-2">
                                                <label className="block text-[10px] uppercase font-bold text-text-muted mb-1 ml-1">Manual Upload</label>
                                                <div className="flex items-center gap-2">
                                                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-card border border-dashed border-border hover:border-text-muted rounded-lg cursor-pointer transition-colors group text-center">
                                                        <Upload size={14} className="text-text-muted group-hover:text-text-secondary" />
                                                        <span className="text-[10px] text-text-secondary font-medium truncate">Choose File</span>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept=".txt,.csv"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) uploadEdl(type, file);
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-border flex flex-col gap-1">
                                                <div className="text-[10px] text-text-muted">
                                                    Last Sync: <span className="text-text-secondary">{list.lastSyncTime ? new Date(list.lastSyncTime).toLocaleString() : 'Never'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Parameter Controls */}
                        <div className="bg-card-secondary border border-border rounded-xl p-5 shadow-sm">
                            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Filter size={14} /> Global EDL Parameters
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2 ml-1">Test Mode</label>
                                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                                        {(['sequential', 'random'] as const).map(m => (
                                            <button
                                                key={m}
                                                onClick={() => updateEdlConfig({ testMode: m })}
                                                className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all ${config.edlTesting.testMode === m
                                                    ? 'bg-orange-500 text-white shadow-lg'
                                                    : 'text-slate-500 hover:text-slate-300'
                                                    }`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2 ml-1">Random Sample Size</label>
                                    <input
                                        type="number"
                                        value={config.edlTesting.randomSampleSize}
                                        onChange={(e) => updateEdlConfig({ randomSampleSize: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2 ml-1">Max Elements / Run</label>
                                    <input
                                        type="number"
                                        value={config.edlTesting.maxElementsPerRun}
                                        onChange={(e) => updateEdlConfig({ maxElementsPerRun: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-orange-500"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={() => showToast('Configuration automatically saved', 'info')}
                                        className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-[10px] font-bold uppercase transition-colors"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Test Execution & Mini Results */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Play size={14} /> Execute EDL Tests
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {(['ip', 'url', 'dns'] as const).map(type => {
                                    const edlData = (edlResults as any)[type];
                                    const results = edlData.results;
                                    const summary = edlData.summary;
                                    const isTesting = edlTestingState[type];
                                    const listName = `${type}List` as keyof typeof config.edlTesting;
                                    const list = config.edlTesting[listName] as any;

                                    return (
                                        <div key={type} className="space-y-3">
                                            <button
                                                onClick={() => runEdlTest(type)}
                                                disabled={isTesting || !list.elementsCount}
                                                className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-card-secondary disabled:text-text-muted text-white rounded-xl font-bold uppercase text-[10px] transition-all flex items-center justify-center gap-2 group shadow-md"
                                            >
                                                {isTesting ? <RefreshCcw size={14} className="animate-spin" /> : <Play size={14} className="group-hover:scale-110 transition-transform" />}
                                                Test {type.toUpperCase()} EDL
                                            </button>

                                            {summary && (
                                                <div className="bg-card border border-border rounded-lg p-2 flex flex-col gap-1 shadow-sm">
                                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight">
                                                        <span className="text-text-muted">Last run summary</span>
                                                        <span className={summary.successRate >= 0.8 ? "text-green-400" : summary.successRate >= 0.5 ? "text-orange-400" : "text-red-400"}>
                                                            {(summary.successRate * 100).toFixed(0)}% OK
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-3 text-[10px] items-center">
                                                        <span className="text-text-secondary">Tested: <b className="text-text-primary">{summary.testedCount}</b></span>
                                                        <span className="text-text-secondary">Allowed: <b className="text-green-400">{summary.allowedCount}</b></span>
                                                        <span className="text-text-secondary">Blocked: <b className="text-red-400">{summary.blockedCount}</b></span>
                                                    </div>
                                                </div>
                                            )}

                                            {results && results.length > 0 && (
                                                <div className="bg-card-secondary border border-border rounded-lg overflow-hidden shadow-sm">
                                                    <table className="w-full text-[10px]">
                                                        <thead className="bg-card">
                                                            <tr className="border-b border-border">
                                                                <th className="text-left py-2 px-3 text-text-muted uppercase">Value</th>
                                                                <th className="text-right py-2 px-3 text-text-muted uppercase">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-border/50">
                                                            {results.slice(0, 5).map((r: any, i: number) => (
                                                                <tr key={i} className="hover:bg-card-hover/30">
                                                                    <td className="py-2 px-3 text-text-primary font-mono truncate max-w-[120px]">{r.value}</td>
                                                                    <td className="py-2 px-3 text-right">
                                                                        <span className={`px-1.5 py-0.5 rounded-md font-bold uppercase text-[9px] ${r.status === 'allowed' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                                                            }`}>
                                                                            {r.status}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {results.length > 5 && (
                                                                <tr>
                                                                    <td colSpan={2} className="py-2 px-3 text-center text-text-muted font-medium italic border-t border-border">
                                                                        + {results.length - 5} more results in global log
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Test Results */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <button
                    onClick={() => setResultsExpanded(!resultsExpanded)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-card-secondary hover:bg-card-hover transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Shield size={20} className="text-green-400" />
                        <h3 className="text-lg font-semibold text-foreground">Test Results</h3>
                        <span className="text-sm text-text-secondary">({totalResults} total, showing {testResults.length})</span>
                    </div>
                    {resultsExpanded ? <ChevronUp size={20} className="text-text-secondary" /> : <ChevronDown size={20} className="text-text-secondary" />}
                </button>

                {resultsExpanded && (
                    <div className="p-6 space-y-4">
                        {/* Search and Filters */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex-1 w-full sm:w-auto">
                                <input
                                    type="text"
                                    placeholder="Search by test #, name, or status..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="w-full px-4 py-2 bg-card-secondary border border-border text-text-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-text-muted"
                                />
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <select
                                    value={testTypeFilter}
                                    onChange={(e) => setTestTypeFilter(e.target.value as any)}
                                    className="px-3 py-2 bg-card border border-border text-text-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Tests</option>
                                    <option value="url">URL Filtering</option>
                                    <option value="dns">DNS Security</option>
                                    <option value="threat">Threat Prevention</option>
                                </select>
                                <button
                                    onClick={exportResults}
                                    disabled={testResults.length === 0}
                                    className="px-3 py-2 bg-card border border-border hover:bg-card-hover disabled:bg-card-secondary disabled:text-text-muted text-text-primary rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <Download size={14} /> Export
                                </button>
                                <button
                                    onClick={clearHistory}
                                    disabled={testResults.length === 0}
                                    className="px-3 py-2 bg-card border border-border hover:bg-red-500/10 hover:text-red-500 disabled:bg-card-secondary disabled:text-text-muted text-text-primary rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <Trash2 size={14} /> Clear
                                </button>
                            </div>
                        </div>

                        {testResults.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <Shield size={48} className="mx-auto mb-3 opacity-30" />
                                <p>{searchQuery ? 'No results found for your search' : 'No test results yet. Run some tests to see results here.'}</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto max-h-96 overflow-y-auto" onScroll={(e) => {
                                    const target = e.currentTarget;
                                    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100 && hasMore && !loadingMore) {
                                        loadMore();
                                    }
                                }}>
                                    <table className="w-full">
                                        <thead className="bg-card-secondary sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="text-left px-4 py-3 text-sm font-semibold text-text-secondary">Test ID</th>
                                                <th className="text-left px-4 py-3 text-sm font-semibold text-text-secondary">Timestamp</th>
                                                <th className="text-left px-4 py-3 text-sm font-semibold text-text-secondary">Test Type</th>
                                                <th className="text-left px-4 py-3 text-sm font-semibold text-text-secondary">Test Name</th>
                                                <th className="text-left px-4 py-3 text-sm font-semibold text-text-secondary">Result</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {testResults.map((result, index) => (
                                                <tr
                                                    key={result.testId || index}
                                                    onClick={() => result.testId && viewTestDetails(result.testId)}
                                                    className="hover:bg-card-hover/20 transition-colors cursor-pointer"
                                                >
                                                    <td className="px-4 py-3 text-sm text-text-muted font-mono">
                                                        #{result.testId || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-text-muted">
                                                        {new Date(result.timestamp).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${result.testType === 'url_filtering' || result.testType === 'url' ? 'bg-blue-500/20 text-blue-400' :
                                                            result.testType === 'dns_security' || result.testType === 'dns' ? 'bg-purple-500/20 text-purple-400' :
                                                                'bg-red-500/20 text-red-400'
                                                            }`}>
                                                            {result.testType === 'url_filtering' || result.testType === 'url' ? 'URL' :
                                                                result.testType === 'dns_security' || result.testType === 'dns' ? 'DNS' :
                                                                    'Threat'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-text-primary truncate max-w-xs">
                                                        {result.testName}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">{getStatusBadge(result.result)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {loadingMore && (
                                        <div className="text-center py-4 text-slate-400 text-sm">
                                            Loading more results...
                                        </div>
                                    )}
                                </div>
                                {hasMore && !loadingMore && (
                                    <div className="text-center mt-4">
                                        <button
                                            onClick={loadMore}
                                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Load More
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Detailed Log Viewer Modal */}
            {showDetailModal && selectedTest && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowDetailModal(false)}>
                    <div className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card-secondary/50">
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Test Details #{selectedTest.id}</h3>
                                <p className="text-sm text-text-muted">{new Date(selectedTest.timestamp).toLocaleString()}</p>
                            </div>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="p-2 hover:bg-card-hover rounded-full transition-all hover:rotate-90"
                            >
                                <XCircle size={24} className="text-text-muted" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)] space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] uppercase font-bold tracking-wider text-text-muted mb-1 block">Test Type</label>
                                    <p className="text-text-primary font-medium">{selectedTest.type === 'url' ? 'URL Filtering' : selectedTest.type === 'dns' ? 'DNS Security' : 'Threat Prevention'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold tracking-wider text-text-muted mb-1 block">Status</label>
                                    <div className="mt-1">{getStatusBadge({ status: selectedTest.status })}</div>
                                </div>
                                <div className="col-span-2 bg-card-secondary/30 p-4 rounded-xl border border-border/50">
                                    <label className="text-[10px] uppercase font-bold tracking-wider text-text-muted mb-1 block">Test Name</label>
                                    <p className="text-text-primary font-medium leading-relaxed">{selectedTest.name}</p>
                                </div>
                            </div>

                            {selectedTest.details && (
                                <div className="bg-slate-800/50 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Details</h4>
                                    <div className="space-y-2 text-sm">
                                        {selectedTest.details.url && (
                                            <div>
                                                <span className="text-slate-400">URL:</span>
                                                <span className="text-slate-200 ml-2 font-mono">{selectedTest.details.url}</span>
                                            </div>
                                        )}
                                        {selectedTest.details.domain && (
                                            <div>
                                                <span className="text-slate-400">Domain:</span>
                                                <span className="text-slate-200 ml-2 font-mono">{selectedTest.details.domain}</span>
                                            </div>
                                        )}
                                        {selectedTest.details.resolvedIp && (
                                            <div>
                                                <span className="text-slate-400">Resolved IP:</span>
                                                <span className="text-slate-200 ml-2 font-mono">{selectedTest.details.resolvedIp}</span>
                                            </div>
                                        )}
                                        {selectedTest.details.command && (
                                            <div>
                                                <span className="text-slate-400">Command:</span>
                                                <pre className="text-slate-200 ml-2 mt-1 bg-slate-900 p-2 rounded overflow-x-auto">{selectedTest.details.command}</pre>
                                            </div>
                                        )}
                                        {selectedTest.details.output && (
                                            <div>
                                                <span className="text-slate-400">Output:</span>
                                                <pre className="text-slate-200 ml-2 mt-1 bg-slate-900 p-2 rounded overflow-x-auto max-h-48">{selectedTest.details.output}</pre>
                                            </div>
                                        )}
                                        {selectedTest.details.error && (
                                            <div>
                                                <span className="text-red-400">Error:</span>
                                                <pre className="text-red-300 ml-2 mt-1 bg-slate-900 p-2 rounded overflow-x-auto">{selectedTest.details.error}</pre>
                                            </div>
                                        )}
                                        {selectedTest.details.executionTime && (
                                            <div>
                                                <span className="text-slate-400">Execution Time:</span>
                                                <span className="text-slate-200 ml-2">{selectedTest.details.executionTime}ms</span>
                                            </div>
                                        )}
                                        {selectedTest.details.isBatch && selectedTest.details.results && (
                                            <div className="mt-4 pt-4 border-t border-slate-700">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-sm font-semibold text-slate-300">Detailed Batch Results</h4>
                                                    <div className="relative w-48">
                                                        <input
                                                            type="text"
                                                            placeholder="Search results..."
                                                            value={modalSearchQuery}
                                                            onChange={(e) => setModalSearchQuery(e.target.value)}
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                                                    <div className="max-h-96 overflow-y-auto">
                                                        <table className="w-full text-xs">
                                                            <thead className="bg-slate-800 sticky top-0 z-10">
                                                                <tr className="border-b border-slate-800">
                                                                    <th className="text-left py-2.5 px-3 text-slate-400 font-bold uppercase tracking-wider text-[9px]">Value</th>
                                                                    <th className="text-right py-2.5 px-3 text-slate-400 font-bold uppercase tracking-wider text-[9px]">Status</th>
                                                                    <th className="text-left py-2.5 px-3 text-slate-400 font-bold uppercase tracking-wider text-[9px]">Details</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-800/50">
                                                                {selectedTest.details.results
                                                                    .filter((r: any) =>
                                                                        r.value.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                                                                        r.status.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                                                                        (r.details && r.details.toLowerCase().includes(modalSearchQuery.toLowerCase()))
                                                                    )
                                                                    .map((r: any, i: number) => (
                                                                        <tr key={i} className="hover:bg-slate-800/30">
                                                                            <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px] break-all">{r.value}</td>
                                                                            <td className="py-2.5 px-3 text-right">
                                                                                <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[9px] ${r.status === 'allowed' ? 'bg-green-500/10 text-green-400' :
                                                                                    r.status === 'error' ? 'bg-orange-500/10 text-orange-400' : 'bg-red-500/10 text-red-400'
                                                                                    }`}>
                                                                                    {r.status}
                                                                                </span>
                                                                            </td>
                                                                            <td className="py-2.5 px-3 text-slate-500 text-[10px] break-words max-w-[150px]">{r.details || '-'}</td>
                                                                        </tr>
                                                                    ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {selectedTest.details.reason && (
                                            <div className="mt-4 pt-4 border-t border-slate-700">
                                                <span className="text-blue-400 font-bold uppercase text-[10px] tracking-wider block mb-1">Decision Reason</span>
                                                <p className="text-slate-200 font-medium">{selectedTest.details.reason}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
