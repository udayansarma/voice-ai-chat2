#!/usr/bin/env node

import WebSocket from 'ws';

console.log('🧪 Testing Azure OpenAI Realtime API WebSocket Connection\n');

const WS_URL = 'ws://localhost:5000/api/realtime/session';

console.log(`Connecting to: ${WS_URL}`);

const ws = new WebSocket(WS_URL);

let eventCount = 0;
let audioChunks = 0;
let transcriptions = 0;

ws.on('open', () => {
  console.log('✅ Connected to server\n');
  console.log('Waiting for events from Azure OpenAI...\n');
  
  // Send a test text message after a short delay
  setTimeout(() => {
    console.log('📤 Sending test text message...');
    
    ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Hello, can you introduce yourself briefly?'
          }
        ]
      }
    }));

    ws.send(JSON.stringify({
      type: 'response.create'
    }));
  }, 2000);
});

ws.on('message', (data) => {
  eventCount++;
  
  try {
    const event = JSON.parse(data.toString());
    const { type } = event;
    
    switch (type) {
      case 'session.created':
        console.log(`✅ Session created: ${event.session?.id || 'unknown'}`);
        console.log(`   Model: ${event.session?.model || 'unknown'}`);
        console.log(`   Voice: ${event.session?.voice || 'unknown'}\n`);
        break;
        
      case 'session.updated':
        console.log('✅ Session updated\n');
        break;
        
      case 'conversation.item.created':
        console.log(`📝 Conversation item created: ${event.item?.id || 'unknown'}\n`);
        break;
        
      case 'response.audio.delta':
        audioChunks++;
        if (audioChunks === 1) {
          console.log('🔊 Receiving audio chunks...');
        }
        break;
        
      case 'response.audio_transcript.delta':
        process.stdout.write(event.delta || '');
        break;
        
      case 'response.audio_transcript.done':
        console.log('\n');
        break;
        
      case 'response.done':
        console.log('✅ Response complete\n');
        console.log('📊 Statistics:');
        console.log(`   Total events: ${eventCount}`);
        console.log(`   Audio chunks: ${audioChunks}`);
        console.log(`   Transcriptions: ${transcriptions}\n`);
        console.log('Test completed successfully! 🎉');
        
        setTimeout(() => {
          ws.close();
        }, 1000);
        break;
        
      case 'error':
        console.error(`❌ Error: ${event.error?.message || 'Unknown error'}`);
        console.error(JSON.stringify(event.error, null, 2));
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        transcriptions++;
        console.log(`📝 User transcription: "${event.transcript}"\n`);
        break;
        
      default:
        console.log(`📩 Event: ${type}`);
    }
  } catch (e) {
    console.error(`❌ Failed to parse message: ${e.message}`);
  }
});

ws.on('error', (error) => {
  console.error(`❌ WebSocket error: ${error.message}`);
  process.exit(1);
});

ws.on('close', () => {
  console.log('\n👋 Connection closed');
  process.exit(0);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.error('\n⏱️  Test timeout - closing connection');
  ws.close();
  process.exit(1);
}, 30000);
