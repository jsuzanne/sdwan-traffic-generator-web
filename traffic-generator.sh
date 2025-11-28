#!/bin/bash
#
# SD-WAN Traffic Generator - Enhanced Version
# Purpose: Generate realistic enterprise application traffic for SD-WAN demos
# Usage: ./traffic-generator.sh [client-id]
#

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="/opt/sdwan-traffic-gen"
CONFIG_DIR="${SCRIPT_DIR}/config"
LOG_DIR="/var/log/sdwan-traffic-gen"
LOGFILE="${LOG_DIR}/traffic.log"
STATS_FILE="${LOG_DIR}/stats.json"

CLIENTID="${1:-client01}"
MAX_TIMEOUT=15
SLEEP_BETWEEN_REQUESTS=1

# Backoff timers (seconds)
B1=60       # 1 min - première erreur
B2=300      # 5 min - deuxième erreur
B3=1800     # 30 min - troisième erreur
B4=3600     # 1h - erreurs répétées
B5=10800    # 3h - site persistemment injoignable

# Stats counters
declare -A APP_COUNTERS
declare -A APP_ERRORS
declare -A BACKOFF_LEVEL
TOTAL_REQUESTS=0

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function log_message() {
    local level="$1"
    shift
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [$level] $*" >> "$LOGFILE"
}

function log_info() {
    log_message "INFO" "$@"
}

function log_warn() {
    log_message "WARN" "$@"
}

function log_error() {
    log_message "ERROR" "$@"
}

# ============================================================================
# RANDOM SELECTION FUNCTIONS
# ============================================================================

function getRandomInterface() {
    if [[ -f "${CONFIG_DIR}/interfaces.txt" ]]; then
        sort -R "${CONFIG_DIR}/interfaces.txt" 2>/dev/null | head -n 1
    else
        echo "eth0"
    fi
}

function getRandomUserAgent() {
    if [[ -f "${CONFIG_DIR}/user_agents.txt" ]]; then
        sort -R "${CONFIG_DIR}/user_agents.txt" 2>/dev/null | head -n 1
    else
        echo "Mozilla/5.0 (compatible; SD-WAN-Traffic-Gen/1.0)"
    fi
}

# Weighted random selection for applications
function getWeightedApp() {
    local total=0
    local -a apps weights endpoints
    
    while IFS='|' read -r app weight endpoint; do
        # Skip comments and empty lines
        [[ "$app" =~ ^#.*$ || -z "$app" ]] && continue
        
        apps+=("$app")
        weights+=("$weight")
        endpoints+=("$endpoint")
        ((total += weight))
    done < "${CONFIG_DIR}/applications.txt"
    
    if [[ $total -eq 0 ]]; then
        log_error "No valid applications found in config"
        echo "google.com|/robots.txt"
        return
    fi
    
    local rand=$((RANDOM % total))
    local cumul=0
    
    for i in "${!weights[@]}"; do
        ((cumul += weights[i]))
        if ((rand < cumul)); then
            echo "${apps[$i]}|${endpoints[$i]}"
            return
        fi
    done
}

# ============================================================================
# BACKOFF MANAGEMENT
# ============================================================================

function calculateBackoff() {
    local key=$1
    local level=${BACKOFF_LEVEL[$key]:-0}
    
    case $level in
        0) echo $B1 ;;
        1) echo $B2 ;;
        2) echo $B3 ;;
        3) echo $B4 ;;
        *) echo $B5 ;;
    esac
}

function checkBackoff() {
    local key=$1
    local current_time=$(date +'%s')
    
    if [[ -n "${!key:-}" ]]; then
        if [[ $current_time -gt ${!key} ]]; then
            # Backoff expired
            eval unset "$key"
            return 0
        else
            # Still in backoff
            return 1
        fi
    fi
    return 0
}

function setBackoff() {
    local key=$1
    local current_time=$(date +'%s')
    local backoff_duration=$(calculateBackoff "$key")
    local backoff_until=$((current_time + backoff_duration))
    
    eval "$key=$backoff_until"
    ((BACKOFF_LEVEL[$key]++))
    
    log_warn "Backoff set for $key until $backoff_until (level ${BACKOFF_LEVEL[$key]})"
}

function resetBackoff() {
    local key=$1
    BACKOFF_LEVEL[$key]=0
}

# ============================================================================
# STATS & MONITORING
# ============================================================================

function updateStats() {
    local app=$1
    local code=$2
    local app_name="${app%%.*}"
    
    ((APP_COUNTERS[$app_name]++))
    ((TOTAL_REQUESTS++))
    
    if [[ "$code" == "000" ]]; then
        ((APP_ERRORS[$app_name]++))
    fi
    
    # Write stats every 50 requests
    if (( (TOTAL_REQUESTS % 50) == 0 )); then
        writeStats
    fi
}

function writeStats() {
    cat > "$STATS_FILE" <<EOF
{
  "timestamp": $(date +%s),
  "client_id": "$CLIENTID",
  "total_requests": $TOTAL_REQUESTS,
  "requests_by_app": {
$(for app in "${!APP_COUNTERS[@]}"; do
    echo "    \"$app\": ${APP_COUNTERS[$app]},"
done | sed '$ s/,$//')
  },
  "errors_by_app": {
$(for app in "${!APP_ERRORS[@]}"; do
    echo "    \"$app\": ${APP_ERRORS[$app]:-0},"
done | sed '$ s/,$//')
  }
}
EOF
}

# ============================================================================
# TRAFFIC GENERATION
# ============================================================================

function makeRequest() {
    local interface=$1
    local app=$2
    local endpoint=$3
    local user_agent=$4
    
    local url="https://${app}${endpoint}"
    local trace_id="$(date +'%s')-${CLIENTID}"
    
    log_info "$CLIENTID requesting $url via $interface (traceid: $trace_id)"
    
    local curl_result
    curl_result=$(curl \
        --interface "$interface" \
        -H "User-Agent: $user_agent" \
        -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \
        -H "Accept-Language: en-US,en;q=0.9,fr;q=0.8" \
        -H "Cache-Control: no-cache" \
        -sL \
        -m "$MAX_TIMEOUT" \
        -w "%{http_code}|%{url_effective}" \
        -o /dev/null \
        "$url" 2>&1 || echo "000|curl_error")
    
    local curl_code="${curl_result%%|*}"
    local curl_url="${curl_result#*|}"
    
    echo "$curl_code|$curl_url"
}

# ============================================================================
# MAIN LOOP
# ============================================================================

function main() {
    log_info "Starting SD-WAN Traffic Generator - Client: $CLIENTID"
    
    # Ensure config exists
    if [[ ! -f "${CONFIG_DIR}/applications.txt" ]]; then
        log_error "Configuration file ${CONFIG_DIR}/applications.txt not found!"
        exit 1
    fi
    
    while true; do
        # Get random variables
        local interface=$(getRandomInterface)
        local user_agent=$(getRandomUserAgent)
        
        # Get weighted app selection
        local app_data=$(getWeightedApp)
        local app="${app_data%%|*}"
        local endpoint="${app_data#*|}"
        
        # Create backoff key
        local backoff_key=$(echo "${interface}_${app}" | tr '.:/-' '_')
        
        # Check if in backoff
        if ! checkBackoff "$backoff_key"; then
            log_info "$CLIENTID skipping $app (in backoff until ${!backoff_key})"
            sleep 1
            continue
        fi
        
        # Make request
        local result=$(makeRequest "$interface" "$app" "$endpoint" "$user_agent")
        local code="${result%%|*}"
        local url="${result#*|}"
        
        # Handle result
        if [[ "$code" == "000" ]]; then
            setBackoff "$backoff_key"
            log_error "$CLIENTID FAILED $url - code: $code"
        else
            resetBackoff "$backoff_key"
            log_info "$CLIENTID SUCCESS $url - code: $code"
        fi
        
        # Update stats
        updateStats "$app" "$code"
        
        # Sleep between requests
        sleep "$SLEEP_BETWEEN_REQUESTS"
    done
}

# ============================================================================
# INITIALIZATION
# ============================================================================

# Create directories if needed
mkdir -p "$CONFIG_DIR" "$LOG_DIR"

# Run main loop
main


