#!/usr/bin/env node

import { chromium } from 'playwright';

async function detailedTest() {
  console.log('🧪 Running detailed browser test...');
  
  const browser = await chromium.launch({ headless: false }); // visible browser for debugging
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture all console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    console.log(`📜 Console [${msg.type()}]: ${text}`);
  });

  // Capture network errors
  page.on('response', response => {
    if (!response.ok()) {
      console.log(`❌ Network: ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('🌐 Loading page...');
    await page.goto('https://werewolveshx-production.up.railway.app/', { waitUntil: 'networkidle' });
    
    await page.waitForTimeout(2000);
    
    console.log('🎮 Clicking Create New Game...');
    await page.getByRole('button', { name: /create new game/i }).click();
    
    console.log('✏️ Filling name...');
    await page.getByRole('textbox', { name: /enter your name/i }).fill('TestUser');
    
    console.log('⚙️ Proceeding to settings...');
    await page.getByRole('button', { name: /set up game/i }).click();
    
    await page.waitForTimeout(1000);
    
    console.log('🚀 Creating lobby...');
    await page.getByRole('button', { name: /confirm.*create lobby/i }).click();
    
    // Wait longer for response
    console.log('⏳ Waiting for game creation response...');
    await page.waitForTimeout(10000);
    
    // Check page content
    const content = await page.content();
    const errorToastVisible = await page.locator('[role="status"]').isVisible().catch(() => false);
    const errorText = await page.locator('text=Failed to create game').textContent().catch(() => null);
    
    console.log('\n🔍 DETAILED RESULTS:');
    console.log('==================');
    console.log(`📋 Error toast visible: ${errorToastVisible}`);
    console.log(`📝 Error text found: ${errorText}`);
    console.log(`🔗 WebSocket connected: ${consoleLogs.some(log => /websocket.*connected/i.test(log.text))}`);
    console.log(`❌ Error logs: ${consoleLogs.filter(log => log.type === 'error').length}`);
    
    // Print all error logs
    consoleLogs.filter(log => log.type === 'error').forEach(log => {
      console.log(`❌ ERROR: ${log.text}`);
    });
    
    // Check if we're in lobby or still in creation screen
    const inLobby = /lobby|game code|waiting for players/i.test(content);
    const inSettings = /werewolves|seer|doctor/i.test(content);
    const showingError = /failed to create|error|something went wrong/i.test(content);
    
    console.log(`🏠 In lobby: ${inLobby}`);
    console.log(`⚙️ In settings: ${inSettings}`);
    console.log(`❌ Showing error: ${showingError}`);
    
    console.log('\n📜 All Console Messages:');
    consoleLogs.forEach(log => {
      console.log(`[${log.type}] ${log.text}`);
    });
    
    // Take a screenshot for manual inspection
    await page.screenshot({ path: 'detailed_test_result.png', fullPage: true });
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

detailedTest();
