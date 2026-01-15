import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
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

// API: Get System Interfaces (Physical)
app.get('/api/system/interfaces', authenticateToken, (req, res) => {
    const interfaces = os.networkInterfaces();
    const result: { name: string, ip: string }[] = [];

    Object.keys(interfaces).forEach(name => {
        const iface = interfaces[name];
        if (iface) {
            iface.forEach(details => {
                // Filter for IPv4 and non-internal (skip loopback 127.0.0.1 unless user wants it?)
                // Usually we want external interfaces. 
                // Let's include everything but mark them? Or just all IPv4.
                if (details.family === 'IPv4' && !details.internal) {
                    result.push({ name, ip: details.address });
                }
            });
        }
    });
    res.json(result);
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
