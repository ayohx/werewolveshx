#!/usr/bin/env node

import { Pool } from 'pg';
import fs from 'fs';

// Using the new database connection
const DATABASE_URL = "postgresql://postgres:vPHnKNddCnAKmiOTFpbnsTnGVjIPKzyA@postgres-gaxg.railway.internal:5432/railway";

console.log('🔧 Manual Database Setup for Railway...');

async function setupDatabase() {
  // This will run from Railway environment where internal URLs work
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 15000,
  });

  let client;
  try {
    console.log('🔌 Connecting to database...');
    client = await pool.connect();
    console.log('✅ Connected successfully');
    
    // Check current tables
    const currentTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Current tables:', currentTables.rows.length);
    currentTables.rows.forEach(row => console.log(`   - ${row.table_name}`));

    if (currentTables.rows.length === 0) {
      console.log('🏗️  Creating database schema...');
      
      // Run the complete refactor migration
      const migrationSQL = fs.readFileSync('./db/migrations/03_complete_refactor.sql', 'utf8');
      await client.query(migrationSQL);
      console.log('✅ Database schema created');

      // Verify tables were created
      const newTables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      console.log('📋 Tables created:');
      newTables.rows.forEach(row => console.log(`   ✓ ${row.table_name}`));
      
      // Test sample data
      const sampleGame = await client.query('SELECT * FROM games WHERE game_code = $1', ['TEST123']);
      if (sampleGame.rows.length > 0) {
        console.log('✅ Sample data found:', sampleGame.rows[0].game_code);
      }
    } else {
      console.log('✅ Tables already exist, no setup needed');
    }

    console.log('\n🎉 Database setup completed!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

setupDatabase().catch(console.error);
