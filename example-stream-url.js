#!/usr/bin/env node

import { WebcastPushConnection } from "tiktok-live-connector";

// Charger le sessionId depuis la variable d'environnement
const sessionId = process.env.TIKTOK_SESSION_ID || "a7dfb011ec6d32287cb5b4ab37cbd1d6";

/**
 * Récupère l'URL de stream pour un utilisateur TikTok donné
 * @param {string} username - Nom d'utilisateur TikTok (avec ou sans @)
 * @returns {Promise<object>} - Objet contenant les URLs de stream
 */
async function getStreamUrl(username) {
    try {
        // Retirer le @ si présent
        const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
        
        console.log(`🔍 Connexion à ${cleanUsername}...`);
        
        // Configuration de la connexion
        const options = {
            fetchRoomInfoOnConnect: true,
            processInitialData: true,
            sessionId: sessionId
        };
        
        // Créer une nouvelle connexion
        const connection = new WebcastPushConnection(cleanUsername, options);
        
        // Se connecter au stream
        const state = await connection.connect();
        
        // Extraire les URLs de stream
        const streamUrls = state.roomInfo?.stream_url || {};
        
        // Déconnecter immédiatement
        connection.disconnect();
        
        console.log(`\n✅ URLs de stream pour @${cleanUsername}:\n`);
        
        // Afficher les différentes URLs disponibles
        if (streamUrls.flv_pull_url) {
            console.log(`📺 FLV Pull URL:\n${JSON.stringify(streamUrls.flv_pull_url, null, 2)}\n`);
        }
        
        if (streamUrls.hls_pull_url) {
            console.log(`📺 HLS Pull URL:\n${streamUrls.hls_pull_url}\n`);
        }
        
        if (streamUrls.rtmp_pull_url) {
            console.log(`📺 RTMP Pull URL:\n${streamUrls.rtmp_pull_url}\n`);
        }
        
        if (streamUrls.hls_pull_url_map) {
            console.log(`📺 HLS Pull URL Map:\n${JSON.stringify(streamUrls.hls_pull_url_map, null, 2)}\n`);
        }
        
        // Afficher toutes les URLs brutes
        //console.log(`📋 Toutes les URLs de stream (brut):\n${JSON.stringify(streamUrls, null, 2)}\n`);
        
        return streamUrls;
        
    } catch (error) {
        console.error(`❌ Erreur lors de la récupération de l'URL de stream pour ${username}:`);
        console.error(error.message);
        throw error;
    }
}

// Récupérer le nom d'utilisateur depuis les arguments de ligne de commande
const username = process.argv[2];

if (!username) {
    console.log("Usage: node example-stream-url.js <username>");
    console.log("Exemple: node example-stream-url.js @username");
    process.exit(1);
}

// Exécuter la fonction
getStreamUrl(username)
    .then(() => {
        console.log("✅ Terminé!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Échec:", error.message);
        process.exit(1);
    });
