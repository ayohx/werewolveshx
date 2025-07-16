import { storage } from "../storage";
import { type Game, type Player, type GameSettings } from "@shared/schema";

export type Role = 'werewolf' | 'villager' | 'seer' | 'doctor' | 'hunter' | 'witch' | 'bodyguard' | 'minion' | 'jester';
export type Phase = 'waiting' | 'role_reveal' | 'night' | 'day' | 'voting' | 'game_over';

export interface GameState {
  game: Game;
  players: Player[];
  alivePlayers: Player[];
  deadPlayers: Player[];
  phase: Phase;
  phaseTimer: number;
  votes: Record<string, string>; // voterId -> targetId
  nightActions: Record<string, any>; // playerId -> action
  seerInvestigationsLeft: Record<string, number>; // playerId -> remaining investigations
}

export class GameLogic {
  private gameStates: Map<string, GameState> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  async getGameState(gameCode: string): Promise<GameState | undefined> {
    if (this.gameStates.has(gameCode)) {
      return this.gameStates.get(gameCode);
    }

    const game = await storage.getGameByCode(gameCode);
    if (!game) return undefined;

    const players = await storage.getPlayersByGameId(game.id);
    const alivePlayers = players.filter(p => p.isAlive);
    const deadPlayers = players.filter(p => !p.isAlive);

    const gameState: GameState = {
      game,
      players,
      alivePlayers,
      deadPlayers,
      phase: game.currentPhase as Phase,
      phaseTimer: game.phaseTimer || 0,
      votes: {},
      nightActions: {},
      seerInvestigationsLeft: {}
    };

    this.gameStates.set(gameCode, gameState);
    return gameState;
  }

  async createGame(gameCode: string, hostId: string, playerName: string, settings: GameSettings): Promise<GameState> {
    const game = await storage.createGame({
      gameCode,
      hostId,
      status: 'waiting',
      settings: settings as any,
      currentPhase: 'waiting',
      phaseTimer: 0
    });

    await storage.addPlayerToGame({
      gameId: game.id,
      playerId: hostId,
      name: playerName,
      isHost: true,
      isAlive: true,
      isSheriff: false,
      role: null
    });

    return await this.getGameState(gameCode) as GameState;
  }

  async joinGame(gameCode: string, playerId: string, playerName: string): Promise<GameState | null> {
    const gameState = await this.getGameState(gameCode);
    if (!gameState || gameState.game.status !== 'waiting') return null;

    // Check if player already exists
    const existingPlayer = await storage.getPlayerByGameAndPlayerId(gameState.game.id, playerId);
    if (existingPlayer) return gameState;

    // Check player limit
    if (gameState.players.length >= 16) return null;

    await storage.addPlayerToGame({
      gameId: gameState.game.id,
      playerId,
      name: playerName,
      isHost: false,
      isAlive: true,
      isSheriff: false,
      role: null
    });

    // Refresh game state
    const players = await storage.getPlayersByGameId(gameState.game.id);
    gameState.players = players;
    gameState.alivePlayers = players.filter(p => p.isAlive);

    return gameState;
  }

  async startGame(gameCode: string, hostId: string): Promise<GameState | null> {
    const gameState = await this.getGameState(gameCode);
    if (!gameState || gameState.game.hostId !== hostId || gameState.players.length < 4) {
      return null;
    }

    // Assign roles
    await this.assignRoles(gameState);

    // Update game status to role reveal phase
    await storage.updateGame(gameCode, {
      status: 'playing',
      currentPhase: 'role_reveal',
      phaseTimer: 10
    });

    gameState.game.status = 'playing';
    gameState.phase = 'role_reveal';
    gameState.phaseTimer = 10;

    // Start with 10-second role reveal, then transition to first night
    this.startPhaseTimer(gameCode, 10, () => this.startNightPhase(gameCode));

    return gameState;
  }

  private async assignRoles(gameState: GameState): Promise<void> {
    const players = [...gameState.players];
    const playerCount = players.length;
    const settings = gameState.game.settings as GameSettings;
    const roles: Role[] = [];

    // Add werewolves
    const werewolfCount = Math.max(1, Math.floor(playerCount * 0.3));
    for (let i = 0; i < werewolfCount; i++) {
      roles.push('werewolf');
    }

    // Add special roles based on settings
    if (settings.seer) roles.push('seer');
    if (settings.doctor) roles.push('doctor');
    if (settings.hunter) roles.push('hunter');
    if (settings.witch) roles.push('witch');
    if (settings.bodyguard) roles.push('bodyguard');
    if (settings.minion) roles.push('minion');
    if (settings.jester) roles.push('jester');

    // Fill remaining with villagers
    while (roles.length < playerCount) {
      roles.push('villager');
    }

    // Shuffle and assign
    this.shuffleArray(roles);
    this.shuffleArray(players);

    for (let i = 0; i < players.length; i++) {
      await storage.updatePlayer(gameState.game.id, players[i].playerId, {
        role: roles[i]
      });
      players[i].role = roles[i];

      // Set seer investigation limit based on settings or default rule (30% of werewolves, minimum 3)
      if (roles[i] === 'seer') {
        const customCount = settings.seerInvestigations;
        const defaultCount = Math.max(3, Math.ceil(werewolfCount * 0.3));
        const seerInvestigations = customCount || defaultCount;
        gameState.seerInvestigationsLeft[players[i].playerId] = seerInvestigations;
      }
    }

    // Assign sheriff if enabled
    if (settings.sheriff) {
      const nonWerewolves = players.filter(p => p.role !== 'werewolf' && p.role !== 'minion');
      if (nonWerewolves.length > 0) {
        const sheriff = nonWerewolves[Math.floor(Math.random() * nonWerewolves.length)];
        await storage.updatePlayer(gameState.game.id, sheriff.playerId, { isSheriff: true });
        sheriff.isSheriff = true;
      }
    }

    gameState.players = players;
    gameState.alivePlayers = players.filter(p => p.isAlive);
  }

  async handleVote(gameCode: string, playerId: string, targetId: string): Promise<boolean> {
    const gameState = await this.getGameState(gameCode);
    if (!gameState || gameState.phase !== 'voting') return false;

    // Check if player is alive
    const player = gameState.alivePlayers.find(p => p.playerId === playerId);
    if (!player) return false;

    // Record vote
    await storage.addGameAction({
      gameId: gameState.game.id,
      playerId,
      actionType: 'vote',
      targetId,
      phase: 'voting',
      data: null
    });

    gameState.votes[playerId] = targetId;

    // Check if all alive players have voted OR majority has voted (over 50%)
    const totalVoters = gameState.alivePlayers.length;
    const currentVotes = Object.keys(gameState.votes).length;
    
    if (currentVotes >= totalVoters || currentVotes > totalVoters * 0.5) {
      // All players voted or majority reached - end voting early
      this.clearTimer(gameCode);
      
      const message = currentVotes >= totalVoters 
        ? 'All players have voted! Results will be revealed in 5 seconds.'
        : 'Majority vote reached! Results will be revealed in 10 seconds.';
      
      await storage.addChatMessage({
        gameId: gameState.game.id,
        playerId: null,
        playerName: 'Game Master',
        message,
        type: 'system'
      });

      const delay = currentVotes >= totalVoters ? 5000 : 10000;
      setTimeout(() => {
        this.resolveVotingPhase(gameCode);
      }, delay);
    }

    return true;
  }

  async handleNightAction(gameCode: string, playerId: string, targetId?: string, actionData?: any): Promise<boolean> {
    const gameState = await this.getGameState(gameCode);
    if (!gameState || gameState.phase !== 'night') return false;

    const player = gameState.alivePlayers.find(p => p.playerId === playerId);
    if (!player || !this.hasNightAction(player.role as Role)) return false;

    // Check seer investigation limit
    if (player.role === 'seer') {
      const investigationsLeft = gameState.seerInvestigationsLeft[playerId] || 0;
      if (investigationsLeft <= 0) {
        return false; // No investigations left
      }
      gameState.seerInvestigationsLeft[playerId] = investigationsLeft - 1;
    }

    await storage.addGameAction({
      gameId: gameState.game.id,
      playerId,
      actionType: 'night_action',
      targetId,
      phase: 'night',
      data: actionData
    });

    gameState.nightActions[playerId] = { targetId, actionData, role: player.role };
    return true;
  }

  private hasNightAction(role: Role): boolean {
    return ['werewolf', 'seer', 'doctor', 'witch', 'bodyguard'].includes(role);
  }

  private async resolveNightPhase(gameCode: string): Promise<void> {
    const gameState = await this.getGameState(gameCode);
    if (!gameState) return;

    const killedPlayers = await this.processNightActions(gameState);
    
    // Update killed players
    for (const player of killedPlayers) {
      await storage.updatePlayer(gameState.game.id, player.playerId, { isAlive: false });
      player.isAlive = false;
    }

    // Update game state
    gameState.alivePlayers = gameState.players.filter(p => p.isAlive);
    gameState.deadPlayers = gameState.players.filter(p => !p.isAlive);
    gameState.nightActions = {};

    // Add system message about deaths
    if (killedPlayers.length > 0) {
      const names = killedPlayers.map(p => p.name).join(', ');
      await storage.addChatMessage({
        gameId: gameState.game.id,
        playerId: null,
        playerName: 'System',
        message: `${names} ${killedPlayers.length === 1 ? 'was' : 'were'} found dead this morning.`,
        type: 'death'
      });
    } else {
      await storage.addChatMessage({
        gameId: gameState.game.id,
        playerId: null,
        playerName: 'System',
        message: 'Everyone survived the night.',
        type: 'system'
      });
    }

    // Check win conditions
    const winner = this.checkWinConditions(gameState);
    if (winner) {
      await this.endGame(gameCode, winner);
      return;
    }

    // Start day phase
    setTimeout(() => this.startDayPhase(gameCode), 2000);
  }

  private async processNightActions(gameState: GameState): Promise<Player[]> {
    const killedPlayers: Player[] = [];
    const werewolfTargets: string[] = [];
    const healerProtected: string[] = [];
    const bodyguardProtected: string[] = [];

    // Process all night actions
    Object.entries(gameState.nightActions).forEach(([playerId, action]) => {
      switch (action.role) {
        case 'werewolf':
          if (action.targetId) werewolfTargets.push(action.targetId);
          break;
        case 'doctor':
          if (action.targetId) healerProtected.push(action.targetId);
          break;
        case 'bodyguard':
          if (action.targetId) bodyguardProtected.push(action.targetId);
          break;
        case 'seer':
          // Send seer result to the player
          if (action.targetId) {
            const target = gameState.players.find(p => p.playerId === action.targetId);
            if (target) {
              const investigationsLeft = gameState.seerInvestigationsLeft[playerId] || 0;
              // Store seer result for later delivery
              storage.addChatMessage({
                gameId: gameState.game.id,
                playerId: playerId,
                playerName: 'Seer Vision',
                message: `${target.name} is a ${target.role}. Investigations remaining: ${investigationsLeft}`,
                type: 'system'
              });
            }
          }
          break;
        case 'witch':
          // Witch actions are handled separately
          break;
      }
    });

    // Apply werewolf kills
    werewolfTargets.forEach(targetId => {
      if (!healerProtected.includes(targetId) && !bodyguardProtected.includes(targetId)) {
        const victim = gameState.alivePlayers.find(p => p.playerId === targetId);
        if (victim && !killedPlayers.includes(victim)) {
          killedPlayers.push(victim);
        }
      } else if (bodyguardProtected.includes(targetId)) {
        // Kill bodyguard instead
        const bodyguard = gameState.alivePlayers.find(p => 
          p.role === 'bodyguard' && 
          gameState.nightActions[p.playerId]?.targetId === targetId
        );
        if (bodyguard && !killedPlayers.includes(bodyguard)) {
          killedPlayers.push(bodyguard);
        }
      }
    });

    return killedPlayers;
  }

  private async startDayPhase(gameCode: string): Promise<void> {
    const gameState = await this.getGameState(gameCode);
    if (!gameState) return;

    await storage.updateGame(gameCode, {
      currentPhase: 'day',
      phaseTimer: 120
    });

    gameState.phase = 'day';
    gameState.phaseTimer = 120;

    await storage.addChatMessage({
      gameId: gameState.game.id,
      playerId: null,
      playerName: 'Game Master',
      message: 'Dawn breaks. Discuss what happened during the night and decide who to vote out.',
      type: 'system'
    });

    this.startPhaseTimer(gameCode, 120, () => this.startVotingPhase(gameCode));
  }

  private async startVotingPhase(gameCode: string): Promise<void> {
    const gameState = await this.getGameState(gameCode);
    if (!gameState) return;

    await storage.updateGame(gameCode, {
      currentPhase: 'voting',
      phaseTimer: 60
    });

    gameState.phase = 'voting';
    gameState.phaseTimer = 60;
    gameState.votes = {};

    await storage.addChatMessage({
      gameId: gameState.game.id,
      playerId: null,
      playerName: 'System',
      message: 'Voting phase has begun. Vote to eliminate a player.',
      type: 'system'
    });

    this.startPhaseTimer(gameCode, 60, () => this.resolveVotingPhase(gameCode));
  }

  private async resolveVotingPhase(gameCode: string): Promise<void> {
    const gameState = await this.getGameState(gameCode);
    if (!gameState) return;

    const eliminatedPlayer = this.countVotesAndGetEliminated(gameState);

    if (eliminatedPlayer) {
      await storage.updatePlayer(gameState.game.id, eliminatedPlayer.playerId, { isAlive: false });
      eliminatedPlayer.isAlive = false;

      await storage.addChatMessage({
        gameId: gameState.game.id,
        playerId: null,
        playerName: 'System',
        message: `${eliminatedPlayer.name} has been voted out! They were a ${eliminatedPlayer.role}.`,
        type: 'elimination'
      });

      // Handle special death effects
      await this.handleSpecialDeath(gameState, eliminatedPlayer, true);
    } else {
      await storage.addChatMessage({
        gameId: gameState.game.id,
        playerId: null,
        playerName: 'System',
        message: 'No one was eliminated due to a tie vote.',
        type: 'system'
      });
    }

    gameState.alivePlayers = gameState.players.filter(p => p.isAlive);
    gameState.deadPlayers = gameState.players.filter(p => !p.isAlive);

    // Check win conditions
    const winner = this.checkWinConditions(gameState);
    if (winner) {
      await this.endGame(gameCode, winner);
      return;
    }

    // Continue to next night
    setTimeout(() => this.startNightPhase(gameCode), 3000);
  }

  private async startNightPhase(gameCode: string): Promise<void> {
    const gameState = await this.getGameState(gameCode);
    if (!gameState) return;

    await storage.updateGame(gameCode, {
      currentPhase: 'night',
      phaseTimer: 180
    });

    gameState.phase = 'night';
    gameState.phaseTimer = 180;
    gameState.nightActions = {};

    await storage.addChatMessage({
      gameId: gameState.game.id,
      playerId: null,
      playerName: 'Game Master',
      message: 'Night falls over the village. Those with night abilities, make your choices wisely.',
      type: 'system'
    });

    this.startPhaseTimer(gameCode, 180, () => this.resolveNightPhase(gameCode));
  }

  private countVotesAndGetEliminated(gameState: GameState): Player | null {
    const voteCount: Record<string, number> = {};

    // Count regular votes
    Object.values(gameState.votes).forEach(targetId => {
      voteCount[targetId] = (voteCount[targetId] || 0) + 1;
    });

    // Add sheriff bonus votes
    Object.entries(gameState.votes).forEach(([voterId, targetId]) => {
      const voter = gameState.alivePlayers.find(p => p.playerId === voterId);
      if (voter?.isSheriff) {
        voteCount[targetId] = (voteCount[targetId] || 0) + 1;
      }
    });

    if (Object.keys(voteCount).length === 0) return null;

    const maxVotes = Math.max(...Object.values(voteCount));
    const candidates = Object.keys(voteCount).filter(id => voteCount[id] === maxVotes);

    if (candidates.length === 1) {
      return gameState.alivePlayers.find(p => p.playerId === candidates[0]) || null;
    }

    return null; // Tie
  }

  private checkWinConditions(gameState: GameState): string | null {
    const aliveWerewolves = gameState.alivePlayers.filter(p => p.role === 'werewolf').length;
    const aliveVillagers = gameState.alivePlayers.filter(p => 
      p.role !== 'werewolf' && p.role !== 'minion'
    ).length;

    // Check for Jester win
    const jesterWon = gameState.deadPlayers.some(p => 
      p.role === 'jester' && !p.isAlive
    );
    if (jesterWon) return 'Jester Wins!';

    // Werewolves win if they equal or outnumber villagers
    if (aliveWerewolves >= aliveVillagers && aliveVillagers > 0) {
      return 'Werewolves Win!';
    }

    // Villagers win if all werewolves are eliminated
    if (aliveWerewolves === 0) {
      return 'Villagers Win!';
    }

    return null;
  }

  private async endGame(gameCode: string, winner: string): Promise<void> {
    const gameState = await this.getGameState(gameCode);
    if (!gameState) return;

    await storage.updateGame(gameCode, {
      status: 'finished',
      currentPhase: 'game_over'
    });

    gameState.game.status = 'finished';
    gameState.phase = 'game_over';

    this.clearTimer(gameCode);

    await storage.addChatMessage({
      gameId: gameState.game.id,
      playerId: null,
      playerName: 'System',
      message: `Game Over! ${winner}`,
      type: 'system'
    });
  }

  private async handleSpecialDeath(gameState: GameState, player: Player, votedOut: boolean): Promise<void> {
    if (player.role === 'hunter') {
      // Hunter gets to eliminate someone (would need additional logic)
      await storage.addChatMessage({
        gameId: gameState.game.id,
        playerId: null,
        playerName: 'System',
        message: `${player.name} was the Hunter! They can now choose someone to eliminate.`,
        type: 'system'
      });
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

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  async leaveGame(gameCode: string, playerId: string): Promise<boolean> {
    const gameState = await this.getGameState(gameCode);
    if (!gameState) return false;

    const leavingPlayer = gameState.players.find(p => p.playerId === playerId);
    if (!leavingPlayer) return false;

    // Add disconnect message to chat
    await storage.addChatMessage({
      gameId: gameState.game.id,
      playerId: null,
      playerName: 'Game Master',
      message: `${leavingPlayer.name} has disconnected from the game.`,
      type: 'system'
    });

    const removed = await storage.removePlayerFromGame(gameState.game.id, playerId);
    if (removed) {
      // Update local state
      gameState.players = gameState.players.filter(p => p.playerId !== playerId);
      gameState.alivePlayers = gameState.alivePlayers.filter(p => p.playerId !== playerId);
      gameState.deadPlayers = gameState.deadPlayers.filter(p => p.playerId !== playerId);

      // Remove any pending votes or actions from the disconnected player
      delete gameState.votes[playerId];
      delete gameState.nightActions[playerId];
      delete gameState.seerInvestigationsLeft[playerId];

      // Handle game state based on phase and remaining players
      await this.handlePlayerDisconnection(gameState, gameCode);

      // If host left, assign new host or delete game
      const remainingHost = gameState.players.find(p => p.isHost);
      if (!remainingHost && gameState.players.length > 0) {
        const newHost = gameState.players[0];
        await storage.updatePlayer(gameState.game.id, newHost.playerId, { isHost: true });
        newHost.isHost = true;
        
        await storage.updateGame(gameCode, { hostId: newHost.playerId });
        gameState.game.hostId = newHost.playerId;

        await storage.addChatMessage({
          gameId: gameState.game.id,
          playerId: null,
          playerName: 'Game Master',
          message: `${newHost.name} is now the game host.`,
          type: 'system'
        });
      } else if (gameState.players.length === 0) {
        await storage.deleteGame(gameCode);
        this.gameStates.delete(gameCode);
        this.clearTimer(gameCode);
        return true;
      }

      // Check if game should continue or end
      if (gameState.players.length < 2) {
        await this.endGame(gameCode, 'Game ended due to insufficient players');
        return true;
      }

      // Update game state in memory
      this.gameStates.set(gameCode, gameState);
    }

    return removed;
  }

  private async handlePlayerDisconnection(gameState: GameState, gameCode: string): Promise<void> {
    // Check win conditions after player removal
    const winner = this.checkWinConditions(gameState);
    if (winner) {
      await this.endGame(gameCode, winner);
      return;
    }

    // Handle phase-specific disconnection logic
    switch (gameState.phase) {
      case 'voting':
        // Check if majority can still be reached or all players voted
        const totalVoters = gameState.alivePlayers.length;
        const currentVotes = Object.keys(gameState.votes).length;
        
        if (currentVotes >= totalVoters || currentVotes > totalVoters * 0.5) {
          // All players voted or majority reached - end voting early
          this.clearTimer(gameCode);
          setTimeout(() => {
            this.resolveVotingPhase(gameCode);
          }, 2000);
        }
        break;

      case 'night':
        // Check if all required night actions are complete
        const alivePlayersWithActions = gameState.alivePlayers.filter(p => 
          this.hasNightAction(p.role as Role)
        );
        const completedActions = Object.keys(gameState.nightActions).length;
        
        if (completedActions >= alivePlayersWithActions.length) {
          // All remaining players have acted - resolve night early
          this.clearTimer(gameCode);
          setTimeout(() => {
            this.resolveNightPhase(gameCode);
          }, 2000);
        }
        break;

      default:
        // Other phases continue normally
        break;
    }
  }
}

export const gameLogic = new GameLogic();
