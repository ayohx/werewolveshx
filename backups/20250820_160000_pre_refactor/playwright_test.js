#!/usr/bin/env node

import { chromium } from 'playwright';

async function testWerewolfGame() {
  console.log('🎭 Starting Playwright test for Werewolf game...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    console.log(`📜 Console: [${msg.type()}] ${text}`);
  });

  // Capture network errors
  page.on('response', response => {
    if (!response.ok()) {
      console.log(`❌ Network Error: ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('🌐 Navigating to https://werewolveshx-production.up.railway.app/');
    await page.goto('https://werewolveshx-production.up.railway.app/', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });

    console.log('📸 Taking initial screenshot...');
    await page.screenshot({ path: 'initial_page.png' });

    // Wait for the page to load
    await page.waitForTimeout(2000);

    console.log('🔍 Looking for Create New Game button...');
    const createButton = page.getByRole('button', { name: /create new game/i });
    await createButton.waitFor({ timeout: 10000 });
    
    console.log('🎮 Clicking Create New Game...');
    await createButton.click();

    // Wait for name input
    console.log('✏️ Filling in player name (Ayo)...');
    const nameInput = page.getByRole('textbox', { name: /enter your name/i });
    await nameInput.waitFor({ timeout: 10000 });
    await nameInput.fill('Ayo');

    console.log('⚙️ Clicking Set Up Game...');
    const setupButton = page.getByRole('button', { name: /set up game/i });
    await setupButton.click();

    // Wait for game settings
    await page.waitForTimeout(2000);

    console.log('🐺 Configuring game settings...');
    
    // Set werewolves to 2
    const werewolfInput = page.getByRole('spinbutton').first();
    await werewolfInput.fill('2');
    
    // Set seer investigations to 3
    const seerInput = page.getByPlaceholder('Auto');
    if (await seerInput.isVisible()) {
      await seerInput.fill('3');
    }

    console.log('📸 Taking settings screenshot...');
    await page.screenshot({ path: 'game_settings.png' });

    console.log('🚀 Creating lobby...');
    const confirmButton = page.getByRole('button', { name: /confirm.*create lobby/i });
    await confirmButton.click();

    // Wait for response
    await page.waitForTimeout(5000);

    console.log('📸 Taking final screenshot...');
    await page.screenshot({ path: 'final_result.png' });

    // Check for different outcomes
    const pageContent = await page.content();
    
    const isLobbyCreated = /lobby|game code|waiting for players/i.test(pageContent);
    const hasError = /failed to create|error|something went wrong/i.test(pageContent);
    const hasWebSocketConnection = consoleLogs.some(log => /websocket.*connected/i.test(log));
    const hasGameCreationLogs = consoleLogs.some(log => /creating game|game created/i.test(log));

    console.log('\n🔍 TEST RESULTS:');
    console.log('================');
    console.log(`✅ Page loaded: true`);
    console.log(`🔌 WebSocket connection detected: ${hasWebSocketConnection}`);
    console.log(`🎮 Game creation logs: ${hasGameCreationLogs}`);
    console.log(`🏠 Lobby created: ${isLobbyCreated}`);
    console.log(`❌ Error detected: ${hasError}`);
    
    if (isLobbyCreated) {
      console.log('\n🎉 SUCCESS: Game lobby was created successfully!');
      
      // Try to extract game code if visible
      const gameCodeMatch = pageContent.match(/game code[:\s]*([A-Z0-9]{6})/i);
      if (gameCodeMatch) {
        console.log(`🔑 Game Code: ${gameCodeMatch[1]}`);
      }
    } else if (hasError) {
      console.log('\n❌ FAILURE: Error occurred during game creation');
    } else {
      console.log('\n⚠️  UNCLEAR: No clear success or error indication');
    }

    console.log('\n📜 Console Logs Summary:');
    console.log('========================');
    consoleLogs.slice(-10).forEach(log => console.log(log));

    return {
      success: isLobbyCreated,
      error: hasError,
      websocketConnected: hasWebSocketConnection,
      gameCreationLogs: hasGameCreationLogs,
      consoleLogs: consoleLogs
    };

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    await page.screenshot({ path: 'error_screenshot.png' });
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testWerewolfGame()
  .then(result => {
    console.log('\n🏁 Test completed');
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  });
