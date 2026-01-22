import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
//import { spawn, exec } from 'child_process';
import { spawn, exec, execSync } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import os from 'os';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { TestLogger, TestResult } from './test-logger.js';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration Paths - Environment aware
const APP_CONFIG = {
    // In development, assume config is in ../config relative to web-dashboard
    configDir: process.env.CONFIG_DIR || path.join(__dirname, '../config'),
    // Fallback to local logs if /var/log is not accessible (dev mode)
    logDir: process.env.LOG_DIR || (fs.existsSync('/var/log/sdwan-traffic-gen') ? '/var/log/sdwan-traffic-gen' : path.join(__dirname, '../logs'))
};

console.log('Using config:', APP_CONFIG);

// Initialize Test Logger with configurable retention
const LOG_RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS || '7');
const LOG_MAX_SIZE_MB = parseInt(process.env.LOG_MAX_SIZE_MB || '100');
const testLogger = new TestLogger(APP_CONFIG.logDir, LOG_RETENTION_DAYS, LOG_MAX_SIZE_MB);

console.log(`Test Logger initialized: retention=${LOG_RETENTION_DAYS} days, max_size=${LOG_MAX_SIZE_MB}MB`);

// Test Counter - Persistent sequential ID for all tests
const TEST_COUNTER_FILE = path.join(APP_CONFIG.configDir, 'test-counter.json');

const getNextTestId = (): number => {
    try {
        if (!fs.existsSync(TEST_COUNTER_FILE)) {
            fs.writeFileSync(TEST_COUNTER_FILE, JSON.stringify({ counter: 0 }));
        }
        const data = JSON.parse(fs.readFileSync(TEST_COUNTER_FILE, 'utf8'));
        const nextId = (data.counter || 0) + 1;
        fs.writeFileSync(TEST_COUNTER_FILE, JSON.stringify({ counter: nextId }));
        return nextId;
    } catch (e) {
        console.error('Error managing test counter:', e);
        return Date.now(); // Fallback to timestamp
    }
};

// Test Logger - Dedicated log file for test execution with rotation
const TEST_LOG_FILE = path.join(APP_CONFIG.logDir, 'test-execution.log');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

const logTest = (...args: any[]) => {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;

    try {
        // Check file size and rotate if needed
        if (fs.existsSync(TEST_LOG_FILE)) {
            const stats = fs.statSync(TEST_LOG_FILE);
            if (stats.size > MAX_LOG_SIZE) {
                const rotatedFile = `${TEST_LOG_FILE}.${Date.now()}`;
                fs.renameSync(TEST_LOG_FILE, rotatedFile);
                console.log(`[TEST-LOG] Rotated log file to: ${rotatedFile}`);
            }
        }

        // Append to log file
        fs.appendFileSync(TEST_LOG_FILE, logLine);

        // Also log to console
        console.log(message);
    } catch (e) {
        console.error('Error writing to test log:', e);
        console.log(message); // Fallback to console only
    }
};


// Platform Detection & DNS Command Availability
const PLATFORM = os.platform(); // 'linux', 'darwin', 'win32'
const availableCommands: { [key: string]: boolean } = {};

// Check if a command is available
const checkCommand = async (command: string): Promise<boolean> => {
    try {
        const execPromise = promisify(exec);
        await execPromise(command);
        return true;
    } catch {
        return false;
    }
};

// Initialize available commands on startup
const initializeCommands = async () => {
    console.log(`[PLATFORM] Detected platform: ${PLATFORM}`);

    // Check DNS command availability
    availableCommands.getent = await checkCommand('getent --version 2>/dev/null');
    availableCommands.dscacheutil = await checkCommand('dscacheutil -h 2>/dev/null');
    availableCommands.dig = await checkCommand('dig -v 2>/dev/null');
    availableCommands.nslookup = await checkCommand('nslookup -version 2>/dev/null || nslookup localhost 2>/dev/null');
    availableCommands.curl = await checkCommand('curl --version 2>/dev/null');

    console.log('[PLATFORM] Available commands:', availableCommands);
};

// Get the best DNS command for the current platform
const getDnsCommand = (domain: string): { command: string; type: string } => {
    if (PLATFORM === 'linux') {
        if (availableCommands.getent) return { command: `getent ahosts ${domain}`, type: 'getent' };
        if (availableCommands.dig) return { command: `dig +short ${domain}`, type: 'dig' };
        return { command: `nslookup ${domain}`, type: 'nslookup' };
    }

    if (PLATFORM === 'darwin') {
        if (availableCommands.dscacheutil) return { command: `dscacheutil -q host -a name ${domain}`, type: 'dscacheutil' };
        if (availableCommands.dig) return { command: `dig +short ${domain}`, type: 'dig' };
        return { command: `nslookup ${domain}`, type: 'nslookup' };
    }

    // Windows or unknown
    return { command: `nslookup ${domain}`, type: 'nslookup' };
};

// Parse DNS command output based on command type
const parseDnsOutput = (output: string, type: string): string | null => {
    if (!output || output.trim() === '') return null;

    if (type === 'getent') {
        // Format: "198.135.184.22  STREAM malware.wicar.org"
        const match = output.match(/^(\d+\.\d+\.\d+\.\d+)/m);
        return match ? match[1] : null;
    }

    if (type === 'dscacheutil') {
        // Format: "ip_address: 198.135.184.22"
        const match = output.match(/ip_address:\s*(\d+\.\d+\.\d+\.\d+)/);
        return match ? match[1] : null;
    }

    if (type === 'dig') {
        // Format: "198.135.184.22" (just the IP)
        const match = output.match(/^(\d+\.\d+\.\d+\.\d+)/m);
        return match ? match[1] : null;
    }

    if (type === 'nslookup') {
        // Format: "Address: 198.135.184.22" or "Addresses:  198.135.184.22"
        const match = output.match(/Address(?:es)?:\s*(\d+\.\d+\.\d+\.\d+)/);
        return match ? match[1] : null;
    }

    return null;
};


const app = express();
const port = parseInt(process.env.PORT || '3001');

const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key-change-this';
const USERS_FILE = path.join(APP_CONFIG.configDir, 'users.json');
const DEBUG_API = process.env.DEBUG_API === 'true';

app.use(cors());
app.use(express.json());

// Global request logger - logs ALL incoming requests (only if DEBUG_API=true)
if (DEBUG_API) {
    app.use((req, res, next) => {
        console.log(`[REQUEST] ${req.method} ${req.path}`, {
            body: req.body,
            query: req.query,
            headers: {
                'content-type': req.headers['content-type'],
                'authorization': req.headers['authorization'] ? 'Bearer ***' : 'none'
            }
        });
        next();
    });
}

// --- Authentication Middleware ---
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const extractUserMiddleware = authenticateToken; // Alias for now, or we can look into optional auth later if needed.


// --- Auth Helpers ---
const getUsers = (): any[] => {
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch { return []; }
};

const saveUsers = (users: any[]) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// --- Initialize Default Configuration Files ---
const initializeDefaultConfigs = () => {
    const configDir = APP_CONFIG.configDir;
    const appsFile = path.join(configDir, 'applications.txt');
    const interfacesFile = path.join(configDir, 'interfaces.txt');

    // Ensure config directory exists
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        console.log(`Created config directory: ${configDir}`);
    }

    // Create default applications.txt if it doesn't exist
    if (!fs.existsSync(appsFile)) {
        const defaultApps = `# Format: domain|weight|endpoint
# Weight: Higher = more traffic generated

# Microsoft 365 Suite
outlook.office365.com|100|/
teams.microsoft.com|95|/api/mt/emea/beta/users/
login.microsoftonline.com|90|/
graph.microsoft.com|85|/v1.0/me
onedrive.live.com|80|/
sharepoint.com|75|/

# Google Workspace
mail.google.com|90|/mail/
drive.google.com|85|/
docs.google.com|80|/document/
meet.google.com|75|/
calendar.google.com|70|/

# Communication & Collaboration
zoom.us|90|/
slack.com|85|/api/api.test
webex.com|70|/
discord.com|40|/api/v9/gateway

# CRM & Sales
salesforce.com|80|/
hubspot.com|60|/
dynamics.microsoft.com|55|/

# Project Management
monday.com|65|/
asana.com|60|/
trello.com|55|/
jira.atlassian.com|70|/
confluence.atlassian.com|65|/

# Cloud Storage & File Sharing
dropbox.com|75|/
box.com|60|/
wetransfer.com|45|/

# Development & DevOps
github.com|75|/
gitlab.com|55|/
bitbucket.org|45|/
stackoverflow.com|50|/

# Cloud Providers
portal.azure.com|70|/
console.aws.amazon.com|70|/
console.cloud.google.com|65|/

# Business Intelligence
tableau.com|50|/
powerbi.microsoft.com|55|/
looker.com|40|/

# HR & Productivity
workday.com|55|/
bamboohr.com|40|/
zenefits.com|35|/
adp.com|45|/

# Marketing & Social
linkedin.com|60|/
twitter.com|50|/robots.txt
facebook.com|55|/robots.txt
instagram.com|45|/robots.txt

# Design & Creative
figma.com|55|/
canva.com|50|/
adobe.com|45|/

# Customer Support
zendesk.com|60|/
intercom.com|50|/
freshdesk.com|40|/

# Finance & Accounting
quickbooks.intuit.com|50|/
expensify.com|40|/
stripe.com|45|/

# Security & IT Tools
okta.com|55|/
duo.com|45|/
1password.com|40|/
lastpass.com|35|/

# Video & Media
youtube.com|65|/feed/trending
vimeo.com|40|/
netflix.com|30|/robots.txt

# E-commerce
shopify.com|50|/
amazon.com|60|/robots.txt
ebay.com|35|/robots.txt

# Popular SaaS
notion.so|65|/
airtable.com|50|/
miro.com|55|/
docusign.com|50|/`;

        fs.writeFileSync(appsFile, defaultApps, 'utf8');
        console.log(`Created default applications.txt with ${defaultApps.split('\n').filter(l => !l.startsWith('#') && l.trim()).length} applications`);
    }

    // ✅ IMPROVED: Auto-detect network interface if not configured
    if (!fs.existsSync(interfacesFile)) {
        console.log('🔍 No interfaces.txt found, attempting auto-detection...');

        try {
            // const { execSync } = require('child_process');
            let defaultIface = '';
            let detectionMethod = '';

            // Check if running in Docker container
            const isDocker = fs.existsSync('/.dockerenv') ||
                (fs.existsSync('/proc/1/cgroup') &&
                    fs.readFileSync('/proc/1/cgroup', 'utf8').includes('docker'));

            if (isDocker) {
                defaultIface = 'eth0';
                detectionMethod = 'Docker container detected';
                console.log('🐳 Docker environment detected, using eth0');
            } else if (PLATFORM === 'linux') {
                try {
                    const route = execSync("ip route | grep default | awk '{print $5}' | head -n 1", {
                        encoding: 'utf8',
                        timeout: 2000
                    });
                    defaultIface = route.trim();
                    detectionMethod = 'Linux ip route';
                } catch (e) {
                    defaultIface = 'eth0';
                    detectionMethod = 'Fallback';
                }
            } else if (PLATFORM === 'darwin') {
                defaultIface = 'en0';
                detectionMethod = 'macOS default';
            } else {
                defaultIface = 'eth0';
                detectionMethod = 'Generic fallback';
            }

            if (defaultIface) {
                const interfaceContent = `# Auto-detected interface (${detectionMethod})\n` +
                    `# You can manually edit this file if needed\n` +
                    `${defaultIface}\n`;
                fs.writeFileSync(interfacesFile, interfaceContent, 'utf8');
                console.log(`✅ Auto-configured interface: ${defaultIface} (${detectionMethod})`);
            } else {
                throw new Error('No interface detected');
            }
        } catch (error) {
            console.log('⚠️  Auto-detection failed, creating empty config file');
            fs.writeFileSync(interfacesFile,
                '# Add network interfaces here, one per line\n' +
                '# Example: eth0, en0, wlan0\n' +
                '# Run "ip link show" (Linux) or "ifconfig" (Mac) to list interfaces\n',
                'utf8'
            );
            console.log('📝 Please configure network interface manually in config/interfaces.txt');
        }
    } else {
        // File exists, check if it's empty (only comments)
        const content = fs.readFileSync(interfacesFile, 'utf8');
        const hasInterface = content.split('\n')
            .some(line => line.trim() && !line.trim().startsWith('#'));

        if (!hasInterface) {
            console.log('⚠️  interfaces.txt exists but is empty, attempting auto-detection...');
            try {
                const { execSync } = require('child_process');
                let defaultIface = 'eth0';

                const isDocker = fs.existsSync('/.dockerenv');
                if (isDocker || PLATFORM === 'linux') {
                    defaultIface = 'eth0';
                } else if (PLATFORM === 'darwin') {
                    defaultIface = 'en0';
                }

                fs.appendFileSync(interfacesFile, `\n# Auto-detected\n${defaultIface}\n`, 'utf8');
                console.log(`✅ Auto-added interface: ${defaultIface}`);
            } catch (e) {
                console.log('⚠️  Could not auto-detect interface, manual configuration required');
            }
        }
    }

    // Initialize traffic control file (default: stopped)
    const controlFile = path.join(configDir, 'traffic-control.json');
    if (!fs.existsSync(controlFile)) {
        fs.writeFileSync(controlFile, JSON.stringify({ enabled: false }, null, 2), 'utf8');
        console.log('Created traffic-control.json (default: stopped)');
    }
};

// Initialize Admin if no users
if (getUsers().length === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin', salt);
    saveUsers([{ username: 'admin', passwordHash: hash }]);
    console.log('Created default admin user (admin/admin)');
}

// Initialize default config files
initializeDefaultConfigs();

// --- Auth Endpoints ---

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const users = getUsers();
    const user = users.find((u: any) => u.username === username);

    if (user && bcrypt.compareSync(password, user.passwordHash)) {
        const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, username: user.username });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/api/auth/change-password', authenticateToken, (req: any, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 5) {
        return res.status(400).json({ error: 'Password too short' });
    }

    const users = getUsers();
    const userIndex = users.findIndex((u: any) => u.username === req.user.username);

    if (userIndex !== -1) {
        const salt = bcrypt.genSaltSync(10);
        users[userIndex].passwordHash = bcrypt.hashSync(newPassword, salt);
        saveUsers(users);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

app.post('/api/auth/users', authenticateToken, (req: any, res) => {
    // Only admin can add users
    if (req.user.username !== 'admin') {
        return res.status(403).json({ error: 'Only admin can add users' });
    }

    const { username, password } = req.body;
    if (!username || !password || password.length < 5) {
        return res.status(400).json({ error: 'Invalid username or password (min 5 chars)' });
    }

    const users = getUsers();
    if (users.find((u: any) => u.username === username)) {
        return res.status(400).json({ error: 'User already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    users.push({ username, passwordHash });
    saveUsers(users);
    res.json({ success: true, message: 'User created' });
});

// API: Get UI Configuration (Public endpoint)
app.get('/api/config/ui', (req, res) => {
    res.json({
        refreshInterval: parseInt(process.env.DASHBOARD_REFRESH_MS || '1000')
    });
});

// API: Get Version (Public endpoint)
app.get('/api/version', (req, res) => {
    try {
        const versionFile = path.join(__dirname, 'VERSION');
        if (fs.existsSync(versionFile)) {
            const version = fs.readFileSync(versionFile, 'utf8').trim();
            res.json({ version });
        } else {
            res.json({ version: 'unknown' });
        }
    } catch (e) {
        res.json({ version: 'unknown' });
    }
});

// API: Speed Test (Public endpoint)
app.get('/api/connectivity/speedtest', async (req, res) => {
    try {
        // exec already imported at top
        // util.promisify already imported as promisify
        const execPromise = promisify(exec);

        // Download 10MB file from Cloudflare and measure speed
        const testUrl = 'https://speed.cloudflare.com/__down?bytes=10000000';
        const curlCommand = `curl -o /dev/null -s -w '%{speed_download}' --max-time 30 ${testUrl}`;

        try {
            const { stdout } = await execPromise(curlCommand);
            const bytesPerSecond = parseFloat(stdout);
            const mbps = (bytesPerSecond * 8 / 1000000).toFixed(2); // Convert to Mbps

            res.json({
                success: true,
                download_mbps: parseFloat(mbps),
                download_bytes_per_second: bytesPerSecond,
                test_url: 'speed.cloudflare.com',
                timestamp: Date.now()
            });
        } catch (curlError: any) {
            res.status(500).json({
                success: false,
                error: 'Speed test failed',
                message: curlError?.message || 'Unknown error',
                timestamp: Date.now()
            });
        }
    } catch (e) {
        res.status(500).json({
            success: false,
            error: 'Failed to run speed test',
            timestamp: Date.now()
        });
    }
});

// Protect sensitive endpoints
// (We leave status/stats public? User asked for login to app. So we probably protect everything except login)
// Actually status/stats are read-only. Config is sensitive.
// But to prevent "background" viewing, we should protect everything.
// However, protecting /status might break the simple health check if we use curl? 
// Health check usually localhost.
// Let's protect config at least. 
// User said "security reason... login to the application". So dashboard should be hidden.

app.use('/api/config', authenticateToken);
app.use('/api/stats', authenticateToken);
app.use('/api/logs', authenticateToken);
app.use('/api/status', authenticateToken); // Protect status too

// Status Check (Unprotected for local health check?) 
// We can make a specific /health endpoint for Docker if needed, but for now protect all.





const STATS_FILE = path.join(APP_CONFIG.logDir, 'stats.json');
const APPS_FILE = path.join(APP_CONFIG.configDir, 'applications.txt');
const INTERFACES_FILE = path.join(APP_CONFIG.configDir, 'interfaces.txt');

console.log('Using config:', APP_CONFIG);

// Helper to read file safely
const readFile = (filePath: string) => {
    try {
        if (!fs.existsSync(filePath)) return null;
        return fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err);
        return null;
    }
};

// API: Get Status
app.get('/api/status', (req, res) => {
    // In Docker/Cross-container, checks via systemctl don't work.
    // We check if stats.json has been updated recently (heartbeat).
    const statsFile = path.join(APP_CONFIG.logDir, 'stats.json');

    fs.readFile(statsFile, 'utf8', (err, data) => {
        if (err) return res.json({ status: 'stopped' });

        try {
            const stats = JSON.parse(data);
            const lastUpdate = stats.timestamp; // Unix timestamp in seconds
            const now = Math.floor(Date.now() / 1000);

            // If updated within last 15 seconds, it's running
            if (now - lastUpdate < 15) {
                res.json({ status: 'running' });
            } else {
                res.json({ status: 'stopped' });
            }
        } catch (e) {
            res.json({ status: 'unknown' });
        }
    });
});

// API: Traffic Control - Get Status
app.get('/api/traffic/status', (req, res) => {
    const controlFile = path.join(APP_CONFIG.configDir, 'traffic-control.json');
    if (fs.existsSync(controlFile)) {
        try {
            const control = JSON.parse(fs.readFileSync(controlFile, 'utf8'));
            res.json({ running: control.enabled || false });
        } catch (e) {
            res.json({ running: false });
        }
    } else {
        res.json({ running: false });
    }
});

// API: Traffic Control - Start
app.post('/api/traffic/start', (req, res) => {
    const controlFile = path.join(APP_CONFIG.configDir, 'traffic-control.json');
    fs.writeFileSync(controlFile, JSON.stringify({ enabled: true }, null, 2), 'utf8');
    console.log('Traffic generation started via API');
    res.json({ success: true, running: true });
});

// API: Traffic Control - Stop
app.post('/api/traffic/stop', (req, res) => {
    const controlFile = path.join(APP_CONFIG.configDir, 'traffic-control.json');
    fs.writeFileSync(controlFile, JSON.stringify({ enabled: false }, null, 2), 'utf8');
    console.log('Traffic generation stopped via API');
    res.json({ success: true, running: false });
});

// API: Get Stats
app.get('/api/stats', (req, res) => {
    const content = readFile(STATS_FILE);
    if (!content) return res.json({ error: 'Stats not found' });
    try {
        res.json(JSON.parse(content));
    } catch (e) {
        res.json({ error: 'Invalid JSON' });
    }
});

// API: Get Applications (Categorized)
app.get('/api/config/apps', extractUserMiddleware, (req, res) => { // Use token if available, but maybe public is fine? kept same auth logic
    const content = readFile(APPS_FILE);
    if (!content) return res.json({ error: 'Config not found' });

    const lines = content.split('\n');
    const categories: { name: string, apps: any[] }[] = [];
    let currentCategory = 'Uncategorized';
    let currentApps: any[] = [];

    // Helper to push category
    const pushCategory = () => {
        if (currentApps.length > 0 || currentCategory !== 'Uncategorized') {
            // Find existing?
            const existing = categories.find(c => c.name === currentCategory);
            if (existing) {
                existing.apps.push(...currentApps);
            } else {
                categories.push({ name: currentCategory, apps: [...currentApps] });
            }
            currentApps = [];
        }
    };

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        if (line.startsWith('#')) {
            // It's a comment, might be a category header
            const comment = line.substring(1).trim();
            // Simple heuristic: if it doesn't contain strict "Format:" or "Weight:" meta info
            if (!comment.startsWith('Format:') && !comment.startsWith('Weight:')) {
                // If previous category had apps, push it
                pushCategory();
                currentCategory = comment;
            }
        } else {
            // App line
            const parts = line.split('|');
            if (parts.length >= 2) {
                const [domain, weight, endpoint] = parts;
                currentApps.push({
                    domain,
                    weight: parseInt(weight) || 0,
                    endpoint: endpoint || '/'
                });
            }
        }
    });
    pushCategory(); // Push last

    res.json(categories);
});

// API: Internet Connectivity Test
app.get('/api/connectivity/test', authenticateToken, async (req, res) => {
    console.log('[CONNECTIVITY] Starting internet connectivity test...');

    // Default endpoints (always tested)
    const testEndpoints = [
        { name: 'Cloudflare DNS', type: 'http', target: 'https://1.1.1.1', timeout: 5000 },
        { name: 'Google DNS', type: 'http', target: 'https://8.8.8.8', timeout: 5000 },
        { name: 'Google', type: 'http', target: 'https://www.google.com', timeout: 5000 }
    ];

    // Add custom HTTP endpoints from ENV
    Object.keys(process.env).forEach(key => {
        if (key.startsWith('CONNECTIVITY_HTTP_')) {
            const value = process.env[key];
            if (value) {
                // Split only on first colon to handle http:// and https://
                const colonIndex = value.indexOf(':');
                if (colonIndex > 0) {
                    const name = value.substring(0, colonIndex);
                    const url = value.substring(colonIndex + 1);
                    if (name && url) {
                        testEndpoints.push({ name, type: 'http', target: url, timeout: 5000 });
                    }
                }
            }
        }
    });

    // Add custom PING endpoints from ENV
    Object.keys(process.env).forEach(key => {
        if (key.startsWith('CONNECTIVITY_PING_')) {
            const value = process.env[key];
            if (value) {
                const [name, ip] = value.split(':');
                if (name && ip) {
                    testEndpoints.push({ name, type: 'ping', target: ip, timeout: 2000 });
                }
            }
        }
    });

    // Add custom TCP endpoints from ENV
    Object.keys(process.env).forEach(key => {
        if (key.startsWith('CONNECTIVITY_TCP_')) {
            const value = process.env[key];
            if (value) {
                const parts = value.split(':');
                if (parts.length === 3) {
                    const [name, ip, port] = parts;
                    testEndpoints.push({ name, type: 'tcp', target: `${ip}:${port}`, timeout: 3000 });
                }
            }
        }
    });

    console.log(`[CONNECTIVITY] Testing ${testEndpoints.length} endpoints (${testEndpoints.filter(e => e.type === 'http').length} HTTP, ${testEndpoints.filter(e => e.type === 'ping').length} PING, ${testEndpoints.filter(e => e.type === 'tcp').length} TCP)`);

    const results = [];
    let connected = false;
    let avgLatency = 0;

    for (const endpoint of testEndpoints) {
        console.log(`[CONNECTIVITY] Testing ${endpoint.name} [${endpoint.type.toUpperCase()}] (${endpoint.target})...`);
        const startTime = Date.now();

        try {
            if (endpoint.type === 'http') {
                // HTTP/HTTPS test
                const response = await fetch(endpoint.target, {
                    method: 'HEAD',
                    signal: AbortSignal.timeout(endpoint.timeout)
                });

                const latency = Date.now() - startTime;

                if (response.ok || response.status < 500) {
                    results.push({
                        name: endpoint.name,
                        type: endpoint.type,
                        status: 'connected',
                        latency,
                        details: `HTTP ${response.status}`
                    });
                    connected = true;
                    avgLatency += latency;
                } else {
                    results.push({
                        name: endpoint.name,
                        type: endpoint.type,
                        status: 'error',
                        error: `HTTP ${response.status}`
                    });
                }
            } else if (endpoint.type === 'ping') {
                // ICMP Ping test
                const execPromise = promisify(exec);
                const pingCommand = `ping -c 1 -W ${Math.floor(endpoint.timeout / 1000)} ${endpoint.target}`;

                try {
                    const { stdout } = await execPromise(pingCommand);
                    const latency = Date.now() - startTime;

                    // Extract time from ping output (works on Linux/Mac)
                    const timeMatch = stdout.match(/time[=<](\d+\.?\d*)/);
                    const pingTime = timeMatch ? parseFloat(timeMatch[1]) : latency;

                    results.push({
                        name: endpoint.name,
                        type: endpoint.type,
                        status: 'connected',
                        latency: Math.round(pingTime),
                        details: 'ICMP Echo Reply'
                    });
                    connected = true;
                    avgLatency += pingTime;
                } catch (pingError: any) {
                    results.push({
                        name: endpoint.name,
                        type: endpoint.type,
                        status: 'failed',
                        error: 'No response'
                    });
                }
            } else if (endpoint.type === 'tcp') {
                // TCP Port test
                const execPromise = promisify(exec);
                const [ip, port] = endpoint.target.split(':');
                const ncCommand = `nc -zv -w ${Math.floor(endpoint.timeout / 1000)} ${ip} ${port} 2>&1`;

                try {
                    await execPromise(ncCommand);
                    const latency = Date.now() - startTime;

                    results.push({
                        name: endpoint.name,
                        type: endpoint.type,
                        status: 'connected',
                        latency,
                        details: `TCP Port ${port}`
                    });
                    connected = true;
                    avgLatency += latency;
                } catch (tcpError: any) {
                    results.push({
                        name: endpoint.name,
                        type: endpoint.type,
                        status: 'failed',
                        error: `Port ${port} closed`
                    });
                }
            }
        } catch (error: any) {
            results.push({
                name: endpoint.name,
                type: endpoint.type,
                status: 'failed',
                error: error.message
            });
        }
    }

    const successfulTests = results.filter(r => r.status === 'connected').length;
    if (successfulTests > 0) {
        avgLatency = Math.round(avgLatency / successfulTests);
    }

    console.log(`[CONNECTIVITY] Test complete: ${connected ? 'Connected' : 'No connection'}, avg latency: ${avgLatency}ms, successful: ${successfulTests}/${testEndpoints.length}`);

    res.json({
        connected,
        latency: avgLatency,
        timestamp: Date.now(),
        results
    });
});

// API: Docker Network Statistics
app.get('/api/connectivity/docker-stats', authenticateToken, async (req, res) => {
    try {
        const execPromise = promisify(exec);

        // Get container network stats from /sys/class/net
        const { stdout } = await execPromise('cat /sys/class/net/eth0/statistics/rx_bytes /sys/class/net/eth0/statistics/tx_bytes');
        const [rxBytes, txBytes] = stdout.trim().split('\n').map(Number);


        res.json({
            success: true,
            stats: {
                received_bytes: rxBytes,
                transmitted_bytes: txBytes,
                received_mb: (rxBytes / 1024 / 1024).toFixed(2),
                transmitted_mb: (txBytes / 1024 / 1024).toFixed(2),
                total_mb: ((rxBytes + txBytes) / 1024 / 1024).toFixed(2)
            },
            timestamp: Date.now()
        });
    } catch (error: any) {
        console.error('[CONNECTIVITY] Failed to get Docker stats:', error.message);
        res.json({
            success: false,
            error: error.message,
            stats: null
        });
    }
});

// API: System Health Check
app.get('/api/system/health', authenticateToken, async (req, res) => {
    console.log('[SYSTEM] Running health check...');

    const execPromise = promisify(exec);

    // Get selected DNS command for a test domain
    const dnsCmd = getDnsCommand('test.example.com');

    const health = {
        platform: PLATFORM,
        ready: true,
        commands: {
            dns: {
                available: true,
                selected: dnsCmd.type,
                command: dnsCmd.command.replace('test.example.com', '<domain>'),
                purpose: 'DNS Security Tests',
                fallback_chain: PLATFORM === 'darwin'
                    ? ['dscacheutil', 'dig', 'nslookup']
                    : PLATFORM === 'linux'
                        ? ['getent', 'dig', 'nslookup']
                        : ['nslookup']
            }
        } as any,
        system: {
            memory: {
                total: 0,
                used: 0,
                free: 0,
                usedPercent: 0
            },
            disk: {
                total: 0,
                used: 0,
                free: 0,
                usedPercent: 0,
                logDirUsage: 0
            }
        },
        timestamp: Date.now()
    };

    // Check curl (for URL/Threat tests)
    try {
        await execPromise('which curl');
        health.commands.curl = {
            available: true,
            command: 'curl',
            purpose: 'URL Filtering & Threat Prevention Tests'
        };
        console.log('[SYSTEM] ✓ curl available');
    } catch (error) {
        health.commands.curl = {
            available: false,
            command: 'curl',
            purpose: 'URL Filtering & Threat Prevention Tests',
            error: 'Command not found'
        };
        health.ready = false;
        console.log('[SYSTEM] ✗ curl not available');
    }

    // Get memory stats
    try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        health.system.memory = {
            total: totalMem,
            used: usedMem,
            free: freeMem,
            usedPercent: Math.round((usedMem / totalMem) * 100)
        };
    } catch (error) {
        console.error('[SYSTEM] Failed to get memory stats:', error);
    }

    // Get disk stats (log directory)
    try {
        const dfCommand = PLATFORM === 'darwin'
            ? `df -k ${APP_CONFIG.logDir} | tail -1 | awk '{print $2,$3,$4}'`
            : `df -k ${APP_CONFIG.logDir} | tail -1 | awk '{print $2,$3,$4}'`;

        const { stdout } = await execPromise(dfCommand);
        const [total, used, free] = stdout.trim().split(/\s+/).map(s => parseInt(s) * 1024); // Convert KB to bytes

        health.system.disk = {
            total,
            used,
            free,
            usedPercent: Math.round((used / total) * 100),
            logDirUsage: 0 // Will be filled below
        };

        // Get log directory usage from TestLogger stats
        const logStats = await testLogger.getStats();
        health.system.disk.logDirUsage = logStats.diskUsageBytes;
    } catch (error) {
        console.error('[SYSTEM] Failed to get disk stats:', error);
    }

    console.log(`[SYSTEM] Health check complete: ${health.ready ? 'READY' : 'NOT READY'}`);

    res.json(health);
});

// API: Update Application Weight (Single)
app.post('/api/config/apps', authenticateToken, (req, res) => {
    const { domain, weight } = req.body;
    updateAppsWeigth({ [domain]: weight }, res);
});

// API: Update Multiple Applications (Bulk)
app.post('/api/config/apps-bulk', authenticateToken, (req, res) => {
    const { updates } = req.body; // { "domain1": 50, "domain2": 30 }
    if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ error: 'Invalid updates format' });
    }
    updateAppsWeigth(updates, res);
});

// API: Update Category Weight (Bulk - legacy support)
app.post('/api/config/category', authenticateToken, (req, res) => {
    const { updates } = req.body; // { "domain1": 50, "domain2": 50 }
    updateAppsWeigth(updates, res);
});

const updateAppsWeigth = (updates: Record<string, number>, res: any) => {
    const content = readFile(APPS_FILE);
    if (!content) return res.status(500).json({ error: 'Read failed' });

    const lines = content.split('\n');
    const newLines = lines.map(line => {
        // Build map for fast lookup? No, just check if line starts with any key
        for (const [domain, weight] of Object.entries(updates)) {
            if (line.startsWith(domain + '|')) {
                const parts = line.split('|');
                parts[1] = weight.toString();
                return parts.join('|');
            }
        }
        return line;
    });

    try {
        fs.writeFileSync(APPS_FILE, newLines.join('\n'));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Write failed', details: err });
    }
};

// API: Export Applications (Download applications.txt)
app.get('/api/config/applications/export', (req, res) => {
    try {
        const content = readFile(APPS_FILE);
        if (!content) {
            return res.status(404).json({ error: 'Applications file not found' });
        }

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename="applications.txt"');
        res.send(content);
    } catch (err: any) {
        res.status(500).json({ error: 'Export failed', details: err?.message });
    }
});

// API: Import Applications (Upload applications.txt)
app.post('/api/config/applications/import', (req, res) => {
    try {
        const { content } = req.body;

        if (!content || typeof content !== 'string') {
            return res.status(400).json({ error: 'Invalid file content' });
        }

        // Basic validation: check if it has the expected format
        const lines = content.split('\n');
        let hasValidFormat = false;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            // Check if line has domain|weight|endpoint format
            const parts = trimmed.split('|');
            if (parts.length >= 2) {
                hasValidFormat = true;
                break;
            }
        }

        if (!hasValidFormat) {
            return res.status(400).json({
                error: 'Invalid file format',
                message: 'File must contain lines in format: domain|weight|endpoint'
            });
        }

        // Backup current file
        const backupFile = APPS_FILE + '.backup';
        if (fs.existsSync(APPS_FILE)) {
            fs.copyFileSync(APPS_FILE, backupFile);
        }

        // Write new content
        fs.writeFileSync(APPS_FILE, content, 'utf8');

        res.json({
            success: true,
            message: 'Applications imported successfully',
            backup: backupFile
        });
    } catch (err: any) {
        res.status(500).json({ error: 'Import failed', details: err?.message });
    }
});

// API: Get Interfaces
app.get('/api/config/interfaces', (req, res) => {
    const content = readFile(INTERFACES_FILE);
    if (!content) return res.json([]);
    const interfaces = content.split('\n').filter(line => line && !line.startsWith('#'));
    res.json(interfaces);
});

// API: Save Interfaces
app.post('/api/config/interfaces', (req, res) => {
    const { interfaces } = req.body;
    if (!Array.isArray(interfaces)) return res.status(400).json({ error: 'Invalid format' });

    try {
        fs.writeFileSync(INTERFACES_FILE, interfaces.join('\n'));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Write failed', details: err });
    }
});

// API: Get System Interfaces with Connectivity Test
app.get('/api/system/interfaces', authenticateToken, async (req, res) => {
    try {
        const execPromise = promisify(exec);
        const interfaces = os.networkInterfaces();
        const result: { name: string, ip: string, status: string, is_default: boolean }[] = [];

        // Get default interface
        let defaultIface = '';
        try {
            let command = '';
            if (process.platform === 'darwin') {
                command = "route -n get default 2>/dev/null | grep 'interface:' | awk '{print $2}'";
            } else {
                command = "ip route | grep '^default' | awk '{print $5}' | head -n 1";
            }
            const { stdout } = await execPromise(command);
            defaultIface = stdout.trim();
        } catch (e) {
            // Ignore, defaultIface stays empty
        }

        // Get all non-loopback IPv4 interfaces
        for (const name of Object.keys(interfaces)) {
            const iface = interfaces[name];
            if (iface) {
                for (const details of iface) {
                    if (details.family === 'IPv4' && !details.internal) {
                        // Test connectivity by pinging gateway
                        let status = 'unknown';
                        try {
                            // Try to ping gateway (simple test)
                            const pingCmd = process.platform === 'darwin'
                                ? `ping -c 1 -t 1 -b ${name} 8.8.8.8 2>/dev/null`
                                : `ping -c 1 -W 1 -I ${name} 8.8.8.8 2>/dev/null`;

                            await execPromise(pingCmd);
                            status = 'active';
                        } catch (e) {
                            status = 'inactive';
                        }

                        result.push({
                            name,
                            ip: details.address,
                            status,
                            is_default: name === defaultIface
                        });
                    }
                }
            }
        }

        res.json({
            interfaces: result,
            default_interface: defaultIface,
            platform: process.platform
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to detect interfaces', message: String(e) });
    }
});

// API: Get Auto-Detected Default Interface
app.get('/api/system/default-interface', authenticateToken, async (req, res) => {
    try {
        const execPromise = promisify(exec);
        let command = '';

        if (process.platform === 'darwin') {
            // macOS: use route to get default interface
            command = "route -n get default 2>/dev/null | grep 'interface:' | awk '{print $2}'";
        } else {
            // Linux: use ip route
            command = "ip route | grep '^default' | awk '{print $5}' | head -n 1";
        }

        const { stdout } = await execPromise(command);
        const iface = stdout.trim();

        if (iface) {
            res.json({ interface: iface, auto_detected: true, platform: process.platform });
        } else {
            // Fallback
            const fallback = process.platform === 'darwin' ? 'en0' : 'eth0';
            res.json({ interface: fallback, auto_detected: false, platform: process.platform });
        }
    } catch (e) {
        const fallback = process.platform === 'darwin' ? 'en0' : 'eth0';
        res.json({ interface: fallback, auto_detected: false, platform: process.platform, error: String(e) });
    }
});



// ✅ NEW: API Force Auto-Detect Interface (for first-time setup)
app.post('/api/system/auto-detect-interface', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 INTERFACE: Manual auto-detection requested');
        const { execSync } = require('child_process');
        const execPromise = promisify(exec);
        let defaultIface = '';
        let detectionMethod = '';
        let confidence = 'high';

        // Check if running in Docker container
        const isDocker = fs.existsSync('/.dockerenv') ||
            (fs.existsSync('/proc/1/cgroup') &&
                fs.readFileSync('/proc/1/cgroup', 'utf8').includes('docker'));

        if (isDocker) {
            defaultIface = 'eth0';
            detectionMethod = 'Docker container';
            console.log('🐳 INTERFACE: Docker detected, using eth0');
        } else if (PLATFORM === 'linux') {
            try {
                const { stdout } = await execPromise("ip route | grep default | awk '{print $5}' | head -n 1");
                defaultIface = stdout.trim();
                detectionMethod = 'Linux default route';

                if (defaultIface) {
                    const testCmd = `ip link show ${defaultIface} 2>/dev/null`;
                    try {
                        await execPromise(testCmd);
                        console.log(`✅ INTERFACE: Verified ${defaultIface} exists`);
                    } catch (e) {
                        console.log(`⚠️  INTERFACE: ${defaultIface} not found, using fallback`);
                        defaultIface = 'eth0';
                        detectionMethod = 'Fallback after verification failed';
                        confidence = 'low';
                    }
                }
            } catch (e) {
                defaultIface = 'eth0';
                detectionMethod = 'Linux fallback';
                confidence = 'low';
            }
        } else if (PLATFORM === 'darwin') {
            defaultIface = 'en0';
            detectionMethod = 'macOS default';
        } else {
            defaultIface = 'eth0';
            detectionMethod = 'Generic fallback';
            confidence = 'low';
        }

        if (defaultIface) {
            const interfacesFile = path.join(APP_CONFIG.configDir, 'interfaces.txt');
            const content = `# Auto-detected on ${new Date().toISOString()}\n` +
                `# Method: ${detectionMethod}\n` +
                `${defaultIface}\n`;
            fs.writeFileSync(interfacesFile, content, 'utf8');

            console.log(`✅ INTERFACE: Saved ${defaultIface} to config`);

            res.json({
                success: true,
                interface: defaultIface,
                method: detectionMethod,
                confidence,
                platform: PLATFORM,
                isDocker,
                message: `Successfully detected and configured interface: ${defaultIface}`
            });
        } else {
            res.json({
                success: false,
                error: 'Could not detect any network interface',
                platform: PLATFORM,
                suggestion: 'Please configure manually using: ip link show (Linux) or ifconfig (Mac/Windows)'
            });
        }
    } catch (error: any) {
        console.error('INTERFACE: Auto-detection error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Auto-detection failed',
            message: error.message,
            suggestion: 'Please configure network interface manually in Configuration page'
        });
    }
});

// API: Tail Logs (Simple last 50 lines)
app.get('/api/logs', (req, res) => {
    const logFile = path.join(APP_CONFIG.logDir, 'traffic.log');
    if (!fs.existsSync(logFile)) return res.json({ logs: [] });

    // Use tail command for efficiency
    const tail = spawn('tail', ['-n', '50', logFile]);
    let data = '';

    tail.stdout.on('data', chunk => data += chunk);
    tail.on('close', () => {
        res.json({ logs: data.split('\n').filter(l => l) });
    });
});

// ===== SECURITY TESTING API =====
const SECURITY_CONFIG_FILE = path.join(APP_CONFIG.configDir, 'security-tests.json');

// Helper: Read security config
const getSecurityConfig = () => {
    try {
        if (!fs.existsSync(SECURITY_CONFIG_FILE)) {
            const defaultConfig = {
                url_filtering: { enabled_categories: [], protocol: 'http' },
                dns_security: { enabled_tests: [] },
                threat_prevention: { enabled: false, eicar_endpoint: 'http://192.168.203.100/eicar.com.txt' },
                scheduled_execution: {
                    enabled: false,
                    interval_minutes: 60,
                    run_url_tests: true,
                    run_dns_tests: true,
                    run_threat_tests: true,
                    next_run_time: null,
                    last_run_time: null
                },
                test_history: []
            };
            fs.writeFileSync(SECURITY_CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
        }
        return JSON.parse(fs.readFileSync(SECURITY_CONFIG_FILE, 'utf8'));
    } catch (e) {
        console.error('Error reading security config:', e);
        return null;
    }
};

// Helper: Save security config
const saveSecurityConfig = (config: any) => {
    try {
        fs.writeFileSync(SECURITY_CONFIG_FILE, JSON.stringify(config, null, 2));
        return true;
    } catch (e) {
        console.error('Error saving security config:', e);
        return false;
    }
};

// Helper: Add test result to history
const addTestResult = async (testType: string, testName: string, result: any, testId?: number, details?: any) => {
    const config = getSecurityConfig();
    if (!config) return;

    // Get next test ID if not provided
    const id = testId || getNextTestId();

    const historyEntry = {
        testId: id,
        timestamp: Date.now(),
        testType,
        testName,
        result,
    };

    // Keep in-memory history for backward compatibility (last 50)
    config.test_history = config.test_history || [];
    config.test_history.unshift(historyEntry);

    if (config.test_history.length > 50) {
        config.test_history = config.test_history.slice(0, 50);
    }

    saveSecurityConfig(config);

    // Also update statistics
    if (result.status) {
        updateStatistics(testType, result.status);
    }

    // Log to persistent TestLogger
    const testResult: TestResult = {
        id,
        timestamp: Date.now(),
        type: testType === 'url_filtering' ? 'url' : testType === 'dns_security' ? 'dns' : 'threat',
        name: testName,
        status: result.status || 'error',
        details: details || {
            url: result.url,
            domain: result.domain,
            endpoint: result.endpoint,
            ...result
        }
    };

    await testLogger.logTest(testResult);

    return id; // Return the test ID
};

// Helper: Update statistics
const updateStatistics = (testType: string, status: string) => {
    const config = getSecurityConfig();
    if (!config) return;

    if (!config.statistics) {
        config.statistics = {
            total_tests_run: 0,
            url_tests_blocked: 0,
            url_tests_allowed: 0,
            dns_tests_blocked: 0,
            dns_tests_sinkholed: 0,
            dns_tests_allowed: 0,
            threat_tests_blocked: 0,
            threat_tests_allowed: 0,
            last_test_time: null
        };
    }

    config.statistics.total_tests_run++;
    config.statistics.last_test_time = Date.now();

    if (testType === 'url_filtering') {
        if (status === 'blocked') config.statistics.url_tests_blocked++;
        else config.statistics.url_tests_allowed++;
    } else if (testType === 'dns_security') {
        if (status === 'blocked') config.statistics.dns_tests_blocked++;
        else if (status === 'sinkholed') config.statistics.dns_tests_sinkholed++;
        else config.statistics.dns_tests_allowed++;
    } else if (testType === 'threat_prevention') {
        if (status === 'blocked') config.statistics.threat_tests_blocked++;
        else config.statistics.threat_tests_allowed++;
    }

    saveSecurityConfig(config);
};

// Scheduled Execution
let scheduledTestInterval: NodeJS.Timeout | null = null;

const runScheduledTests = async () => {
    const config = getSecurityConfig();
    if (!config || !config.scheduled_execution?.enabled) return;

    console.log('Running scheduled security tests...');

    // exec already imported at top
    // util.promisify already imported as promisify
    const execPromise = promisify(exec);

    // Run URL tests if enabled
    if (config.scheduled_execution.run_url_tests && config.url_filtering.enabled_categories.length > 0) {
        // Import URL categories dynamically
        const URL_CATEGORIES = [
            { id: 'malware', url: 'http://urlfiltering.paloaltonetworks.com/test-malware' },
            { id: 'phishing', url: 'http://urlfiltering.paloaltonetworks.com/test-phishing' },
            // Add more as needed for scheduled tests
        ];

        for (const categoryId of config.url_filtering.enabled_categories.slice(0, 5)) { // Limit to 5 per run
            const category = URL_CATEGORIES.find(c => c.id === categoryId);
            if (!category) continue;

            try {
                const { stdout } = await execPromise(`curl -fsS --max-time 10 -o /dev/null -w '%{http_code}' '${category.url}'`);
                const httpCode = parseInt(stdout);
                const status = httpCode >= 200 && httpCode < 400 ? 'allowed' : 'blocked';
                updateStatistics('url_filtering', status);
            } catch (e) {
                updateStatistics('url_filtering', 'blocked');
            }
        }
    }

    // Run DNS tests if enabled
    if (config.scheduled_execution.run_dns_tests && config.dns_security.enabled_tests.length > 0) {
        const DNS_DOMAINS = [
            { id: 'malware', domain: 'test-malware.testpanw.com' },
            { id: 'phishing', domain: 'test-phishing.testpanw.com' },
        ];

        for (const testId of config.dns_security.enabled_tests.slice(0, 5)) { // Limit to 5 per run
            const test = DNS_DOMAINS.find(t => t.id === testId);
            if (!test) continue;

            try {
                const { stdout } = await execPromise(`nslookup ${test.domain}`);
                const resolved = !stdout.includes('NXDOMAIN') && !stdout.includes('server can\'t find');
                const status = resolved ? 'allowed' : 'blocked';
                updateStatistics('dns_security', status);
            } catch (e) {
                updateStatistics('dns_security', 'blocked');
            }
        }
    }

    // Run threat test if enabled
    if (config.scheduled_execution.run_threat_tests && config.threat_prevention.enabled) {
        const endpoints = config.threat_prevention.eicar_endpoints || [config.threat_prevention.eicar_endpoint];
        for (const endpoint of endpoints.slice(0, 3)) { // Limit to 3 endpoints per run
            if (!endpoint) continue;
            try {
                await execPromise(`curl -fsS --max-time 20 ${endpoint} -o /tmp/eicar.com.txt && rm -f /tmp/eicar.com.txt`);
                updateStatistics('threat_prevention', 'allowed');
            } catch (e) {
                updateStatistics('threat_prevention', 'blocked');
            }
        }
    }

    console.log('Scheduled security tests completed');
};

const startScheduledTests = () => {
    const config = getSecurityConfig();
    if (!config || !config.scheduled_execution?.enabled) return;

    if (scheduledTestInterval) {
        clearInterval(scheduledTestInterval);
    }

    const intervalMs = (config.scheduled_execution.interval_minutes || 60) * 60 * 1000;
    scheduledTestInterval = setInterval(runScheduledTests, intervalMs);
    console.log(`Scheduled security tests enabled (every ${config.scheduled_execution.interval_minutes} minutes)`);
};

const stopScheduledTests = () => {
    if (scheduledTestInterval) {
        clearInterval(scheduledTestInterval);
        scheduledTestInterval = null;
        console.log('Scheduled security tests disabled');
    }
};

// Start scheduled tests on server startup
setTimeout(() => {
    const config = getSecurityConfig();
    if (config?.scheduled_execution?.enabled) {
        startScheduledTests();
    }
}, 5000); // Wait 5 seconds after startup


// API: Get Security Configuration
app.get('/api/security/config', authenticateToken, (req, res) => {
    const config = getSecurityConfig();
    if (!config) return res.status(500).json({ error: 'Failed to read config' });
    res.json(config);
});

// API: Update Security Configuration
app.post('/api/security/config', authenticateToken, (req, res) => {
    const config = getSecurityConfig();
    if (!config) return res.status(500).json({ error: 'Failed to read config' });

    const { url_filtering, dns_security, threat_prevention, scheduled_execution } = req.body;

    if (url_filtering) config.url_filtering = url_filtering;
    if (dns_security) config.dns_security = dns_security;
    if (threat_prevention) config.threat_prevention = threat_prevention;
    if (scheduled_execution !== undefined) {
        config.scheduled_execution = scheduled_execution;

        // Restart scheduler if settings changed
        if (scheduled_execution.enabled) {
            stopScheduledTests();
            startScheduledTests();
        } else {
            stopScheduledTests();
        }
    }

    if (saveSecurityConfig(config)) {
        res.json({ success: true, config });
    } else {
        res.status(500).json({ error: 'Failed to save config' });
    }
});

// API: Get Test History (with search, pagination, filters)
app.get('/api/security/results', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const search = req.query.search as string;
        const type = req.query.type as 'url' | 'dns' | 'threat' | undefined;
        const status = req.query.status as 'blocked' | 'allowed' | 'sinkholed' | 'error' | undefined;

        const { results, total } = await testLogger.getResults({
            limit,
            offset,
            search,
            type,
            status
        });

        res.json({ results, total, limit, offset });
    } catch (error) {
        console.error('[API] Failed to get test results:', error);
        res.status(500).json({ error: 'Failed to retrieve test results' });
    }
});

// API: Get Single Test Result by ID
app.get('/api/security/results/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await testLogger.getResultById(id);

        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ error: 'Test result not found' });
        }
    } catch (error) {
        console.error('[API] Failed to get test result:', error);
        res.status(500).json({ error: 'Failed to retrieve test result' });
    }
});

// API: Get Test Statistics
app.get('/api/security/results/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await testLogger.getStats();
        res.json(stats);
    } catch (error) {
        console.error('[API] Failed to get test stats:', error);
        res.status(500).json({ error: 'Failed to retrieve statistics' });
    }
});

// API: Clear Test History (manual cleanup)
app.delete('/api/security/results', authenticateToken, async (req, res) => {
    try {
        const before = req.query.before as string;

        if (before) {
            // Delete logs before specific date (not implemented yet - would need enhancement)
            res.status(501).json({ error: 'Date-based cleanup not yet implemented' });
        } else {
            // Delete all logs
            const deletedCount = await testLogger.deleteAll();
            res.json({ success: true, deletedCount });
        }
    } catch (error) {
        console.error('[API] Failed to clear test results:', error);
        res.status(500).json({ error: 'Failed to clear test results' });
    }
});

// API: URL Filtering Test
app.post('/api/security/url-test', authenticateToken, async (req, res) => {
    const { url, category } = req.body;

    const testId = getNextTestId();

    logTest(`[URL-TEST-${testId}] URL filtering test request: ${url} (${category || 'Uncategorized'})`);

    if (!url) {
        logTest(`[URL-TEST-${testId}] Test failed: No URL provided`);
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        // exec already imported at top
        // util.promisify already imported as promisify
        const execPromise = promisify(exec);

        const curlCommand = `curl -fsS --max-time 10 -o /dev/null -w '%{http_code}' '${url}'`;
        logTest(`[URL-TEST-${testId}] Executing URL test for ${url} (${category || 'Uncategorized'}): ${curlCommand}`);

        try {
            const { stdout } = await execPromise(curlCommand);
            const httpCode = parseInt(stdout);
            logTest(`[URL-TEST-${testId}] HTTP response code: ${httpCode}`);

            const result = {
                success: httpCode >= 200 && httpCode < 400,
                httpCode,
                status: httpCode >= 200 && httpCode < 400 ? 'allowed' : 'blocked',
                url,
                category
            };

            logTest(`[URL-TEST-${testId}] Final status: ${result.status} (HTTP ${httpCode})`);
            addTestResult('url_filtering', category || url, result, testId);
            res.json(result);
        } catch (curlError: any) {
            // Curl error usually means blocked or network error
            const result = {
                success: false,
                httpCode: 0,
                status: 'blocked',
                url,
                category,
                error: curlError.message
            };

            logTest(`[URL-TEST-${testId}] Final status: blocked (curl error: ${curlError.message})`);
            addTestResult('url_filtering', category || url, result, testId);
            res.json(result);
        }
    } catch (e: any) {
        res.status(500).json({ error: 'Test execution failed', message: e.message });
    }
});

// API: URL Filtering Batch Test
app.post('/api/security/url-test-batch', authenticateToken, async (req, res) => {
    const { tests } = req.body; // Array of { url, category }

    if (!Array.isArray(tests) || tests.length === 0) {
        return res.status(400).json({ error: 'Tests array is required' });
    }

    const batchId = Date.now();
    const results = [];

    logTest(`[URL-BATCH-${batchId}] Starting batch URL filtering test with ${tests.length} tests`);

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        const testId = getNextTestId();

        try {
            logTest(`[URL-BATCH-${batchId}][URL-TEST-${testId}] [${i + 1}/${tests.length}] Testing: ${test.url} (${test.category})`);

            const execPromise = promisify(exec);
            const curlCommand = `curl -fsS --max-time 10 -o /dev/null -w '%{http_code}' '${test.url}'`;

            logTest(`[URL-TEST-${testId}] Executing URL test for ${test.url} (${test.category}): ${curlCommand}`);

            try {
                const { stdout } = await execPromise(curlCommand);
                const httpCode = parseInt(stdout);

                logTest(`[URL-TEST-${testId}] HTTP response code: ${httpCode}`);

                const status = httpCode >= 200 && httpCode < 400 ? 'allowed' : 'blocked';
                const result = {
                    success: httpCode >= 200 && httpCode < 400,
                    httpCode,
                    status,
                    url: test.url,
                    category: test.category
                };

                logTest(`[URL-TEST-${testId}] Final status: ${status} (HTTP ${httpCode})`);

                results.push(result);
                await addTestResult('url_filtering', test.category, result, testId, {
                    url: test.url,
                    httpCode,
                    command: curlCommand
                });
            } catch (curlError: any) {
                logTest(`[URL-TEST-${testId}] Final status: blocked (curl error: ${curlError.message})`);

                const result = {
                    success: false,
                    httpCode: 0,
                    status: 'blocked',
                    url: test.url,
                    category: test.category,
                    error: curlError.message
                };

                results.push(result);
                await addTestResult('url_filtering', test.category, result, testId, {
                    url: test.url,
                    error: curlError.message,
                    command: curlCommand
                });
            }
        } catch (e: any) {
            logTest(`[URL-TEST-${testId}] Error: ${e.message}`);

            results.push({
                success: false,
                status: 'error',
                url: test.url,
                category: test.category,
                error: e.message
            });
        }
    }

    logTest(`[URL-BATCH-${batchId}] Batch completed: ${results.length} tests executed`);
    res.json({ results });
});

// API: DNS Security Test
app.post('/api/security/dns-test', authenticateToken, async (req, res) => {
    const { domain, testName } = req.body;

    // Generate unique test ID
    const testId = getNextTestId();


    logTest(`[DNS-TEST-${testId}] DNS security test request: ${domain} (${testName || 'Custom Test'})`);

    if (!domain) {
        logTest(`[DNS-TEST-${testId}] Test failed: No domain provided`);
        return res.status(400).json({ error: 'Domain is required' });
    }

    try {
        // exec already imported at top
        // util.promisify already imported as promisify
        const execPromise = promisify(exec);

        // Get platform-specific DNS command
        const { command: dnsCommand, type: commandType } = getDnsCommand(domain);
        logTest(`[DNS-TEST-${testId}] Executing DNS test for ${domain} (${testName || 'Custom Test'}): ${dnsCommand}`);

        // Helper function to wait
        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        try {
            // First attempt
            let { stdout, stderr } = await execPromise(dnsCommand);

            logTest(`[DNS-TEST-${testId}] DNS command output (attempt 1):`, stdout || '(empty)');

            // Parse output based on command type
            let resolvedIp = parseDnsOutput(stdout, commandType);

            // If no IP found, try a second time (DNS can be flaky)
            if (!resolvedIp) {
                logTest(`[DNS-TEST-${testId}] No IP in first attempt, retrying after 500ms...`);
                await wait(500);
                const result2 = await execPromise(dnsCommand);
                stdout = result2.stdout;
                logTest(`[DNS-TEST-${testId}] DNS command output (attempt 2):`, stdout || '(empty)');
                resolvedIp = parseDnsOutput(stdout, commandType);
            }

            // Known sinkhole IPs (Palo Alto Networks and common sinkhole addresses)
            const sinkholeIPs = [
                '198.135.184.22',  // Current Palo Alto sinkhole
                '72.5.65.111',     // Legacy Palo Alto sinkhole
                '::1',             // IPv6 sinkhole (loopback)
                '0.0.0.0',         // Common sinkhole
                '127.0.0.1'        // Loopback sinkhole
            ];

            // Determine status based on parsed IP
            let status: string;
            let resolved: boolean;

            if (!resolvedIp) {
                // No IP found - domain is blocked
                status = 'blocked';
                resolved = false;
                logTest(`[DNS-TEST-${testId}] Status: BLOCKED (no IP resolved)`);
            } else if (sinkholeIPs.includes(resolvedIp)) {
                // Sinkhole IP detected
                status = 'sinkholed';
                resolved = false;
                logTest(`[DNS-TEST-${testId}] Status: SINKHOLED (IP: ${resolvedIp})`);
            } else {
                // Normal resolution
                status = 'resolved';
                resolved = true;
                logTest(`[DNS-TEST-${testId}] Status: RESOLVED (IP: ${resolvedIp})`);
            }

            const result = {
                success: true,
                resolved,
                status,
                domain,
                testName,
                output: stdout
            };

            logTest(`[DNS-TEST-${testId}] Test result:`, { domain, status, resolved });
            addTestResult('dns_security', testName || domain, result, testId);
            res.json(result);
        } catch (dnsError: any) {
            // Check if it's a command not found error
            const isCommandError = dnsError.message.includes('command not found') ||
                dnsError.message.includes('not found');

            const result = {
                success: false,
                resolved: false,
                status: isCommandError ? 'error' : 'blocked',
                domain,
                testName,
                error: dnsError.message
            };

            logTest(`[DNS-TEST-${testId}] Error: ${isCommandError ? 'Command not available' : 'DNS blocked'} - ${dnsError.message}`);

            addTestResult('dns_security', testName || domain, result, testId);
            res.json(result);
        }
    } catch (e: any) {
        res.status(500).json({ error: 'Test execution failed', message: e.message });
    }
});

// API: DNS Security Batch Test
app.post('/api/security/dns-test-batch', authenticateToken, async (req, res) => {
    const { tests } = req.body; // Array of { domain, testName }

    if (!Array.isArray(tests) || tests.length === 0) {
        return res.status(400).json({ error: 'Tests array is required' });
    }

    const results = [];
    const batchId = Date.now(); // Unique batch ID

    // Helper function to wait
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    logTest(`[DNS-BATCH-${batchId}] Starting batch test with ${tests.length} domains`);

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        const testId = getNextTestId(); // Generate unique ID for each test

        logTest(`[DNS-BATCH-${batchId}][DNS-TEST-${testId}] [${i + 1}/${tests.length}] Testing: ${test.domain} (${test.testName})`);

        try {
            // exec already imported at top
            // util.promisify already imported as promisify
            const execPromise = promisify(exec);

            // Use getent instead of nslookup - more reliable in containers
            const dnsCommand = `getent ahosts ${test.domain}`;

            try {
                // First attempt
                let { stdout, stderr } = await execPromise(dnsCommand);

                logTest(`[DNS-TEST-${testId}] First query result: ${stdout.trim() || '(empty)'}`);

                // If first attempt returns empty, retry after 2 seconds
                // Palo Alto DNS Security sometimes returns empty on first query, sinkhole IP on second
                if (!stdout.trim()) {
                    logTest(`[DNS-TEST-${testId}] First query empty, waiting 2 seconds before retry...`);
                    await wait(2000);
                    const retry = await execPromise(dnsCommand);
                    stdout = retry.stdout;
                    stderr = retry.stderr;
                    logTest(`[DNS-TEST-${testId}] Retry query result: ${stdout.trim() || '(empty)'}`);
                }

                // Known sinkhole IPs (Palo Alto Networks and common sinkhole addresses)
                const sinkholeIPs = [
                    '198.135.184.22',  // Current Palo Alto sinkhole
                    '72.5.65.111',     // Legacy Palo Alto sinkhole
                    '::1',             // IPv6 sinkhole (loopback)
                    '0.0.0.0',         // Common sinkhole
                    '127.0.0.1'        // Loopback sinkhole
                ];

                // Check for sinkhole IP in response
                const isSinkholed = sinkholeIPs.some(ip => stdout.includes(ip));

                // Check for blocked (no response or empty output after retry)
                const isBlocked = !stdout.trim() || stdout.includes('Name or service not known');

                // Determine status: resolved, sinkholed, or blocked
                let status: string;
                let resolved: boolean;

                if (isSinkholed) {
                    status = 'sinkholed';  // Malicious domain detected, sinkhole IP returned
                    resolved = false;      // Not a legitimate resolution
                } else if (isBlocked) {
                    status = 'blocked';    // Query blocked, no response
                    resolved = false;
                } else {
                    status = 'resolved';   // Normal resolution
                    resolved = true;
                }

                logTest(`[DNS-TEST-${testId}] Final status: ${status} (isSinkholed=${isSinkholed}, isBlocked=${isBlocked})`);

                const result = {
                    success: true,
                    resolved,
                    status,
                    domain: test.domain,
                    testName: test.testName
                };

                results.push(result);
                addTestResult('dns_security', test.testName, result, testId);
            } catch (dnsError: any) {
                // Check if it's a command not found error
                const isCommandError = dnsError.message.includes('command not found') ||
                    dnsError.message.includes('not found');

                const result = {
                    success: false,
                    resolved: false,
                    status: isCommandError ? 'error' : 'blocked',
                    domain: test.domain,
                    testName: test.testName,
                    error: dnsError.message
                };

                logTest(`[DNS-TEST-${testId}] Error: ${isCommandError ? 'Command not available' : 'DNS blocked'} - ${dnsError.message}`);

                results.push(result);
                addTestResult('dns_security', test.testName, result, testId);
            }
        } catch (e: any) {
            results.push({
                success: false,
                status: 'error',
                domain: test.domain,
                testName: test.testName,
                error: e.message
            });
        }
    }

    res.json({ results });
});

// API: Threat Prevention Test (EICAR)
app.post('/api/security/threat-test', authenticateToken, async (req, res) => {
    const { endpoint } = req.body;

    const testId = getNextTestId();

    logTest(`[THREAT-TEST-${testId}] EICAR test request received: ${endpoint} (Threat Prevention Test)`);

    if (!endpoint) {
        logTest(`[THREAT-TEST-${testId}] Test failed: No endpoint provided`);
        return res.status(400).json({ error: 'Endpoint URL is required' });
    }

    // Validate URL format
    try {
        new URL(endpoint);
    } catch (e) {
        console.log('[DEBUG] EICAR test failed: Invalid URL format:', endpoint);
        return res.status(400).json({ error: 'Invalid URL format' });
    }

    const results = [];

    try {
        // exec already imported at top
        // util.promisify already imported as promisify
        const execPromise = promisify(exec);

        // Support single endpoint or array
        const endpointsArray = Array.isArray(endpoint) ? endpoint : [endpoint];

        for (const ep of endpointsArray) {
            const curlCommand = `curl -fsS --max-time 20 ${ep} -o /tmp/eicar.com.txt && rm -f /tmp/eicar.com.txt`;
            logTest(`[THREAT-TEST-${testId}] Executing EICAR test for ${ep}: ${curlCommand}`);

            try {
                await execPromise(curlCommand);
                logTest(`[THREAT-TEST-${testId}] EICAR file downloaded successfully from ${ep}`);

                const result = {
                    success: true,
                    status: 'allowed',
                    endpoint,
                    message: 'EICAR file downloaded successfully (not blocked by IPS)'
                };

                logTest(`[THREAT-TEST-${testId}] EICAR test result: ALLOWED`, { endpoint });
                addTestResult('threat_prevention', `EICAR Test (${endpoint})`, result, testId);
                results.push(result);
            } catch (curlError: any) {
                // Curl error usually means blocked by IPS
                const result = {
                    success: false,
                    status: 'blocked',
                    endpoint,
                    message: 'EICAR download blocked (IPS triggered)',
                    error: curlError.message
                };

                logTest(`[THREAT-TEST-${testId}] EICAR test result: BLOCKED`, { endpoint, error: curlError.message });
                addTestResult('threat_prevention', `EICAR Test (${endpoint})`, result, testId);
                results.push(result);
            }
        }

        console.log('[DEBUG] EICAR test completed:', { totalTests: results.length, results });
        res.json({ success: true, results });
    } catch (e: any) {
        console.log('[DEBUG] EICAR test error:', e.message);
        res.status(500).json({ error: 'Test execution failed', message: e.message });
    }
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    // Static files
    app.use(express.static(path.join(__dirname, 'dist')));

    // SPA Fallback - Use middleware as last resort
    app.use((req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
}

app.listen(port, async () => {
    // Initialize platform-specific commands
    await initializeCommands();

    // Log version on startup
    try {
        const versionFile = path.join(__dirname, 'VERSION');
        if (fs.existsSync(versionFile)) {
            const version = fs.readFileSync(versionFile, 'utf8').trim();
            console.log(`🚀 SD-WAN Traffic Generator v${version}`);
        }
    } catch (e) {
        // Ignore version read errors
    }

    // Schedule daily log cleanup (runs at 2 AM)
    const scheduleLogCleanup = () => {
        const now = new Date();
        const tomorrow2AM = new Date(now);
        tomorrow2AM.setDate(tomorrow2AM.getDate() + 1);
        tomorrow2AM.setHours(2, 0, 0, 0);

        const msUntil2AM = tomorrow2AM.getTime() - now.getTime();

        setTimeout(async () => {
            console.log('[LOG_CLEANUP] Running daily log cleanup...');
            const deletedCount = await testLogger.cleanup();
            console.log(`[LOG_CLEANUP] Deleted ${deletedCount} old log files`);

            // Schedule next cleanup
            scheduleLogCleanup();
        }, msUntil2AM);

        console.log(`[LOG_CLEANUP] Next cleanup scheduled for ${tomorrow2AM.toISOString()}`);
    };

    scheduleLogCleanup();

    console.log(`Backend running at http://localhost:${port}`);
});
