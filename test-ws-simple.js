const WebSocket = require('ws');

console.log('Starting WebSocket Connection Tests');
console.log('====================================\n');

// Test configurations
const tests = [
  {
    name: 'Local Server',
    url: 'ws://localhost:5000/api/realtime/session'
  },
  {
    name: 'Azure App Service',
    url: 'wss://udy-voice-ai-server-native.azurewebsites.net/api/realtime/session'
  }
];

// Test message with parameters property
const testMessage = {
  parameters: {
    persona: '',
    mood: '',
    name: '',
    gender: undefined,
    voice: '',
    templateName: '',
    scenarioId: ''
  }
};

async function testEndpoint(config) {
  return new Promise((resolve) => {
    console.log(`=== Testing ${config.name} ===`);
    console.log(`Connecting to: ${config.url}`);
    
    const ws = new WebSocket(config.url);
    const messages = [];
    let connected = false;
    
    const timeout = setTimeout(() => {
      if (!connected) {
        console.log('❌ Connection timeout');
        ws.close();
        resolve({ success: false, messages, error: 'timeout' });
      }
    }, 10000);
    
    ws.on('open', () => {
      connected = true;
      console.log('✅ WebSocket connected successfully');
      console.log('Sending test message:', JSON.stringify(testMessage, null, 2));
      ws.send(JSON.stringify(testMessage));
      
      // Wait for responses
      setTimeout(() => {
        clearTimeout(timeout);
        console.log('✅ Test completed - closing connection\n');
        ws.close();
        resolve({ success: true, messages });
      }, 3000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        messages.push(message);
        console.log('📨 Received message:', JSON.stringify(message, null, 2));
      } catch (err) {
        console.log('📨 Received (non-JSON):', data.toString());
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.log('❌ WebSocket error:', error.message);
      resolve({ success: false, messages, error: error.message });
    });
    
    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      console.log(`Connection closed - Code: ${code}, Reason: ${reason || '(none)'}`);
      if (!connected) {
        resolve({ success: false, messages, error: 'connection_failed' });
      }
    });
  });
}

// Run tests sequentially
(async () => {
  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test);
    results.push({ name: test.name, ...result });
  }
  
  // Summary
  console.log('=== Test Summary ===');
  results.forEach(result => {
    const hasError = result.messages.some(m => m.type === 'error');
    const hasSessionUpdated = result.messages.some(m => m.type === 'session.updated');
    
    if (result.success && !hasError && hasSessionUpdated) {
      console.log(`${result.name}: ✅ PASS (session.updated received)`);
    } else if (result.success && !hasError) {
      console.log(`${result.name}: ⚠️ PARTIAL (connected but no session.updated)`);
    } else if (hasError) {
      console.log(`${result.name}: ❌ FAIL (error: ${result.messages.find(m => m.type === 'error')?.error})`);
    } else {
      console.log(`${result.name}: ❌ FAIL (${result.error})`);
    }
  });
  
  process.exit(0);
})();
