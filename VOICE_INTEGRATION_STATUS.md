# 🎙️ Voice Integration Status Report

## 📦 Version: 1.1.0-patch.36.1
**Date:** 2026-01-23

### ✅ Completed Tasks
1.  **Infrastructure**:
    *   `Dockerfile.voice` (Generator) and `Dockerfile.voice-echo` (Target) created.
    *   `docker-compose.yml` updated with `voice-gen` and `voice-echo` services.
    *   `docker-compose.example.yml` and `docker-compose.voice-target.yml` created for clean deployments.
2.  **Moteur Voix**:
    *   `rtp.py` (votre script) modernisé pour Python 3 et corrigé pour le forgeage L2 (Scapy).
    *   `echo_server.py` créé (version Python 3 éco-responsable du serveur UDP).
3.  **Orchestration**:
    *   `voice_orchestrator.py` : Gère les appels en parallèle, les poids des serveurs, et le logging.
4.  **Interface & API**:
    *   `server.ts` : Routes API prêtes (`/api/voice/*`).
    *   `Voice.tsx` : Nouvel onglet Dashboard avec monitoring live et config.
    *   `App.tsx` : Intégration complète de la navigation.
5.  **CI/CD**:
    *   GitHub Actions mis à jour pour construire et pousser les images multi-plateformes.

### 🛠️ Current Debugging (En cours)
*   **Problème** : Les appels s'arrêtent instantanément ("START" puis "END" immédiat).
*   **Actions entreprises** :
    *   Activation du mode **Unbuffered** dans Docker pour voir les erreurs Python.
    *   Fix sur le forgeage des paquets **Ethernet / IP** (Patch 35).
    *   Ajout du port source fixe (**5060**) pour passer les firewalls (Patch 36).
    *   **Patch 37** : Affichage de la version au démarrage des containers (`voice-gen` & `voice-echo`) pour un meilleur debug.

### 🛠️ Current Debugging (En cours)
*   **Problème** : `ValueError: While building field 'timestamp'` dans `rtp.py`.
*   **Cause identifiée** : `time.time()` renvoie un float, Scapy attend un entier.
*   **Problème Ping** : Ping HS dans l'UI alors que OK sur le host.
*   **Causes identifiées** : Commande `ping` manquante dans le container UI et manque de droits `NET_RAW`.
*   **Actions entreprises** :
    *   **Patch 38** : 
        *   Fix `rtp.py` : conversion du timestamp en `int`.
        *   Fix UI : Installation de `iputils-ping`, `dnsutils`, `netcat` dans le container.
        *   Fix Docker : Ajout de `cap_add: NET_RAW` pour l'UI.
    *   **Patch 39** :
        *   Ajout d'un **numéro de séquence** (`call_id`) pour identifier chaque appel (ex: CALL-0001).
        *   Fix **Active Calls** : Refonte de la logique UI pour afficher les appels en cours en fonction de l'ID.
        *   Amélioration de la lisibilité des logs orchestrateur.
    *   **Patch 40** :
        *   Nettoyage UI : Suppression du cadre "Internet Connectivity" dans l'onglet Security (doublon avec le Dashboard).
    *   **Patch 42** :
        *   Fix **Active Calls** : Suppression de la vérification temporelle (Date.now) qui bloquait l'affichage à cause des décalages d'horloge.
    *   **Patch 43** :
        *   Ajout du **Speedtest** (via Cloudflare) sur le Dashboard.
        *   Intégration de **Iperf3** : L'application fait maintenant office de **Client** (bouton test) et de **Serveur** (port 5201 exposé).
    *   **Patch 44** :
        *   Persistent Call IDs : Le numéro de séquence des appels voix est maintenant sauvegardé sur disque (survit au redémarrage).
        *   Ghost Call Protection : L'interface ignore les appels orphelins de plus de 30 minutes.
    *   **Patch 45** :
        *   **CRITICAL FIX** : Correction d'une erreur de syntaxe (missing catch) dans `server.ts` qui empêchait le Dashboard de démarrer.
    *   **Patch 46** :
        *   **HOTFIX Orchestrator** : Restauration des constantes `STATS_FILE` et `CONTROL_FILE` accidentellement supprimées dans la v45. La voix est de nouveau fonctionnelle.
    *   **Patch 47** :
        *   **Versions Alignement** : Tous les containers affichent maintenant la même version (47).
        *   **Workflow Change** : Le tag `:stable` n'est plus automatique. Utilisez le bouton "Run Workflow" sur GitHub pour promouvoir un patch en stable.
    *   **Patch 48** :
        *   **FIX Final Active Calls** : Suppression définitive de la dépendance à l'heure locale du navigateur. Le nettoyage des appels "fantômes" se base maintenant sur le temps relatif des logs (immune au clock-skew).
    *   **Patch 49** :
        *   **FIX Iperf Results** : Optimisation du moteur Iperf (backend) pour mieux capturer les résultats JSON et gérer les erreurs de connexion.
        *   **NEW Iperf UI** : Affichage du "Dernier résultat" directement dans la fenêtre modale de test.
        *   **FIX RTP Noise** : Suppression des warnings "Broadcast MAC" dans les logs du simulateur voix (passage en Layer 3 pur).
    *   **Patch 50** :
        *   **UI Voice History** : Ajout d'un scroll interne et d'un en-tête fixe pour le tableau "Recent History". Les nouveaux appels apparaissent en haut.
        *   **Log Optimization** : Réduction drastique du bruit dans les logs de connectivité. On ne logue désormais une ligne que si le statut d'une destination change (Online <-> Offline).
    *   **Patch 51** :
        *   **VOICE Pre-flight Check** : L'orchestrateur vérifie maintenant la joignabilité (ping) de la cible AVANT de lancer un appel. Si la cible ne répond pas, l'appel est "Skipped" et ne pollue plus la liste active.
        *   **ECHO Server Logging** : Le serveur d'écho gère désormais des sessions. Il logue explicitement `📞 Incoming call` et `✅ Call finished` (après 5s de silence).
    *   **Patch 52** :
        *   **CRITICAL FIX Ghost Calls** : Introduction d'un `session_id` pour chaque run de l'orchestrateur. Le Dashboard ignore désormais automatiquement les appels "pendus" des sessions précédentes. Plus de 6 appels affichés quand on en demande 3 !
    *   **Patch 53** :
        *   **FIX Orchestrator Crash** : Installation du package `iputils-ping` dans le container voix. L'orchestrateur ne plante plus au démarrage lorsqu'il tente de vérifier la joignabilité des cibles.
    *   **Patch 54** :
        *   **DOCUMENTATION** : Mise à jour du `VOICE_SIMULATION.md` avec les instructions d'installation de Docker sur les cibles et des exemples de logs pour le debugging.
    *   **Patch 55** :
        *   **RTP SILENT MODE** : Nettoyage radical des logs du simulateur. Tous les avertissements Scapy (`SyntaxWarning`, `iface has no effect`) sont désormais masqués. On ne voit plus que l'essentiel.
        *   **L3 Optimized** : Envoi direct via la pile IP de l'OS pour une compatibilité maximale sans broadcast.
    *   **Patch 56** :
        *   **NETWORK HOST MODE** : Le container `sdwan-voice-gen` tourne désormais en mode réseau `host`. Il se comporte comme un script natif, voit toutes les interfaces de l'hôte et gère mieux le forgeage de paquets.
        *   **BYPASS DOCKER LIMITS** : Migration de toutes les images de base (`debian`, `node`, `python`) vers les miroirs Amazon ECR Public. Terminé les erreurs "429 Too Many Requests" lors des builds GitHub !
    *   **Patch 57** :
        *   **UI RESILIENCE** : Refonte de la détection des appels actifs. On ne dépend plus d'une session fixe, ce qui permet de voir les appels même si l'orchestrateur redémarre. Augmentation de l'historique visible (500 lignes).
    *   **Patch 58** :
        *   **SMART DASHBOARD** : Correction finale du tri (le plus récent en haut). Les vieux appels orphelins (Ghost Calls) sont désormais automatiquement nettoyés à chaque redémarrage grâce au filtrage par session ID optimisé. Augmentation du buffer (1000 lignes) et ajout d'un flush real-time sur les logs.
    *   **Patch 59** :
        *   **DEEP INSPECTION** : Le `CALL-ID` est désormais injecté directement dans le payload RTP. Le serveur d'écho décode ces informations pour afficher exactement quel appel il reçoit. On voit enfin la correspondance directe entre le générateur et la cible dans les logs !
    *   **Patch 60** :
        *   **ZERO POLLUTION** : L'orchestrateur repart d'une "page blanche" à chaque démarrage (compteur reset à 1, logs vidés, simulation désactivée par défaut).
        *   **UI SYNC** : Suppression de toute la logique de session complexe côté Dashboard. Si c'est dans le log, c'est que c'est l'activité actuelle. Zéro confusion, 100% de synchronisation.
    *   **Patch 61** :
        *   **FLOW SEPARATION** : Suppression du port source fixe (5060). Chaque appel utilise désormais un port aléatoire, permettant au serveur cible de distinguer chaque appel individuellement et au SD-WAN de mieux répartir le trafic.
    *   **Patch 62** :
        *   **DNS HARDENING** : Refonte totale des tests de sécurité DNS. Priorité à `nslookup`/`dig` pour obtenir plus de détails. Ajout de la détection par mot-clé "sinkhole" dans les flux de sortie et d'erreur. Les domaines bloqués par Palo Alto (via redirect sinkhole) sont désormais détectés avec 100% de fiabilité, même si la commande retourne un code d'erreur.

    *   **Patch 63** :
        *   **UNIVERSAL DNS** : Optimisation cross-platform (macOS/Windows/Linux). `nslookup` devient l'outil de référence universel car il fournit les mêmes détails techniques sur tous les OS, garantissant une détection des menaces identique, que le host soit sous Windows ou Ubuntu.
    *   **Patch 64** :
        *   **LIVE COUNTERS** : Les compteurs de sécurité (Total, Blocked, Sinkholed) sont désormais mis à jour en temps réel. Ajout d'un rafraîchissement automatique toutes les 30 secondes pour capter les tests planifiés en arrière-plan, et mise à jour immédiate après chaque test manuel.

### 📝 Next Steps (IMPORTANT)
1.  **Attendre le signal ✅ sur GitHub (v1.1.0-patch.64)**.
2.  Faire un `docker compose pull` sur **toute la pile**.
3.  **Promotion en Stable** : Allez dans GitHub Actions > Build and Push > Run Workflow > `1.1.0-patch.64`.
