// flv2realtime.js
import WebSocket from "ws";
import { spawn } from "node:child_process";
import process from "node:process";

const INPUT = process.argv[2];
if (!INPUT) {
  console.error("Usage: node flv2realtime.js <flv-url|path>");
  process.exit(1);
}

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}

// --- 1) WebSocket Realtime (transcription seule) ---
const url = "wss://api.openai.com/v1/realtime?model=gpt-realtime-2025-08-28";

const ws = new WebSocket(url, {
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "OpenAI-Beta": "realtime=v1",
  },
});

// Affiche les transcripts en direct
ws.on("message", (data) => {
  try {
    const msg = JSON.parse(data.toString());
    
    // Événements VAD - détection de parole
    if (msg.type === "input_audio_buffer.speech_started") {
      //console.log("\n[🎤 Speech started]");
    }
    if (msg.type === "input_audio_buffer.speech_stopped") {
      //console.log("\n[🔇 Speech stopped]");
    }
    
    // Events de transcription incrémentale / finale
    if (msg.type === "conversation.item.input_audio_transcription.delta" && msg.delta) {
      //process.stdout.write(msg.delta);
    }
    if (msg.type === "conversation.item.input_audio_transcription.completed" && msg.transcript) {
      //console.log("FINAL: ");  
      console.log( msg.transcript);
    }
    
    // Événements de session
    if (msg.type === "session.created" || msg.type === "session.updated") {
      console.log(`[Session] ${msg.type}`);
    }
    
    if (msg.type === "error") {
      //console.error("\n[RT ERROR]", msg.error || msg);
    }
  } catch {
    // ignore
  }
});

ws.on("open", () => {
  console.log("[Connected] Configuring transcription session...");
  
  // Configure la session en mode transcription
  // Vous pouvez changer "server_vad" en "semantic_vad" pour de meilleurs chunks
  ws.send(
    JSON.stringify({
      type: "session.update",
      session: {
        modalities: ["text"],
        input_audio_format: "pcm16",
        input_audio_transcription: {
          model: "gpt-4o-transcribe",
          language: "fr"
        },
        turn_detection: {
            type: "server_vad",
            threshold: 0.2,
            prefix_padding_ms: 100,
            silence_duration_ms: 100
        },
        // turn_detection: {
        //     type: "semantic_vad",
        //     eagerness: "high", // optional
        //     //create_response: true, // only in conversation mode
        //     //interrupt_response: true, // only in conversation mode
        // }
      },
    }),
  );

  // --- 2) ffmpeg: n'envoie que l'audio du flux FLV ---
  // Démultiplexe et convertit en PCM 24kHz mono 16-bit little-endian
  console.log("[Starting ffmpeg...]");
  const ff = spawn("ffmpeg", [
    "-re", // lire en temps réel
    "-i",
    INPUT,
    "-vn", // AUCUNE vidéo: audio seulement
    "-ac",
    "1",
    "-ar",
    "24000",
    "-f",
    "s16le",
    "pipe:1",
  ]);

  ff.stderr.on("data", (c) => {
    // console.error(c.toString()); // décommentez pour debug ffmpeg
  });

  ff.on("close", (code) => {
    // Commit final quand ffmpeg s'arrête
    try {
      ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
    } catch {}
    console.error(`ffmpeg exited (${code})`);
  });

  // Avec semantic_vad, on envoie en continu mais on commit périodiquement
  // pour forcer la transcription des segments longs
  let lastCommit = Date.now();

  ff.stdout.on("data", (chunk) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    
    // Encode et envoie l'audio
    const b64 = chunk.toString("base64");
    ws.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: b64,
      }),
    );
    
    // Commit toutes les 20 secondes pour forcer la transcription
    const now = Date.now();
    if (now - lastCommit >= 60000) {
      ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      lastCommit = now;
    }
  });
});

ws.on("close", () => {
  console.error("WS closed");
  process.exit(0);
});

ws.on("error", (err) => {
  console.error("WS error:", err);
});