# DNS Security Testing: Sinkhole vs Block

## Executive Summary

When testing DNS security in Palo Alto Networks environments, choosing between **Sinkhole** and **Block** actions significantly impacts how effectively you can validate threat detection. This document outlines the key differences, measurement capabilities, and best practices for each approach.

---

## 1. Understanding DNS Sinkhole

### Definition

DNS sinkhole intercepts malicious DNS queries and returns a forged IP address instead of the legitimate domain resolution[1]. The client receives this fake IP and attempts to connect to it, which is then blocked by firewall rules.

### Palo Alto Networks Sinkhole IP Addresses

Palo Alto Networks provides default sinkhole IP addresses[1]:

- **Current IPv4**: 198.135.184.22 (updated from legacy 72.5.65.111)
- **FQDN**: sinkhole.paloaltonetworks.com (recommended - allows automatic IP updates)
- **IPv6**: ::1 (loopback address)

### How It Works

Client sends DNS query for malicious domain
↓
PAN firewall detects malicious domain
↓
Returns sinkhole IP (198.135.184.22) instead of real IP
↓
Client attempts connection to sinkhole IP
↓
Firewall rule blocks connection to sinkhole IP

### Advantages of Sinkhole

- **User-facing block page**: Can display custom block messages to end users[1]
- **Host identification**: Reveals which specific clients attempted to access malicious domains[1]
- **Threat intelligence**: Logs connection attempts for analysis and incident response
- **Graceful handling**: Clients receive a response before being blocked

### Limitations of Sinkhole

- **Complex testing**: Two-phase process (DNS response + connection attempt) complicates validation[1]
- **Measurement ambiguity**: Must verify if returned IP is the sinkhole IP, not a real address
- **Client confusion**: Some clients may timeout or retry multiple times
- **Configuration required**: Need firewall rules to block traffic to sinkhole IP[1]

---

## 2. Understanding DNS Block

### Definition

DNS block immediately denies the DNS query without returning any response. The client receives a DNS failure (NXDOMAIN or timeout) when attempting to resolve a malicious domain.

### How It Works

Client sends DNS query for malicious domain
↓
PAN firewall detects malicious domain
↓
Query is dropped (no response sent)
↓
Client receives DNS resolution failure

### Advantages of Block

- **Clear validation**: Binary pass/fail results - either you get a response or you don't[1]
- **Simple testing**: Single event makes scripting and automation easier
- **Unambiguous measurement**: No false IP addresses to confuse results
- **Single event logging**: One block event per query
- **Easier client-side measurement**: `nslookup` failures are immediate and obvious
- **No false positives**: Cannot confuse sinkhole IP with legitimate resolution

### Limitations of Block

- **No user notification**: Clients don't see a block page, just a DNS error
- **No host tracking**: Cannot easily log which clients attempted the query
- **Less graceful**: Clients may experience longer timeout periods
- **Limited intelligence**: Fewer details about blocked connection attempts

---

## 3. Comparison Matrix

| Aspect | Sinkhole | Block |
| --- | --- | --- |
| **DNS Response** | Forged IP (198.135.184.22) | No response (NXDOMAIN/timeout) |
| **Client Outcome** | Attempted connection blocked | DNS resolution fails |
| **Testing Simplicity** | Complex (2 phases) | Simple (1 phase) |
| **Measurement Clarity** | Ambiguous IP checking required | Binary (success/fail) |
| **User Visibility** | Can show block page | No notification |
| **Threat Intelligence** | Detailed (connection attempts logged) | Basic (query blocked) |
| **Scripting Ease** | Harder to automate | Easier to script |
| **False Positives** | Possible (IP confusion) | None (clear failure) |

---

## 4. Testing Methodology

### With Sinkhole (Current Approach)

# Query known malicious domain
nslookup malware.example.com

# Expected result: DNS returns 198.135.184.22 (or ::1 for IPv6)
# Answer: 198.135.184.22
# ↓
# This indicates: Domain was detected as malicious ✓

# Test with clean domain
nslookup google.com

# Expected result: DNS returns legitimate IP
# Answer: 142.251.xx.xx
# ↓
# This indicates: Domain is not flagged ✓

**Validation checks for sinkhole[1]**:
- [ ] Malicious domain returns sinkhole IP
- [ ] Clean domain returns real IP
- [ ] Sinkhole IP differs clearly from legitimate results
- [ ] Firewall logs show blocked connection to sinkhole IP

### With Block (Recommended for Testing)

# Query known malicious domain
nslookup malware.example.com

# Expected result: No response / NXDOMAIN
# ↓
# This indicates: Domain blocked ✓

# Test with clean domain
nslookup google.com

# Expected result: DNS resolves normally
# Answer: 142.251.xx.xx
# ↓
# This indicates: Domain is clean ✓

**Validation checks for block**:
- [ ] Malicious domain returns no response (NXDOMAIN or timeout)
- [ ] Clean domain resolves normally
- [ ] Firewall logs show DNS block event
- [ ] No false positives from IP confusion

---

## 5. Configuration Recommendations

### For Security Operations (SASE Teams)

**Recommended**: Use **Sinkhole** for production environments[1]

- Better user experience (block page)
- Enhanced threat intelligence from connection logs
- Identifies compromised hosts attempting malicious connections
- Better integration with Palo Alto Networks threat feeds

### For Security Testing & Validation

**Recommended**: Use **Block** for validation testing

- Clearer measurement results
- Easier to automate testing scripts
- Faster feedback loops
- Simpler log analysis

### Migration from Old to New Sinkhole IP

If using static sinkhole IPs, update configuration[1]:

- **Old IP**: 72.5.65.111 (legacy)
- **New IP**: 198.135.184.22 (current)
- **Best practice**: Use FQDN `sinkhole.paloaltonetworks.com` instead of static IP (allows automatic updates)

---

## 6. Palo Alto Networks Best Practices

### Sinkhole Configuration Steps[1]

1. Define sinkhole IP in DNS Security profile
2. Create security policy rule with action: "Sinkhole"
3. Create separate firewall rule to block traffic destined to sinkhole IP
4. Enable logging for both DNS and Application layers
5. Create separate security zone for sinkhole traffic (optional but recommended)

### Testing Validation[1]

Policy Configuration:
├─ DNS Security Profile: Action = Sinkhole
├─ Sinkhole IP: sinkhole.paloaltonetworks.com
├─ Security Rule: Action = Sinkhole
└─ Block Rule: Drop traffic to 198.135.184.22

Validation:
├─ Malicious domain → nslookup returns 198.135.184.22
├─ Clean domain → nslookup returns real IP
├─ Connection attempt → Blocked by sinkhole rule
└─ Logs show → DNS block + App block events

---

## 7. Decision Tree

Are you testing DNS security?
│
├─ YES, for production deployment
│  └─→ Use SINKHOLE
│      └─ Better user experience
│      └─ Better threat intelligence
│      └─ Identify compromised hosts
│
└─ YES, for validation/measurement
   └─→ Use BLOCK
      └─ Clearer results
      └─ Easier to measure
      └─ Simpler to automate
      └─ No IP confusion

---

## 8. Key Takeaways

1. **Sinkhole IP (198.135.184.22)** = Domain detected as malicious[1]
   - No response to query = Better for testing clarity
   - Domain blocked = Security working correctly

2. **For client-side measurement**: Block provides binary validation
   - Query fails → Threat blocked ✓
   - Query succeeds → Domain clean ✓

3. **For SASE/security operations**: Sinkhole provides better user experience and threat intelligence[1]

4. **Configuration consideration**: Use FQDN not static IP[1]
   - `sinkhole.paloaltonetworks.com` (recommended)
   - `198.135.184.22` (current, manual updates needed)
   - `72.5.65.111` (legacy, deprecated)

5. **Testing best practice**: Use block action for validation, sinkhole for production

---

## References

[1] Palo Alto Networks. (2025). New Update in Palo Alto Networks Hosted Sinkhole IP Address. https://live.paloaltonetworks.com/t5/community-blogs/new-update-in-palo-alto-networks-hosted-sinkhole-ip-address/ba-p/1224043

[2] Huntress. (2025). DNS Sinkholing in Cybersecurity: How It Blocks Threats. https://www.huntress.com/cybersecurity-101/topic/dns-sinkholing

[3] Netskope Community. (2025). Implementing and Verifying DNS Security Measures. https://community.netskope.com/dns-security-104/implementing-and-verifying-dns-security-measures-7081

[4] IP With Ease. (2025). How to configure DNS Sinkhole: Palo Alto Networks. https://ipwithease.com/how-to-configure-dns-sinkhole-palo-alto-networks/

[5] CERT-FR. (2014). DNS Sinkholing. https://www.cert.ssi.gouv.fr/actualite/CERTFR-2014-ACT-052/
