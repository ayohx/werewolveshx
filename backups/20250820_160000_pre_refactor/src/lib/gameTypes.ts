export type Role = 'werewolf' | 'villager' | 'seer' | 'doctor' | 'hunter' | 'witch' | 'bodyguard' | 'minion' | 'jester';
export type Phase = 'waiting' | 'role_reveal' | 'night' | 'day' | 'voting' | 'game_over';
export type GameStatus = 'waiting' | 'playing' | 'finished';
export type ActionType = 'kill' | 'save' | 'protect' | 'investigate' | 'poison' | 'shield' | 'vote';

export interface RequiredAction {
  role: Role;
  actionType: ActionType;
  playerId: string;
  completed: boolean;
}

export interface GameSettings {
  werewolves: number;
  seer: boolean;
  doctor: boolean;
  shield: boolean;
  minion: boolean;
  jester: boolean;
  hunter: boolean;
  witch: boolean;
  bodyguard: boolean;
  sheriff: boolean;
  seerInvestigations?: number;
  nightDuration?: number; // Duration of night phase in seconds
  dayDuration?: number;   // Duration of day phase in seconds
  voteDuration?: number;  // Duration of voting phase in seconds
}

export interface Player {
  id: number;
  gameId: number;
  playerId: string;
  name: string;
  role: Role | null;
  isAlive: boolean;
  isHost: boolean;
  isSheriff: boolean;
  joinedAt: Date;
  hasShield?: boolean;
  actionUsed?: boolean;
}

export interface Game {
  id: number;
  gameCode: string;
  hostId: string;
  status: GameStatus;
  settings: GameSettings;
  currentPhase: Phase;
  phaseTimer: number;
  createdAt: Date;
  nightCount: number;
  dayCount: number;
  lastPhaseChange: Date;
  requiredActions: RequiredAction[];
  completedActions: RequiredAction[];
  phaseEndTime: Date | null;
}

export interface ChatMessage {
  id: number;
  gameId: number;
  playerId: string | null;
  playerName: string;
  message: string;
  type: 'player' | 'system' | 'death' | 'elimination' | 'werewolf' | 'scrambled';
  createdAt: Date;
}

export interface GameState {
  game: Game;
  players: Player[];
  alivePlayers: Player[];
  deadPlayers: Player[];
  phase: Phase;
  phaseTimer: number;
  votes: Record<string, string>;
  nightActions: Record<string, any>;
  chatMessages?: ChatMessage[];
  seerInvestigationsLeft?: Record<string, number>;
  werewolfCount?: number;
  villagerCount?: number;
}

export interface WSMessage {
  type: string;
  [key: string]: any;
}

export const ROLE_INFO: Record<Role, { name: string; description: string; color: string }> = {
  werewolf: {
    name: 'WEREWOLF',
    description: 'You are a werewolf. Each night, work with your pack to eliminate a villager. Win by outnumbering the villagers.',
    color: 'text-red-500'
  },
  villager: {
    name: 'VILLAGER', 
    description: 'You are a villager. During the day, discuss and vote to eliminate the werewolves. Win by eliminating all werewolves.',
    color: 'text-green-500'
  },
  seer: {
    name: 'SEER',
    description: 'You are the seer. You have limited investigations to divine the true role of other players. Use them wisely to guide the village.',
    color: 'text-blue-500'
  },
  doctor: {
    name: 'DOCTOR',
    description: 'You are the doctor. Each night, you can protect one player from werewolf attacks. You can save yourself or others.',
    color: 'text-emerald-500'
  },
  hunter: {
    name: 'HUNTER',
    description: 'You are the hunter. When you die, you can choose another player to eliminate with you.',
    color: 'text-amber-500'
  },
  witch: {
    name: 'WITCH',
    description: 'You are the witch. You have one healing potion and one poison potion to use during the game.',
    color: 'text-purple-500'
  },
  bodyguard: {
    name: 'BODYGUARD',
    description: 'You are the bodyguard. Each night, you can protect a player. If they are attacked, you die instead of them.',
    color: 'text-cyan-500'
  },
  minion: {
    name: 'MINION',
    description: 'You are the minion. You appear as a villager but win with the werewolves. You know who the werewolves are.',
    color: 'text-red-500'
  },
  jester: {
    name: 'JESTER',
    description: 'You are the jester. Your goal is to be voted out by the villagers. If you succeed, you win the game!',
    color: 'text-orange-500'
  }
};
