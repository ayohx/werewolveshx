import { pgTable, serial, text, timestamp, boolean, integer, jsonb, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ========================================
// CORE GAME TABLES WITH PROPER CONSTRAINTS
// ========================================

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  gameCode: text("game_code").notNull().unique(),
  hostId: text("host_id").notNull(),
  status: text("status").notNull().default("waiting").$type<'waiting' | 'starting' | 'in_progress' | 'finished'>(),
  settings: jsonb("settings").notNull(),
  currentPhase: text("current_phase").notNull().default("waiting").$type<'waiting' | 'day' | 'night' | 'voting' | 'finished'>(),
  phaseTimer: integer("phase_timer").default(0).notNull(),
  nightCount: integer("night_count").default(0).notNull(),
  dayCount: integer("day_count").default(0).notNull(),
  lastPhaseChange: timestamp("last_phase_change", { withTimezone: true }).defaultNow().notNull(),
  requiredActions: jsonb("required_actions").default("[]").notNull(),
  completedActions: jsonb("completed_actions").default("[]").notNull(),
  phaseEndTime: timestamp("phase_end_time", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  gameCodeIdx: index("idx_games_code").on(table.gameCode),
  statusIdx: index("idx_games_status").on(table.status),
  createdAtIdx: index("idx_games_created").on(table.createdAt),
}));

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  playerId: text("player_id").notNull(),
  name: text("name").notNull(),
  role: text("role").$type<'villager' | 'werewolf' | 'seer' | 'doctor' | 'sheriff' | 'hunter' | 'witch' | 'bodyguard' | 'minion' | 'jester' | null>(),
  isAlive: boolean("is_alive").notNull().default(true),
  isHost: boolean("is_host").notNull().default(false),
  isSheriff: boolean("is_sheriff").notNull().default(false),
  hasShield: boolean("has_shield").default(false).notNull(),
  actionUsed: boolean("action_used").default(false).notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  gamePlayerUnique: unique("unique_player_per_game").on(table.gameId, table.playerId),
  gameIdIdx: index("idx_players_game_id").on(table.gameId),
  playerIdIdx: index("idx_players_player_id").on(table.playerId),
}));

export const gameActions = pgTable("game_actions", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  playerId: text("player_id").notNull(),
  actionType: text("action_type").notNull().$type<'vote' | 'investigate' | 'heal' | 'kill' | 'protect' | 'hunt' | 'poison' | 'antidote'>(),
  targetId: text("target_id"),
  data: jsonb("data").default("{}").notNull(),
  phase: text("phase").notNull().$type<'day' | 'night' | 'voting'>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  gameIdIdx: index("idx_actions_game_id").on(table.gameId),
  actionTypeIdx: index("idx_actions_type").on(table.actionType),
  phaseIdx: index("idx_actions_phase").on(table.phase),
}));

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  playerId: text("player_id"),
  playerName: text("player_name").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("player").$type<'player' | 'system' | 'action' | 'death' | 'vote' | 'werewolf' | 'scrambled' | 'elimination'>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  gameIdIdx: index("idx_chat_game_id").on(table.gameId),
  createdAtIdx: index("idx_chat_created").on(table.createdAt),
}));

// ========================================
// VALIDATION SCHEMAS WITH PROPER RULES
// ========================================

export const gameSettingsSchema = z.object({
  werewolves: z.number().min(1).max(10),
  seer: z.boolean().default(true),
  doctor: z.boolean().default(true),
  shield: z.boolean().default(true),
  minion: z.boolean().default(false),
  jester: z.boolean().default(false),
  hunter: z.boolean().default(false),
  witch: z.boolean().default(false),
  bodyguard: z.boolean().default(false),
  sheriff: z.boolean().default(false),
  seerInvestigations: z.number().min(1).max(20).default(3),
}).strict().refine((data) => {
  // Validate werewolf count vs total special roles
  const specialRoles = [
    data.seer, data.doctor, data.hunter, data.witch, 
    data.bodyguard, data.minion, data.jester
  ].filter(Boolean).length;
  
  return data.werewolves + specialRoles <= 16; // Max 16 players
}, {
  message: "Too many special roles for the number of werewolves",
});

export const createGameSchema = z.object({
  playerName: z.string().min(1).max(20).regex(/^[a-zA-Z0-9\s]+$/, "Name can only contain letters, numbers, and spaces"),
  settings: gameSettingsSchema,
});

export const joinGameSchema = z.object({
  gameCode: z.string().length(6).regex(/^[A-Z0-9]{6}$/, "Game code must be 6 uppercase letters/numbers"),
  playerName: z.string().min(1).max(20).regex(/^[a-zA-Z0-9\s]+$/, "Name can only contain letters, numbers, and spaces"),
});

// ========================================
// TYPE DEFINITIONS
// ========================================

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
});

export const selectGameSchema = createSelectSchema(games);
export const insertPlayerSchema = createInsertSchema(players).omit({ id: true, joinedAt: true });
export const insertGameActionSchema = createInsertSchema(gameActions).omit({ id: true, createdAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type GameAction = typeof gameActions.$inferSelect;
export type InsertGameAction = z.infer<typeof insertGameActionSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type GameSettings = z.infer<typeof gameSettingsSchema>;

// ========================================
// WEBSOCKET MESSAGE SCHEMAS
// ========================================

export const wsMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create_game"),
    playerName: z.string().min(1).max(20),
    settings: gameSettingsSchema,
  }),
  z.object({
    type: z.literal("join_game"),
    gameCode: z.string().length(6),
    playerName: z.string().min(1).max(20),
  }),
  z.object({
    type: z.literal("start_game"),
    gameCode: z.string().length(6),
  }),
  z.object({
    type: z.literal("chat_message"),
    gameCode: z.string().length(6),
    message: z.string().min(1).max(500),
  }),
  z.object({
    type: z.literal("vote"),
    gameCode: z.string().length(6),
    targetId: z.string(),
  }),
  z.object({
    type: z.literal("night_action"),
    gameCode: z.string().length(6),
    targetId: z.string().optional(),
    actionData: z.any().optional(),
  }),
  z.object({
    type: z.literal("leave_game"),
    gameCode: z.string().length(6),
  }),
]);

export type WSMessage = z.infer<typeof wsMessageSchema>;

// ========================================
// GAME STATE TYPES
// ========================================

export interface GameState {
  game: Game;
  players: Player[];
  alivePlayers: Player[];
  deadPlayers: Player[];
  phase: Game['currentPhase'];
  phaseTimer: number;
  votes: Record<string, string>;
  nightActions: Record<string, any>;
  seerInvestigationsLeft: Record<string, number>;
  werewolfCount: number;
  villagerCount: number;
}

export interface RequiredAction {
  role: NonNullable<Player['role']>;
  actionType: GameAction['actionType'];
  playerId: string;
  completed: boolean;
}