#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

console.log('🔧 Fixing missing database columns...');

// Get the DATABASE_URL from Railway variables
let databaseUrl;
try {
  const output = execSync('railway variables --service werewolveshx', { encoding: 'utf-8' });
  const match = output.match(/DATABASE_URL\s+│\s+(postgresql:\/\/[^\s│]+)/);
  if (match) {
    databaseUrl = match[1].replace(/\s+/g, '');
    console.log('✅ Found DATABASE_URL from Railway');
  } else {
    throw new Error('Could not extract DATABASE_URL from Railway variables');
  }
} catch (error) {
  console.error('❌ Failed to get DATABASE_URL:', error.message);
  process.exit(1);
}

// Read the SQL fix script
const sqlScript = readFileSync('fix_missing_columns.sql', 'utf-8');

// Create a temporary SQL file with proper connection URL
const tempSqlFile = 'temp_fix.sql';
const fs = await import('fs');
fs.writeFileSync(tempSqlFile, sqlScript);

try {
  console.log('🔄 Executing database fix...');
  
  // Use railway run to execute the SQL script in the Railway environment
  const result = execSync(`railway run --service werewolveshx -- psql "$DATABASE_URL" -f fix_missing_columns.sql`, { 
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  
  console.log('✅ Database fix completed successfully!');
  console.log('📋 Output:');
  console.log(result);
  
} catch (error) {
  console.error('❌ Database fix failed:', error.message);
  if (error.stdout) {
    console.log('STDOUT:', error.stdout);
  }
  if (error.stderr) {
    console.log('STDERR:', error.stderr);
  }
  process.exit(1);
} finally {
  // Clean up temporary file
  try {
    fs.unlinkSync(tempSqlFile);
  } catch (e) {
    // Ignore cleanup errors
  }
}

console.log('🎉 Database schema is now ready for game creation!');
