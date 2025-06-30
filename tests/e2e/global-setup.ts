import { chromium, FullConfig } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { AuthPage } from './fixtures/page-objects';
import { join } from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up global test user...');
  
  // Create a test user that will be shared across tests
  const testUser = {
    email: faker.internet.email(),
    password: `${faker.internet.password({ length: 7, pattern: /[a-zA-Z0-9]/ })}Aa1`,
    firstName: faker.person.firstName()
  };

  // Launch browser and create the user
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to auth page
    await page.goto('http://localhost:5173/auth');
    
    // Create AuthPage instance and sign up the user
    const authPage = new AuthPage(page);
    await authPage.signUp(testUser.email, testUser.password, testUser.firstName);
    
    // Wait for sign up to complete
    await page.waitForTimeout(3000);
    
    // Verify user was created successfully
    const isAuthenticated = await authPage.isAuthenticated();
    if (!isAuthenticated) {
      throw new Error('Failed to create test user during global setup');
    }
    
    console.log(`✅ Test user created: ${testUser.email}`);
    
    // Store user credentials in a file for tests to use
    const fs = await import('fs');
    const testUserData = {
      email: testUser.email,
      password: testUser.password,
      firstName: testUser.firstName
    };
    
    const testUserFilePath = join(process.cwd(), 'test-user.json');
    fs.writeFileSync(testUserFilePath, JSON.stringify(testUserData, null, 2));
    
  } catch (error) {
    console.error('❌ Failed to create test user:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;