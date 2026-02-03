# IoT Device Profile Generator

🏭 **Générateur de profils d'appareils IoT pour tests de sécurité Palo Alto Networks**

Ce script Python génère des fichiers JSON contenant des profils d'appareils IoT réalistes, optimisés pour tester **Palo Alto IoT Security** (Prisma Access) et le **SD-WAN Traffic Generator**.

## 📋 Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Installation](#installation)
- [Utilisation](#utilisation)
- [Options](#options)
- [Exemples](#exemples)
- [Catégories d'appareils](#catégories-dappareils)
- [Format de sortie](#format-de-sortie)
- [Cas d'usage](#cas-dusage)
- [Protocoles simulés](#protocoles-simulés)

---

## ✨ Fonctionnalités

- **121 modèles d'appareils IoT** réels (Hikvision, Philips Hue, Xiaomi, Amazon Echo, etc.)
- **13 catégories** d'appareils (caméras, capteurs, éclairage intelligent, etc.)
- **4 presets** prédéfinis (small, medium, large, enterprise)
- **Configuration personnalisée** par catégorie
- **Protocoles IoT réalistes** (MQTT, RTSP, mDNS, Modbus, SNMP, etc.)
- **Adresses MAC et IP uniques** pour chaque appareil
- Compatible avec **SD-WAN Traffic Generator**
- Optimisé pour **Palo Alto IoT Security**

---

## 🚀 Installation

### Prérequis

- Python 3.7 ou supérieur
- Aucune dépendance externe (bibliothèques standard uniquement)

### Téléchargement

```bash
# Cloner le repository
git clone https://github.com/jsuzanne/sdwan-traffic-generator-web.git
cd sdwan-traffic-generator-web

# Ou télécharger directement le script
wget https://raw.githubusercontent.com/jsuzanne/sdwan-traffic-generator-web/main/generate_iot_devices.py
chmod +x generate_iot_devices.py
```

---

## 📖 Utilisation

### Syntaxe de base

```bash
python generate_iot_devices.py [OPTIONS]
```

### Afficher l'aide

```bash
python generate_iot_devices.py --help
```

### Lister les catégories disponibles

```bash
python generate_iot_devices.py --list-categories
```

---

## ⚙️ Options

| Option | Alias | Description | Valeur par défaut |
|--------|-------|-------------|-------------------|
| `--preset` | - | Configuration prédéfinie (`small`, `medium`, `large`, `enterprise`) | - |
| `--custom` | - | Configuration personnalisée `"Catégorie:N,Catégorie:N"` | - |
| `--output` | `-o` | Nom du fichier de sortie | `iot-devices-{preset}.json` |
| `--base-ip` | - | Les 3 premiers octets de l'IP (ex: `192.168.207`) | `192.168.207` |
| `--start-ip` | - | Dernier octet de départ (1-254) | `50` |
| `--list-categories` | - | Affiche les catégories disponibles | - |
| `--help` | `-h` | Affiche l'aide complète | - |

### Règles importantes

- ⚠️ `--preset` et `--custom` sont **mutuellement exclusifs**
- ⚠️ Au moins l'un des deux doit être spécifié
- ⚠️ Les noms de catégories sont **sensibles à la casse**
- ⚠️ Utiliser des **guillemets** pour `--custom` si espaces dans les noms

---

## 💡 Exemples

### Exemple 1 : Configuration simple

Générer un lab de test avec 30 appareils :

```bash
python generate_iot_devices.py --preset small
```

**Sortie :** `iot-devices-small.json` (29 appareils)

---

### Exemple 2 : Lab PME

Générer un environnement PME avec 65 appareils et nom personnalisé :

```bash
python generate_iot_devices.py --preset medium --output lab-pme.json
```

**Sortie :** `lab-pme.json` (64 appareils)

---

### Exemple 3 : Configuration personnalisée

Créer un lab focalisé sur la surveillance (caméras + capteurs) :

```bash
python generate_iot_devices.py --custom "Security Cameras:20,Sensors:30,Smart Lighting:10"
```

**Sortie :** `iot-devices-custom.json` (60 appareils)

---

### Exemple 4 : Changer le réseau IP

Générer un lab avec un réseau spécifique (10.20.30.x) :

```bash
python generate_iot_devices.py --preset large --base-ip 10.20.30 --start-ip 100
```

**IPs générées :** 10.20.30.100, 10.20.30.101, ... 10.20.30.209

---

### Exemple 5 : Configuration avancée

Créer un lab de sécurité complet :

```bash
python generate_iot_devices.py \
  --custom "Security Cameras:25,Sensors:35,Smart Locks & Doorbells:10,Hubs & Bridges:5" \
  --base-ip 192.168.100 \
  --start-ip 50 \
  --output lab-securite-avance.json
```

**Sortie :** `lab-securite-avance.json` (75 appareils sur 192.168.100.50-124)

---

### Exemple 6 : Lab entreprise complet

Générer un environnement campus/industrie avec 170 appareils :

```bash
python generate_iot_devices.py --preset enterprise --base-ip 10.10.10 --output campus-iot.json
```

**Sortie :** `campus-iot.json` (169 appareils incluant PLCs industriels)

---

## 📦 Catégories d'appareils

Le script supporte **13 catégories** avec **121 modèles** d'appareils :

| # | Catégorie | Vendors | Modèles | Exemples |
|---|-----------|---------|---------|----------|
| 1 | **Smart Lighting** | Philips, LIFX, TP-Link, Yeelight | 17 | Hue White A19, LIFX Mini Color |
| 2 | **Smart Plugs & Switches** | TP-Link, Meross, Sonoff, Shelly | 13 | Kasa HS100, Sonoff Mini R2 |
| 3 | **Security Cameras** | Hikvision, Axis, Dahua, Arlo, Ring | 10 | DS-2CD2042FWD, Arlo Pro 3 |
| 4 | **Smart Speakers & Displays** | Amazon, Google, Sonos | 11 | Echo Dot 5th Gen, Nest Hub |
| 5 | **Sensors** | Xiaomi, Aqara, Samsung | 9 | LYWSD03MMC Temp, Motion P1 |
| 6 | **Thermostats & HVAC** | Google, Ecobee, Honeywell | 6 | Nest Learning, Ecobee SmartThermostat |
| 7 | **Smart TVs & Streaming** | Samsung, LG, Roku, Apple | 10 | OLED C2, Apple TV 4K |
| 8 | **Smart Locks & Doorbells** | Ring, August, Yale | 5 | Video Doorbell Pro 2, August Smart Lock |
| 9 | **Smart Appliances** | Samsung, LG, iRobot | 7 | Family Hub Fridge, Roomba j7+ |
| 10 | **Printers & Office** | HP, Epson, Canon | 7 | OfficeJet Pro 9015e, EcoTank ET-4760 |
| 11 | **Hubs & Bridges** | Philips, Samsung, Hubitat | 4 | Hue Bridge v2, SmartThings Hub |
| 12 | **Medical Devices** | Fitbit, Withings | 4 | Charge 5 Dock, Body+ Scale |
| 13 | **Industrial IoT** | Siemens, Schneider, Rockwell | 6 | SIMATIC S7-1200 PLC, Modicon M221 |

---

## 📊 Presets prédéfinis

### 🧪 Small (~30 appareils)
Idéal pour : **Lab de test, développement**

```
Smart Lighting          : 5
Smart Plugs & Switches  : 5
Security Cameras        : 3
Smart Speakers          : 3
Sensors                 : 5
Thermostats             : 2
Smart TVs               : 2
Printers                : 2
Hubs & Bridges          : 2
```

---

### 🏢 Medium (~65 appareils)
Idéal pour : **PME, démo client**

```
Smart Lighting          : 10
Smart Plugs & Switches  : 10
Security Cameras        : 6
Smart Speakers          : 5
Sensors                 : 10
Thermostats             : 4
Smart TVs               : 4
Smart Locks             : 3
Smart Appliances        : 4
Printers                : 5
Hubs & Bridges          : 3
```

---

### 🏭 Large (~110 appareils)
Idéal pour : **Grande entreprise, campus**

```
Smart Lighting          : 15
Smart Plugs & Switches  : 15
Security Cameras        : 10
Smart Speakers          : 8
Sensors                 : 20
Thermostats             : 6
Smart TVs               : 6
Smart Locks             : 5
Smart Appliances        : 8
Printers                : 8
Hubs & Bridges          : 5
Medical Devices         : 4
```

---

### 🏗️ Enterprise (~170 appareils)
Idéal pour : **Campus, environnement industriel**

```
Smart Lighting          : 20
Smart Plugs & Switches  : 20
Security Cameras        : 15
Smart Speakers          : 10
Sensors                 : 30
Thermostats             : 10
Smart TVs               : 8
Smart Locks             : 8
Smart Appliances        : 10
Printers                : 15
Hubs & Bridges          : 8
Medical Devices         : 5
Industrial IoT          : 10  ← PLCs, SCADA
```

---

## 📄 Format de sortie

### Structure JSON

```json
{
  "devices": [
    {
      "id": "hikvision_security_camera_01",
      "name": "Hikvision DS-2CD2042FWD",
      "vendor": "Hikvision",
      "type": "Security Camera",
      "mac": "00:12:34:00:00:00",
      "ip_start": "192.168.207.50",
      "protocols": ["dhcp", "arp", "lldp", "snmp", "http", "rtsp", "cloud", "dns", "ntp"],
      "enabled": true,
      "traffic_interval": 120,
      "description": "Hikvision DS-2CD2042FWD - Security Cameras"
    },
    {
      "id": "xiaomi_sensor_01",
      "name": "Xiaomi LYWSD03MMC Temp",
      "vendor": "Xiaomi",
      "type": "Sensor",
      "mac": "4c:65:a8:01:00:01",
      "ip_start": "192.168.207.51",
      "protocols": ["dhcp", "arp", "lldp", "snmp", "mqtt", "cloud", "dns"],
      "enabled": true,
      "traffic_interval": 180,
      "mqtt_topic": "iot/sensors/xiaomi_sensor_01",
      "description": "Xiaomi LYWSD03MMC Temp - Sensors"
    }
  ]
}
```

### Champs par appareil

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant unique (format: `vendor_category_XX`) |
| `name` | string | Nom complet du modèle |
| `vendor` | string | Fabricant |
| `type` | string | Type d'appareil (catégorie sans 's') |
| `mac` | string | Adresse MAC unique |
| `ip_start` | string | Adresse IP suggérée |
| `protocols` | array | Liste des protocoles simulés |
| `enabled` | boolean | Actif par défaut (toujours `true`) |
| `traffic_interval` | integer | Intervalle de trafic en secondes (60-300) |
| `description` | string | Description complète |
| `mqtt_topic` | string | Topic MQTT (optionnel, si protocole MQTT) |

---

## 🎯 Cas d'usage

### 1. Test de segmentation IoT
```bash
python generate_iot_devices.py --preset medium
```
→ Importer dans SD-WAN Traffic Generator  
→ Vérifier que les appareils IoT sont placés dans le bon VLAN/VRF

---

### 2. Validation de politiques de sécurité
```bash
python generate_iot_devices.py --custom "Security Cameras:15,Sensors:20"
```
→ Tester les règles firewall  
→ Vérifier le blocage des communications inter-IoT

---

### 3. Détection d'appareils par IoT Security
```bash
python generate_iot_devices.py --preset enterprise
```
→ Vérifier que Prisma Access/IoT Security identifie correctement chaque appareil  
→ Valider la classification automatique par vendor/type

---

### 4. Test de failover SD-WAN
```bash
python generate_iot_devices.py --preset large --base-ip 10.10.10
```
→ Simuler 110 appareils IoT sensibles à la latence  
→ Tester le comportement lors de bascule de circuit

---

### 5. Lab de formation/démo
```bash
python generate_iot_devices.py --preset small --output demo-formation.json
```
→ Environnement reproductible pour formations  
→ 30 appareils représentatifs de tous les types

---

## 🔌 Protocoles simulés

Chaque appareil génère du trafic réaliste selon son type :

### Layer 2/3
- **DHCP** : Demande et renouvellement d'adresse IP
- **ARP** : Résolution MAC/IP
- **LLDP** : Discovery protocol (switches/routers)

### Management
- **SNMP** : Monitoring et gestion (v2c/v3)
- **HTTP/HTTPS** : Interface web de configuration

### IoT Specific
- **MQTT** : Telemetry pour capteurs et switches (Xiaomi, Sonoff)
- **mDNS** : Service discovery (Apple, Sonos, printers)
- **RTSP** : Streaming vidéo (caméras IP)
- **Modbus** : Protocole industriel (PLCs, SCADA)
- **EtherNet/IP** : Automation industrielle (Rockwell)

### Cloud
- **Cloud heartbeats** : Connexions périodiques vers vendors (Philips, Amazon, Google)

### Time Sync
- **NTP** : Synchronisation temporelle

---

## 🔗 Intégration avec SD-WAN Traffic Generator

### Étape 1 : Générer le fichier
```bash
python generate_iot_devices.py --preset medium
```

### Étape 2 : Importer dans l'interface web
1. Ouvrir le dashboard SD-WAN Traffic Generator (`http://localhost:8080`)
2. Onglet **IoT Devices**
3. Cliquer sur **Import JSON**
4. Sélectionner `iot-devices-medium.json`
5. Valider l'import

### Étape 3 : Démarrer la simulation
- Les appareils effectueront des requêtes DHCP réelles
- Répondront aux ARP requests avec leur MAC spoofée
- Généreront du trafic cloud/MQTT selon les protocoles configurés

### Étape 4 : Monitoring dans Palo Alto
- Vérifier la détection dans **IoT Security**
- Analyser les logs dans **Monitor > Traffic**
- Valider la classification automatique

---

## 🛠️ Développement et personnalisation

### Ajouter une nouvelle catégorie

Éditer le dictionnaire `IOT_DATABASE` dans le script :

```python
"Ma Catégorie": [
    {
        "vendor": "Mon Vendor",
        "models": ["Modèle A", "Modèle B"],
        "mac_prefix": "aa:bb:cc",
        "protocols": ["dhcp", "arp", "http", "dns"]
    }
]
```

### Ajouter un nouveau vendor

```python
"Smart Lighting": [
    # ... entrées existantes ...
    {
        "vendor": "Nouveau Vendor",
        "models": ["Smart Bulb X1", "LED Strip Y2"],
        "mac_prefix": "dd:ee:ff",
        "protocols": ["dhcp", "arp", "http", "cloud", "dns"]
    }
]
```

---

## 📝 Licence

Ce script fait partie du projet **SD-WAN Traffic Generator** développé pour les labs et démonstrations Palo Alto Networks.

---

## 👤 Auteur

**Jean Suzanne**  
SASE Specialist @ Palo Alto Networks  
Ex-Cisco (21 ans)

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour ajouter des modèles d'appareils ou de nouveaux vendors :

1. Fork le repository
2. Créer une branche (`git checkout -b feature/nouveau-vendor`)
3. Éditer `IOT_DATABASE` dans le script
4. Commit et push
5. Ouvrir une Pull Request

---

## 📚 Documentation connexe

- [SD-WAN Traffic Generator](https://github.com/jsuzanne/sdwan-traffic-generator-web)
- [IoT Simulation Guide](IOT_SIMULATION.md)
- [Palo Alto IoT Security Documentation](https://docs.paloaltonetworks.com/iot)

---

## ⚡ Quick Start (TL;DR)

```bash
# Installation
git clone https://github.com/jsuzanne/sdwan-traffic-generator-web.git
cd sdwan-traffic-generator-web

# Générer 65 appareils IoT
python generate_iot_devices.py --preset medium

# Importer dans SD-WAN Traffic Generator
# → Dashboard IoT Tab → Import JSON → Sélectionner iot-devices-medium.json

# Profit! 🎉
```

---

**🔥 Pro Tip :** Pour des démos clients, utiliser `--custom` pour cibler exactement leurs use cases (ex: beaucoup de caméras pour un campus, capteurs industriels pour une usine).
