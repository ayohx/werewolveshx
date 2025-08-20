import { useState, useCallback } from 'react';
import { GameState, GameSettings, Player, ChatMessage } from '@/lib/gameTypes';
import { useWebSocket } from './useWebSocket';
import { useToast } from './use-toast';

export function useGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [currentScreen, setCurrentScreen] = useState<'initial' | 'settings' | 'lobby' | 'game'>('initial');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [showVoteOverlay, setShowVoteOverlay] = useState(false);
  const [showNightActionOverlay, setShowNightActionOverlay] = useState(false);
  const [showGameOverOverlay, setShowGameOverOverlay] = useState(false);
  const [hasPerformedNightAction, setHasPerformedNightAction] = useState(false);

  const { sendMessage, onMessage, isConnected } = useWebSocket();
  const { toast } = useToast();

  // WebSocket message handlers
  onMessage('game_created', (message) => {
    setGameState(message.gameState);
    setPlayerId(message.playerId);
    setCurrentScreen('lobby');
    toast({
      title: "Game Created",
      description: `Game code: ${message.gameCode}`,
    });
  });

  onMessage('game_joined', (message) => {
    setGameState(message.gameState);
    setPlayerId(message.playerId);
    setCurrentScreen('lobby');
    toast({
      title: "Joined Game",
      description: `Welcome to the game!`,
    });
  });

  onMessage('game_started', () => {
    setCurrentScreen('game');
    setShowRoleReveal(true);
    toast({
      title: "Game Started",
      description: "The game has begun!",
    });
  });

  onMessage('game_state_update', (message) => {
    setGameState(message.gameState);
    
    // Handle phase transitions
    if (message.gameState.phase === 'night') {
      setHasPerformedNightAction(false); // Reset night action state
      const currentPlayer = message.gameState.alivePlayers.find((p: Player) => p.playerId === playerId);
      if (currentPlayer && hasNightAction(currentPlayer.role)) {
        setTimeout(() => {
          if (!showRoleReveal) { // Only show night action if role reveal is done
            setShowNightActionOverlay(true);
          }
        }, 2000);
      }
    } else if (message.gameState.phase === 'day') {
      setShowNightActionOverlay(false);
      setHasPerformedNightAction(false);
    } else if (message.gameState.phase === 'game_over') {
      setShowGameOverOverlay(true);
      setShowNightActionOverlay(false);
      setShowVoteOverlay(false);
    }
  });

  onMessage('player_joined', (message) => {
    toast({
      title: "Player Joined",
      description: `${message.playerName} joined the game`,
    });
  });

  onMessage('player_left', (message) => {
    toast({
      title: "Player Left",
      description: `${message.playerName} left the game`,
    });
  });

  onMessage('chat_message', (message) => {
    // Chat messages are handled in the GameState update
  });

  onMessage('vote_recorded', () => {
    setShowVoteOverlay(false);
    setSelectedPlayer(null);
    toast({
      title: "Vote Recorded",
      description: "Your vote has been recorded",
    });
  });

  onMessage('night_action_recorded', () => {
    setShowNightActionOverlay(false);
    setSelectedPlayer(null);
    setHasPerformedNightAction(true);
    toast({
      title: "Action Recorded",
      description: "Your night action has been recorded",
    });
  });

  onMessage('error', (message) => {
    toast({
      title: "Error",
      description: message.message,
      variant: "destructive",
    });
  });

  const createGame = useCallback((name: string, settings: GameSettings) => {
    setPlayerName(name);
    sendMessage({
      type: 'create_game',
      playerName: name,
      settings
    });
  }, [sendMessage]);

  const joinGame = useCallback((gameCode: string, name: string) => {
    setPlayerName(name);
    sendMessage({
      type: 'join_game',
      gameCode: gameCode.toUpperCase(),
      playerName: name
    });
  }, [sendMessage]);

  const startGame = useCallback(() => {
    if (gameState) {
      sendMessage({
        type: 'start_game',
        gameCode: gameState.game.gameCode
      });
    }
  }, [sendMessage, gameState]);

  const sendChatMessage = useCallback((message: string) => {
    if (gameState) {
      sendMessage({
        type: 'chat_message',
        gameCode: gameState.game.gameCode,
        message
      });
    }
  }, [sendMessage, gameState]);

  const vote = useCallback((targetId: string) => {
    if (gameState) {
      sendMessage({
        type: 'vote',
        gameCode: gameState.game.gameCode,
        targetId
      });
    }
  }, [sendMessage, gameState]);

  const performNightAction = useCallback((targetId?: string, actionData?: any) => {
    if (gameState) {
      sendMessage({
        type: 'night_action',
        gameCode: gameState.game.gameCode,
        targetId,
        actionData
      });
    }
  }, [sendMessage, gameState]);

  const leaveGame = useCallback(() => {
    if (gameState) {
      sendMessage({
        type: 'leave_game',
        gameCode: gameState.game.gameCode
      });
    }
    
    // Reset local state
    setGameState(null);
    setPlayerId(null);
    setPlayerName('');
    setCurrentScreen('initial');
    setSelectedPlayer(null);
    setShowRoleReveal(false);
    setShowVoteOverlay(false);
    setShowNightActionOverlay(false);
    setShowGameOverOverlay(false);
    setHasPerformedNightAction(false);
  }, [sendMessage, gameState]);

  const hasNightAction = (role: string | null): boolean => {
    return role ? ['werewolf', 'seer', 'doctor', 'witch', 'bodyguard'].includes(role) : false;
  };

  const getCurrentPlayer = (): Player | undefined => {
    if (!gameState || !playerId) return undefined;
    return gameState.players.find(p => p.playerId === playerId);
  };

  const getPlayerRole = (): string | null => {
    const player = getCurrentPlayer();
    return player?.role || null;
  };

  const isHost = (): boolean => {
    const player = getCurrentPlayer();
    return player?.isHost || false;
  };

  const isAlive = (): boolean => {
    const player = getCurrentPlayer();
    return player?.isAlive || false;
  };

  const canVote = (): boolean => {
    return gameState?.phase === 'voting' && isAlive();
  };

  const canChat = (): boolean => {
    return gameState?.phase !== 'night' && isAlive();
  };

  return {
    gameState,
    playerId,
    playerName,
    currentScreen,
    selectedPlayer,
    showRoleReveal,
    showVoteOverlay,
    showNightActionOverlay,
    showGameOverOverlay,
    hasPerformedNightAction,
    isConnected,
    
    // Actions
    createGame,
    joinGame,
    startGame,
    sendChatMessage,
    vote,
    performNightAction,
    leaveGame,
    
    // UI Actions
    setCurrentScreen,
    setSelectedPlayer,
    setShowRoleReveal,
    setShowVoteOverlay,
    setShowNightActionOverlay,
    setShowGameOverOverlay,
    setHasPerformedNightAction,
    
    // Computed properties
    getCurrentPlayer,
    getPlayerRole,
    isHost,
    isAlive,
    canVote,
    canChat,
    hasNightAction: () => hasNightAction(getPlayerRole())
  };
}
