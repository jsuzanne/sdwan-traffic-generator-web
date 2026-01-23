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

### 📝 Next Steps (IMPORTANT)
1.  **Attendre le signal ✅ sur GitHub (v1.1.0-patch.40)**.
2.  Faire un `docker compose pull` sur **toutes les machines**.
