# Error Tracking System

## Vue d'ensemble

Le serveur TikTok Live MCP inclut maintenant un système complet de suivi d'erreurs pour faciliter le débogage et la surveillance.

## Fonctionnalités

### 📊 Capture automatique des erreurs

Toutes les erreurs sont automatiquement capturées et enregistrées dans trois catégories :

1. **Connection errors** (`connection`) - Erreurs de connexion aux livestreams TikTok
   - Échecs de connexion initiale
   - Déconnexions inattendues
   - Échecs de reconnexion
   - Erreurs de stream

2. **Tool errors** (`tool`) - Erreurs lors de l'exécution des outils MCP
   - Erreurs dans `tiktok-connect`
   - Erreurs dans `tiktok-messages`, `tiktok-gifts`, etc.
   - Erreurs de lecture vidéo
   - Erreurs d'enregistrement vidéo

3. **System errors** (`system`) - Erreurs système critiques
   - Erreurs de démarrage du serveur
   - Exceptions non gérées
   - Promesses rejetées
   - Erreurs d'arrêt

### 🔍 Outils de diagnostic

#### `show-errors`
Affiche toutes les erreurs enregistrées avec des options de filtrage.

**Paramètres :**
- `count` (optionnel, défaut: 20) - Nombre d'erreurs récentes à afficher
- `type` (optionnel, défaut: 'all') - Type d'erreur : `all`, `connection`, `tool`, `system`

**Exemple d'utilisation :**
```
show-errors avec count=50 et type=connection
```

**Sortie :**
- Résumé statistique par type d'erreur
- Liste détaillée des erreurs récentes avec :
  - Timestamp
  - Type d'erreur
  - Source (username, nom de l'outil, etc.)
  - Message d'erreur
  - Stack trace (premières lignes)

#### `clear-errors`
Efface toutes les erreurs enregistrées pour repartir sur une base propre.

**Exemple d'utilisation :**
```
clear-errors
```

### 💾 Stockage des erreurs

- **Limite de stockage :** Les 50 dernières erreurs sont conservées (configurable via `CONFIG.MAX_STORED_ERRORS`)
- **Rotation automatique :** Les anciennes erreurs sont supprimées automatiquement
- **Logs console :** Toutes les erreurs sont également affichées dans la console pour une visibilité immédiate

### 📝 Format des erreurs

Chaque erreur enregistrée contient :

```javascript
{
  timestamp: "2025-11-09T10:30:45.123Z",
  type: "connection" | "tool" | "system",
  source: "username ou nom de l'outil",
  message: "Message d'erreur détaillé",
  stack: "Stack trace (si disponible)"
}
```

## Exemples d'utilisation

### Voir toutes les erreurs récentes
```
Utilise l'outil show-errors pour voir les 20 dernières erreurs
```

### Voir uniquement les erreurs de connexion
```
Utilise show-errors avec type=connection
```

### Voir les 100 dernières erreurs système
```
Utilise show-errors avec count=100 et type=system
```

### Réinitialiser le log d'erreurs
```
Utilise clear-errors pour effacer toutes les erreurs
```

## Avantages pour le débogage

1. **Historique complet** : Toutes les erreurs sont conservées, pas seulement les dernières
2. **Contexte riche** : Chaque erreur inclut le timestamp, la source et le stack trace
3. **Filtrage facile** : Trier par type d'erreur pour isoler les problèmes
4. **Statistiques** : Vue d'ensemble du nombre d'erreurs par catégorie
5. **Persistance en mémoire** : Les erreurs restent disponibles pendant toute la durée de vie du serveur

## Configuration

Dans `app.js`, vous pouvez ajuster :

```javascript
const CONFIG = {
  MAX_STORED_ERRORS: 50,  // Augmentez pour garder plus d'erreurs en mémoire
  // ...
};
```

## Gestion globale des erreurs

Le système capture également :
- **Unhandled Promise Rejections** : Promesses rejetées non gérées
- **Uncaught Exceptions** : Exceptions JavaScript non capturées
- **Erreurs de shutdown** : Erreurs lors de l'arrêt gracieux du serveur

Ces erreurs sont automatiquement loguées avec le type `system` pour un débogage complet.
