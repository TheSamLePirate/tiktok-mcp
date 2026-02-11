import fs from "fs";
import OpenAI from "openai";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);
const openai = new OpenAI();

// Configuration
const INPUT_FILE = "iaProvox.mp3";
const MAX_SIZE_MB = 3; // Limite de sécurité sous les 25 MB
const OVERLAP_SECONDS = 5; // Chevauchement pour éviter de perdre du contexte
const TEMP_DIR = "temp_audio";

// Créer le dossier temporaire s'il n'existe pas
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Fonction pour obtenir la durée d'un fichier audio avec ffmpeg
async function getAudioDuration(filePath) {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
  );
  return parseFloat(stdout.trim());
}

// Fonction pour obtenir la taille d'un fichier en MB
function getFileSizeMB(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size / (1024 * 1024);
}

// Fonction pour découper un fichier audio en segments
async function splitAudioFile(inputFile, maxSizeMB, overlapSeconds) {
  console.log(`Analyse du fichier ${inputFile}...`);
  
  const totalDuration = await getAudioDuration(inputFile);
  const totalSizeMB = getFileSizeMB(inputFile);
  
  console.log(`Durée totale: ${Math.floor(totalDuration / 60)}m ${Math.floor(totalDuration % 60)}s`);
  console.log(`Taille totale: ${totalSizeMB.toFixed(2)} MB`);
  
  // Estimer la durée par segment basée sur le ratio taille/durée
  const sizePerSecond = totalSizeMB / totalDuration;
  const segmentDuration = Math.floor((maxSizeMB / sizePerSecond) * 0.95); // 95% pour marge de sécurité
  
  console.log(`Durée estimée par segment: ${Math.floor(segmentDuration / 60)}m ${Math.floor(segmentDuration % 60)}s`);
  
  const segments = [];
  let startTime = 0;
  let segmentIndex = 0;
  
  while (startTime < totalDuration) {
    const outputFile = path.join(TEMP_DIR, `segment_${segmentIndex}.mp3`);
    const duration = Math.min(segmentDuration, totalDuration - startTime);
    
    console.log(`Découpage du segment ${segmentIndex} (${Math.floor(startTime)}s - ${Math.floor(startTime + duration)}s)...`);
    
    // Utiliser ffmpeg pour extraire le segment
    await execAsync(
      `ffmpeg -i "${inputFile}" -ss ${startTime} -t ${duration} -acodec copy "${outputFile}" -y`
    );
    
    const segmentSize = getFileSizeMB(outputFile);
    console.log(`Segment ${segmentIndex} créé: ${segmentSize.toFixed(2)} MB`);
    
    segments.push({
      file: outputFile,
      startTime,
      endTime: startTime + duration,
      index: segmentIndex,
    });
    
    // Avancer au prochain segment avec chevauchement
    startTime += segmentDuration - overlapSeconds;
    segmentIndex++;
  }
  
  return segments;
}

// Fonction pour transcrire un segment
async function transcribeSegment(segment, samRef, provoxRef) {
  console.log(`\nTranscription du segment ${segment.index}...`);
  
  try {
    const transcript = await openai.audio.transcriptions.create({
      file: fs.createReadStream(segment.file),
      model: "gpt-4o-transcribe-diarize",
      response_format: "diarized_json",
      chunking_strategy: "auto",
      extra_body: {
        known_speaker_names: ["Sam", "Provox"],
        known_speaker_references: [
          "data:audio/mp3;base64," + samRef,
          "data:audio/mp3;base64," + provoxRef,
        ],
      },
    });
    
    // Ajuster les timestamps en fonction du début du segment
    transcript.segments = transcript.segments.map(seg => ({
      ...seg,
      start: seg.start + segment.startTime,
      end: seg.end + segment.startTime,
    }));
    
    console.log(`Segment ${segment.index} transcrit: ${transcript.segments.length} segments de parole`);
    console.log("Dialogue :");
    for (const seg of transcript.segments) {
      const startTime = new Date(seg.start * 1000).toISOString().substr(11, 8);
      const endTime = new Date(seg.end * 1000).toISOString().substr(11, 8);
      console.log(`[${startTime} - ${endTime}] ${seg.speaker}: ${seg.text}`);
    }
    return transcript;
  } catch (error) {
    console.error(`Erreur lors de la transcription du segment ${segment.index}:`, error.message);
    throw error;
  }
}

// Fonction pour fusionner les transcriptions
function mergeTranscripts(transcripts, overlapSeconds) {
  const allSegments = [];
  
  for (let i = 0; i < transcripts.length; i++) {
    const transcript = transcripts[i];
    
    for (const segment of transcript.segments) {
      // Pour les segments après le premier, ignorer les segments dans la zone de chevauchement
      // qui ont déjà été traités dans le segment précédent
      if (i > 0) {
        const previousTranscript = transcripts[i - 1];
        const overlapStart = previousTranscript.segments[0].start + 
                           (previousTranscript.segments[previousTranscript.segments.length - 1].end - 
                            previousTranscript.segments[0].start) - overlapSeconds;
        
        // Ignorer les segments qui commencent dans la première moitié du chevauchement
        if (segment.start < overlapStart + (overlapSeconds / 2)) {
          continue;
        }
      }
      
      allSegments.push(segment);
    }
  }
  
  return allSegments;
}

// Fonction principale
async function main() {
  try {
    console.log("=== Transcription de fichier audio volumineux ===\n");
    
    // Charger les références des speakers
    const samRef = fs.readFileSync("sam.mp3").toString("base64");
    const provoxRef = fs.readFileSync("provox.mp3").toString("base64");
    
    // Découper le fichier audio
    const segments = await splitAudioFile(INPUT_FILE, MAX_SIZE_MB, OVERLAP_SECONDS);
    console.log(`\n${segments.length} segments créés\n`);
    
    // Transcrire chaque segment
    const transcripts = [];
    for (const segment of segments) {
      const transcript = await transcribeSegment(segment, samRef, provoxRef);
      transcripts.push(transcript);
    }
    
    // Fusionner les transcriptions
    console.log("\nFusion des transcriptions...");
    const mergedSegments = mergeTranscripts(transcripts, OVERLAP_SECONDS);
    
    console.log(`\n=== Transcription terminée ===`);
    console.log(`Total de segments de parole: ${mergedSegments.length}\n`);
    
    // Afficher le résultat
    for (const segment of mergedSegments) {
      const startTime = new Date(segment.start * 1000).toISOString().substr(11, 8);
      const endTime = new Date(segment.end * 1000).toISOString().substr(11, 8);
      console.log(`[${startTime} - ${endTime}] ${segment.speaker}: ${segment.text}`);
    }
    
    // Sauvegarder dans un fichier
    const outputFile = "iaProvox_transcript.json";
    fs.writeFileSync(outputFile, JSON.stringify({ segments: mergedSegments }, null, 2));
    console.log(`\nTranscription sauvegardée dans ${outputFile}`);
    
    // Nettoyer les fichiers temporaires
    console.log("\nNettoyage des fichiers temporaires...");
    for (const segment of segments) {
      fs.unlinkSync(segment.file);
    }
    console.log("Nettoyage terminé");
    
  } catch (error) {
    console.error("Erreur:", error.message);
    process.exit(1);
  }
}

// Exécuter
main();