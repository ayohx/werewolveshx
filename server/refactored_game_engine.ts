import { gameStorage } from './refactored_storage';
import { 
  type GameState, type GameSettings, type Game, type Player, 
  type RequiredAction, gameSettingsSchema, createGameSchema, joinGameSchema
} from './refactored_schema';
import { z } from 'zod';

// ========================================
// ROBUST GAME ENGINE WITH PROPER VALIDATION
// ========================================

export class WerewolfGameEngine {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private votes: Map<string, Record<string, string>> = new Map();
  private nightActions: Map<string, Record<string, any>> = new Map();
  private seerInvestigationsLeft: Map<string, Record<string, number>> = new Map();

  // ========================================
  // GAME CREATION AND MANAGEMENT
  // ========================================

  async createGame(playerName: string, settings: GameSettings): Promise<{ success: true; gameCode: string; gameState: GameState } | { success: false; error: string }> {
    try {
      // Validate input
      const validationResult = createGameSchema.safeParse({ playerName, settings });
      if (!validationResult.success) {
        console.error('❌ Invalid game creation data:', validationResult.error.flatten());
        return { 
          success: false, 
          error: `Validation failed: ${validationResult.error.errors.map(e => e.message).join(', ')}` 
        };
      }

      // Generate unique game code
      const gameCode = this.generateGameCode();
      const hostId = this.generatePlayerId();

      console.log('🎮 Creating game:', { gameCode, hostId, playerName });

      // Validate settings
      const settingsValidation = gameSettingsSchema.safeParse(settings);
      if (!settingsValidation.success) {
        return { 
          success: false, 
          error: `Invalid game settings: ${settingsValidation.error.errors.map(e => e.message).join(', ')}` 
        };
      }

      // Create game in database
      const game = await gameStorage.createGame({
        gameCode,
        hostId,
        status: 'waiting',
        settings: settingsValidation.data,
        currentPhase: 'waiting',
        phaseTimer: 0,
        nightCount: 0,
        dayCount: 0,
        lastPhaseChange: new Date(),
        requiredActions: [],
        completedActions: [],
        phaseEndTime: null,
      });

      // Add host player
      await gameStorage.addPlayerToGame({
        gameId: game.id,
        playerId: hostId,
        name: playerName,
        isHost: true,
        isAlive: true,
        isSheriff: false,
        hasShield: false,
        actionUsed: false,
        role: null,
      });

      const gameState = await this.getGameState(gameCode);
      if (!gameState) {
        throw new Error('Failed to retrieve created game state');
      }

      console.log('✅ Game created successfully:', gameCode);
      return { success: true, gameCode, gameState };
    } catch (error) {
      console.error('❌ Failed to create game:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  async joinGame(gameCode: string, playerName: string): Promise<{ success: true; gameState: GameState } | { success: false; error: string }> {
    try {
      // Validate input
      const validationResult = joinGameSchema.safeParse({ gameCode, playerName });
      if (!validationResult.success) {
        return { 
          success: false, 
          error: `Validation failed: ${validationResult.error.errors.map(e => e.message).join(', ')}` 
        };
      }

      const game = await gameStorage.getGameByCode(gameCode);
      if (!game) {
        return { success: false, error: 'Game not found' };
      }

      if (game.status !== 'waiting') {
        return { success: false, error: 'Game has already started' };
      }

      const players = await gameStorage.getPlayersByGameId(game.id);
      
      // Check player limit
      if (players.length >= 16) {
        return { success: false, error: 'Game is full (maximum 16 players)' };
      }

      // Check if player name is already taken
      if (players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
        return { success: false, error: 'Player name is already taken' };
      }

      const playerId = this.generatePlayerId();

      // Add player to game
      await gameStorage.addPlayerToGame({
        gameId: game.id,
        playerId,
        name: playerName,
        isHost: false,
        isAlive: true,
        isSheriff: false,
        hasShield: false,
        actionUsed: false,
        role: null,
      });

      const gameState = await this.getGameState(gameCode);
      if (!gameState) {
        throw new Error('Failed to retrieve game state after joining');
      }

      console.log('✅ Player joined game:', { gameCode, playerName });
      return { success: true, gameState };
    } catch (error) {
      console.error('❌ Failed to join game:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  async getGameState(gameCode: string): Promise<GameState | null> {
    try {
      const game = await gameStorage.getGameByCode(gameCode);
      if (!game) return null;

      const players = await gameStorage.getPlayersByGameId(game.id);
      const alivePlayers = players.filter(p => p.isAlive);
      const deadPlayers = players.filter(p => !p.isAlive);
      const werewolfCount = alivePlayers.filter(p => p.role === 'werewolf').length;
      const villagerCount = alivePlayers.filter(p => p.role !== 'werewolf' && p.role !== 'minion').length;

      const gameState: GameState = {
        game,
        players,
        alivePlayers,
        deadPlayers,
        phase: game.currentPhase,
        phaseTimer: game.phaseTimer,
        votes: this.votes.get(gameCode) || {},
        nightActions: this.nightActions.get(gameCode) || {},
        seerInvestigationsLeft: this.seerInvestigationsLeft.get(gameCode) || {},
        werewolfCount,
        villagerCount,
      };

      return gameState;
    } catch (error) {
      console.error('❌ Failed to get game state:', error);
      return null;
    }
  }

  // ========================================
  // GAME FLOW MANAGEMENT
  // ========================================

  async startGame(gameCode: string, hostId: string): Promise<{ success: true; gameState: GameState } | { success: false; error: string }> {
    try {
      const gameState = await this.getGameState(gameCode);
      if (!gameState) {
        return { success: false, error: 'Game not found' };
      }

      if (gameState.game.hostId !== hostId) {
        return { success: false, error: 'Only the host can start the game' };
      }

      if (gameState.players.length < 4) {
        return { success: false, error: 'Need at least 4 players to start' };
      }

      if (gameState.players.length > 16) {
        return { success: false, error: 'Too many players (maximum 16)' };
      }

      // Assign roles
      await this.assignRoles(gameState);

      // Update game status
      await gameStorage.updateGame(gameCode, {
        status: 'in_progress',
        currentPhase: 'day',
        phaseTimer: 120,
        dayCount: 1,
      });

      // Add system message
      await gameStorage.addChatMessage({
        gameId: gameState.game.id,
        playerId: null,
        playerName: 'Game Master',
        message: 'Game has started! Day 1 begins. Discuss and find the werewolves.',
        type: 'system',
      });

      const updatedGameState = await this.getGameState(gameCode);
      if (!updatedGameState) {
        throw new Error('Failed to retrieve updated game state');
      }

      // Start day phase timer
      this.startPhaseTimer(gameCode, 120, () => this.startVotingPhase(gameCode));

      console.log('✅ Game started:', gameCode);
      return { success: true, gameState: updatedGameState };
    } catch (error) {
      console.error('❌ Failed to start game:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  private async assignRoles(gameState: GameState): Promise<void> {
    const playerCount = gameState.players.length;
    const settings = gameState.game.settings as GameSettings;
    const roles: Array<NonNullable<Player['role']>> = [];

    // Add werewolves
    const werewolfCount = Math.min(settings.werewolves, Math.floor(playerCount / 3));
    for (let i = 0; i < werewolfCount; i++) {
      roles.push('werewolf');
    }

    // Add special roles based on settings
    if (settings.seer && roles.length < playerCount) roles.push('seer');
    if (settings.doctor && roles.length < playerCount) roles.push('doctor');
    if (settings.hunter && roles.length < playerCount) roles.push('hunter');
    if (settings.witch && roles.length < playerCount) roles.push('witch');
    if (settings.bodyguard && roles.length < playerCount) roles.push('bodyguard');
    if (settings.minion && roles.length < playerCount) roles.push('minion');
    if (settings.jester && roles.length < playerCount) roles.push('jester');

    // Fill remaining with villagers
    while (roles.length < playerCount) {
      roles.push('villager');
    }

    // Shuffle arrays
    this.shuffleArray(roles);
    const shuffledPlayers = [...gameState.players];
    this.shuffleArray(shuffledPlayers);

    // Assign roles
    for (let i = 0; i < shuffledPlayers.length; i++) {
      await gameStorage.updatePlayer(gameState.game.id, shuffledPlayers[i].playerId, {
        role: roles[i],
      });

      // Set seer investigations
      if (roles[i] === 'seer') {
        const investigations = this.seerInvestigationsLeft.get(gameState.game.gameCode) || {};
        investigations[shuffledPlayers[i].playerId] = settings.seerInvestigations;
        this.seerInvestigationsLeft.set(gameState.game.gameCode, investigations);
      }
    }

    // Assign sheriff if enabled
    if (settings.sheriff) {
      const nonEvilPlayers = shuffledPlayers.filter(p => {
        const role = roles[shuffledPlayers.indexOf(p)];
        return role !== 'werewolf' && role !== 'minion';
      });

      if (nonEvilPlayers.length > 0) {
        const sheriff = nonEvilPlayers[Math.floor(Math.random() * nonEvilPlayers.length)];
        await gameStorage.updatePlayer(gameState.game.id, sheriff.playerId, {
          isSheriff: true,
        });
      }
    }
  }

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  private generateGameCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generatePlayerId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private startPhaseTimer(gameCode: string, seconds: number, callback: () => void): void {
    this.clearTimer(gameCode);
    const timer = setTimeout(callback, seconds * 1000);
    this.timers.set(gameCode, timer);
  }

  private clearTimer(gameCode: string): void {
    const timer = this.timers.get(gameCode);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(gameCode);
    }
  }

  private async startVotingPhase(gameCode: string): Promise<void> {
    // Implementation for voting phase...
    console.log('🗳️ Starting voting phase for game:', gameCode);
  }

  // ========================================
  // CLEANUP
  // ========================================

  cleanup(): void {
    // Clear all timers
    for (const [gameCode, timer] of this.timers) {
      clearTimeout(timer);
      this.timers.delete(gameCode);
    }

    // Clear game state maps
    this.votes.clear();
    this.nightActions.clear();
    this.seerInvestigationsLeft.clear();
  }
}

// Export singleton instance
export const gameEngine = new WerewolfGameEngine();