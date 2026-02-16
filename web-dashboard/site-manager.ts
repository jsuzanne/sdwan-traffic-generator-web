import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { log } from './utils/logger.js';

export interface SiteInfo {
    success: boolean;
    local_ip?: string;
    detected_site_name?: string;
    detected_site_id?: string;
    matched_network?: string;
    error?: string;
    last_attempt: number;
    last_success?: number;
}

export class SiteManager {
    private siteInfoFile: string;
    private currentInfo: SiteInfo;
    private refreshInterval: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;

    constructor(private configDir: string) {
        this.siteInfoFile = path.join(this.configDir, 'site-detection.json');
        this.currentInfo = this.loadCachedInfo();
    }

    private loadCachedInfo(): SiteInfo {
        if (fs.existsSync(this.siteInfoFile)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.siteInfoFile, 'utf8'));
                return data;
            } catch (e) {
                log('SITE-MGR', 'Failed to read cached site info', 'error');
            }
        }
        return {
            success: false,
            last_attempt: 0,
            error: 'No detection attempt yet'
        };
    }

    private saveInfo(info: SiteInfo) {
        try {
            // Atomic write: write to temp then rename
            const tempFile = `${this.siteInfoFile}.tmp`;
            fs.writeFileSync(tempFile, JSON.stringify(info, null, 2));
            fs.renameSync(tempFile, this.siteInfoFile);
            this.currentInfo = info;
        } catch (e: any) {
            log('SITE-MGR', `Failed to save site info: ${e.message}`, 'error');
        }
    }

    public getSiteInfo(): SiteInfo {
        return this.currentInfo;
    }

    public async runDetection(): Promise<SiteInfo> {
        const clientId = process.env.PRISMA_SDWAN_CLIENT_ID;
        const clientSecret = process.env.PRISMA_SDWAN_CLIENT_SECRET;
        const tsgId = process.env.PRISMA_SDWAN_TSG_ID;

        if (!clientId || !clientSecret || !tsgId) {
            log('SITE-MGR', 'Prisma SD-WAN credentials not set, skipping auto-detection', 'debug');
            return this.currentInfo;
        }

        if (this.isRunning) {

            log('SITE-MGR', 'Detection already in progress, skipping', 'debug');
            return this.currentInfo;
        }

        this.isRunning = true;
        log('SITE-MGR', 'Starting site auto-detection...');
        const startTime = Date.now();

        return new Promise((resolve) => {
            const pythonProcess = spawn('python3', [
                path.join(process.cwd(), 'engines/getflow.py'),
                '--auto-detect',
                '--json'
            ], {
                env: {
                    ...process.env,
                    // Ensure output is not buffered
                    PYTHONUNBUFFERED: '1'
                }
            });

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            const timeout = setTimeout(() => {
                pythonProcess.kill();
                log('SITE-MGR', 'Site detection timed out after 30s', 'error');
            }, 30000);

            pythonProcess.on('close', (code) => {
                clearTimeout(timeout);
                this.isRunning = false;
                const duration = Date.now() - startTime;

                let result: SiteInfo = {
                    success: false,
                    last_attempt: Date.now(),
                    error: `Process exited with code ${code}`
                };

                if (code === 0) {
                    try {
                        // Find the JSON block in stdout (it might have logging before it)
                        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            if (parsed.success) {
                                result = {
                                    ...parsed,
                                    last_attempt: Date.now(),
                                    last_success: Date.now()
                                };
                                log('SITE-MGR', `Site detected: ${result.detected_site_name} (${duration}ms)`);
                            } else {
                                result.error = parsed.error || 'Unknown detection error';
                                log('SITE-MGR', `Detection failed: ${result.error}`, 'error');
                            }
                        } else {
                            result.error = 'No valid JSON output from script';
                            log('SITE-MGR', result.error, 'error');
                        }
                    } catch (e: any) {
                        result.error = `Parse error: ${e.message}`;
                        log('SITE-MGR', result.error, 'error');
                    }
                } else {
                    log('SITE-MGR', `Detection script failed (code ${code}): ${stderr.trim()}`, 'error');
                    result.error = stderr.trim() || `Exit code ${code}`;
                }

                this.saveInfo(result);
                resolve(result);
            });
        });
    }

    public startPeriodicRefresh(intervalMinutes: number = 10) {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        const ms = intervalMinutes * 60 * 1000;
        this.refreshInterval = setInterval(() => {
            this.runDetection().catch(e => {
                log('SITE-MGR', `Periodic refresh failed: ${e.message}`, 'error');
            });
        }, ms);

        log('SITE-MGR', `Enabled periodic refresh every ${intervalMinutes} minutes`, 'debug');
    }

    public stopPeriodicRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}
