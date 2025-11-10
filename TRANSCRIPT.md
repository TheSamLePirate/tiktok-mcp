# Transcription en Temps Réel (Realtime Transcription)

## Vue d'ensemble

Le module `transcriptRealtime.js` permet de transcrire en temps réel l'audio d'un flux TikTok Live en utilisant l'API Realtime d'OpenAI. Il capture uniquement l'audio du flux et le transcrit en continu.

## Fonctionnalités

- 🎤 Transcription en temps réel de l'audio du live TikTok
- 🔊 Détection automatique de la parole (VAD - Voice Activity Detection)
- 📝 Affichage des transcriptions finales dans la console
- 🌐 Support multilingue (configuré par défaut en français)
- ⚡ Traitement en continu avec commits périodiques

## Prérequis

### Variables d'environnement

```bash
export OPENAI_API_KEY="sk-your-api-key-here"
```

### Dépendances

- Node.js avec support ESM
- `ws` (WebSocket)
- `ffmpeg` installé et accessible dans le PATH

## Utilisation

### Commande de base

```bash
node transcriptRealtime.js <flv-url|path>
```

### Exemples

```bash
# Avec une URL de flux FLV
node transcriptRealtime.js "http://example.com/live.flv"

# Avec un fichier local
node transcriptRealtime.js ./video.flv
```

## Architecture Technique

### 1. Configuration WebSocket

Le module se connecte à l'API OpenAI Realtime via WebSocket :

```
wss://api.openai.com/v1/realtime?model=gpt-realtime-2025-08-28
```

### 2. Configuration de la session

**Paramètres actuels :**
- **Modalities** : `["text"]` (transcription uniquement, pas de réponse)
- **Format audio** : PCM 16-bit, 24 kHz, mono
- **Modèle de transcription** : `gpt-4o-transcribe`
- **Langue** : Français (`fr`)

**Détection de parole (Turn Detection) :**
```javascript
turn_detection: {
  type: "server_vad",
  threshold: 0.2,
  prefix_padding_ms: 100,
  silence_duration_ms: 100
}
```

**Alternative (commentée) - Semantic VAD :**
```javascript
turn_detection: {
  type: "semantic_vad",
  eagerness: "high"
}
```

### 3. Pipeline FFmpeg

FFmpeg extrait et convertit l'audio du flux FLV :

```bash
ffmpeg -re -i <INPUT> -vn -ac 1 -ar 24000 -f s16le pipe:1
```

**Options :**
- `-re` : Lecture en temps réel
- `-i` : Source d'entrée (URL ou fichier)
- `-vn` : Désactive la vidéo (audio uniquement)
- `-ac 1` : Mono (1 canal)
- `-ar 24000` : Taux d'échantillonnage 24 kHz
- `-f s16le` : Format PCM 16-bit little-endian

### 4. Flux de données

```
Flux FLV → FFmpeg → PCM Audio → Base64 → WebSocket → OpenAI API → Transcription
```

## Événements WebSocket

### Événements de parole (VAD)

| Événement | Description |
|-----------|-------------|
| `input_audio_buffer.speech_started` | Début de parole détecté |
| `input_audio_buffer.speech_stopped` | Fin de parole détectée |

### Événements de transcription

| Événement | Description | Sortie |
|-----------|-------------|--------|
| `conversation.item.input_audio_transcription.delta` | Fragment de transcription | Commenté (mode incremental) |
| `conversation.item.input_audio_transcription.completed` | Transcription finale | Affichée dans la console |

### Événements de session

| Événement | Description |
|-----------|-------------|
| `session.created` | Session créée avec succès |
| `session.updated` | Configuration de session mise à jour |
| `error` | Erreur de l'API |

## Stratégie de Commit

Pour éviter que les segments longs ne soient jamais transcrits, le système effectue des commits périodiques :

```javascript
// Commit toutes les 60 secondes
if (now - lastCommit >= 60000) {
  ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
  lastCommit = now;
}
```

Un commit final est également envoyé lorsque FFmpeg se termine.

## Options de Configuration

### Changer la langue de transcription

```javascript
input_audio_transcription: {
  model: "gpt-4o-transcribe",
  language: "en" // ou "es", "de", etc.
}
```

### Passer à Semantic VAD

Pour de meilleurs découpes sémantiques, décommentez la section `semantic_vad` et commentez `server_vad` :

```javascript
turn_detection: {
  type: "semantic_vad",
  eagerness: "high"
}
```

**Avantages du Semantic VAD :**
- Découpe plus intelligente des phrases
- Meilleure gestion des pauses naturelles
- Transcriptions plus cohérentes

### Activer la transcription incrémentale

Décommentez la ligne dans le handler de messages :

```javascript
if (msg.type === "conversation.item.input_audio_transcription.delta" && msg.delta) {
  process.stdout.write(msg.delta);
}
```

## Sortie Console

### Mode actuel (transcription finale uniquement)

```
[Connected] Configuring transcription session...
[Session] session.created
[Session] session.updated
[Starting ffmpeg...]
Bonjour tout le monde !
Je suis en direct sur TikTok.
Comment allez-vous aujourd'hui ?
```

### Mode debug (décommenter les lignes VAD)

```
[Connected] Configuring transcription session...
[🎤 Speech started]
[🔇 Speech stopped]
Bonjour tout le monde !
[🎤 Speech started]
[🔇 Speech stopped]
Je suis en direct sur TikTok.
```

## Gestion des Erreurs

### Erreurs de validation

```bash
# Clé API manquante
Missing OPENAI_API_KEY

# URL/fichier manquant
Usage: node flv2realtime.js <flv-url|path>
```

### Erreurs d'exécution

- Les erreurs WebSocket sont affichées via `ws.on("error")`
- Les erreurs de l'API sont capturées dans les messages de type `"error"`
- Les erreurs FFmpeg peuvent être activées en décommentant `ff.stderr.on("data")`

## Limitations

1. **Transcription uniquement** : Le mode actuel ne génère pas de réponses (modalities: `["text"]`)
2. **Latence** : Dépend de la qualité du réseau et de la VAD
3. **Commits périodiques** : Nécessaires pour les segments longs (>60s)
4. **Format audio fixe** : PCM 16-bit 24 kHz mono uniquement

## Optimisations Possibles

### 1. Réduire la latence

```javascript
turn_detection: {
  type: "server_vad",
  threshold: 0.1,        // Plus sensible
  silence_duration_ms: 50 // Réagit plus vite
}
```

### 2. Améliorer la précision

```javascript
turn_detection: {
  type: "semantic_vad",
  eagerness: "high"
}
```

### 3. Ajuster la fréquence des commits

```javascript
// Commits plus fréquents (30s au lieu de 60s)
if (now - lastCommit >= 30000) {
  ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
  lastCommit = now;
}
```

## Cas d'Usage

1. **Modération de live** : Transcription en temps réel pour détecter du contenu inapproprié
2. **Sous-titres automatiques** : Génération de sous-titres en direct
3. **Analyse de contenu** : Extraction et analyse du discours du streamer
4. **Archivage** : Création de transcriptions textuelles des lives
5. **Traduction** : Base pour un système de traduction en temps réel

## Dépannage

### FFmpeg ne démarre pas

Vérifier que FFmpeg est installé :
```bash
which ffmpeg
ffmpeg -version
```

### Pas de transcription

1. Vérifier que l'audio est présent dans le flux
2. Activer les logs FFmpeg (décommenter `ff.stderr.on("data")`)
3. Vérifier la clé API OpenAI
4. Tester avec un fichier audio local

### Transcriptions coupées

- Augmenter `silence_duration_ms`
- Passer à `semantic_vad`
- Réduire l'intervalle de commit automatique

## Ressources

- [Documentation OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [WebSocket Protocol](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

## Licence

Voir [LICENSE](LICENSE) dans le projet principal.
