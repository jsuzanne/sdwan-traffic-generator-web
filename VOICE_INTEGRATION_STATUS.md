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
    *   Ajout de la commande `python3 -u` pour avoir les logs en temps réel.

### 📝 Next Steps (Si déconnexion)
1.  Faire un `docker compose pull voice-gen` sur UbuntuBR8 pour récupérer le Patch 36.1.
2.  Lancer `docker logs -f sdwan-voice-gen`.
3.  Vérifier l'erreur Python qui s'affiche au clic sur "Start Voice".
4.  Vérifier que l'interface spécifiée dans l'UI (ex: `eth0`) existe bien sur le host via `ip addr`.
