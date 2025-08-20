#!/usr/bin/env node

import WebSocket from 'ws';

console.log('🧪 Testing REFACTORED WebSocket connection to Railway...');

const wsUrl = 'wss://werewolveshx-production.up.railway.app/api/ws';
console.log('🔗 Connecting to:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.onopen = () => {
  console.log('✅ WebSocket connected successfully!');
  
  // Test with properly validated message
  const testMessage = {
    type: 'create_game',
    playerName: 'RefactoredTestUser',
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
  
  console.log('📤 Sending refactored test message: create_game');
  console.log('📋 Message payload:', JSON.stringify(testMessage, null, 2));
  ws.send(JSON.stringify(testMessage));
};

ws.onmessage = (event) => {
  console.log('📥 Received message from refactored server:');
  
  try {
    const data = JSON.parse(event.data.toString());
    console.log('✅ Parsed response:', JSON.stringify(data, null, 2));
    
    if (data.type === 'game_created') {
      console.log('🎉 SUCCESS: Game created with code:', data.gameCode);
      console.log('🎮 Game state received:', data.gameState ? 'Yes' : 'No');
    } else if (data.type === 'error') {
      console.log('❌ ERROR:', data.message);
      console.log('📝 Details:', data.details || 'No details provided');
    } else if (data.type === 'connected') {
      console.log('🔌 Connection confirmed:', data.message);
      return; // Don't close on connection message
    }
    
    // Close after receiving response
    setTimeout(() => {
      console.log('✅ Test completed, closing connection');
      ws.close();
    }, 1000);
  } catch (parseError) {
    console.error('❌ Failed to parse response:', parseError);
    console.log('📄 Raw response:', event.data.toString());
  }
};

ws.onerror = (error) => {
  console.error('❌ WebSocket error:', error.message);
};

ws.onclose = (event) => {
  console.log(`🔌 WebSocket closed: ${event.code} ${event.reason || '(no reason)'}`);
  
  if (event.code === 1006) {
    console.log('⚠️  Code 1006 indicates abnormal closure - server may have crashed');
  } else if (event.code === 1000) {
    console.log('✅ Clean closure - test completed successfully');
  }
};

// Timeout for safety
setTimeout(() => {
  if (ws.readyState === WebSocket.OPEN) {
    console.log('⏰ Test timeout - closing connection');
    ws.close();
  }
}, 15000);