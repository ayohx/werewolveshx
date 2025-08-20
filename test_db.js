#!/usr/bin/env node

import { Pool } from 'pg';
import fs from 'fs';

const DATABASE_URL = "postgresql://postgres:QTeZstLAXPxltSaNTgCuNLLvVBbjcjgZ@crossover.proxy.rlwy.net:33662/railway";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  min: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  maxUses: 7500,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  allowExitOnIdle: false
});

async function testDatabase() {
  console.log('🔍 Testing database connection...');
  
  let client;
  try {
    // Test basic connection
    client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Basic query successful:', result.rows[0].current_time);
    
    // Check if tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Current tables:');
    if (tables.rows.length === 0) {
      console.log('   No tables found - need to run migrations');
    } else {
      tables.rows.forEach(row => console.log(`   - ${row.table_name}`));
    }
    
    // Try to run the refactor migration
    console.log('\n🔄 Running database refactor...');
    const migrationSQL = fs.readFileSync('./db/migrations/03_complete_refactor.sql', 'utf8');
    
    await client.query(migrationSQL);
    console.log('✅ Database refactor completed successfully');
    
    // Verify tables were created
    const newTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tables after refactor:');
    newTables.rows.forEach(row => console.log(`   - ${row.table_name}`));
    
    // Test sample data
    const sampleGame = await client.query('SELECT * FROM games WHERE game_code = $1', ['TEST123']);
    if (sampleGame.rows.length > 0) {
      console.log('✅ Sample game data found:', sampleGame.rows[0].game_code);
    }
    
    console.log('\n🎉 Database refactor completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

testDatabase().catch(console.error);
