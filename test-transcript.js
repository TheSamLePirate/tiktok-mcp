#!/usr/bin/env node

/**
 * Test script for Transcript Tools
 * 
 * This script demonstrates how to use the transcript tools
 * with a TikTok livestream.
 * 
 * Usage:
 *   export OPENAI_API_KEY="your-api-key"
 *   node test-transcript.js <stream-url>
 * 
 * Or test with connection:
 *   node test-transcript.js @username
 */

import { TikTokLiveConnection } from 'tiktok-live-connector';
import { normalizeUsername, extractStreamUrl } from './utils.js';

const input = process.argv[2];

if (!input) {
  console.error('Usage: node test-transcript.js <stream-url|@username>');
  process.exit(1);
}

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable not set');
  console.error('Set it with: export OPENAI_API_KEY="your-api-key"');
  process.exit(1);
}

async function testWithUsername(username) {
  console.log(`\n📡 Connecting to ${username}'s livestream...`);
  
  const connection = new TikTokLiveConnection(username, {
    fetchRoomInfoOnConnect: true,
    processInitialData: true,
  });

  try {
    const state = await connection.connect();
    const streamUrl = extractStreamUrl(state.roomInfo);
    
    console.log(`✅ Connected to Room ID: ${state.roomId}`);
    console.log(`👥 Viewers: ${state.viewerCount || 0}`);
    
    if (streamUrl === "No stream URL available") {
      console.error('❌ No stream URL available');
      connection.disconnect();
      process.exit(1);
    }
    
    console.log(`\n🎥 Stream URL obtained`);
    console.log(`URL: ${streamUrl.substring(0, 80)}...`);
    
    console.log(`\n💡 To use this with transcription:`);
    console.log(`\n1. Use the MCP tool "start-transcript" with this stream URL:`);
    console.log(`   streamUrl: "${streamUrl}"`);
    console.log(`   language: "fr"`);
    
    console.log(`\n2. Monitor with "show-transcript" tool`);
    console.log(`\n3. Stop with "stop-transcript" tool when done`);
    
    connection.disconnect();
    
  } catch (error) {
    console.error(`❌ Failed to connect: ${error.message}`);
    process.exit(1);
  }
}

async function testWithUrl(url) {
  console.log(`\n🎥 Stream URL provided: ${url.substring(0, 80)}...`);
  
  console.log(`\n💡 To use this with transcription:`);
  console.log(`\n1. Use the MCP tool "start-transcript" with this stream URL:`);
  console.log(`   streamUrl: "${url}"`);
  console.log(`   language: "fr"`);
  
  console.log(`\n2. Monitor with "show-transcript" tool`);
  console.log(`\n3. Stop with "stop-transcript" tool when done`);
  
  console.log(`\n📝 Example MCP tool calls:`);
  console.log(`\nStart transcription:`);
  console.log(JSON.stringify({
    tool: 'start-transcript',
    arguments: {
      streamUrl: url,
      language: 'fr'
    }
  }, null, 2));
  
  console.log(`\nShow transcript (after some time):`);
  console.log(JSON.stringify({
    tool: 'show-transcript',
    arguments: {
      sessionId: 'transcript-1-1699564800000' // Example session ID
    }
  }, null, 2));
  
  console.log(`\nList all sessions:`);
  console.log(JSON.stringify({
    tool: 'list-transcripts',
    arguments: {}
  }, null, 2));
  
  console.log(`\nStop transcription:`);
  console.log(JSON.stringify({
    tool: 'stop-transcript',
    arguments: {
      sessionId: 'transcript-1-1699564800000' // Use actual session ID
    }
  }, null, 2));
}

// Main
(async () => {
  console.log('🎤 Transcript Tools Test Script');
  console.log('================================\n');
  
  if (input.startsWith('http')) {
    await testWithUrl(input);
  } else {
    const username = normalizeUsername(input);
    await testWithUsername(username);
  }
  
  console.log('\n✨ Done!\n');
})();
