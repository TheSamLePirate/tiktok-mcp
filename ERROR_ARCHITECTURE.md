# Architecture du système de suivi d'erreurs

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                    TikTok Live MCP Server                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   MCP Tools │  │  Connections │  │    System    │       │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                  │               │
│         └─────────────────┼──────────────────┘               │
│                           ▼                                  │
│                   ┌───────────────┐                          │
│                   │  logError()   │                          │
│                   └───────┬───────┘                          │
│                           ▼                                  │
│                   ┌───────────────┐                          │
│                   │  errorLogs[]  │  ◄── Max 50 erreurs     │
│                   └───────┬───────┘                          │
│                           │                                  │
│         ┌─────────────────┼─────────────────┐               │
│         ▼                 ▼                 ▼               │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐           │
│  │show-errors│     │clear-errors│   │ Console  │           │
│  └──────────┘     └──────────┘     └──────────┘           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Flux de données

### 1. Capture d'erreur

```javascript
// Quand une erreur se produit
try {
  await connection.connect();
} catch (error) {
  // L'erreur est capturée et loguée
  logError('connection', username, error);
  return createErrorResponse(message);
}
```

### 2. Stockage

```javascript
function logError(type, source, error) {
  // Création de l'objet ErrorLog
  const errorLog = {
    timestamp: new Date().toISOString(),
    type,      // 'connection' | 'tool' | 'system'
    source,    // '@username', 'tool-name', 'system-component'
    message,   // Message d'erreur
    stack      // Stack trace (optionnel)
  };
  
  // Ajout au tableau
  errorLogs.push(errorLog);
  
  // Limitation de la taille (rotation)
  limitArraySize(errorLogs, CONFIG.MAX_STORED_ERRORS);
  
  // Log console immédiat
  console.error(`[${type}] [${source}] ${message}`);
}
```

### 3. Récupération

```javascript
// Via l'outil show-errors
server.tool("show-errors", ..., async ({ count, type }) => {
  // Filtrage par type
  let filtered = type === 'all' 
    ? errorLogs 
    : errorLogs.filter(e => e.type === type);
  
  // Sélection des N dernières
  const recent = filtered.slice(-count);
  
  // Formatage et retour
  return createSuccessResponse(formattedErrors);
});
```

## Types d'erreurs capturées

### Connection Errors

**Source :** Event listeners des connexions TikTok

```javascript
connection.on('error', (err) => {
  logError('connection', username, err);
});

connection.on('disconnected', async () => {
  logError('connection', username, 'Disconnected from livestream');
});
```

**Exemples :**
- Échec de connexion initiale
- Perte de connexion
- Échec de reconnexion
- Timeout de stream

### Tool Errors

**Source :** Blocs try-catch de tous les outils MCP

```javascript
server.tool("tiktok-connect", ..., async ({ username }) => {
  try {
    // ... code de l'outil
  } catch (error) {
    logError('tool', 'tiktok-connect', error);
    return createErrorResponse(...);
  }
});
```

**Outils concernés :**
- tiktok-connect
- tiktok-disconnect
- tiktok-messages
- tiktok-gifts
- tiktok-likes
- tiktok-info
- tiktok-list
- play-video
- stop-video
- record-video
- stop-record-video

### System Errors

**Source :** Handlers d'événements globaux

```javascript
// Démarrage du serveur
async function startServer() {
  try {
    await server.connect(transport);
  } catch (error) {
    logError('system', 'startServer', error);
  }
}

// Rejets de promesses non gérés
process.on('unhandledRejection', (reason) => {
  logError('system', 'unhandledRejection', reason);
});

// Exceptions non capturées
process.on('uncaughtException', (error) => {
  logError('system', 'uncaughtException', error);
});

// Erreurs de shutdown
process.on('SIGINT', () => {
  connections.forEach(({ connection }, username) => {
    try {
      connection.disconnect();
    } catch (error) {
      logError('system', `shutdown-${username}`, error);
    }
  });
});
```

## Structure de données

### ErrorLog Object

```typescript
interface ErrorLog {
  timestamp: string;    // ISO 8601 format
  type: 'connection' | 'tool' | 'system';
  source: string;       // Identifiant de la source
  message: string;      // Message d'erreur
  stack?: string;       // Stack trace (si Error object)
}
```

### Storage Array

```javascript
const errorLogs: ErrorLog[] = [];
```

**Caractéristiques :**
- Tableau en mémoire
- Taille maximale : `CONFIG.MAX_STORED_ERRORS` (50 par défaut)
- Rotation automatique (FIFO - First In, First Out)
- Persistance durant la vie du serveur

## Outils de diagnostic

### show-errors

**Entrée :**
```typescript
{
  count?: number;     // Défaut: 20
  type?: 'all' | 'connection' | 'tool' | 'system';  // Défaut: 'all'
}
```

**Sortie :**
```
Error Log Summary
==================================================
Total Errors: X
By Type:
  connection: Y
  tool: Z
  system: W

Recent Errors (showing N of M):
==================================================

[1] 2025-11-09T10:30:45.123Z
    Type: connection
    Source: @username
    Message: Error message
    Stack: Stack trace (first 3 lines)
...
```

### clear-errors

**Entrée :** Aucune

**Sortie :**
```
Successfully cleared X error(s) from the log.
Error tracking has been reset.
```

**Action :** Vide le tableau `errorLogs`

## Configuration

```javascript
const CONFIG = {
  MAX_STORED_ERRORS: 50,  // Nombre max d'erreurs stockées
  // ...
};
```

**Ajustement :** Modifier `MAX_STORED_ERRORS` selon les besoins
- Plus petit : Moins de mémoire, historique réduit
- Plus grand : Plus de mémoire, historique étendu

## Avantages de cette architecture

### ✅ Simplicité
- Pas de dépendances externes
- Stockage en mémoire simple
- API facile à utiliser

### ✅ Performance
- Opérations O(1) pour l'ajout
- Pas d'I/O disque
- Rotation automatique

### ✅ Fiabilité
- Capture exhaustive
- Pas de perte d'erreurs
- Console fallback

### ✅ Maintenabilité
- Code centralisé
- Interface cohérente
- Facile à étendre

## Limitations actuelles

### ⚠️ Persistance
- Les erreurs sont perdues au redémarrage
- Pas de sauvegarde sur disque

### ⚠️ Capacité
- Limité à 50 erreurs
- Pas de pagination avancée

### ⚠️ Analyse
- Pas de recherche par texte
- Pas de tri personnalisé
- Pas d'export

## Évolutions futures possibles

### 📝 Persistance
```javascript
// Sauvegarder dans un fichier JSON
function saveErrors() {
  fs.writeFileSync('errors.json', JSON.stringify(errorLogs));
}
```

### 📊 Métriques
```javascript
// Statistiques avancées
function getErrorMetrics() {
  return {
    totalErrors: errorLogs.length,
    errorRate: calculateErrorRate(),
    topSources: getMostFrequentSources(),
    timeline: getErrorTimeline()
  };
}
```

### 🔍 Recherche
```javascript
// Recherche par texte
function searchErrors(query) {
  return errorLogs.filter(err => 
    err.message.includes(query) ||
    err.source.includes(query)
  );
}
```

### 📤 Export
```javascript
// Export en différents formats
function exportErrors(format) {
  switch (format) {
    case 'json': return JSON.stringify(errorLogs);
    case 'csv': return convertToCSV(errorLogs);
    case 'html': return generateHTMLReport(errorLogs);
  }
}
```
