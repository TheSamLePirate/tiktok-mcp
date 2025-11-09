#!/usr/bin/env node

import { TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';
import fs from "fs";
import path from "path";

// Charger le sessionId depuis la variable d'environnement
const sessionId = process.env.TIKTOK_SESSION_ID || "a7dfb011ec6d32287cb5b4ab37cbd1d6";

/**
 * Formatte la date pour le nom de fichier
 * @returns {string} - Date au format YYYYMMDD_HHMMSS
 */
function getFormattedDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

/**
 * Formatte un timestamp pour l'affichage
 * @param {string} timestamp - ISO timestamp
 * @returns {string} - Timestamp formatté
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
}

/**
 * Écrit un message dans le fichier log
 * @param {string} logFilePath - Chemin du fichier log
 * @param {object} messageData - Données du message
 */
function logMessage(logFilePath, messageData) {
    const logLine = `[${messageData.timestamp}] ${messageData.nickname} (@${messageData.uniqueId}) [UID: ${messageData.userId}]: ${messageData.comment}\n`;
    fs.appendFileSync(logFilePath, logLine, 'utf8');
}

/**
 * Affiche un message dans la console avec couleurs
 * @param {object} messageData - Données du message
 */
function displayMessage(messageData) {
    const time = formatTimestamp(messageData.timestamp);
    console.log(`\n💬 [${time}] ${messageData.nickname} (@${messageData.uniqueId})`);
    console.log(`   ${messageData.comment}`);
}

/**
 * Connecte au chat TikTok et affiche les messages en temps réel
 * @param {string} username - Nom d'utilisateur TikTok
 */
async function connectToChat(username) {
    try {
        // Retirer le @ si présent
        const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
        
        // Créer le nom du fichier log
        const logFileName = `${cleanUsername}_${getFormattedDateTime()}.txt`;
        const logFilePath = path.join(process.cwd(), logFileName);
        
        console.log(`🔍 Connexion au chat de ${cleanUsername}...`);
        console.log(`📝 Les messages seront enregistrés dans: ${logFileName}\n`);
        
        // Créer le fichier log avec un en-tête
        const header = `=== Chat TikTok Live de @${cleanUsername} ===\n` +
                      `Début de l'enregistrement: ${new Date().toLocaleString('fr-FR')}\n` +
                      `${'='.repeat(60)}\n\n`;
        fs.writeFileSync(logFilePath, header, 'utf8');
        
        // Configuration de la connexion
        const options = {
            fetchRoomInfoOnConnect: true,
            processInitialData: true,
            //sessionId: sessionId
        };
        
        // Créer une nouvelle connexion
        //const connection = new WebcastPushConnection(cleanUsername, options);
        const connection = new TikTokLiveConnection(cleanUsername);
        
        // Compteur de messages
        let messageCount = 0;
        
        // Gérer les messages du chat
        connection.on('chat', (data) => {
            messageCount++;
            
            const messageData = {
                uniqueId: data.user.uniqueId,
                userId: data.user.userId,
                nickname: data.user.nickname,
                comment: data.comment,
                timestamp: new Date().toISOString()
            };
            
            // Afficher dans la console
            displayMessage(messageData);
            
            // Enregistrer dans le fichier
            logMessage(logFilePath, messageData);
        });
        
        // Gérer les likes
        // connection.on('like', (data) => {
        //     const likeLog = `[${new Date().toISOString()}] ❤️ ${data.nickname} (@${data.uniqueId}) a envoyé ${data.likeCount} like(s)\n`;
        //     fs.appendFileSync(logFilePath, likeLog, 'utf8');
        //     console.log(`\n❤️  ${data.nickname} a envoyé ${data.likeCount} like(s)`);
        // });
        
        // Gérer les cadeaux
        // connection.on('gift', (data) => {
        //     const giftLog = `[${new Date().toISOString()}] 🎁 ${data.nickname} (@${data.uniqueId}) a envoyé ${data.giftName} x${data.repeatCount} (${data.diamondCount} diamants)\n`;
        //     fs.appendFileSync(logFilePath, giftLog, 'utf8');
        //     console.log(`\n🎁 ${data.nickname} a envoyé ${data.giftName} x${data.repeatCount} (${data.diamondCount} diamants)`);
        // });
        
        // Gérer les nouveaux spectateurs
        // connection.on('roomUser', (data) => {
        //     const viewerLog = `[${new Date().toISOString()}] 👁️  ${data.viewerCount} spectateurs dans le live\n`;
        //     fs.appendFileSync(logFilePath, viewerLog, 'utf8');
        //     console.log(`\n👁️  ${data.viewerCount} spectateurs`);
        // });
        
        // Gérer la déconnexion
        connection.on('disconnected', () => {
            const disconnectLog = `\n${'='.repeat(60)}\n` +
                                 `Fin de l'enregistrement: ${new Date().toLocaleString('fr-FR')}\n` +
                                 `Total de messages: ${messageCount}\n` +
                                 `${'='.repeat(60)}\n`;
            fs.appendFileSync(logFilePath, disconnectLog, 'utf8');
            
            console.log(`\n\n❌ Déconnecté du chat de ${cleanUsername}`);
            console.log(`📊 Total de messages enregistrés: ${messageCount}`);
            console.log(`📝 Log sauvegardé dans: ${logFileName}`);
            process.exit(0);
        });
        
        // Gérer les erreurs
        connection.on('error', (err) => {
            console.error(`\n❌ Erreur de connexion:`, err.message);
            const errorLog = `[${new Date().toISOString()}] ❌ ERREUR: ${err.message}\n`;
            fs.appendFileSync(logFilePath, errorLog, 'utf8');
        });
        
        // Se connecter au stream
        const state = await connection.connect();
        
        console.log(`✅ Connecté au live de ${cleanUsername}!`);
        console.log(`🆔 Room ID: ${state.roomId}`);
        console.log(`👥 Spectateurs: ${state.viewerCount || 0}`);
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`Écoute des messages en cours... (Ctrl+C pour arrêter)`);
        console.log(`${'─'.repeat(60)}\n`);
        
        // Enregistrer les infos de connexion dans le fichier
        const connectionInfo = `Connecté avec succès!\n` +
                              `Room ID: ${state.roomId}\n` +
                              `Spectateurs initiaux: ${state.viewerCount || 0}\n\n` +
                              `${'─'.repeat(60)}\n` +
                              `MESSAGES DU CHAT\n` +
                              `${'─'.repeat(60)}\n\n`;
        fs.appendFileSync(logFilePath, connectionInfo, 'utf8');
        
        // Gérer l'arrêt propre avec Ctrl+C
        process.on('SIGINT', () => {
            console.log(`\n\n⏹️  Arrêt en cours...`);
            connection.disconnect();
        });
        
    } catch (error) {
        console.error(`❌ Erreur lors de la connexion au chat de ${username}:`);
        console.error(error.message);
        process.exit(1);
    }
}

// Récupérer le nom d'utilisateur depuis les arguments de ligne de commande
const username = process.argv[2];

if (!username) {
    console.log("Usage: node example-chat.js <username>");
    console.log("Exemple: node example-chat.js @username");
    console.log("\nOptional: Définir TIKTOK_SESSION_ID pour accéder à plus de fonctionnalités");
    console.log("Exemple: TIKTOK_SESSION_ID='your_session_id' node example-chat.js @username");
    process.exit(1);
}

// Démarrer la connexion au chat
connectToChat(username);
