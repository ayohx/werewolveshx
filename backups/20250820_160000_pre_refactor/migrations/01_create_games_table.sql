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
