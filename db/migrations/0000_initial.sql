CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    game_code TEXT NOT NULL UNIQUE,
    host_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting',
    settings JSONB NOT NULL,
    current_phase TEXT NOT NULL DEFAULT 'waiting',
    phase_timer INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) NOT NULL,
    player_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT,
    is_alive BOOLEAN DEFAULT TRUE NOT NULL,
    is_host BOOLEAN DEFAULT FALSE NOT NULL,
    is_sheriff BOOLEAN DEFAULT FALSE NOT NULL,
    joined_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE game_actions (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) NOT NULL,
    player_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    target_id TEXT,
    data JSONB,
    phase TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) NOT NULL,
    player_id TEXT,
    player_name TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'player',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

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
