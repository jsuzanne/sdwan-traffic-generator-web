#!/bin/bash
#
# SD-WAN Traffic Generator - Installation Script
#

set -e

echo "=================================================="
echo "  SD-WAN Traffic Generator - Installation"
echo "=================================================="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

echo "📋 Checking prerequisites..."

# Check for curl
if ! command -v curl &> /dev/null; then
    echo "⚠️  curl not found. Installing..."
    apt-get update
    apt-get install -y curl
fi

# Check for jq (optional but recommended)
if ! command -v jq &> /dev/null; then
    echo "ℹ️  jq not found. Installing (optional, for JSON viewing)..."
    apt-get install -y jq || echo "⚠️  Could not install jq, continuing anyway..."
fi

echo ""
echo "📁 Creating directories..."
mkdir -p /opt/sdwan-traffic-gen/config
mkdir -p /opt/sdwan-traffic-gen/profiles
mkdir -p /var/log/sdwan-traffic-gen

echo "📄 Installing traffic generator..."
if [[ -f traffic-generator.sh ]]; then
    cp traffic-generator.sh /opt/sdwan-traffic-gen/
    chmod +x /opt/sdwan-traffic-gen/traffic-generator.sh
    echo "✓ Main script installed"
else
    echo "❌ Error: traffic-generator.sh not found in current directory"
    exit 1
fi

echo "⚙️  Installing configuration files..."
if [[ -d config ]]; then
    cp config/applications.txt /opt/sdwan-traffic-gen/config/ 2>/dev/null || echo "⚠️  applications.txt not found"
    cp config/interfaces.txt /opt/sdwan-traffic-gen/config/ 2>/dev/null || echo "⚠️  interfaces.txt not found"
    cp config/user_agents.txt /opt/sdwan-traffic-gen/config/ 2>/dev/null || echo "⚠️  user_agents.txt not found"
    echo "✓ Configuration files installed"
else
    echo "⚠️  config directory not found, creating default configs..."
    
    # Create default applications.txt
    cat > /opt/sdwan-traffic-gen/config/applications.txt << 'EOF'
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
zoom.us|70|/
slack.com|65|/api/api.test
webex.com|60|/
discord.com|55|/api/v9/gateway

# CRM & Sales
salesforce.com|50|/
hubspot.com|45|/
dynamics.microsoft.com|40|/

# Project Management
monday.com|40|/
asana.com|40|/
trello.com|35|/
jira.atlassian.com|35|/
confluence.atlassian.com|30|/

# Cloud Storage
dropbox.com|40|/
box.com|35|/
wetransfer.com|30|/

# DevOps
github.com|40|/
gitlab.com|35|/
bitbucket.org|30|/
stackoverflow.com|25|/

# Cloud Providers
portal.azure.com|35|/
console.aws.amazon.com|35|/
console.cloud.google.com|30|/
EOF

    # Create default interfaces.txt
    cat > /opt/sdwan-traffic-gen/config/interfaces.txt << 'EOF'
eth0
EOF

    # Create default user_agents.txt
    cat > /opt/sdwan-traffic-gen/config/user_agents.txt << 'EOF'
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15
Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0
Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0
Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1
Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36
Microsoft Office/16.0 (Windows NT 10.0; Microsoft Teams)
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Teams/1.5.00.32771 Chrome/91.0.4472.164 Electron/13.6.6 Safari/537.36
Microsoft-WNS/10.0
EOF

    echo "✓ Default configuration files created"
fi

echo "🔧 Installing systemd service..."
if [[ -f systemd/sdwan-traffic-gen.service ]]; then
    cp systemd/sdwan-traffic-gen.service /etc/systemd/system/
elif [[ -f sdwan-traffic-gen.service ]]; then
    cp sdwan-traffic-gen.service /etc/systemd/system/
else
    echo "⚠️  Service file not found, creating default..."
    cat > /etc/systemd/system/sdwan-traffic-gen.service << 'EOF'
[Unit]
Description=SD-WAN Traffic Generator
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/opt/sdwan-traffic-gen/traffic-generator.sh client01
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
fi

systemctl daemon-reload
echo "✓ Systemd service installed"

echo "📋 Installing logrotate configuration..."
if [[ -f logrotate/sdwan-traffic-gen ]]; then
    cp logrotate/sdwan-traffic-gen /etc/logrotate.d/
elif [[ -f sdwan-traffic-gen.logrotate ]]; then
    cp sdwan-traffic-gen.logrotate /etc/logrotate.d/sdwan-traffic-gen
else
    echo "⚠️  Logrotate config not found, creating default..."
    cat > /etc/logrotate.d/sdwan-traffic-gen << 'EOF'
/var/log/sdwan-traffic-gen/*.log {
    daily
    rotate 7
    size 100M
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    sharedscripts
    postrotate
        /bin/kill -HUP `cat /var/run/syslogd.pid 2> /dev/null` 2> /dev/null || true
    endscript
}

/var/log/sdwan-traffic-gen/*.json {
    daily
    rotate 3
    size 10M
    compress
    missingok
    notifempty
    create 0644 root root
}
EOF
fi
echo "✓ Logrotate configuration installed"

echo "🛠️  Installing helper scripts (optional)..."
if [[ -f scripts/generate-traffic-profile.sh ]]; then
    cp scripts/generate-traffic-profile.sh /usr/local/bin/sdwan-profile-gen
    chmod +x /usr/local/bin/sdwan-profile-gen
    echo "✓ Profile generator installed as 'sdwan-profile-gen'"
fi

if [[ -f scripts/update-traffic-profile.sh ]]; then
    cp scripts/update-traffic-profile.sh /usr/local/bin/sdwan-update-profile
    chmod +x /usr/local/bin/sdwan-update-profile
    echo "✓ Profile updater installed as 'sdwan-update-profile'"
fi

echo "🔒 Setting permissions..."
chown -R root:root /opt/sdwan-traffic-gen
chmod 755 /opt/sdwan-traffic-gen
chmod 755 /opt/sdwan-traffic-gen/config
chmod 644 /opt/sdwan-traffic-gen/config/*
chmod 755 /var/log/sdwan-traffic-gen

echo ""
echo "✅ Installation complete!"
echo ""
echo "=================================================="
echo "           Next Steps"
echo "=================================================="
echo ""
echo "1️⃣  Start the service:"
echo "   sudo systemctl start sdwan-traffic-gen"
echo ""
echo "2️⃣  Enable auto-start on boot:"
echo "   sudo systemctl enable sdwan-traffic-gen"
echo ""
echo "3️⃣  Check status:"
echo "   sudo systemctl status sdwan-traffic-gen"
echo ""
echo "4️⃣  View logs:"
echo "   tail -f /var/log/sdwan-traffic-gen/traffic.log"
echo ""
echo "5️⃣  View statistics (after ~1 minute):"
echo "   cat /var/log/sdwan-traffic-gen/stats.json | jq"
echo ""
echo "=================================================="
echo ""
echo "📖 Documentation: https://github.com/jsuzanne/sdwan-traffic-generator"
echo "🐛 Issues: https://github.com/jsuzanne/sdwan-traffic-generator/issues"
echo ""
echo "Happy traffic generating! 🚀"
echo ""

