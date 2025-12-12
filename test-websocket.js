// Standalone WebSocket test that won't interfere with running server
const WebSocket = require('ws');

async function testWebSocket(url, name) {
  console.log(`\n=== Testing ${name} ===`);
  console.log(`Connecting to: ${url}`);
  
  return new Promise((resolve) => {
    const ws = new WebSocket(url);
    let connected = false;
    
    const timeout = setTimeout(() => {
      if (!connected) {
        console.log(`❌ Connection timeout after 10 seconds`);
        ws.close();
        resolve(false);
      }
    }, 10000);
    
    ws.on('open', () => {
      connected = true;
      clearTimeout(timeout);
      console.log('✅ WebSocket connected successfully');
      
      // Test sending a session update message
      const testMessage = {
        type: 'session.update',
        parameters: {
          persona: '',
          mood: '',
          voice: 'alloy',
          templateName: '',
          scenarioId: '',
          temperature: 0.8
        }
      };
      
      console.log('Sending test message:', JSON.stringify(testMessage, null, 2));
      ws.send(JSON.stringify(testMessage));
      
      // Wait for response
      setTimeout(() => {
        console.log('✅ Test completed - closing connection');
        ws.close();
        resolve(true);
      }, 3000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 Received message:', JSON.stringify(message, null, 2));
      } catch (e) {
        console.log('📨 Received data:', data.toString().substring(0, 200));
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.log('❌ WebSocket error:', error.message);
      resolve(false);
    });
    
    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      console.log(`Connection closed - Code: ${code}, Reason: ${reason || 'No reason provided'}`);
      if (!connected) {
        resolve(false);
      }
    });
  });
}

async function runTests() {
  console.log('Starting WebSocket Connection Tests');
  console.log('====================================');
  
  // Test 1: Local server
  const localResult = await testWebSocket(
    'ws://localhost:5000/api/realtime/session',
    'Local Server'
  );
  
  // Test 2: Azure App Service
  const azureResult = await testWebSocket(
    'wss://udy-voice-ai-server-native.azurewebsites.net/api/realtime/session',
    'Azure App Service'
  );
  
  console.log('\n=== Test Summary ===');
  console.log(`Local Server: ${localResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Azure App Service: ${azureResult ? '✅ PASS' : '❌ FAIL'}`);
  
  // Exit cleanly
  process.exit(0);
}

runTests().catch(console.error);
