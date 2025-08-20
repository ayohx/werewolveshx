-- First, drop existing foreign key constraints
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_game_id_fkey;
ALTER TABLE game_actions DROP CONSTRAINT IF EXISTS game_actions_game_id_fkey;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_game_id_fkey;

-- Re-add constraints with CASCADE
ALTER TABLE players 
    ADD CONSTRAINT players_game_id_fkey 
    FOREIGN KEY (game_id) 
    REFERENCES games(id) 
    ON DELETE CASCADE;

ALTER TABLE game_actions 
    ADD CONSTRAINT game_actions_game_id_fkey 
    FOREIGN KEY (game_id) 
    REFERENCES games(id) 
    ON DELETE CASCADE;

ALTER TABLE chat_messages 
    ADD CONSTRAINT chat_messages_game_id_fkey 
    FOREIGN KEY (game_id) 
    REFERENCES games(id) 
    ON DELETE CASCADE;

-- Add new columns for game state management
ALTER TABLE games 
    ADD COLUMN IF NOT EXISTS night_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS day_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_phase_change TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS required_actions JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS completed_actions JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS phase_end_time TIMESTAMP WITH TIME ZONE;

-- Add new columns to players table
ALTER TABLE players
    ADD COLUMN IF NOT EXISTS has_shield BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS action_used BOOLEAN DEFAULT FALSE; 