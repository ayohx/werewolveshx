import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { gameEngine } from './refactored_game_engine';
import { gameStorage } from './refactored_storage';
import { wsMessageSchema, type WSMessage } from './refactored_schema';

const app = express();
app.use(express.json());

// ========================================
// WEBSOCKET CONNECTION MANAGEMENT
// ========================================

interface ExtendedWebSocket extends WebSocket {
  gameCode?: string;
  playerId?: string;
  playerName?: string;
}

const connectedClients = new Map<string, Set<ExtendedWebSocket>>();

// ========================================
// HTTP ROUTES
// ========================================

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    // Test database connection
    const stats = await gameStorage.getGameStats();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        stats
      },
      websocket: {
        connectedClients: connectedClients.size
      }
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// WEBSOCKET SERVER SETUP
// ========================================

// ========================================
// STATIC FILE SERVING FOR FRONTEND
// ========================================

function serveStatic(app: express.Application) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    console.warn(`⚠️ Could not find build directory: ${distPath}`);
    console.warn('Frontend may not be available - make sure to build the client');
  } else {
    console.log('📁 Serving static files from:', distPath);
    app.use(express.static(distPath));

    // Catch-all handler for SPA routing
    app.use("*", (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
}

// Setup static file serving in production
if (process.env.NODE_ENV === 'production') {
  serveStatic(app);
}

const httpServer = createServer(app);

console.log('🔗 Setting up WebSocket server on path: /api/ws');
const wss = new WebSocketServer({ 
  server: httpServer, 
  path: '/api/ws',
  perMessageDeflate: false,
});

console.log('✅ WebSocket server configured');

wss.on('connection', (ws: ExtendedWebSocket, request) => {
  console.log('🔌 WebSocket client connected from:', request.socket.remoteAddress);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to Werewolf game server'
  }));

  ws.on('message', async (data: Buffer) => {
    try {
      console.log('📨 Received WebSocket message');
      const rawMessage = data.toString();
      
      let parsedMessage: any;
      try {
        parsedMessage = JSON.parse(rawMessage);
      } catch (parseError) {
        console.error('❌ Invalid JSON received:', parseError);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid JSON format'
        }));
        return;
      }

      // Validate message schema
      const validationResult = wsMessageSchema.safeParse(parsedMessage);
      if (!validationResult.success) {
        console.error('❌ Invalid message schema:', validationResult.error.flatten());
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          details: validationResult.error.errors.map(e => e.message).join(', ')
        }));
        return;
      }

      const message = validationResult.data;
      console.log('✅ Processing message type:', message.type);

      // Route message to appropriate handler
      await handleWebSocketMessage(ws, message);
    } catch (error) {
      console.error('❌ Error processing WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  });

  ws.on('close', (code, reason) => {
    console.log('❌ WebSocket client disconnected:', code, reason.toString());
    handleClientDisconnect(ws);
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// ========================================
// WEBSOCKET MESSAGE HANDLERS
// ========================================

async function handleWebSocketMessage(ws: ExtendedWebSocket, message: WSMessage): Promise<void> {
  switch (message.type) {
    case 'create_game':
      await handleCreateGame(ws, message);
      break;
    
    case 'join_game':
      await handleJoinGame(ws, message);
      break;
    
    case 'start_game':
      await handleStartGame(ws, message);
      break;
    
    case 'chat_message':
      await handleChatMessage(ws, message);
      break;
    
    case 'vote':
      await handleVote(ws, message);
      break;
    
    case 'night_action':
      await handleNightAction(ws, message);
      break;
    
    case 'leave_game':
      await handleLeaveGame(ws, message);
      break;
    
    default:
      console.warn('⚠️ Unknown message type:', (message as any).type);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Unknown message type'
      }));
  }
}

async function handleCreateGame(ws: ExtendedWebSocket, message: { type: 'create_game'; playerName: string; settings: any }): Promise<void> {
  try {
    console.log('🎮 Creating game for player:', message.playerName);
    
    const result = await gameEngine.createGame(message.playerName, message.settings);
    
    if (result.success) {
      const { gameCode, gameState } = result;
      
      // Associate WebSocket with game
      ws.gameCode = gameCode;
      ws.playerId = gameState.game.hostId;
      ws.playerName = message.playerName;
      
      // Add to connected clients
      if (!connectedClients.has(gameCode)) {
        connectedClients.set(gameCode, new Set());
      }
      connectedClients.get(gameCode)!.add(ws);
      
      console.log('✅ Game created successfully:', gameCode);
      
      ws.send(JSON.stringify({
        type: 'game_created',
        gameCode,
        gameState
      }));
      
      // Broadcast to all clients in the game
      broadcastToGame(gameCode, {
        type: 'game_updated',
        gameState
      });
    } else {
      console.error('❌ Failed to create game:', result.error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to create game',
        details: result.error
      }));
    }
  } catch (error) {
    console.error('❌ Error in handleCreateGame:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to create game',
      details: error instanceof Error ? error.message : 'Unknown error'
    }));
  }
}

async function handleJoinGame(ws: ExtendedWebSocket, message: { type: 'join_game'; gameCode: string; playerName: string }): Promise<void> {
  try {
    console.log('👤 Player joining game:', { gameCode: message.gameCode, playerName: message.playerName });
    
    const result = await gameEngine.joinGame(message.gameCode, message.playerName);
    
    if (result.success) {
      const { gameState } = result;
      
      // Find the player that just joined
      const joinedPlayer = gameState.players.find(p => p.name === message.playerName);
      if (!joinedPlayer) {
        throw new Error('Failed to find joined player');
      }
      
      // Associate WebSocket with game
      ws.gameCode = message.gameCode;
      ws.playerId = joinedPlayer.playerId;
      ws.playerName = message.playerName;
      
      // Add to connected clients
      if (!connectedClients.has(message.gameCode)) {
        connectedClients.set(message.gameCode, new Set());
      }
      connectedClients.get(message.gameCode)!.add(ws);
      
      console.log('✅ Player joined successfully:', message.playerName);
      
      ws.send(JSON.stringify({
        type: 'game_joined',
        gameState
      }));
      
      // Broadcast to all clients in the game
      broadcastToGame(message.gameCode, {
        type: 'game_updated',
        gameState
      });
      
      // Add join message to chat
      await gameStorage.addChatMessage({
        gameId: gameState.game.id,
        playerId: null,
        playerName: 'Game Master',
        message: `${message.playerName} joined the game`,
        type: 'system'
      });
    } else {
      console.error('❌ Failed to join game:', result.error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to join game',
        details: result.error
      }));
    }
  } catch (error) {
    console.error('❌ Error in handleJoinGame:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to join game',
      details: error instanceof Error ? error.message : 'Unknown error'
    }));
  }
}

async function handleStartGame(ws: ExtendedWebSocket, message: { type: 'start_game'; gameCode: string }): Promise<void> {
  try {
    if (!ws.playerId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not associated with any player'
      }));
      return;
    }
    
    console.log('🚀 Starting game:', message.gameCode);
    
    const result = await gameEngine.startGame(message.gameCode, ws.playerId);
    
    if (result.success) {
      const { gameState } = result;
      
      console.log('✅ Game started successfully:', message.gameCode);
      
      // Broadcast to all clients in the game
      broadcastToGame(message.gameCode, {
        type: 'game_started',
        gameState
      });
    } else {
      console.error('❌ Failed to start game:', result.error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to start game',
        details: result.error
      }));
    }
  } catch (error) {
    console.error('❌ Error in handleStartGame:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to start game',
      details: error instanceof Error ? error.message : 'Unknown error'
    }));
  }
}

async function handleChatMessage(ws: ExtendedWebSocket, message: { type: 'chat_message'; gameCode: string; message: string }): Promise<void> {
  // Chat implementation...
  console.log('💬 Chat message from:', ws.playerName);
}

async function handleVote(ws: ExtendedWebSocket, message: { type: 'vote'; gameCode: string; targetId: string }): Promise<void> {
  // Vote implementation...
  console.log('🗳️ Vote from:', ws.playerName);
}

async function handleNightAction(ws: ExtendedWebSocket, message: { type: 'night_action'; gameCode: string; targetId?: string; actionData?: any }): Promise<void> {
  // Night action implementation...
  console.log('🌙 Night action from:', ws.playerName);
}

async function handleLeaveGame(ws: ExtendedWebSocket, message: { type: 'leave_game'; gameCode: string }): Promise<void> {
  handleClientDisconnect(ws);
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function handleClientDisconnect(ws: ExtendedWebSocket): void {
  if (ws.gameCode) {
    const gameClients = connectedClients.get(ws.gameCode);
    if (gameClients) {
      gameClients.delete(ws);
      if (gameClients.size === 0) {
        connectedClients.delete(ws.gameCode);
      }
    }
    
    console.log('🔌 Client disconnected from game:', ws.gameCode);
  }
}

function broadcastToGame(gameCode: string, message: any): void {
  const gameClients = connectedClients.get(gameCode);
  if (gameClients) {
    const messageStr = JSON.stringify(message);
    gameClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
}

// ========================================
// SERVER STARTUP
// ========================================

const PORT = process.env.PORT || 10000;

httpServer.listen(PORT, () => {
  console.log(`🚀 REFACTORED SERVER running on port ${PORT} - NEW ARCHITECTURE ACTIVE`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}/api/ws`);
  console.log('✨ Using refactored schema and game engine - should resolve database issues');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  gameEngine.cleanup();
  httpServer.close(() => {
    console.log('✅ Server shut down complete');
    process.exit(0);
  });
});

export { app, httpServer };