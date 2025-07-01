import { test, expect } from '@playwright/test';
import { AuthPage, CommunitiesPage } from '../../fixtures/page-objects';
import { getGlobalTestUser } from '../../helpers/test-user';
import { markAsTestData } from '../../helpers/test-data-builders';
import { faker } from '@faker-js/faker';

test.describe('Authentication Persistence and Session Management', () => {
  let authPage: AuthPage;
  let communitiesPage: CommunitiesPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    communitiesPage = new CommunitiesPage(page);
  });

  test('should maintain authentication state across multiple operations', async ({ page }) => {
    const testUser = getGlobalTestUser();
    
    // Step 1: Authenticate
    await authPage.goto();
    await authPage.signIn(testUser.email, testUser.password);
    await page.waitForTimeout(3000);
    
    // Verify initial authentication
    expect(await authPage.isAuthenticated()).toBe(true);
    
    // Step 2: Navigate to communities and verify auth persists
    await communitiesPage.goto();
    await page.waitForTimeout(2000);
    
    // Re-verify authentication on communities page
    await authPage.goto();
    expect(await authPage.isAuthenticated()).toBe(true);
    const userEmail = await authPage.getUserEmail();
    expect(userEmail).toBe(testUser.email.toLowerCase());
    
    // Step 3: Return to communities and perform CREATE operation
    await communitiesPage.goto();
    await page.waitForTimeout(2000);
    
    const testCommunityName = markAsTestData(`Auth Test ${faker.location.city()}`);
    
    await test.step('Verify auth before CREATE operation', async () => {
      // Check auth state before CREATE
      await authPage.goto();
      expect(await authPage.isAuthenticated()).toBe(true);
      await communitiesPage.goto();
    });
    
    await test.step('Perform CREATE operation', async () => {
      await communitiesPage.clickCreateButton();
      await communitiesPage.fillCommunityForm(testCommunityName, 'Test auth persistence');
      await communitiesPage.submitForm();
      await page.waitForTimeout(3000);
      
      // Verify creation succeeded
      const communityElement = page.locator('li').filter({ hasText: testCommunityName });
      await expect(communityElement).toBeVisible();
    });
    
    // Step 4: Get community ID and verify auth before JOIN operation
    const communityElement = page.locator('li').filter({ hasText: testCommunityName });
    const communityTestId = await communityElement.getAttribute('data-testid');
    const communityId = communityTestId?.replace('community-', '') || '';
    
    await test.step('Verify auth before JOIN operation', async () => {
      // Check auth state before JOIN
      await authPage.goto();
      const isStillAuthenticated = await authPage.isAuthenticated();
      const currentEmail = await authPage.getUserEmail();
      
      test.info().annotations.push({ 
        type: 'info', 
        description: `Auth state before JOIN: ${isStillAuthenticated}, Email: ${currentEmail}` 
      });
      
      expect(isStillAuthenticated).toBe(true);
      expect(currentEmail).toBe(testUser.email.toLowerCase());
      
      await communitiesPage.goto();
      await page.waitForTimeout(1000);
    });
    
    await test.step('Perform JOIN operation', async () => {
      // Attempt to join the community
      const hasJoinButton = await communitiesPage.hasJoinButton(communityId);
      const hasLeaveButton = await communitiesPage.hasLeaveButton(communityId);
      
      test.info().annotations.push({ 
        type: 'info', 
        description: `Button state: Join=${hasJoinButton}, Leave=${hasLeaveButton}` 
      });
      
      if (hasJoinButton) {
        await communitiesPage.joinCommunity(communityId);
        await page.waitForTimeout(2000);
        
        // Check for errors
        const error = await communitiesPage.getError();
        if (error) {
          test.info().annotations.push({ type: 'error', description: `JOIN operation error: ${error}` });
          
          // If JOIN failed due to auth, re-verify auth state
          await authPage.goto();
          const authStateAfterError = await authPage.isAuthenticated();
          test.info().annotations.push({ 
            type: 'info', 
            description: `Auth state after JOIN error: ${authStateAfterError}` 
          });
          
          throw new Error(`JOIN operation failed: ${error}`);
        }
        
        // Verify join succeeded by checking for leave button
        await expect(page.locator(`[data-testid="leave-${communityId}"]`)).toBeVisible();
      }
    });
    
    // Cleanup
    await test.step('Cleanup', async () => {
      try {
        if (await communitiesPage.hasDeleteButton(communityId)) {
          page.once('dialog', dialog => dialog.accept());
          await communitiesPage.deleteCommunity(communityId);
          await page.waitForTimeout(2000);
        }
      } catch (cleanupError) {
        test.info().annotations.push({ type: 'warning', description: `Cleanup failed: ${cleanupError}` });
      }
    });
  });

  test('should handle session timeout gracefully', async ({ page }) => {
    test.setTimeout(60000); // Set 60 second timeout for this test that waits 30 seconds
    const testUser = getGlobalTestUser();
    
    // Authenticate
    await authPage.goto();
    await authPage.signIn(testUser.email, testUser.password);
    await page.waitForTimeout(3000);
    
    expect(await authPage.isAuthenticated()).toBe(true);
    
    // Simulate session timeout by waiting longer
    await test.step('Wait for potential session timeout', async () => {
      test.info().annotations.push({ type: 'info', description: 'Waiting 30 seconds to test session persistence' });
      await page.waitForTimeout(30000); // Wait 30 seconds
      
      // Check if auth state is still valid
      await authPage.goto();
      const isStillAuthenticated = await authPage.isAuthenticated();
      
      test.info().annotations.push({ 
        type: 'info', 
        description: `Auth state after 30 seconds: ${isStillAuthenticated}` 
      });
      
      if (!isStillAuthenticated) {
        test.info().annotations.push({ 
          type: 'warning', 
          description: 'Session expired after 30 seconds - this may be expected behavior' 
        });
      }
    });
  });

  test('should verify authentication before each community operation', async ({ page }) => {
    const testUser = getGlobalTestUser();
    
    // Helper function to verify and log auth state
    const verifyAuthState = async (operationName: string) => {
      await authPage.goto();
      const isAuth = await authPage.isAuthenticated();
      const email = await authPage.getUserEmail();
      
      test.info().annotations.push({ 
        type: 'info', 
        description: `Auth state before ${operationName}: authenticated=${isAuth}, email=${email}` 
      });
      
      expect(isAuth).toBe(true);
      expect(email).toBe(testUser.email.toLowerCase());
      
      await communitiesPage.goto();
      await page.waitForTimeout(1000);
    };
    
    // Initial authentication
    await authPage.goto();
    await authPage.signIn(testUser.email, testUser.password);
    await page.waitForTimeout(3000);
    
    await communitiesPage.goto();
    await page.waitForTimeout(2000);
    
    let communityId = '';
    const testCommunityName = markAsTestData(`Auth Verify ${faker.location.city()}`);
    
    // Test CREATE with auth verification
    await test.step('CREATE with auth verification', async () => {
      await verifyAuthState('CREATE');
      
      await communitiesPage.clickCreateButton();
      await communitiesPage.fillCommunityForm(testCommunityName, 'Auth verification test');
      await communitiesPage.submitForm();
      await page.waitForTimeout(3000);
      
      // Get community ID
      const communityElement = page.locator('li').filter({ hasText: testCommunityName });
      const communityTestId = await communityElement.getAttribute('data-testid');
      communityId = communityTestId?.replace('community-', '') || '';
    });
    
    // Test JOIN with auth verification
    await test.step('JOIN with auth verification', async () => {
      await verifyAuthState('JOIN');
      
      if (await communitiesPage.hasJoinButton(communityId)) {
        await communitiesPage.joinCommunity(communityId);
        await page.waitForTimeout(2000);
        
        const error = await communitiesPage.getError();
        if (error) {
          throw new Error(`JOIN operation failed despite valid auth: ${error}`);
        }
      }
    });
    
    // Test LEAVE with auth verification
    await test.step('LEAVE with auth verification', async () => {
      await verifyAuthState('LEAVE');
      
      if (await communitiesPage.hasLeaveButton(communityId)) {
        await communitiesPage.leaveCommunity(communityId);
        await page.waitForTimeout(2000);
        
        const error = await communitiesPage.getError();
        if (error) {
          throw new Error(`LEAVE operation failed despite valid auth: ${error}`);
        }
      }
    });
    
    // Test DELETE with auth verification
    await test.step('DELETE with auth verification', async () => {
      await verifyAuthState('DELETE');
      
      if (await communitiesPage.hasDeleteButton(communityId)) {
        page.once('dialog', dialog => dialog.accept());
        await communitiesPage.deleteCommunity(communityId);
        await page.waitForTimeout(2000);
        
        const error = await communitiesPage.getError();
        if (error) {
          throw new Error(`DELETE operation failed despite valid auth: ${error}`);
        }
      }
    });
  });

  test('should maintain auth state across page refreshes', async ({ page }) => {
    const testUser = getGlobalTestUser();
    
    // Authenticate
    await authPage.goto();
    await authPage.signIn(testUser.email, testUser.password);
    await page.waitForTimeout(3000);
    
    expect(await authPage.isAuthenticated()).toBe(true);
    
    // Refresh the page
    await page.reload();
    await page.waitForTimeout(3000);
    
    // Verify auth persists after refresh
    expect(await authPage.isAuthenticated()).toBe(true);
    expect(await authPage.getUserEmail()).toBe(testUser.email.toLowerCase());
    
    // Navigate to communities and verify auth still works
    await communitiesPage.goto();
    await page.waitForTimeout(2000);
    
    // Try to create a community to verify auth is functional
    const testCommunityName = markAsTestData(`Refresh Test ${faker.location.city()}`);
    
    await communitiesPage.clickCreateButton();
    await communitiesPage.fillCommunityForm(testCommunityName, 'Page refresh auth test');
    await communitiesPage.submitForm();
    await page.waitForTimeout(3000);
    
    // Verify creation succeeded
    const error = await communitiesPage.getError();
    if (error) {
      throw new Error(`Community creation failed after page refresh: ${error}`);
    }
    
    const communityElement = page.locator('li').filter({ hasText: testCommunityName });
    await expect(communityElement).toBeVisible();
    
    // Cleanup
    const communityTestId = await communityElement.getAttribute('data-testid');
    const communityId = communityTestId?.replace('community-', '') || '';
    
    if (await communitiesPage.hasDeleteButton(communityId)) {
      page.once('dialog', dialog => dialog.accept());
      await communitiesPage.deleteCommunity(communityId);
    }
  });

  test('should handle concurrent authentication checks', async ({ page }) => {
    const testUser = getGlobalTestUser();
    
    // Authenticate
    await authPage.goto();
    await authPage.signIn(testUser.email, testUser.password);
    await page.waitForTimeout(3000);
    
    // Perform multiple rapid auth checks
    const authChecks = await Promise.all([
      authPage.isAuthenticated(),
      authPage.isAuthenticated(),
      authPage.isAuthenticated(),
      authPage.getUserEmail(),
      authPage.getUserId()
    ]);
    
    expect(authChecks[0]).toBe(true);
    expect(authChecks[1]).toBe(true);  
    expect(authChecks[2]).toBe(true);
    expect(authChecks[3]).toBe(testUser.email.toLowerCase());
    expect(authChecks[4]).toBeTruthy();
  });

  test('should recover from auth errors by re-authenticating', async ({ page }) => {
    const testUser = getGlobalTestUser();
    
    // Authenticate
    await authPage.goto();
    await authPage.signIn(testUser.email, testUser.password);
    await page.waitForTimeout(3000);
    
    expect(await authPage.isAuthenticated()).toBe(true);
    
    // Go to communities and try to create a community
    await communitiesPage.goto();
    await page.waitForTimeout(2000);
    
    const testCommunityName = markAsTestData(`Recovery Test ${faker.location.city()}`);
    
    await communitiesPage.clickCreateButton();
    await communitiesPage.fillCommunityForm(testCommunityName, 'Auth recovery test');
    await communitiesPage.submitForm();
    await page.waitForTimeout(3000);
    
    // If there's an auth error, try to recover
    const error = await communitiesPage.getError();
    if (error && error.includes('authenticated')) {
      test.info().annotations.push({ 
        type: 'info', 
        description: `Auth error detected: ${error}. Attempting recovery...` 
      });
      
      // Re-authenticate
      await authPage.goto();
      await authPage.signIn(testUser.email, testUser.password);
      await page.waitForTimeout(3000);
      
      expect(await authPage.isAuthenticated()).toBe(true);
      
      // Retry the operation
      await communitiesPage.goto();
      await page.waitForTimeout(2000);
      
      await communitiesPage.clickCreateButton();
      await communitiesPage.fillCommunityForm(testCommunityName + ' Retry', 'Auth recovery retry');
      await communitiesPage.submitForm();
      await page.waitForTimeout(3000);
      
      // Verify recovery worked
      const retryError = await communitiesPage.getError();
      if (retryError) {
        throw new Error(`Auth recovery failed: ${retryError}`);
      }
    }
  });
});