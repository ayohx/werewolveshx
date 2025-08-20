-- ========================================
-- REFACTORED WEREWOLF GAME SCHEMA
-- Complete rebuild with proper constraints and indexes
-- ========================================

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS game_actions CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ========================================
-- GAMES TABLE WITH PROPER CONSTRAINTS
-- ========================================
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    game_code TEXT NOT NULL UNIQUE CHECK (LENGTH(game_code) = 6),
    host_id TEXT NOT NULL CHECK (LENGTH(host_id) > 0),
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'starting', 'in_progress', 'finished')),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    current_phase TEXT NOT NULL DEFAULT 'waiting' CHECK (current_phase IN ('waiting', 'day', 'night', 'voting', 'finished')),
    phase_timer INTEGER NOT NULL DEFAULT 0 CHECK (phase_timer >= 0),
    night_count INTEGER NOT NULL DEFAULT 0 CHECK (night_count >= 0),
    day_count INTEGER NOT NULL DEFAULT 0 CHECK (day_count >= 0),
    last_phase_change TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    required_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    completed_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    phase_end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- PLAYERS TABLE WITH PROPER RELATIONSHIPS
-- ========================================
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL CHECK (LENGTH(player_id) > 0),
    name TEXT NOT NULL CHECK (LENGTH(name) BETWEEN 1 AND 20),
    role TEXT CHECK (role IN ('villager', 'werewolf', 'seer', 'doctor', 'sheriff', 'hunter', 'witch', 'bodyguard', 'minion', 'jester')),
    is_alive BOOLEAN NOT NULL DEFAULT TRUE,
    is_host BOOLEAN NOT NULL DEFAULT FALSE,
    is_sheriff BOOLEAN NOT NULL DEFAULT FALSE,
    has_shield BOOLEAN NOT NULL DEFAULT FALSE,
    action_used BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique player per game
    CONSTRAINT unique_player_per_game UNIQUE (game_id, player_id),
    
    -- Ensure only one host per game
    CONSTRAINT one_host_per_game EXCLUDE (game_id WITH =) WHERE (is_host = TRUE),
    
    -- Ensure only one sheriff per game
    CONSTRAINT one_sheriff_per_game EXCLUDE (game_id WITH =) WHERE (is_sheriff = TRUE)
);

-- ========================================
-- GAME ACTIONS TABLE FOR TRACKING ACTIONS
-- ========================================
CREATE TABLE game_actions (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL CHECK (LENGTH(player_id) > 0),
    action_type TEXT NOT NULL CHECK (action_type IN ('vote', 'investigate', 'heal', 'kill', 'protect', 'hunt', 'poison', 'antidote')),
    target_id TEXT,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    phase TEXT NOT NULL CHECK (phase IN ('day', 'night', 'voting')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- CHAT MESSAGES TABLE FOR GAME COMMUNICATION
-- ========================================
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id TEXT,
    player_name TEXT NOT NULL CHECK (LENGTH(player_name) BETWEEN 1 AND 20),
    message TEXT NOT NULL CHECK (LENGTH(message) BETWEEN 1 AND 500),
    type TEXT NOT NULL DEFAULT 'player' CHECK (type IN ('player', 'system', 'action', 'death', 'vote', 'werewolf', 'scrambled', 'elimination')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- PERFORMANCE INDEXES
-- ========================================

-- Games table indexes
CREATE INDEX idx_games_code ON games(game_code);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_created ON games(created_at);
CREATE INDEX idx_games_host ON games(host_id);

-- Players table indexes
CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_players_player_id ON players(player_id);
CREATE INDEX idx_players_role ON players(role);
CREATE INDEX idx_players_alive ON players(is_alive);

-- Game actions indexes
CREATE INDEX idx_actions_game_id ON game_actions(game_id);
CREATE INDEX idx_actions_type ON game_actions(action_type);
CREATE INDEX idx_actions_phase ON game_actions(phase);
CREATE INDEX idx_actions_player ON game_actions(player_id);
CREATE INDEX idx_actions_created ON game_actions(created_at);

-- Chat messages indexes
CREATE INDEX idx_chat_game_id ON chat_messages(game_id);
CREATE INDEX idx_chat_created ON chat_messages(created_at);
CREATE INDEX idx_chat_type ON chat_messages(type);

-- ========================================
-- UTILITY FUNCTIONS
-- ========================================

-- Function to get all players in a game
CREATE OR REPLACE FUNCTION get_game_players(game_code_param TEXT)
RETURNS TABLE(
    player_id TEXT,
    name TEXT,
    role TEXT,
    is_alive BOOLEAN,
    is_host BOOLEAN,
    is_sheriff BOOLEAN,
    has_shield BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.player_id, p.name, p.role, p.is_alive, p.is_host, p.is_sheriff, p.has_shield
    FROM players p
    JOIN games g ON p.game_id = g.id
    WHERE g.game_code = game_code_param
    ORDER BY p.joined_at;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old finished games
CREATE OR REPLACE FUNCTION cleanup_old_games(days_old INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM games 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_old 
    AND status = 'finished';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get game statistics
CREATE OR REPLACE FUNCTION get_game_stats()
RETURNS TABLE(
    total_games INTEGER,
    active_games INTEGER,
    finished_games INTEGER,
    total_players INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM games) as total_games,
        (SELECT COUNT(*)::INTEGER FROM games WHERE status IN ('waiting', 'starting', 'in_progress')) as active_games,
        (SELECT COUNT(*)::INTEGER FROM games WHERE status = 'finished') as finished_games,
        (SELECT COUNT(*)::INTEGER FROM players) as total_players;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- SAMPLE DATA FOR TESTING
-- ========================================

INSERT INTO games (game_code, host_id, settings) VALUES 
('TEST01', 'host-001', '{"werewolves": 2, "seer": true, "doctor": true, "seerInvestigations": 3}'::jsonb);

INSERT INTO players (game_id, player_id, name, is_host) VALUES 
(1, 'host-001', 'Test Host', true);

INSERT INTO chat_messages (game_id, player_id, player_name, message, type) VALUES 
(1, null, 'Game Master', 'Welcome to the refactored Werewolf game!', 'system');

-- ========================================
-- VERIFICATION
-- ========================================

-- Verify schema creation
DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('games', 'players', 'game_actions', 'chat_messages');
    
    SELECT COUNT(*) INTO index_count FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
    
    SELECT COUNT(*) INTO function_count FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name IN ('get_game_players', 'cleanup_old_games', 'get_game_stats');
    
    RAISE NOTICE 'Schema verification: % tables, % indexes, % functions created', table_count, index_count, function_count;
    
    IF table_count = 4 AND index_count >= 14 AND function_count = 3 THEN
        RAISE NOTICE '✅ Refactored schema applied successfully!';
    ELSE
        RAISE WARNING '⚠️ Schema verification failed - some objects may be missing';
    END IF;
END $$;

-- Final status
SELECT 'Refactored Werewolf Game Schema - Ready for Production!' as status;