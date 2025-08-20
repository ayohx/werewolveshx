import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { gameLogic } from "./services/gameLogic";
import { wsMessageSchema, type WSMessage, gameSettingsSchema } from "../shared/schema";

type ExtendedWebSocket = WebSocket & {
  playerId?: string;
  gameCode?: string;
  playerName?: string;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // REST API routes
  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      const { migrationStatus } = await import('./db.js');
      res.json({ 
        status: "ok",
        database: {
          migration_status: migrationStatus,
          connected: migrationStatus === 'completed'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.json({ 
        status: "ok",
        database: {
          migration_status: "unknown",
          connected: false
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get game state
  app.get("/api/games/:gameCode", async (req: Request, res: Response) => {
    try {
      const { gameCode } = req.params;
      const game = await storage.getGameByCode(gameCode.toUpperCase());
      
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      const players = await storage.getPlayersByGameId(game.id);
      const chatMessages = await storage.getChatMessagesByGame(game.id);

      res.json({
        game,
        players,
        chatMessages
      });
    } catch (error) {
      console.error("Error fetching game:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/api/ws'
  });

  const gameConnections = new Map<string, Set<ExtendedWebSocket>>();

  wss.on('connection', (ws: WebSocket) => {
    const extendedWs = ws as ExtendedWebSocket;
    console.log('WebSocket client connected');

    extendedWs.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WSMessage;
        const validatedMessage = wsMessageSchema.parse(message);

        await handleWebSocketMessage(extendedWs, validatedMessage);
      } catch (error) {
        console.error('WebSocket message error:', error);
        extendedWs.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    extendedWs.on('close', async () => {
      console.log('WebSocket client disconnected');
      
      if (extendedWs.gameCode && extendedWs.playerId) {
        // Handle player leaving the game
        const success = await gameLogic.leaveGame(extendedWs.gameCode, extendedWs.playerId);
        
        if (success) {
          // Broadcast updated game state to remaining players
          await broadcastGameState(extendedWs.gameCode);
        }
        
        // Remove from connections
        const connections = gameConnections.get(extendedWs.gameCode);
        if (connections) {
          connections.delete(extendedWs);
          if (connections.size === 0) {
            gameConnections.delete(extendedWs.gameCode);
          }
        }

        // Broadcast player left
        await broadcastToGame(extendedWs.gameCode, {
          type: 'player_left',
          playerId: extendedWs.playerId,
          playerName: extendedWs.playerName
        });

        // Send updated game state
        const gameState = await gameLogic.getGameState(extendedWs.gameCode);
        if (gameState) {
          await broadcastGameState(extendedWs.gameCode);
        }
      }
    });
  });

  async function handleWebSocketMessage(ws: ExtendedWebSocket, message: WSMessage) {
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
    }
  }

  async function handleCreateGame(ws: ExtendedWebSocket, message: { type: 'create_game'; playerName: string; settings: any }) {
    try {
      const playerId = generatePlayerId();
      const gameCode = generateGameCode();
      
      const validatedSettings = gameSettingsSchema.parse(message.settings);
      
      const gameState = await gameLogic.createGame(gameCode, playerId, message.playerName, validatedSettings);
      
      ws.playerId = playerId;
      ws.gameCode = gameCode;
      ws.playerName = message.playerName;

      // Add to connections
      if (!gameConnections.has(gameCode)) {
        gameConnections.set(gameCode, new Set());
      }
      gameConnections.get(gameCode)!.add(ws);

      ws.send(JSON.stringify({
        type: 'game_created',
        gameCode,
        playerId,
        gameState
      }));

    } catch (error) {
      console.error('Error creating game:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to create game'
      }));
    }
  }

  async function handleJoinGame(ws: ExtendedWebSocket, message: { type: 'join_game'; gameCode: string; playerName: string }) {
    try {
      const playerId = generatePlayerId();
      const gameCode = message.gameCode.toUpperCase();
      
      const gameState = await gameLogic.joinGame(gameCode, playerId, message.playerName);
      
      if (!gameState) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Game not found or game already started'
        }));
        return;
      }

      ws.playerId = playerId;
      ws.gameCode = gameCode;
      ws.playerName = message.playerName;

      // Add to connections
      if (!gameConnections.has(gameCode)) {
        gameConnections.set(gameCode, new Set());
      }
      gameConnections.get(gameCode)!.add(ws);

      ws.send(JSON.stringify({
        type: 'game_joined',
        gameCode,
        playerId,
        gameState
      }));

      // Broadcast to other players
      await broadcastToGame(gameCode, {
        type: 'player_joined',
        playerId,
        playerName: message.playerName
      }, ws);

      // Send updated game state to all
      await broadcastGameState(gameCode);

    } catch (error) {
      console.error('Error joining game:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to join game'
      }));
    }
  }

  async function handleStartGame(ws: ExtendedWebSocket, message: { type: 'start_game'; gameCode: string }) {
    try {
      if (!ws.playerId) return;

      const gameState = await gameLogic.startGame(message.gameCode, ws.playerId);
      
      if (!gameState) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Cannot start game - not host or insufficient players'
        }));
        return;
      }

      await broadcastToGame(message.gameCode, {
        type: 'game_started'
      });

      await broadcastGameState(message.gameCode);

    } catch (error) {
      console.error('Error starting game:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to start game'
      }));
    }
  }

  async function handleChatMessage(ws: ExtendedWebSocket, message: { type: 'chat_message'; gameCode: string; message: string }) {
    try {
      if (!ws.playerId) return;

      const success = await gameLogic.handleChat(message.gameCode, ws.playerId, message.message);

      if (success) {
        await broadcastGameState(message.gameCode);
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Cannot send chat message'
        }));
      }

    } catch (error) {
      console.error('Error handling chat message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to send chat message'
      }));
    }
  }

  async function handleVote(ws: ExtendedWebSocket, message: { type: 'vote'; gameCode: string; targetId: string }) {
    try {
      if (!ws.playerId) return;

      const success = await gameLogic.handleVote(message.gameCode, ws.playerId, message.targetId);
      
      if (success) {
        ws.send(JSON.stringify({
          type: 'vote_recorded',
          targetId: message.targetId
        }));

        await broadcastGameState(message.gameCode);
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid vote'
        }));
      }

    } catch (error) {
      console.error('Error handling vote:', error);
    }
  }

  async function handleNightAction(ws: ExtendedWebSocket, message: { type: 'night_action'; gameCode: string; targetId?: string; actionData?: any }) {
    try {
      if (!ws.playerId) return;

      const success = await gameLogic.handleNightAction(message.gameCode, ws.playerId, message.targetId, message.actionData);
      
      if (success) {
        ws.send(JSON.stringify({
          type: 'night_action_recorded',
          targetId: message.targetId
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid night action'
        }));
      }

    } catch (error) {
      console.error('Error handling night action:', error);
    }
  }

  async function handleLeaveGame(ws: ExtendedWebSocket, message: { type: 'leave_game'; gameCode: string }) {
    try {
      if (!ws.playerId) return;

      await gameLogic.leaveGame(message.gameCode, ws.playerId);
      
      // Remove from connections
      const connections = gameConnections.get(message.gameCode);
      if (connections) {
        connections.delete(ws);
      }

      ws.send(JSON.stringify({
        type: 'left_game'
      }));

      // Broadcast to remaining players
      await broadcastToGame(message.gameCode, {
        type: 'player_left',
        playerId: ws.playerId,
        playerName: ws.playerName
      });

      await broadcastGameState(message.gameCode);

    } catch (error) {
      console.error('Error leaving game:', error);
    }
  }

  async function broadcastToGame(gameCode: string, message: any, exclude?: ExtendedWebSocket) {
    const connections = gameConnections.get(gameCode);
    if (!connections) return;

    const messageStr = JSON.stringify(message);
    
    connections.forEach(ws => {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  async function broadcastGameState(gameCode: string) {
    const gameState = await gameLogic.getGameState(gameCode);
    if (!gameState) return;

    const chatMessages = await storage.getChatMessagesByGame(gameState.game.id);

    await broadcastToGame(gameCode, {
      type: 'game_state_update',
      gameState: {
        ...gameState,
        chatMessages
      }
    });
  }

  function generateGameCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function generatePlayerId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  return httpServer;
}
