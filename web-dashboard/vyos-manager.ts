import { spawn, exec, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface VyosRouterInterface {
    name: string;
    description: string | null;
    address: string[];
}

export interface VyosRouter {
    id: string;
    name: string;           // hostname from VyOS
    host: string;           // IP address
    apiKey: string;
    version: string;        // auto-detected
    location?: string;
    interfaces: VyosRouterInterface[];
    enabled: boolean;
    status: 'online' | 'offline' | 'unknown';
    lastSeen?: number;
}

export interface VyosAction {
    id: string;
    offset_minutes: number;
    router_id: string;
    command: string;
    params: any;
}

export class VyosManager extends EventEmitter {
    private pythonScriptPath: string;
    private routersFile: string;
    private routers: Map<string, VyosRouter> = new Map();

    constructor(configDir: string) {
        super();
        this.routersFile = path.join(configDir, 'vyos-routers.json');

        // Target path: Option B (process.cwd()) as recommended in Plan v2
        this.pythonScriptPath = path.join(process.cwd(), 'vyos/vyos_sdwan_ctl.py');

        // Fallback for dev if not found in cwd
        if (!fs.existsSync(this.pythonScriptPath)) {
            const fallback = path.join(__dirname, '../vyos/vyos_sdwan_ctl.py');
            if (fs.existsSync(fallback)) {
                this.pythonScriptPath = fallback;
            }
        }

        this.loadRouters();
        console.log(`[VYOS] Manager initialized. Script: ${this.pythonScriptPath}`);
    }

    private loadRouters() {
        if (fs.existsSync(this.routersFile)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.routersFile, 'utf8'));
                if (data.routers && Array.isArray(data.routers)) {
                    data.routers.forEach((r: VyosRouter) => this.routers.set(r.id, r));
                }
            } catch (e) {
                console.error('[VYOS] Failed to load routers:', e);
            }
        } else {
            // Initialize empty config if missing
            this.saveRouters();
        }
    }

    private saveRouters() {
        try {
            const data = { routers: Array.from(this.routers.values()) };
            fs.writeFileSync(this.routersFile, JSON.stringify(data, null, 2));
        } catch (e) {
            console.error('[VYOS] Failed to save routers:', e);
        }
    }

    /**
     * Discover a router's hardware and software info.
     * Uses: python3 vyos/vyos_sdwan_ctl.py --host <host> --key <key> get-info
     */
    async discoverRouter(host: string, apiKey: string): Promise<{
        hostname: string;
        version: string;
        interfaces: VyosRouterInterface[];
    }> {
        console.log(`[VYOS] Discovering router at ${host}...`);

        return new Promise((resolve, reject) => {
            // Set 5s timeout as requested
            const timeout = setTimeout(() => {
                proc.kill();
                reject(new Error('Discovery timeout (5s)'));
            }, 5000);

            const proc = spawn('python3', [this.pythonScriptPath, 'get-info', '--ip', host, '--key', apiKey]);

            let output = '';
            let errorMsg = '';

            proc.stdout.on('data', (data) => output += data.toString());
            proc.stderr.on('data', (data) => errorMsg += data.toString());

            proc.on('close', (code) => {
                clearTimeout(timeout);
                if (code === 0) {
                    try {
                        const info = JSON.parse(output);
                        resolve({
                            hostname: info.hostname || 'unknown',
                            version: info.version || 'unknown',
                            interfaces: info.interfaces || []
                        });
                    } catch (e) {
                        reject(new Error('Invalid JSON response from controller'));
                    }
                } else {
                    reject(new Error(errorMsg.trim() || `Process exited with code ${code}`));
                }
            });
        });
    }

    getRouter(id: string): VyosRouter | undefined {
        return this.routers.get(id);
    }

    getRouters(): VyosRouter[] {
        return Array.from(this.routers.values());
    }

    saveRouter(router: VyosRouter) {
        this.routers.set(router.id, router);
        this.saveRouters();
        this.emit('router:updated', router);
    }

    deleteRouter(id: string) {
        if (this.routers.delete(id)) {
            this.saveRouters();
            this.emit('router:deleted', id);
        }
    }

    /**
     * Slugify a string for router ID (e.g., "VyosBranch206" -> "vyos-branch206")
     */
    slugify(text: string): string {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')     // Replace spaces with -
            .replace(/[^\w-]+/g, '')  // Remove all non-word chars
            .replace(/--+/g, '-');    // Replace multiple - with single -
    }

    /**
     * Enhanced Health Check: Detects changes in version, hostname, and interfaces.
     */
    async checkHealth() {
        console.log('[VYOS] Starting background health check...');
        for (const router of this.routers.values()) {
            if (!router.enabled) continue;

            try {
                const info = await this.discoverRouter(router.host, router.apiKey);

                let changed = false;

                // Version change detection
                if (info.version !== router.version) {
                    console.log(`[VYOS] Router ${router.name}: Version updated ${router.version} -> ${info.version}`);
                    router.version = info.version;
                    changed = true;
                }

                // Hostname change detection
                if (info.hostname !== router.name) {
                    console.warn(`[VYOS] Router ${router.name}: Hostname changed to ${info.hostname}`);
                    router.name = info.hostname;
                    changed = true;
                }

                // Interface changes detection (shallow comparison of count/names)
                if (JSON.stringify(info.interfaces) !== JSON.stringify(router.interfaces)) {
                    console.log(`[VYOS] Router ${router.name}: Interface configuration changed`);
                    router.interfaces = info.interfaces;
                    changed = true;
                }

                router.status = 'online';
                router.lastSeen = Date.now();

                if (changed) {
                    this.saveRouter(router);
                }
            } catch (error: any) {
                console.error(`[VYOS] Router ${router.name} (${router.host}) is offline: ${error.message}`);
                if (router.status !== 'offline') {
                    router.status = 'offline';
                    this.saveRouter(router);
                }
            }
        }
        this.saveRouters();
    }

    /**
     * Execute a specific action on a router
     */
    async executeAction(routerId: string, action: VyosAction): Promise<any> {
        const router = this.routers.get(routerId);
        if (!router) throw new Error('Router not found');

        const args = [this.pythonScriptPath, action.command, '--ip', router.host, '--key', router.apiKey];

        // Map params to CLI arguments
        if (action.params) {
            Object.keys(action.params).forEach(key => {
                args.push(`--${key}`, action.params[key].toString());
            });
        }

        console.log(`[VYOS] Executing: python3 ${args.join(' ')}`);

        return new Promise((resolve, reject) => {
            const proc = spawn('python3', args);
            let output = '';
            let errorMsg = '';

            proc.stdout.on('data', (data) => output += data.toString());
            proc.stderr.on('data', (data) => errorMsg += data.toString());

            proc.on('close', (code) => {
                if (code === 0) {
                    try {
                        resolve(JSON.parse(output));
                    } catch {
                        resolve({ success: true, output });
                    }
                } else {
                    reject(new Error(errorMsg.trim() || `Process exited with code ${code}`));
                }
            });
        });
    }

    /**
     * Simple ping for fast connectivity check
     */
    async testConnection(routerId: string): Promise<boolean> {
        const router = this.routers.get(routerId);
        if (!router) return false;

        try {
            const cmd = (process.platform === 'win32')
                ? `ping -n 1 -w 1000 ${router.host}`
                : `ping -c 1 -W 1 ${router.host}`;
            await execPromise(cmd);
            return true;
        } catch {
            return false;
        }
    }
}
