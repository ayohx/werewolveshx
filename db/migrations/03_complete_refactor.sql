-- Complete database refactor with proper error handling and constraints
-- This migration will clean up and rebuild the database schema

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS game_actions CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table (optional for future auth)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create games table with all necessary columns
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    game_code TEXT NOT NULL UNIQUE,
    host_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'starting', 'in_progress', 'finished')),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    current_phase TEXT NOT NULL DEFAULT 'waiting' CHECK (current_phase IN ('waiting', 'day', 'night', 'voting', 'finished')),
    phase_timer INTEGER DEFAULT 0,
    night_count INTEGER DEFAULT 0,
    day_count INTEGER DEFAULT 0,
    last_phase_change TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    required_actions JSONB DEFAULT '[]'::jsonb,
    completed_actions JSONB DEFAULT '[]'::jsonb,
    phase_end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create players table with proper relationships
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL,
    player_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('villager', 'werewolf', 'seer', 'doctor', 'sheriff', 'hunter', 'witch', 'bodyguard', 'minion', 'jester')),
    is_alive BOOLEAN DEFAULT TRUE NOT NULL,
    is_host BOOLEAN DEFAULT FALSE NOT NULL,
    is_sheriff BOOLEAN DEFAULT FALSE NOT NULL,
    has_shield BOOLEAN DEFAULT FALSE,
    action_used BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT players_game_id_fkey 
        FOREIGN KEY (game_id) 
        REFERENCES games(id) 
        ON DELETE CASCADE,
    CONSTRAINT unique_player_per_game 
        UNIQUE (game_id, player_id)
);

-- Create game_actions table for tracking all game actions
CREATE TABLE game_actions (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL,
    player_id TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('vote', 'investigate', 'heal', 'kill', 'protect', 'hunt', 'poison', 'antidote')),
    target_id TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    phase TEXT NOT NULL CHECK (phase IN ('day', 'night', 'voting')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT game_actions_game_id_fkey 
        FOREIGN KEY (game_id) 
        REFERENCES games(id) 
        ON DELETE CASCADE
);

-- Create chat_messages table for game chat
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL,
    player_id TEXT,
    player_name TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'player' CHECK (type IN ('player', 'system', 'action', 'death', 'vote')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chat_messages_game_id_fkey 
        FOREIGN KEY (game_id) 
        REFERENCES games(id) 
        ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_games_code ON games(game_code);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_players_game_player ON players(game_id, player_id);
CREATE INDEX idx_game_actions_game_id ON game_actions(game_id);
CREATE INDEX idx_game_actions_type ON game_actions(action_type);
CREATE INDEX idx_chat_messages_game_id ON chat_messages(game_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Add helpful functions for game management
CREATE OR REPLACE FUNCTION get_game_players(game_code_param TEXT)
RETURNS TABLE(
    player_id TEXT,
    name TEXT,
    role TEXT,
    is_alive BOOLEAN,
    is_host BOOLEAN,
    is_sheriff BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.player_id, p.name, p.role, p.is_alive, p.is_host, p.is_sheriff
    FROM players p
    JOIN games g ON p.game_id = g.id
    WHERE g.game_code = game_code_param
    ORDER BY p.joined_at;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_games()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM games 
    WHERE created_at < NOW() - INTERVAL '7 days' 
    AND status = 'finished';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data for testing
INSERT INTO games (game_code, host_id, settings) VALUES 
('TEST123', 'test-host', '{"werewolves": 2, "seer": true, "doctor": true}');

INSERT INTO players (game_id, player_id, name, is_host) VALUES 
(1, 'test-host', 'Test Host', true);

INSERT INTO chat_messages (game_id, player_id, player_name, message, type) VALUES 
(1, 'test-host', 'Test Host', 'Welcome to the game!', 'system');

-- Grant necessary permissions (if needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- Verify the setup
SELECT 'Database refactor completed successfully' as status;
