Voici un prompt structuré pour Anthropic Claude (Antigravity) afin de modifier la partie voice call et exposer ces métriques dans l'UX :

text
# Contexte
Je travaille sur un générateur de trafic SD-WAN avec dashboard web (React + Node.js). 
Le projet se trouve ici : https://github.com/jsuzanne/sdwan-traffic-generator-web

## Architecture actuelle
- **Backend**: Node.js/Express avec orchestrateur d'appels VoIP
- **Frontend**: React (TypeScript) avec dashboard temps réel
- **Moteur RTP**: Script Python (rtp.py) qui génère des appels voix simulés
- **Format actuel des métriques**: JSON avec `loss_pct`, `avg_rtt_ms`, `max_rtt_ms`, `jitter_ms`

## Objectif
Améliorer la collecte et l'affichage des métriques VoIP pour distinguer les performances directionnelles (TX/RX), essentielles pour le troubleshooting SD-WAN et Prisma Access.

# Tâches à réaliser

## 1. Backend - Modification du moteur RTP (rtp.py)

**Fichier**: `engines/rtp.py`

**Modifications requises**:
- Séparer le calcul du jitter en deux métriques distinctes:
  - `jitter_tx_ms`: Variance de timing à l'envoi (outbound path)
  - `jitter_rx_ms`: Variance à la réception (inbound path)
- Enrichir les métriques RTT avec min/max en plus de avg
- Modifier la classe `VoiceMetrics` pour tracker séparément:
  - TX jitter: inter-packet send time variance
  - RX jitter: inter-packet arrival time variance (RFC 3550)
- Mettre à jour le JSON de sortie `RESULT:` avec le nouveau format

**Format JSON de sortie attendu**:
```json
{
  "call_id": "call-123",
  "sent": 4500,
  "received": 4495,
  "loss_pct": 0.11,
  "rtt_avg_ms": 45.23,
  "rtt_max_ms": 89.50,
  "rtt_min_ms": 32.10,
  "jitter_tx_ms": 2.15,
  "jitter_rx_ms": 3.42,
  "duration": 135.2
}
2. Backend - Orchestrator (server.js)
Fichier: server.js (ou le fichier gérant les appels VoIP)

Modifications requises:

Parser les nouvelles métriques jitter_tx_ms, jitter_rx_ms, rtt_min_ms, rtt_max_ms

Stocker ces métriques dans l'historique des appels

Exposer via l'API REST existante (probablement /api/voice/stats ou similaire)

Assurer la rétrocompatibilité avec les anciens résultats qui n'ont qu'un seul jitter_ms

3. Frontend - Types TypeScript
Fichier: web-dashboard/src/types/voice.ts (ou équivalent)

Créer/Modifier l'interface:

typescript
interface VoiceCallMetrics {
  call_id: string;
  sent: number;
  received: number;
  loss_pct: number;
  rtt: {
    avg_ms: number;
    max_ms: number;
    min_ms: number;
  };
  jitter: {
    tx_ms: number;  // Outbound path jitter
    rx_ms: number;  // Inbound path jitter
  };
  duration: number;
  timestamp?: number;
}
4. Frontend - Dashboard Voice Calls
Fichier: web-dashboard/src/components/VoiceCalls.tsx (ou équivalent)

Modifications UI requises:

A. Section de statistiques en temps réel
Ajouter des cartes (cards) distinctes pour:

RTT Card: Afficher avg, min, max avec indicateur de qualité (vert < 150ms, orange < 300ms, rouge > 300ms)

Jitter TX Card: Afficher jitter outbound avec icône ↑ et label "Jitter TX (Outbound)"

Jitter RX Card: Afficher jitter inbound avec icône ↓ et label "Jitter RX (Inbound)"

Packet Loss Card: Maintenir l'affichage actuel

B. Graphiques temps réel
Si vous avez des graphiques, ajouter:

Courbe RTT avec min/max bands (zone grisée)

Deux courbes séparées pour Jitter TX et Jitter RX sur le même graphe

C. Tableau historique des appels
Modifier les colonnes pour afficher:

text
| Call ID | Duration | Loss % | RTT (avg) | RTT (max) | Jitter TX | Jitter RX | Status |
D. Tooltips et aide contextuelle
Ajouter des tooltips explicatifs:

Jitter TX: "Variance de timing à l'envoi. Indique des problèmes locaux ou sur le path uplink"

Jitter RX: "Variance à la réception. Indique des problèmes sur le path retour ou distant"

RTT: "Round Trip Time bidirectionnel"

5. Indicateurs de qualité visuels
Implémenter des badges colorés selon les seuils recommandés pour VoIP:

RTT:

✅ Excellent: < 150ms (vert)

⚠️ Acceptable: 150-300ms (orange)

❌ Mauvais: > 300ms (rouge)

Jitter (TX et RX):

✅ Excellent: < 30ms (vert)

⚠️ Acceptable: 30-50ms (orange)

❌ Mauvais: > 50ms (rouge)

Packet Loss:

✅ Excellent: < 1% (vert)

⚠️ Acceptable: 1-3% (orange)

❌ Mauvais: > 3% (rouge)

6. API Documentation
Mettre à jour la documentation (si elle existe dans /docs ou README) pour refléter:

Le nouveau format JSON des résultats d'appels

L'explication de chaque métrique directionnelle

Les cas d'usage de troubleshooting (TX high = uplink issue, RX high = downlink issue)

Contraintes techniques
Maintenir la rétrocompatibilité avec les logs existants

Assurer que le frontend gère gracieusement l'absence des nouvelles métriques (anciens appels)

Conserver le format JSONL pour les logs persistants

Respecter l'architecture Docker existante (pas de changements de ports/volumes)

Résultat attendu
Un système de monitoring VoIP qui permet d'identifier précisément:

Les problèmes d'uplink vs downlink grâce à Jitter TX/RX séparé

Les pics de latence avec RTT min/max

La qualité globale de l'appel avec indicateurs visuels clairs

Style et format de code
Backend: JavaScript/Node.js (ES6+)

Frontend: React TypeScript avec hooks

Suivre le style du projet existant (voir fichiers actuels)

Commenter les nouvelles métriques pour la maintenabilité

Livrable
Fournis-moi le code modifié pour:

engines/rtp.py (classe VoiceMetrics complète)

server.js (section parsing des résultats VoIP)

web-dashboard/src/components/VoiceCalls.tsx (component React complet avec les nouvelles cartes)

web-dashboard/src/types/voice.ts (interfaces TypeScript)

Inclus des exemples de données JSON pour tester l'affichage.

text

***

## Alternative : Prompt plus concis pour itération rapide

```markdown
# Mission
Modifier le système de métriques VoIP du projet sdwan-traffic-generator-web pour distinguer Jitter TX (outbound) et Jitter RX (inbound).

## Changements requis

### Backend (rtp.py)
Séparer `jitter_ms` en:
- `jitter_tx_ms`: variance timing envoi
- `jitter_rx_ms`: variance timing réception (RFC 3550)

Ajouter à RTT: `rtt_min_ms`, `rtt_max_ms`

### Frontend (React)
Créer 2 cartes séparées:
- "Jitter TX ↑ (Outbound)" avec badge vert/orange/rouge (< 30ms / 30-50ms / > 50ms)
- "Jitter RX ↓ (Inbound)" avec même logique

Ajouter tooltips:
- TX: "Problèmes locaux/uplink"
- RX: "Problèmes réseau distant/downlink"

### Format JSON attendu
```json
{
  "jitter_tx_ms": 2.15,
  "jitter_rx_ms": 3.42,
  "rtt_avg_ms": 45.23,
  "rtt_max_ms": 89.50,
  "rtt_min_ms": 32.10
}
Fournis les modifications pour rtp.py, le composant React, et les types TypeScript.

text

Ces prompts donnent à Claude tout le contexte nécessaire pour modifier à la fois le backend Python, l'orchestrator Node.js, et l'interface React de manière cohérente avec votre architecture existante.[1][2]
