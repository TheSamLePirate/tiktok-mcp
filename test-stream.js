/**
 * Script de test rapide pour tester une URL FLV sans transcription
 * Usage: node test-stream.js
 */

import { spawn } from 'child_process';

// Remplacez par votre URL
const streamUrl = "https://pull-f5-tt04.tiktokcdn-eu.com/stage/stream-1271210437271356737_sd.flv?expire=1763863158&sign=46044db6fb41c9dc7329aa05df297a64";

console.log('🔍 Test de connexion au flux FLV...\n');
console.log('URL:', streamUrl, '\n');

const ffmpeg = spawn('ffmpeg', [
  '-loglevel', 'info',
  '-user_agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  '-headers', 'Referer: https://www.tiktok.com/',
  '-i', streamUrl,
  '-t', '5',  // Tester seulement 5 secondes
  '-f', 'null',
  '-'
], {
  shell: false
});

let hasConnected = false;

ffmpeg.stderr.on('data', (data) => {
  const message = data.toString();
  
  if (message.includes('Input #0')) {
    console.log('✅ Connexion réussie au flux!\n');
    hasConnected = true;
  }
  
  if (message.includes('Audio:')) {
    const audioMatch = message.match(/Audio: ([^\n]+)/);
    if (audioMatch) {
      console.log('🎵 Audio détecté:', audioMatch[1]);
    }
  }
  
  if (message.includes('Video:')) {
    const videoMatch = message.match(/Video: ([^\n]+)/);
    if (videoMatch) {
      console.log('🎬 Vidéo détectée:', videoMatch[1]);
    }
  }
  
  if (message.includes('Duration:')) {
    const durationMatch = message.match(/Duration: ([^,]+)/);
    if (durationMatch) {
      console.log('⏱️  Durée:', durationMatch[1]);
    }
  }
  
  if (message.includes('Error') || message.includes('Invalid')) {
    console.error('❌', message.trim());
  }
});

ffmpeg.on('error', (error) => {
  console.error('❌ Erreur:', error.message);
});

ffmpeg.on('close', (code) => {
  if (code === 0 && hasConnected) {
    console.log('\n✅ Test réussi! Le flux fonctionne correctement.');
    console.log('\n🚀 Vous pouvez maintenant lancer la transcription:');
    console.log(`   node transcriptStreamRealTime.js "${streamUrl}"`);
  } else if (!hasConnected) {
    console.error('\n❌ Impossible de se connecter au flux');
    console.error('\n💡 Vérifications:');
    console.error('   - L\'URL est-elle encore valide?');
    console.error('   - Le paramètre "expire" n\'est-il pas dépassé?');
    console.error('   - Le flux est-il toujours actif?');
  }
});
