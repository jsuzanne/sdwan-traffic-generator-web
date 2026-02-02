# Security Testing – Support des listes EDL (IP / URL / DNS)

## Objectif

Permettre de tester des listes externes de type EDL (External Dynamic List) utilisées par les firewalls / Prisma Access dans des règles de sécurité (whitelist / blocklist).  
L’utilisateur peut :

- Fournir une **URL distante** qui pointe vers une liste (une EDL “à la PAN‑OS”) de :
  - IP / subnets
  - URLs
  - FQDN / domaines
- Ou **importer un fichier local** contenant ces listes.
- L’application télécharge / parse ces listes, puis **génère du trafic** :
  - Tests **séquentiels** (tous les éléments, dans l’ordre)
  - Tests **random / statistiques** (échantillon aléatoire)

## Périmètre

- Nouvelle section dans l’onglet **Security** (backend déjà existant pour URL, DNS, EICAR). [file:8][file:24]
- Trois blocs distincts sur la **même page** :
  - Bloc **IP List**
  - Bloc **URL List**
  - Bloc **DNS List**
- Implémentation principalement **backend** (comme les tests URL / DNS existants avec `curl` et `dig/nslookup`). [file:8]

---

## Modèle de données

### Nouveau bloc de configuration (dans `config/security-tests.json`)

Ajouter une section `edlTesting` :

```jsonc
{
  "edlTesting": {
    "ipList": {
      "remoteUrl": "https://example.com/ip-edl.txt",
      "lastSyncTime": 0,
      "elements": [
        "1.1.1.1",
        "8.8.8.8/32"
      ]
    },
    "urlList": {
      "remoteUrl": "https://example.com/url-edl.txt",
      "lastSyncTime": 0,
      "elements": [
        "http://example.com/malware",
        "https://test.example.org/path"
      ]
    },
    "dnsList": {
      "remoteUrl": "https://example.com/dns-edl.txt",
      "lastSyncTime": 0,
      "elements": [
        "bad1.example.com",
        "bad2.example.com"
      ]
    },
    "testMode": "sequential",   // "sequential" | "random"
    "randomSampleSize": 50,     // nombre max d’éléments testés en mode random
    "maxElementsPerRun": 200    // limite dure par run pour ne pas cramer le FW
  }
}
Points clés :

Les listes sont stockées sous forme de tableau brut de strings déjà normalisées (une entrée par ligne).

remoteUrl est optionnel si l’utilisateur n’utilise que l’upload local.

lastSyncTime pour afficher “Dernière synchro” dans l’UI.

Format attendu des listes EDL
Texte brut, une entrée par ligne.

Commentaires : lignes commençant par # ignorées.

Lignes vides ignorées.

Typage implicite par bloc :

Bloc IP : 1.2.3.4 ou 1.2.3.0/24.

Bloc URL : http:// ou https:// (si absent, préfixer en http:// côté backend).

Bloc DNS : fqdn (domaines ou sous-domaines).

Backend – API et logique
Nouvelles routes API
Prefix commun : /api/security/edl

Récupérer la config / état EDL

GET /api/security/edl-config

Réponse :

json
{
  "success": true,
  "config": {
    "ipList": { "remoteUrl": "...", "lastSyncTime": 1738000000000, "elementsCount": 123 },
    "urlList": { "remoteUrl": "...", "lastSyncTime": 1738000000000, "elementsCount": 67 },
    "dnsList": { "remoteUrl": "...", "lastSyncTime": 0, "elementsCount": 0 },
    "testMode": "sequential",
    "randomSampleSize": 50,
    "maxElementsPerRun": 200
  }
}
Mettre à jour la config (URLs, mode, limites)

POST /api/security/edl-config

Body (partiel) :

json
{
  "ipList": { "remoteUrl": "https://..." },
  "urlList": { "remoteUrl": "https://..." },
  "dnsList": { "remoteUrl": "https://..." },
  "testMode": "random",
  "randomSampleSize": 100,
  "maxElementsPerRun": 300
}
Effet :

Merge dans config/security-tests.json (suivant logique existante). [file:8]

Ne déclenche pas de sync ni de test.

Synchroniser une liste depuis son URL distante

POST /api/security/edl-sync

Body :

json
{ "type": "ip" | "url" | "dns" }
Logique :

Télécharge remoteUrl via curl -fsS --max-time 20. [file:8][file:10]

Parse le contenu :

split lignes, remove comments/empty, trim.

Optionnel : validation minimale par type (regex IP/CIDR, URL, FQDN).

Stocke dans edlTesting.<type>List.elements.

Met à jour lastSyncTime.

Réponse :

json
{
  "success": true,
  "type": "ip",
  "elementsCount": 123
}
Uploader un fichier local pour une liste

POST /api/security/edl-upload

Content-Type : multipart/form-data.

Champs :

type : ip | url | dns

file : fichier texte

Logique : identique à edl-sync mais en utilisant le contenu du fichier au lieu de curl.

Exécuter des tests sur une des listes

POST /api/security/edl-test

Body :

json
{
  "type": "ip" | "url" | "dns",
  "mode": "sequential" | "random", // optionnel, override config
  "limit": 50                      // optionnel, override maxElementsPerRun
}
Résultat :

json
{
  "success": true,
  "type": "url",
  "mode": "random",
  "testedCount": 50,
  "results": [
    {
      "value": "http://example.com/malware",
      "status": "blocked" | "allowed" | "error",
      "details": "HTTP 403",
      "timestamp": 1738000110000
    }
  ]
}
Logique d’exécution des tests
Réutiliser les mécanismes existants :

Pour URL :

Même logique que /api/security/url-test mais au lieu de prendre les URLs depuis URLCATEGORIES, boucler sur edlTesting.urlList.elements. [file:8][file:2]

curl -fsS --max-time 10 -o /dev/null -w "%{http_code}" URL, mapping 200–399 → allowed, erreurs → blocked. [file:8][file:10]

Pour DNS :

Même logique que /api/security/dns-test avec nslookup / dig via getDnsCommand. [file:8][file:10]

Résolution IP → allowed, NXDOMAIN / server can't find → blocked.

Pour IP :

Deux options simples (à choisir) :

Ping ICMP : ping -c 1 -W 2 IP, succès = allowed, timeout = blocked.

TCP connect sur un port fixe (ex. 80 ou 443) si tu veux simuler du HTTP.

Simple et suffisant pour “générer du trafic” et vérifier si Prisma Access voit l’IP.

Sélection séquentielle vs random :

Séquentiel :

Prendre les N premiers éléments (ou tous si limit > taille).

Random :

Shuffle de la liste et prendre les min(randomSampleSize, limit, elements.length).

Stats et historique :

Option minimaliste pour commencer :

Retourner les résultats au frontend sans impacter les compteurs globaux statistics existants (URL/DNS/Threat). [file:8]

Possibilité d’ajouter plus tard un sous-ensemble edlHistory séparé.

Frontend – UX / UI
Dans l’onglet Security existant (React Security.tsx). [file:8][file:24]

Layout
Ajouter un nouveau bloc “EDL Lists (IP / URL / DNS)” avec 3 colonnes :

Colonne 1 : IP EDL

Colonne 2 : URL EDL

Colonne 3 : DNS EDL

Chaque colonne contient :

Champ Remote EDL URL

Input texte

Bouton Sync → appelle POST /api/security/edl-sync pour le type.

Zone Upload fichier

<input type="file"> + bouton Upload → POST /api/security/edl-upload.

Label Status

X éléments chargés – dernière synchro : <date>.

En dessous des 3 colonnes :

Section Test Options :

Radio / select Mode : Séquentiel / Random.

Input numérique Random sample size.

Input numérique Max éléments par run.

Section Test Execution :

3 boutons :

Tester IP EDL

Tester URL EDL

Tester DNS EDL

Chaque bouton :

Appelle /api/security/edl-test avec le type correspondant.

Affiche un mini tableau de résultats (dernière exécution) :

Valeur (IP/URL/domain), statut, détails, timestamp.

Ajoute une ligne dans le Execution Log global existant (facultatif mais cohérent). [file:8]
