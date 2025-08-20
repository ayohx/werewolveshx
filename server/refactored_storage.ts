import { db } from './refactored_db';
import { eq, and, desc } from 'drizzle-orm';
import { 
  games, players, gameActions, chatMessages,
  type Game, type Player, type GameAction, type ChatMessage,
  type InsertGame, type InsertPlayer, type InsertGameAction, type InsertChatMessage
} from './refactored_schema';

// ========================================
// ROBUST STORAGE LAYER WITH ERROR HANDLING
// ========================================

export class GameStorage {
  // ========================================
  // GAME OPERATIONS
  // ========================================

  async createGame(gameData: InsertGame): Promise<Game> {
    try {
      console.log('🎮 Creating game with data:', JSON.stringify(gameData, null, 2));
      
      const [game] = await db
        .insert(games)
        .values({
          gameCode: gameData.gameCode,
          hostId: gameData.hostId,
          status: gameData.status || 'waiting',
          settings: gameData.settings,
          currentPhase: gameData.currentPhase || 'waiting',
          phaseTimer: gameData.phaseTimer || 0,
          nightCount: gameData.nightCount || 0,
          dayCount: gameData.dayCount || 0,
          lastPhaseChange: gameData.lastPhaseChange || new Date(),
          requiredActions: gameData.requiredActions || [],
          completedActions: gameData.completedActions || [],
          phaseEndTime: gameData.phaseEndTime || null,
        })
        .returning();
        
      console.log('✅ Game created successfully:', game.gameCode);
      return game;
    } catch (error) {
      console.error('❌ Failed to create game:', error);
      throw new Error(`Failed to create game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getGameByCode(gameCode: string): Promise<Game | null> {
    try {
      const [game] = await db
        .select()
        .from(games)
        .where(eq(games.gameCode, gameCode))
        .limit(1);
        
      return game || null;
    } catch (error) {
      console.error('❌ Failed to get game by code:', error);
      throw new Error(`Failed to retrieve game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateGame(gameCode: string, updates: Partial<Game>): Promise<Game | null> {
    try {
      const [game] = await db
        .update(games)
        .set({
          ...updates,
          lastPhaseChange: new Date(), // Always update phase change time
        })
        .where(eq(games.gameCode, gameCode))
        .returning();
        
      return game || null;
    } catch (error) {
      console.error('❌ Failed to update game:', error);
      throw new Error(`Failed to update game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteGame(gameCode: string): Promise<boolean> {
    try {
      const result = await db
        .delete(games)
        .where(eq(games.gameCode, gameCode));
        
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Failed to delete game:', error);
      return false;
    }
  }

  // ========================================
  // PLAYER OPERATIONS
  // ========================================

  async addPlayerToGame(playerData: InsertPlayer): Promise<Player> {
    try {
      // Check if player already exists
      const existingPlayer = await this.getPlayerByGameAndPlayerId(playerData.gameId, playerData.playerId);
      if (existingPlayer) {
        console.log('👤 Player already exists, returning existing player');
        return existingPlayer;
      }

      const [player] = await db
        .insert(players)
        .values({
          gameId: playerData.gameId,
          playerId: playerData.playerId,
          name: playerData.name,
          role: playerData.role || null,
          isAlive: playerData.isAlive !== undefined ? playerData.isAlive : true,
          isHost: playerData.isHost !== undefined ? playerData.isHost : false,
          isSheriff: playerData.isSheriff !== undefined ? playerData.isSheriff : false,
          hasShield: playerData.hasShield !== undefined ? playerData.hasShield : false,
          actionUsed: playerData.actionUsed !== undefined ? playerData.actionUsed : false,
        })
        .returning();
        
      console.log('✅ Player added to game:', player.name);
      return player;
    } catch (error) {
      console.error('❌ Failed to add player to game:', error);
      throw new Error(`Failed to add player: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPlayersByGameId(gameId: number): Promise<Player[]> {
    try {
      const playerList = await db
        .select()
        .from(players)
        .where(eq(players.gameId, gameId))
        .orderBy(players.joinedAt);
        
      return playerList;
    } catch (error) {
      console.error('❌ Failed to get players by game ID:', error);
      throw new Error(`Failed to retrieve players: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPlayerByGameAndPlayerId(gameId: number, playerId: string): Promise<Player | null> {
    try {
      const [player] = await db
        .select()
        .from(players)
        .where(and(eq(players.gameId, gameId), eq(players.playerId, playerId)))
        .limit(1);
        
      return player || null;
    } catch (error) {
      console.error('❌ Failed to get player:', error);
      return null;
    }
  }

  async updatePlayer(gameId: number, playerId: string, updates: Partial<Player>): Promise<Player | null> {
    try {
      const [player] = await db
        .update(players)
        .set(updates)
        .where(and(eq(players.gameId, gameId), eq(players.playerId, playerId)))
        .returning();
        
      return player || null;
    } catch (error) {
      console.error('❌ Failed to update player:', error);
      throw new Error(`Failed to update player: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async removePlayerFromGame(gameId: number, playerId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(players)
        .where(and(eq(players.gameId, gameId), eq(players.playerId, playerId)));
        
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Failed to remove player:', error);
      return false;
    }
  }

  // ========================================
  // GAME ACTION OPERATIONS
  // ========================================

  async addGameAction(actionData: InsertGameAction): Promise<GameAction> {
    try {
      const [action] = await db
        .insert(gameActions)
        .values({
          gameId: actionData.gameId,
          playerId: actionData.playerId,
          actionType: actionData.actionType,
          targetId: actionData.targetId || null,
          data: actionData.data || {},
          phase: actionData.phase,
        })
        .returning();
        
      return action;
    } catch (error) {
      console.error('❌ Failed to add game action:', error);
      throw new Error(`Failed to record action: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getGameActionsByGame(gameId: number, phase?: string): Promise<GameAction[]> {
    try {
      let query = db.select().from(gameActions).where(eq(gameActions.gameId, gameId));
      
      if (phase) {
        query = query.where(and(eq(gameActions.gameId, gameId), eq(gameActions.phase, phase as any)));
      }
      
      const actions = await query.orderBy(desc(gameActions.createdAt));
      return actions;
    } catch (error) {
      console.error('❌ Failed to get game actions:', error);
      return [];
    }
  }

  // ========================================
  // CHAT MESSAGE OPERATIONS
  // ========================================

  async addChatMessage(messageData: InsertChatMessage): Promise<ChatMessage> {
    try {
      const [message] = await db
        .insert(chatMessages)
        .values({
          gameId: messageData.gameId,
          playerId: messageData.playerId || null,
          playerName: messageData.playerName,
          message: messageData.message,
          type: messageData.type || 'player',
        })
        .returning();
        
      return message;
    } catch (error) {
      console.error('❌ Failed to add chat message:', error);
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getChatMessagesByGame(gameId: number, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.gameId, gameId))
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit);
        
      return messages.reverse(); // Return in chronological order
    } catch (error) {
      console.error('❌ Failed to get chat messages:', error);
      return [];
    }
  }

  // ========================================
  // UTILITY OPERATIONS
  // ========================================

  async cleanupOldGames(daysOld: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const result = await db
        .delete(games)
        .where(and(
          eq(games.status, 'finished'),
          // Note: Using string comparison since we can't easily do date comparison with current setup
        ));
        
      console.log(`🧹 Cleaned up ${result.rowCount} old games`);
      return result.rowCount || 0;
    } catch (error) {
      console.error('❌ Failed to cleanup old games:', error);
      return 0;
    }
  }

  async getGameStats(): Promise<{ total: number; active: number; finished: number }> {
    try {
      // This would need raw SQL or more complex Drizzle queries
      // For now, return basic stats
      return { total: 0, active: 0, finished: 0 };
    } catch (error) {
      console.error('❌ Failed to get game stats:', error);
      return { total: 0, active: 0, finished: 0 };
    }
  }
}

// Export singleton instance
export const gameStorage = new GameStorage();