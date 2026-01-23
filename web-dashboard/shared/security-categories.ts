// Palo Alto Networks URL Filtering Test Categories
// Source: https://knowledgebase.paloaltonetworks.com/KCSArticleDetail?id=kA10g000000ClaDCAS

export interface URLCategory {
    id: string;
    name: string;
    url: string;
}

export const URL_CATEGORIES: URLCategory[] = [
    { id: 'abortion', name: 'Abortion', url: 'http://urlfiltering.paloaltonetworks.com/test-abortion' },
    { id: 'abused-drugs', name: 'Abused Drugs', url: 'http://urlfiltering.paloaltonetworks.com/test-abused-drugs' },
    { id: 'adult', name: 'Adult Content', url: 'http://urlfiltering.paloaltonetworks.com/test-adult' },
    { id: 'alcohol-tobacco', name: 'Alcohol and Tobacco', url: 'http://urlfiltering.paloaltonetworks.com/test-alcohol-tobacco' },
    { id: 'auctions', name: 'Auctions', url: 'http://urlfiltering.paloaltonetworks.com/test-auctions' },
    { id: 'business-economy', name: 'Business and Economy', url: 'http://urlfiltering.paloaltonetworks.com/test-business-economy' },
    { id: 'computer-info', name: 'Computer and Internet Info', url: 'http://urlfiltering.paloaltonetworks.com/test-computer-info' },
    { id: 'content-delivery', name: 'Content Delivery Networks', url: 'http://urlfiltering.paloaltonetworks.com/test-content-delivery' },
    { id: 'copyright-infringement', name: 'Copyright Infringement', url: 'http://urlfiltering.paloaltonetworks.com/test-copyright-infringement' },
    { id: 'cryptocurrency', name: 'Cryptocurrency', url: 'http://urlfiltering.paloaltonetworks.com/test-cryptocurrency' },
    { id: 'dating', name: 'Dating', url: 'http://urlfiltering.paloaltonetworks.com/test-dating' },
    { id: 'dynamic-dns', name: 'Dynamic DNS', url: 'http://urlfiltering.paloaltonetworks.com/test-dynamic-dns' },
    { id: 'educational', name: 'Educational Institutions', url: 'http://urlfiltering.paloaltonetworks.com/test-educational' },
    { id: 'entertainment', name: 'Entertainment and Arts', url: 'http://urlfiltering.paloaltonetworks.com/test-entertainment' },
    { id: 'extremism', name: 'Extremism', url: 'http://urlfiltering.paloaltonetworks.com/test-extremism' },
    { id: 'financial', name: 'Financial Services', url: 'http://urlfiltering.paloaltonetworks.com/test-financial' },
    { id: 'gambling', name: 'Gambling', url: 'http://urlfiltering.paloaltonetworks.com/test-gambling' },
    { id: 'games', name: 'Games', url: 'http://urlfiltering.paloaltonetworks.com/test-games' },
    { id: 'government', name: 'Government', url: 'http://urlfiltering.paloaltonetworks.com/test-government' },
    { id: 'hacking', name: 'Hacking', url: 'http://urlfiltering.paloaltonetworks.com/test-hacking' },
    { id: 'health-medicine', name: 'Health and Medicine', url: 'http://urlfiltering.paloaltonetworks.com/test-health-medicine' },
    { id: 'home-garden', name: 'Home and Garden', url: 'http://urlfiltering.paloaltonetworks.com/test-home-garden' },
    { id: 'hunting-fishing', name: 'Hunting and Fishing', url: 'http://urlfiltering.paloaltonetworks.com/test-hunting-fishing' },
    { id: 'insufficient-content', name: 'Insufficient Content', url: 'http://urlfiltering.paloaltonetworks.com/test-insufficient-content' },
    { id: 'internet-communications', name: 'Internet Communications and Telephony', url: 'http://urlfiltering.paloaltonetworks.com/test-internet-communications' },
    { id: 'internet-portals', name: 'Internet Portals', url: 'http://urlfiltering.paloaltonetworks.com/test-internet-portals' },
    { id: 'job-search', name: 'Job Search', url: 'http://urlfiltering.paloaltonetworks.com/test-job-search' },
    { id: 'legal', name: 'Legal', url: 'http://urlfiltering.paloaltonetworks.com/test-legal' },
    { id: 'malware', name: 'Malware', url: 'http://urlfiltering.paloaltonetworks.com/test-malware' },
    { id: 'military', name: 'Military', url: 'http://urlfiltering.paloaltonetworks.com/test-military' },
    { id: 'motor-vehicles', name: 'Motor Vehicles', url: 'http://urlfiltering.paloaltonetworks.com/test-motor-vehicles' },
    { id: 'music', name: 'Music', url: 'http://urlfiltering.paloaltonetworks.com/test-music' },
    { id: 'newly-registered', name: 'Newly Registered Domain', url: 'http://urlfiltering.paloaltonetworks.com/test-newly-registered' },
    { id: 'news', name: 'News', url: 'http://urlfiltering.paloaltonetworks.com/test-news' },
    { id: 'nudity', name: 'Nudity', url: 'http://urlfiltering.paloaltonetworks.com/test-nudity' },
    { id: 'online-storage', name: 'Online Storage and Backup', url: 'http://urlfiltering.paloaltonetworks.com/test-online-storage' },
    { id: 'parked', name: 'Parked', url: 'http://urlfiltering.paloaltonetworks.com/test-parked' },
    { id: 'peer-to-peer', name: 'Peer-to-Peer', url: 'http://urlfiltering.paloaltonetworks.com/test-peer-to-peer' },
    { id: 'personal-sites', name: 'Personal Sites and Blogs', url: 'http://urlfiltering.paloaltonetworks.com/test-personal-sites' },
    { id: 'philosophy-political', name: 'Philosophy and Political Advocacy', url: 'http://urlfiltering.paloaltonetworks.com/test-philosophy-political' },
    { id: 'phishing', name: 'Phishing', url: 'http://urlfiltering.paloaltonetworks.com/test-phishing' },
    { id: 'private-ip', name: 'Private IP Addresses', url: 'http://urlfiltering.paloaltonetworks.com/test-private-ip' },
    { id: 'proxy-avoidance', name: 'Proxy Avoidance and Anonymizers', url: 'http://urlfiltering.paloaltonetworks.com/test-proxy-avoidance' },
    { id: 'questionable', name: 'Questionable', url: 'http://urlfiltering.paloaltonetworks.com/test-questionable' },
    { id: 'real-estate', name: 'Real Estate', url: 'http://urlfiltering.paloaltonetworks.com/test-real-estate' },
    { id: 'recreation-hobbies', name: 'Recreation and Hobbies', url: 'http://urlfiltering.paloaltonetworks.com/test-recreation-hobbies' },
    { id: 'reference-research', name: 'Reference and Research', url: 'http://urlfiltering.paloaltonetworks.com/test-reference-research' },
    { id: 'religion', name: 'Religion', url: 'http://urlfiltering.paloaltonetworks.com/test-religion' },
    { id: 'search-engines', name: 'Search Engines', url: 'http://urlfiltering.paloaltonetworks.com/test-search-engines' },
    { id: 'sex-education', name: 'Sex Education', url: 'http://urlfiltering.paloaltonetworks.com/test-sex-education' },
    { id: 'shareware-freeware', name: 'Shareware and Freeware', url: 'http://urlfiltering.paloaltonetworks.com/test-shareware-freeware' },
    { id: 'shopping', name: 'Shopping', url: 'http://urlfiltering.paloaltonetworks.com/test-shopping' },
    { id: 'social-networking', name: 'Social Networking', url: 'http://urlfiltering.paloaltonetworks.com/test-social-networking' },
    { id: 'society', name: 'Society', url: 'http://urlfiltering.paloaltonetworks.com/test-society' },
    { id: 'sports', name: 'Sports', url: 'http://urlfiltering.paloaltonetworks.com/test-sports' },
    { id: 'stock-advice', name: 'Stock Advice and Tools', url: 'http://urlfiltering.paloaltonetworks.com/test-stock-advice' },
    { id: 'streaming-media', name: 'Streaming Media', url: 'http://urlfiltering.paloaltonetworks.com/test-streaming-media' },
    { id: 'swimsuits', name: 'Swimsuits and Intimate Apparel', url: 'http://urlfiltering.paloaltonetworks.com/test-swimsuits' },
    { id: 'training-tools', name: 'Training and Tools', url: 'http://urlfiltering.paloaltonetworks.com/test-training-tools' },
    { id: 'translation', name: 'Translation', url: 'http://urlfiltering.paloaltonetworks.com/test-translation' },
    { id: 'travel', name: 'Travel', url: 'http://urlfiltering.paloaltonetworks.com/test-travel' },
    { id: 'unknown', name: 'Unknown', url: 'http://urlfiltering.paloaltonetworks.com/test-unknown' },
    { id: 'weapons', name: 'Weapons', url: 'http://urlfiltering.paloaltonetworks.com/test-weapons' },
    { id: 'web-ads', name: 'Web Advertisements', url: 'http://urlfiltering.paloaltonetworks.com/test-web-ads' },
    { id: 'web-email', name: 'Web-based Email', url: 'http://urlfiltering.paloaltonetworks.com/test-web-email' },
    { id: 'web-hosting', name: 'Web Hosting', url: 'http://urlfiltering.paloaltonetworks.com/test-web-hosting' },
];

// DNS Security Test Domains
// Source: https://docs.paloaltonetworks.com/dns-security/administration/configure-dns-security/dns-security-test-domains

export interface DNSTestDomain {
    id: string;
    domain: string;
    name: string;
    category: 'basic' | 'advanced';
}

export const DNS_TEST_DOMAINS: DNSTestDomain[] = [
    // Basic DNS Security Tests
    { id: 'dns-tunneling', domain: 'test-dnstun.testpanw.com', name: 'DNS Tunneling', category: 'basic' },
    { id: 'ddns', domain: 'test-ddns.testpanw.com', name: 'Dynamic DNS', category: 'basic' },
    { id: 'malware', domain: 'test-malware.testpanw.com', name: 'Malware', category: 'basic' },
    { id: 'nrd', domain: 'test-nrd.testpanw.com', name: 'Newly Registered Domains', category: 'basic' },
    { id: 'phishing', domain: 'test-phishing.testpanw.com', name: 'Phishing', category: 'basic' },
    { id: 'grayware', domain: 'test-grayware.testpanw.com', name: 'Grayware', category: 'basic' },
    { id: 'parked', domain: 'test-parked.testpanw.com', name: 'Parked', category: 'basic' },
    { id: 'proxy', domain: 'test-proxy.testpanw.com', name: 'Proxy Avoidance', category: 'basic' },
    { id: 'fastflux', domain: 'test-fastflux.testpanw.com', name: 'Fast Flux', category: 'basic' },
    { id: 'malicious-nrd', domain: 'test-malicious-nrd.testpanw.com', name: 'Malicious NRD', category: 'basic' },
    { id: 'nxns', domain: 'test-nxns.testpanw.com', name: 'NXNS Attack', category: 'basic' },
    { id: 'dangling', domain: 'test-dangling-domain.testpanw.com', name: 'Dangling Domain', category: 'basic' },
    { id: 'dns-rebinding', domain: 'test-dns-rebinding.testpanw.com', name: 'DNS Rebinding', category: 'basic' },
    { id: 'dns-infiltration', domain: 'test-dns-infiltration.testpanw.com', name: 'DNS Infiltration', category: 'basic' },
    { id: 'wildcard-abuse', domain: 'test-wildcard-abuse.testpanw.com', name: 'Wildcard Abuse', category: 'basic' },

    // Advanced DNS Security Tests
    { id: 'strategically-aged', domain: 'test-strategically-aged.testpanw.com', name: 'Strategically-Aged', category: 'advanced' },
    { id: 'compromised-dns', domain: 'test-compromised-dns.testpanw.com', name: 'Compromised DNS', category: 'advanced' },
    { id: 'adtracking', domain: 'test-adtracking.testpanw.com', name: 'Ad Tracking', category: 'advanced' },
    { id: 'cname-cloaking', domain: 'test-cname-cloaking.testpanw.com', name: 'CNAME Cloaking', category: 'advanced' },
    { id: 'ransomware', domain: 'test-ransomware.testpanw.com', name: 'Ransomware', category: 'advanced' },
    { id: 'stockpile', domain: 'test-stockpile-domain.testpanw.com', name: 'Stockpile', category: 'advanced' },
    { id: 'cybersquatting', domain: 'test-squatting.testpanw.com', name: 'Cybersquatting', category: 'advanced' },
    { id: 'subdomain-reputation', domain: 'test-subdomain-reputation.testpanw.com', name: 'Subdomain Reputation', category: 'advanced' },
    { id: 'dnsmisconfig-claimable', domain: 'test-dnsmisconfig-claimable-nx.testpanw.com', name: 'DNS Misconfiguration (Claimable)', category: 'advanced' },
];
