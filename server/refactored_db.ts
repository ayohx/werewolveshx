import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./refactored_schema";

// ========================================
// DATABASE CONNECTION WITH ROBUST SETTINGS
// ========================================

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

console.log('🔗 Connecting to database...');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 20,           // Increased connection pool
  min: 5,            // Minimum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  acquireTimeoutMillis: 30000,
});

export const db = drizzle(pool, { schema });

// ========================================
// CONNECTION VALIDATION AND RETRY LOGIC
// ========================================

async function validateConnection(retries = 5): Promise<boolean> {
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`🔄 Attempting to connect to database (${i}/${retries})...`);
      
      const client = await pool.connect();
      
      // Test basic query
      const result = await client.query('SELECT NOW() as timestamp, version() as db_version');
      console.log('✅ Database connection successful');
      console.log('📊 Database info:', {
        timestamp: result.rows[0].timestamp,
        version: result.rows[0].db_version.split(' ')[0] + ' ' + result.rows[0].db_version.split(' ')[1]
      });
      
      client.release();
      return true;
    } catch (error) {
      console.error(`❌ Database connection attempt ${i} failed:`, error instanceof Error ? error.message : error);
      
      if (i === retries) {
        console.error('💀 All database connection attempts failed');
        return false;
      }
      
      const delay = Math.min(1000 * Math.pow(2, i - 1), 10000); // Exponential backoff, max 10s
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

// ========================================
// ROBUST QUERY WRAPPER WITH RETRY LOGIC
// ========================================

export async function withRetry<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 1; i <= retries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`❌ Database operation attempt ${i} failed:`, error instanceof Error ? error.message : error);
      
      if (i === retries) {
        throw error;
      }
      
      const delay = Math.min(500 * i, 2000); // Progressive delay
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('All retry attempts failed');
}

// ========================================
// INITIALIZATION
// ========================================

export async function initializeDatabase(): Promise<boolean> {
  console.log('🚀 Initializing refactored database...');
  
  const connected = await validateConnection();
  if (!connected) {
    console.error('💀 Failed to establish database connection');
    return false;
  }
  
  console.log('✅ Refactored database initialized successfully');
  return true;
}

// ========================================
// GRACEFUL SHUTDOWN
// ========================================

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down database connection...');
  await pool.end();
  console.log('✅ Database connection closed');
});

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down database connection...');
  await pool.end();
  console.log('✅ Database connection closed');
  process.exit(0);
});

// ========================================
// HEALTH CHECK
// ========================================

export async function healthCheck(): Promise<{ status: string; details?: any }> {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        NOW() as timestamp,
        COUNT(*) as total_games,
        (SELECT COUNT(*) FROM games WHERE status IN ('waiting', 'in_progress')) as active_games
      FROM games
    `);
    client.release();
    
    return {
      status: 'healthy',
      details: result.rows[0]
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Initialize on import
initializeDatabase().catch(error => {
  console.error('💀 Failed to initialize database:', error);
  process.exit(1);
});