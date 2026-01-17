import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import os from 'os';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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



const app = express();
const port = parseInt(process.env.PORT || '3001');

const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key-change-this';
const USERS_FILE = path.join(APP_CONFIG.configDir, 'users.json');

app.use(cors());
app.use(express.json());

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

    // Create empty interfaces.txt if it doesn't exist (user must configure)
    if (!fs.existsSync(interfacesFile)) {
        fs.writeFileSync(interfacesFile, '# Add network interfaces here, one per line\n# Example: eth0\n', 'utf8');
        console.log('Created default interfaces.txt (empty - requires user configuration)');
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

// API: Update Application Weight (Single)
app.post('/api/config/apps', authenticateToken, (req, res) => {
    const { domain, weight } = req.body;
    updateAppsWeigth({ [domain]: weight }, res);
});

// API: Update Category Weight (Bulk)
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
const addTestResult = (testType: string, testName: string, result: any) => {
    const config = getSecurityConfig();
    if (!config) return;

    const historyEntry = {
        timestamp: Date.now(),
        testType,
        testName,
        result,
    };

    config.test_history = config.test_history || [];
    config.test_history.unshift(historyEntry);

    // Keep only last 50 results
    if (config.test_history.length > 50) {
        config.test_history = config.test_history.slice(0, 50);
    }

    saveSecurityConfig(config);

    // Also update statistics
    if (result.status) {
        updateStatistics(testType, result.status);
    }
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

// API: Get Test History
app.get('/api/security/results', authenticateToken, (req, res) => {
    const config = getSecurityConfig();
    if (!config) return res.status(500).json({ error: 'Failed to read config' });
    res.json({ results: config.test_history || [] });
});

// API: Clear Test History
app.delete('/api/security/results', authenticateToken, (req, res) => {
    const config = getSecurityConfig();
    if (!config) return res.status(500).json({ error: 'Failed to read config' });

    config.test_history = [];
    if (saveSecurityConfig(config)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to clear history' });
    }
});

// API: URL Filtering Test
app.post('/api/security/url-test', authenticateToken, async (req, res) => {
    const { url, category } = req.body;

    console.log('[DEBUG] URL filtering test request:', { url, category });

    if (!url) {
        console.log('[DEBUG] URL test failed: No URL provided');
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        // exec already imported at top
        // util.promisify already imported as promisify
        const execPromise = promisify(exec);

        const curlCommand = `curl -fsS --max-time 10 -o /dev/null -w '%{http_code}' '${url}'`;

        try {
            const { stdout } = await execPromise(curlCommand);
            const httpCode = parseInt(stdout);
            const result = {
                success: httpCode >= 200 && httpCode < 400,
                httpCode,
                status: httpCode >= 200 && httpCode < 400 ? 'allowed' : 'blocked',
                url,
                category
            };

            addTestResult('url_filtering', category || url, result);
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

            addTestResult('url_filtering', category || url, result);
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

    const results = [];

    for (const test of tests) {
        try {
            // exec already imported at top
            // util.promisify already imported as promisify
            const execPromise = promisify(exec);

            const curlCommand = `curl -fsS --max-time 10 -o /dev/null -w '%{http_code}' '${test.url}'`;

            try {
                const { stdout } = await execPromise(curlCommand);
                const httpCode = parseInt(stdout);
                const result = {
                    success: httpCode >= 200 && httpCode < 400,
                    httpCode,
                    status: httpCode >= 200 && httpCode < 400 ? 'allowed' : 'blocked',
                    url: test.url,
                    category: test.category
                };

                results.push(result);
                addTestResult('url_filtering', test.category, result);
            } catch (curlError: any) {
                const result = {
                    success: false,
                    httpCode: 0,
                    status: 'blocked',
                    url: test.url,
                    category: test.category,
                    error: curlError.message
                };

                results.push(result);
                addTestResult('url_filtering', test.category, result);
            }
        } catch (e: any) {
            results.push({
                success: false,
                status: 'error',
                url: test.url,
                category: test.category,
                error: e.message
            });
        }
    }

    res.json({ results });
});

// API: DNS Security Test
app.post('/api/security/dns-test', authenticateToken, async (req, res) => {
    const { domain, testName } = req.body;

    console.log('[DEBUG] DNS security test request:', { domain, testName });

    if (!domain) {
        console.log('[DEBUG] DNS test failed: No domain provided');
        return res.status(400).json({ error: 'Domain is required' });
    }

    try {
        // exec already imported at top
        // util.promisify already imported as promisify
        const execPromise = promisify(exec);

        // Use getent instead of nslookup - more reliable in containers
        const dnsCommand = `getent ahosts ${domain}`;
        console.log('[DEBUG] Executing DNS test:', dnsCommand);

        try {
            const { stdout, stderr } = await execPromise(dnsCommand);

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

            // Check for blocked (no response or empty output)
            const isBlocked = !stdout.trim() || stdout.includes('Name or service not known');

            // Determine status: resolved, sinkholed, or blocked
            let status: string;
            let resolved: boolean;

            if (isSinkholed) {
                status = 'sinkholed';  // Malicious domain detected, sinkhole IP returned
                resolved = false;      // Not a legitimate resolution
            } else if (isBlocked) {
                status = 'blocked';    // Query blocked, no response
            } else {
                status = 'resolved';   // Normal resolution
                resolved = true;
            }

            const result = {
                success: true,
                resolved,
                status,
                domain,
                testName,
                output: stdout
            };

            console.log('[DEBUG] DNS test result:', { domain, status, resolved, isSinkholed, isBlocked });
            addTestResult('dns_security', testName || domain, result);
            res.json(result);
        } catch (dnsError: any) {
            // DNS error usually means blocked
            const result = {
                success: false,
                resolved: false,
                status: 'blocked',
                domain,
                testName,
                error: dnsError.message
            };

            addTestResult('dns_security', testName || domain, result);
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

    for (const test of tests) {
        try {
            // exec already imported at top
            // util.promisify already imported as promisify
            const execPromise = promisify(exec);

            const dnsCommand = `nslookup ${test.domain}`;

            try {
                const { stdout } = await execPromise(dnsCommand);
                const resolved = !stdout.includes('NXDOMAIN') && !stdout.includes('server can\'t find');

                const result = {
                    success: true,
                    resolved,
                    status: resolved ? 'resolved' : 'blocked',
                    domain: test.domain,
                    testName: test.testName
                };

                results.push(result);
                addTestResult('dns_security', test.testName, result);
            } catch (dnsError: any) {
                const result = {
                    success: false,
                    resolved: false,
                    status: 'blocked',
                    domain: test.domain,
                    testName: test.testName,
                    error: dnsError.message
                };

                results.push(result);
                addTestResult('dns_security', test.testName, result);
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

    console.log('[DEBUG] EICAR test request received:', { endpoint });

    if (!endpoint) {
        console.log('[DEBUG] EICAR test failed: No endpoint provided');
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
            console.log('[DEBUG] Executing EICAR test:', curlCommand);

            try {
                await execPromise(curlCommand);

                const result = {
                    success: true,
                    status: 'allowed',
                    endpoint,
                    message: 'EICAR file downloaded successfully (not blocked by IPS)'
                };

                console.log('[DEBUG] EICAR test result: ALLOWED', { endpoint });
                addTestResult('threat_prevention', `EICAR Test (${endpoint})`, result);
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

                console.log('[DEBUG] EICAR test result: BLOCKED', { endpoint, error: curlError.message });
                addTestResult('threat_prevention', `EICAR Test (${endpoint})`, result);
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

app.listen(port, () => {
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
    console.log(`Backend running at http://localhost:${port}`);
});
