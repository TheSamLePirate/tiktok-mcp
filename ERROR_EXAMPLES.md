# Exemples d'utilisation du système de suivi d'erreurs

## Scénario 1 : Surveillance des erreurs de connexion

```bash
# Se connecter à un livestream
tiktok-connect avec username=@samiepirate

# Si la connexion échoue, vérifier les erreurs
show-errors avec type=connection

# Sortie exemple :
# Error Log Summary
# ==================================================
# Total Errors: 3
# By Type:
#   connection: 3
# 
# Recent Errors (showing 3 of 3):
# ==================================================
#
# [1] 2025-11-09T10:15:23.456Z
#     Type: connection
#     Source: @samiepirate
#     Message: Failed to connect: User is not live
#
# [2] 2025-11-09T10:16:45.789Z
#     Type: connection
#     Source: @samiepirate
#     Message: Disconnected from livestream
#
# [3] 2025-11-09T10:17:01.234Z
#     Type: connection
#     Source: @samiepirate
#     Message: Reconnection failed: Network error
```

## Scénario 2 : Débogage des erreurs d'outils

```bash
# Tenter de lire un stream sans être connecté
play-video avec url=https://invalid-url.com/stream

# Vérifier les erreurs d'outils
show-errors avec type=tool count=10

# Sortie exemple :
# Error Log Summary
# ==================================================
# Total Errors: 5
# By Type:
#   tool: 5
# 
# Recent Errors (showing 5 of 5):
# ==================================================
#
# [1] 2025-11-09T10:20:15.123Z
#     Type: tool
#     Source: play-video
#     Message: Invalid URL provided
#
# [2] 2025-11-09T10:21:30.456Z
#     Type: tool
#     Source: tiktok-messages
#     Message: Not connected to @user's livestream. Use tiktok-connect first.
#
# [3] 2025-11-09T10:22:45.789Z
#     Type: tool
#     Source: stop-video
#     Message: Invalid PID provided
```

## Scénario 3 : Surveillance complète du système

```bash
# Afficher toutes les erreurs (tous types confondus)
show-errors avec count=50

# Sortie exemple :
# Error Log Summary
# ==================================================
# Total Errors: 12
# By Type:
#   connection: 5
#   tool: 6
#   system: 1
# 
# Recent Errors (showing 12 of 12):
# ==================================================
#
# [1] 2025-11-09T09:00:00.000Z
#     Type: system
#     Source: startServer
#     Message: Port 3000 already in use
#     Stack: Error: Port 3000 already in use
#         at startServer (app.js:860:5)
#         at Object.<anonymous> (app.js:900:1)
#
# [2] 2025-11-09T10:15:23.456Z
#     Type: connection
#     Source: @samiepirate
#     Message: Failed to connect: User is not live
#
# ... (10 more errors)
```

## Scénario 4 : Nettoyage du journal d'erreurs

```bash
# Après avoir résolu les problèmes, nettoyer le journal
clear-errors

# Sortie :
# Successfully cleared 12 error(s) from the log.
# Error tracking has been reset.

# Vérifier que le journal est vide
show-errors

# Sortie :
# No errors logged yet. The system is running smoothly! 🎉
```

## Workflow de débogage recommandé

### 1. Surveiller régulièrement
```bash
# Vérifier périodiquement s'il y a des erreurs
show-errors avec count=5
```

### 2. Isoler les problèmes par type
```bash
# Si vous avez des problèmes de connexion
show-errors avec type=connection count=20

# Si un outil ne fonctionne pas
show-errors avec type=tool count=20

# Si le serveur a des problèmes
show-errors avec type=system count=20
```

### 3. Analyser et résoudre
- Lisez les messages d'erreur
- Vérifiez les stack traces pour localiser les problèmes
- Notez les patterns (erreurs récurrentes)

### 4. Nettoyer après correction
```bash
# Une fois les problèmes résolus
clear-errors
```

### 5. Vérifier que tout fonctionne
```bash
# Tester vos opérations
tiktok-connect avec username=@user
tiktok-messages avec username=@user count=10

# Vérifier qu'aucune nouvelle erreur n'apparaît
show-errors
```

## Cas d'usage avancés

### Surveiller uniquement les erreurs récentes
```bash
show-errors avec count=3
# Affiche seulement les 3 dernières erreurs
```

### Obtenir un rapport complet pour un bug report
```bash
show-errors avec count=100
# Affiche jusqu'à 100 erreurs pour un rapport détaillé
```

### Vérifier après une reconnexion automatique
```bash
# Le système tente automatiquement de se reconnecter
# Vérifier si les reconnexions ont échoué
show-errors avec type=connection count=10
```

## Tips pour le débogage

1. **Vérifiez d'abord les erreurs système** : Elles peuvent causer des problèmes en cascade
2. **Recherchez les patterns** : Plusieurs erreurs similaires indiquent un problème récurrent
3. **Utilisez les timestamps** : Identifiez quand les problèmes ont commencé
4. **Filtrez par source** : Trouvez rapidement les erreurs liées à un username spécifique
5. **Nettoyez régulièrement** : Gardez le journal propre pour éviter la confusion
