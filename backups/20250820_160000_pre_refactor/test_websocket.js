#!/usr/bin/env node

import WebSocket from 'ws';

console.log('🧪 Testing WebSocket connection to Railway...');

const wsUrl = 'wss://werewolveshx-production.up.railway.app/api/ws';
console.log('🔗 Connecting to:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully!');
  
  // Test sending a create_game message
  const testMessage = {
    type: 'create_game',
    playerName: 'TestUser',
    settings: {
      werewolves: 2,
      seer: true,
      doctor: true,
      shield: true,
      minion: false,
      jester: false,
      hunter: false,
      witch: false,
      bodyguard: false,
      sheriff: false,
      seerInvestigations: 3
    }
  };
  
  console.log('📤 Sending test message:', testMessage.type);
  ws.send(JSON.stringify(testMessage));
});

ws.on('message', (data) => {
  console.log('📥 Received message:', data.toString());
});

ws.on('close', (code, reason) => {
  console.log('❌ WebSocket closed:', code, reason.toString());
});

ws.on('error', (error) => {
  console.error('💥 WebSocket error:', error.message);
});

// Close after 10 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - closing connection');
  ws.close();
  process.exit(0);
}, 10000);
