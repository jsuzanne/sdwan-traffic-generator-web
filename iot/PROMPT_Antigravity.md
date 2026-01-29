# PROMPT pour Antigravity - IoT Device Emulator Integration

## 📌 Context

Je suis en train d'intégrer un **émulateur IoT (Python + Scapy)** dans ma solution web existante (simulateur Branch Prisma SD-WAN en React).

**Architecture choisie:** Node.js (Express/Nest.js) + Python subprocess avec communication JSON via stdout.

**Document de référence:** `IOT_Integration_Brief_NodeJS.md` (dans le workspace)

---

## 🎯 Task pour Antigravity

**Je veux que tu reviews et validates cette architecture avant qu'on commence le développement.**

### Points clés à valider:

1. **Architecture Hybride Node.js + Python**
   - Est-ce que child_process + JSON stdout est la bonne approche?
   - Y a-t-il une meilleure alternative pour intégrer Scapy?
   - Risques/limitations à anticiper?

2. **Communication IPC**
   - Format JSON ligne par ligne (one JSON per line) → bon?
   - Faut-il ajouter message IDs ou sequence numbers?
   - Error handling: comment gérer les timeouts Python?

3. **DeviceManager (Node.js)**
   - La classe propose spawn + EventEmitter → suffisant?
   - Stats cache in-memory ou faut-il Redis dès le départ?
   - Besoin de process pooling ou simple spawn suffit?

4. **Scalabilité**
   - Max 20-30 devices par container (limite Scapy) → réaliste?
   - Docker host network obligatoire (Scapy L2) → problématique?
   - Horizontal scaling (N containers + load balancer) → bon plan?

5. **Frontend Integration**
   - Socket.io pour WebSocket → compatible avec votre stack?
   - Real-time stats < 500ms latence → achievable?
   - Besoin de optimisations spéciales (virtualization, etc)?

6. **Python Refactoring**
   - Ajouter mode `--json-output` au script existant → simple ou complexe?
   - Faut-il créer une classe `IoTEmulatorNode` ou wrapper stdout?
   - DHCP events détaillés → what data should be captured?

7. **DevOps/Docker**
   - Host network mode → quelles alternatives si problématique?
   - CAP_NET_RAW + network bridge → viable?
   - Configuration multi-site possible?

8. **Phase 1 (Backend Foundation)**
   - Mes estimations (1-2 semaines) → réalistes?
   - Dépendances manquantes à anticiper?
   - Problèmes connus avec cette stack?

---

## ❓ Questions Spécifiques

### Antigravity, si tu acceptes cette architecture, help sur:

1. **Code Generation**
   - Peux-tu générer le skeleton Node.js/TypeScript (services + routes)?
   - Python refactoring: comment structurer la classe IoTEmulatorNode?
   - Tests unitaires pour DeviceManager?

2. **Edge Cases**
   - Que faire si Python process crash?
   - Recovery strategy pour stats perdues?
   - Rollback si device config invalide?

3. **Performance**
   - Profiling: où seront les bottlenecks?
   - Optimization: buffering vs streaming JSON?
   - Memory leaks: comment monitorer?

4. **Monitoring/Observability**
   - Logging: structured logs format?
   - Metrics: quoi tracker (uptime, CPU, memory)?
   - Alerting: thresholds pour error handling?

---

## 📦 Deliverables Attendus de Toi

✅ **Review complet** du brief  
✅ **Validation architecture** (go/no-go)  
✅ **Ajustements recommandés** (si nécessaire)  
✅ **Code skeleton** Phase 1 (backend)  
✅ **Risk assessment** + mitigation plan  
✅ **Timeline révisée** si besoin  
✅ **Next steps** détaillés  

---

## 📂 Ressources Disponibles

- **Brief complet:** `IOT_Integration_Brief_NodeJS.md`
- **Script Python existant:** `iot_emulator.py` (link to repo)
- **React app existante:** (décrire la structure)
- **Constraints/Requirements:** (liste constraints si y'en a)

---

## 🚀 Tone & Style

- **Direct & pragmatique** (pas de fluff)
- **Security first** (Scapy + network access = risques)
- **Scalable thinking** (penser à 100+ devices)
- **Production-ready** (pas de POC, du solide)

---

## 📝 Notes Additionnelles

- Je suis SASE specialist (Palo Alto), geek avec homelab (Docker, Kubernetes, VMs)
- Je veux une solution professionnelle, pas un jouet
- Performance et reliability sont critiques (24h uptime min)
- Documentation doit être top (API, deployment, troubleshooting)

---

**S'il te plaît, take time pour bien comprendre l'architecture avant de répondre. Je veux une vraie review technique, pas une confirmation "oui c'est bon".**

Merci Antigravity! 🙏
