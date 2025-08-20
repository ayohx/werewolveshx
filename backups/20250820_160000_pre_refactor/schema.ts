import { pgTable, serial, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  gameCode: text("game_code").notNull().unique(),
  hostId: text("host_id").notNull(),
  status: text("status").notNull().default("waiting"),
  settings: jsonb("settings").notNull(),
  currentPhase: text("current_phase").notNull().default("waiting"),
  phaseTimer: integer("phase_timer").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  nightCount: integer("night_count").default(0),
  dayCount: integer("day_count").default(0),
  lastPhaseChange: timestamp("last_phase_change").defaultNow(),
  requiredActions: jsonb("required_actions").default("[]"),
  completedActions: jsonb("completed_actions").default("[]"),
  phaseEndTime: timestamp("phase_end_time"),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  playerId: text("player_id").notNull(),
  name: text("name").notNull(),
  role: text("role"),
  isAlive: boolean("is_alive").notNull().default(true),
  isHost: boolean("is_host").notNull().default(false),
  isSheriff: boolean("is_sheriff").notNull().default(false),
  hasShield: boolean("has_shield").default(false),
  actionUsed: boolean("action_used").default(false),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const gameActions = pgTable("game_actions", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  playerId: text("player_id").notNull(),
  actionType: text("action_type").notNull(),
  targetId: text("target_id"),
  data: jsonb("data"),
  phase: text("phase").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  playerId: text("player_id"),
  playerName: text("player_name").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("player"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Zod schemas
export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  joinedAt: true,
});

export const insertGameActionSchema = createInsertSchema(gameActions).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;
export type InsertGameAction = z.infer<typeof insertGameActionSchema>;
export type GameAction = typeof gameActions.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Game settings schema
export const gameSettingsSchema = z.object({
  werewolves: z.number().min(1),
  seer: z.boolean().default(true),
  doctor: z.boolean().default(true),
  shield: z.boolean().default(true),
  minion: z.boolean().default(false),
  jester: z.boolean().default(false),
  hunter: z.boolean().default(false),
  witch: z.boolean().default(false),
  bodyguard: z.boolean().default(false),
  sheriff: z.boolean().default(false),
  seerInvestigations: z.number().min(1).max(20).optional(),
});

export type GameSettings = z.infer<typeof gameSettingsSchema>;

// WebSocket message types
export const wsMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("join_game"),
    gameCode: z.string(),
    playerName: z.string(),
  }),
  z.object({
    type: z.literal("create_game"),
    playerName: z.string(),
    settings: gameSettingsSchema,
  }),
  z.object({
    type: z.literal("start_game"),
    gameCode: z.string(),
  }),
  z.object({
    type: z.literal("chat_message"),
    gameCode: z.string(),
    message: z.string(),
  }),
  z.object({
    type: z.literal("vote"),
    gameCode: z.string(),
    targetId: z.string(),
  }),
  z.object({
    type: z.literal("night_action"),
    gameCode: z.string(),
    targetId: z.string().optional(),
    actionData: z.any().optional(),
  }),
  z.object({
    type: z.literal("leave_game"),
    gameCode: z.string(),
  }),
]);

export type WSMessage = z.infer<typeof wsMessageSchema>;
