-- Fix missing columns in the games table
-- Add missing columns if they don't exist

-- Check if night_count column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'games' AND column_name = 'night_count') THEN
        ALTER TABLE games ADD COLUMN night_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added night_count column to games table';
    ELSE
        RAISE NOTICE 'night_count column already exists';
    END IF;
END $$;

-- Check if day_count column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'games' AND column_name = 'day_count') THEN
        ALTER TABLE games ADD COLUMN day_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added day_count column to games table';
    ELSE
        RAISE NOTICE 'day_count column already exists';
    END IF;
END $$;

-- Check if last_phase_change column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'games' AND column_name = 'last_phase_change') THEN
        ALTER TABLE games ADD COLUMN last_phase_change TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added last_phase_change column to games table';
    ELSE
        RAISE NOTICE 'last_phase_change column already exists';
    END IF;
END $$;

-- Check if required_actions column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'games' AND column_name = 'required_actions') THEN
        ALTER TABLE games ADD COLUMN required_actions JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added required_actions column to games table';
    ELSE
        RAISE NOTICE 'required_actions column already exists';
    END IF;
END $$;

-- Check if completed_actions column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'games' AND column_name = 'completed_actions') THEN
        ALTER TABLE games ADD COLUMN completed_actions JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added completed_actions column to games table';
    ELSE
        RAISE NOTICE 'completed_actions column already exists';
    END IF;
END $$;

-- Check if phase_end_time column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'games' AND column_name = 'phase_end_time') THEN
        ALTER TABLE games ADD COLUMN phase_end_time TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added phase_end_time column to games table';
    ELSE
        RAISE NOTICE 'phase_end_time column already exists';
    END IF;
END $$;

-- Show the final structure
\d games;

SELECT 'Database schema fix completed' as status;
