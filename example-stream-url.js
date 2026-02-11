#!/usr/bin/env node

import { TikTokLiveConnection, WebcastEvent ,WebcastPushConnection} from 'tiktok-live-connector';

// Charger le sessionId depuis la variable d'environnement

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
            fetchRoomInfoOnConnect: false,
            processInitialData: false,
            sessionId:"b427a71163104c8833491455a6655af9",
            ttTargetIdc:"eu-ttp2",
            signApiKey:"euler_ZTJkN2JhNWUyMDc0OTU5ODY4ZGMyZGE5ZjU5ZWYzM2MwNzAzNmJjOTJkM2EwZDVlN2I4ZDI5",
            
        };
        
        // Créer une nouvelle connexion
        //const connection = new WebcastPushConnection(cleanUsername, options);
        const connection = new TikTokLiveConnection(cleanUsername,options);

        //const connection = new WebcastPushConnection(cleanUsername, options);

        
        // Se connecter au stream


        

        const state = await connection.connect().catch((err)=>{console.log(err)});



        //console.log(state);

        
        
        const roomInfo=await connection.fetchRoomInfo();

        console.log("Stream url:",roomInfo?.data.stream_url.flv_pull_url);

        return "state";




        // Extraire les URLs de stream
        const streamUrls = state.roomInfo?.data.stream_url || {};
        
        // Déconnecter immédiatement
        connection.disconnect();

        exit();
        
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
