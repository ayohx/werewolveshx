#!/usr/bin/env node

// Direct table setup script for Railway
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

console.log('🚀 Direct Railway Database Setup');

try {
  // Read the migration SQL
  const migrationSQL = readFileSync('./db/migrations/03_complete_refactor.sql', 'utf8');
  
  // Write to temporary file for psql
  const tempFile = '/tmp/setup_tables.sql';
  require('fs').writeFileSync(tempFile, migrationSQL);
  
  console.log('📝 Migration SQL prepared');
  
  // Get database URL from environment
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable not found');
  }
  
  console.log('🔌 Database URL found:', dbUrl.replace(/:[^:]*@/, ':***@'));
  
  // Execute SQL using psql
  console.log('🏗️  Executing migration SQL...');
  
  const result = execSync(`psql "${dbUrl}" -f ${tempFile}`, { 
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
  });
  
  console.log('✅ Migration executed successfully!');
  console.log('📋 Result:', result);
  
  // Verify tables were created
  const verifyResult = execSync(`psql "${dbUrl}" -c "\\dt"`, { 
    encoding: 'utf8' 
  });
  
  console.log('🔍 Tables verification:');
  console.log(verifyResult);
  
  // Clean up temp file
  require('fs').unlinkSync(tempFile);
  
  console.log('\n🎉 Database setup completed successfully!');
  
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}
