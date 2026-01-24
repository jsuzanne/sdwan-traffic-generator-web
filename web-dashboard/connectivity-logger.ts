import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const appendFile = promisify(fs.appendFile);
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

export interface ConnectivityResult {
    timestamp: number;
    endpointId: string;
    endpointName: string;
    endpointType: 'HTTP' | 'HTTPS' | 'PING' | 'TCP';
    url: string;
    reachable: boolean;
    httpCode?: number;
    remoteIp?: string;
    remotePort?: number;
    metrics: {
        dns_ms?: number;
        tcp_ms?: number;
        tls_ms?: number;
        ttfb_ms?: number;
        total_ms: number;
        size_bytes?: number;
        speed_bps?: number;
        ssl_verify?: number;
    };
    score: number;
}

export class ConnectivityLogger {
    private logDir: string;
    private retentionDays: number;
    private maxLogSizeMB: number;
    private currentLogFile: string;

    constructor(logDir: string, retentionDays: number = 7, maxLogSizeMB: number = 100) {
        this.logDir = logDir;
        this.retentionDays = retentionDays;
        this.maxLogSizeMB = maxLogSizeMB;
        this.currentLogFile = path.join(logDir, 'connectivity-results.jsonl');

        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    async logResult(result: ConnectivityResult): Promise<void> {
        try {
            await this.rotateIfNeeded();
            const line = JSON.stringify(result) + '\n';
            await appendFile(this.currentLogFile, line, 'utf8');
        } catch (error) {
            console.error('[CONNECTIVITY_LOGGER] Failed to log result:', error);
        }
    }

    private async rotateIfNeeded(): Promise<void> {
        try {
            if (!fs.existsSync(this.currentLogFile)) return;
            const stats = await stat(this.currentLogFile);
            if (stats.size / (1024 * 1024) >= this.maxLogSizeMB) {
                const timestamp = new Date().toISOString().split('T')[0];
                let counter = 1;
                let rotatedFile = path.join(this.logDir, `connectivity-results-${timestamp}.jsonl`);
                while (fs.existsSync(rotatedFile)) {
                    rotatedFile = path.join(this.logDir, `connectivity-results-${timestamp}-${counter}.jsonl`);
                    counter++;
                }
                fs.renameSync(this.currentLogFile, rotatedFile);
                console.log(`[CONNECTIVITY_LOGGER] Rotated log file to: ${rotatedFile}`);
            }
        } catch (error) {
            console.error('[CONNECTIVITY_LOGGER] Failed to rotate log:', error);
        }
    }

    async cleanup(): Promise<number> {
        try {
            const files = await readdir(this.logDir);
            const logFiles = files.filter((f: string) => f.startsWith('connectivity-results') && f.endsWith('.jsonl'));
            const cutoffDate = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
            let deletedCount = 0;
            for (const file of logFiles) {
                const filePath = path.join(this.logDir, file);
                const stats = await stat(filePath);
                if (stats.mtimeMs < cutoffDate) {
                    await unlink(filePath);
                    deletedCount++;
                }
            }
            return deletedCount;
        } catch (error) {
            console.error('[CONNECTIVITY_LOGGER] Failed to cleanup logs:', error);
            return 0;
        }
    }

    async getResults(options: { limit?: number; offset?: number; type?: string; endpointId?: string; timeRange?: string } = {}): Promise<{ results: ConnectivityResult[]; total: number }> {
        try {
            const allResults = await this.readAllResults();
            let filtered = allResults;

            if (options.type) filtered = filtered.filter(r => r.endpointType === options.type);
            if (options.endpointId) filtered = filtered.filter(r => r.endpointId === options.endpointId);

            if (options.timeRange) {
                const now = Date.now();
                let cutoff = 0;
                if (options.timeRange === '1h') cutoff = now - 3600000;
                else if (options.timeRange === '6h') cutoff = now - 6 * 3600000;
                else if (options.timeRange === '24h') cutoff = now - 24 * 3600000;
                else if (options.timeRange === '7d') cutoff = now - 7 * 24 * 3600000;
                if (cutoff > 0) filtered = filtered.filter(r => r.timestamp >= cutoff);
            }

            filtered.sort((a, b) => b.timestamp - a.timestamp);
            const offset = options.offset || 0;
            const limit = options.limit || 100;
            return {
                results: filtered.slice(offset, offset + limit),
                total: filtered.length
            };
        } catch (error) {
            console.error('[CONNECTIVITY_LOGGER] Failed to get results:', error);
            return { results: [], total: 0 };
        }
    }

    async getStats(): Promise<any> {
        try {
            const allResults = await this.readAllResults();
            if (allResults.length === 0) return null;

            const httpResults = allResults.filter(r => r.endpointType === 'HTTP' || r.endpointType === 'HTTPS');
            const reachableHttp = httpResults.filter(r => r.reachable && r.score > 0);

            // Group by endpoint to find flaky ones
            const endpointStats = new Map<string, { name: string, count: number, success: number, totalScore: number }>();
            allResults.forEach(r => {
                const stats = endpointStats.get(r.endpointId) || { name: r.endpointName, count: 0, success: 0, totalScore: 0 };
                stats.count++;
                if (r.reachable) stats.success++;
                stats.totalScore += r.score;
                endpointStats.set(r.endpointId, stats);
            });

            const flakyEndpoints = Array.from(endpointStats.entries())
                .map(([id, stats]) => ({
                    id,
                    name: stats.name,
                    reliability: Math.round((stats.success / stats.count) * 100),
                    avgScore: Math.round(stats.totalScore / stats.count)
                }))
                .filter(e => e.reliability < 95 || e.avgScore < 70) // Definition of flaky
                .sort((a, b) => (a.reliability + a.avgScore) - (b.reliability + b.avgScore))
                .slice(0, 3);

            const uniqueHttpEndpoints = new Set(httpResults.map(r => r.endpointId)).size;

            return {
                globalHealth: httpResults.length > 0 ? Math.round(httpResults.reduce((acc, r) => acc + (r.score || 0), 0) / httpResults.length) : 0,
                httpEndpoints: {
                    total: uniqueHttpEndpoints,
                    avgScore: httpResults.length > 0 ? Math.round(httpResults.reduce((acc, r) => acc + (r.score || 0), 0) / httpResults.length) : 0,
                    minScore: httpResults.length > 0 ? Math.min(...httpResults.map(r => r.score || 0)) : 0,
                    maxScore: httpResults.length > 0 ? Math.max(...httpResults.map(r => r.score || 0)) : 0
                },
                flakyEndpoints,
                lastCheckTime: allResults.length > 0 ? allResults[0].timestamp : null
            };
        } catch (error) {
            console.error('[CONNECTIVITY_LOGGER] Failed to compute stats:', error);
            return null;
        }
    }

    private async readAllResults(): Promise<ConnectivityResult[]> {
        try {
            const files = await readdir(this.logDir);
            const logFiles = files.filter((f: string) => f.startsWith('connectivity-results') && f.endsWith('.jsonl'));
            const allResults: ConnectivityResult[] = [];
            for (const file of logFiles) {
                const content = await readFile(path.join(this.logDir, file), 'utf8');
                const lines = content.trim().split('\n').filter((l: string) => l.length > 0);
                for (const line of lines) {
                    try { allResults.push(JSON.parse(line)); } catch (e) { }
                }
            }
            return allResults;
        } catch (error) {
            return [];
        }
    }
}
