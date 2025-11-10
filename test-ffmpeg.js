/**
 * Script de test pour vérifier FFmpeg et tester une URL FLV
 */

import { spawn } from 'child_process';

console.log('🔍 Test de FFmpeg...\n');

// Test 1: Vérifier que FFmpeg est installé
console.log('Test 1: Installation de FFmpeg');
const versionTest = spawn('ffmpeg', ['-version']);

let versionOutput = '';
versionTest.stdout.on('data', (data) => {
  versionOutput += data.toString();
});

versionTest.stderr.on('data', (data) => {
  versionOutput += data.toString();
});

versionTest.on('error', (error) => {
  console.error('❌ FFmpeg n\'est pas installé ou n\'est pas dans le PATH');
  console.error('\n📦 Installation sur macOS:');
  console.error('   brew install ffmpeg');
  console.error('\n📦 Installation sur Linux:');
  console.error('   sudo apt-get install ffmpeg  # Debian/Ubuntu');
  console.error('   sudo yum install ffmpeg      # RedHat/CentOS');
  process.exit(1);
});

versionTest.on('close', (code) => {
  if (code === 0) {
    console.log('✅ FFmpeg est installé');
    const version = versionOutput.split('\n')[0];
    console.log(`   ${version}\n`);
    
    // Test 2: Tester l'URL FLV si fournie
    const streamUrl = process.argv[2];
    if (streamUrl) {
      console.log('Test 2: Connexion au flux FLV');
      console.log(`URL: ${streamUrl}\n`);
      
      const probeTest = spawn('ffmpeg', [
        '-i', streamUrl,
        '-t', '1',
        '-f', 'null',
        '-'
      ]);
      
      let probeOutput = '';
      let hasError = false;
      
      probeTest.stderr.on('data', (data) => {
        probeOutput += data.toString();
      });
      
      probeTest.on('close', (code) => {
        if (probeOutput.includes('Invalid data found') || 
            probeOutput.includes('Connection refused') ||
            probeOutput.includes('Server returned 4') ||
            probeOutput.includes('403') ||
            probeOutput.includes('404')) {
          console.error('❌ Impossible de se connecter au flux');
          console.error('\n💡 Raisons possibles:');
          console.error('   - URL expirée (vérifiez le paramètre "expire")');
          console.error('   - Flux non disponible ou terminé');
          console.error('   - Restrictions géographiques ou d\'accès');
          console.error('\n📋 Détails techniques:');
          console.error(probeOutput.substring(0, 500));
        } else if (probeOutput.includes('Input #0')) {
          console.log('✅ Connexion au flux réussie!');
          
          // Extraire les informations du flux
          const audioMatch = probeOutput.match(/Audio: ([^,]+)/);
          if (audioMatch) {
            console.log(`   Audio détecté: ${audioMatch[1]}`);
          }
          
          const durationMatch = probeOutput.match(/Duration: ([^,]+)/);
          if (durationMatch) {
            console.log(`   Durée: ${durationMatch[1]}`);
          }
          
          console.log('\n✅ Tout est prêt pour la transcription!');
          console.log('\n🚀 Lancement:');
          console.log(`   node transcriptStreamRealTime.js "${streamUrl}"`);
        } else {
          console.log('⚠️  Flux testé mais résultat incertain');
          console.log('\n📋 Output FFmpeg:');
          console.log(probeOutput.substring(0, 500));
        }
      });
    } else {
      console.log('✅ FFmpeg est opérationnel!');
      console.log('\n💡 Pour tester une URL FLV:');
      console.log('   node test-ffmpeg.js "https://example.com/stream.flv"');
    }
  } else {
    console.error('❌ Erreur lors du test de FFmpeg');
  }
});
