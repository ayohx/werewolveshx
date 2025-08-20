#!/usr/bin/env node

import { Pool } from 'pg';
import { readFileSync } from 'fs';

// Use the Railway internal database URL
const DATABASE_URL = "postgresql://postgres:vPHnKNddCnAKmiOTFpbnsTnGVjIPKzyA@postgres-gaxg.railway.internal:5432/railway";

console.log('🏗️  Manual Table Creation for Werewolf Game');
console.log('📍 Connecting to:', DATABASE_URL.replace(/:[^:]*@/, ':***@'));

async function createTables() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
    connectionTimeoutMillis: 15000,
  });

  let client;
  try {
    console.log('🔌 Connecting to database...');
    client = await pool.connect();
    console.log('✅ Connected successfully!');
    
    // Check current state
    const existingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`📊 Current tables: ${existingTables.rows.length}`);
    
    if (existingTables.rows.length === 0) {
      console.log('🏗️  Creating database schema...');
      
      // Read and execute the complete refactor migration
      const migrationSQL = readFileSync('./db/migrations/03_complete_refactor.sql', 'utf8');
      
      console.log('📝 Executing migration SQL...');
      await client.query(migrationSQL);
      console.log('✅ Migration executed successfully!');
      
      // Verify tables were created
      const newTables = await client.query(`
        SELECT table_name, 
               (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
        FROM information_schema.tables t
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      console.log('🎉 Tables created successfully:');
      newTables.rows.forEach(row => {
        console.log(`   ✓ ${row.table_name} (${row.column_count} columns)`);
      });
      
      // Test basic functionality
      console.log('🧪 Testing basic database operations...');
      
      // Test inserting a sample game
      const testGame = await client.query(`
        INSERT INTO games (game_code, creator_id, settings, phase, created_at, updated_at) 
        VALUES ('TEST001', 'test-user', '{"werewolves": 2, "seers": 1}', 'lobby', NOW(), NOW())
        RETURNING *
      `);
      
      console.log('✅ Sample game created:', testGame.rows[0].game_code);
      
      // Clean up test data
      await client.query('DELETE FROM games WHERE game_code = $1', ['TEST001']);
      console.log('🧹 Test data cleaned up');
      
    } else {
      console.log('ℹ️  Tables already exist:');
      existingTables.rows.forEach(row => console.log(`   - ${row.table_name}`));
    }

    console.log('\n🎯 Database setup completed successfully!');
    console.log('🚀 The Werewolf game should now work properly.');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    if (error.code) {
      console.error('   Error Code:', error.code);
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

createTables().catch(err => {
  console.error('💥 Script failed:', err.message);
  process.exit(1);
});
