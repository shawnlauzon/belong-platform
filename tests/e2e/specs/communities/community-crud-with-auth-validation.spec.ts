import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { getGlobalTestUser } from '../../helpers/test-user';
import { createTestCommunity, markAsTestData } from '../../helpers/test-data-builders';
import { AuthPage } from '../../fixtures/page-objects/AuthPage';
import { CommunitiesPage } from '../../fixtures/page-objects/CommunitiesPage';

test.describe('Community CRUD Operations - Platform Auth Reliability', () => {
  let authPage: AuthPage;
  let communitiesPage: CommunitiesPage;
  
  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    communitiesPage = new CommunitiesPage(page);
  });

  // Helper function to ensure platform authentication is working
  async function ensurePlatformAuth(page: any, maxRetries = 2) {
    const testUser = getGlobalTestUser();
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      await authPage.goto();
      const isAuth = await authPage.isAuthenticated();
      
      if (!isAuth) {
        await authPage.signIn(testUser.email, testUser.password);
        await page.waitForTimeout(3000);
        
        const authSuccess = await authPage.isAuthenticated();
        if (authSuccess) {
          return true;
        } else if (attempt === maxRetries) {
          throw new Error('Platform authentication failed after retries');
        }
      } else {
        return true;
      }
    }
  }

  test('should test platform community operations with authentication reliability', async ({ page }) => {
    let communityId: string = '';
    let communityName: string = '';
    
    try {
      const communityData = createTestCommunity({
        name: markAsTestData(`Platform Test ${faker.location.city()}`)
      });

      // Test platform authentication reliability
      await test.step('Verify platform authentication works consistently', async () => {
        await ensurePlatformAuth(page);
        expect(await authPage.isAuthenticated()).toBe(true);
      });

      // Test platform community creation
      await test.step('Test platform community creation', async () => {
        await ensurePlatformAuth(page);
        
        await communitiesPage.goto();
        await page.waitForLoadState('networkidle');
        
        await communitiesPage.clickCreateButton();
        await communitiesPage.fillCommunityForm(communityData.name, communityData.description);
        await communitiesPage.submitForm();
        
        await page.waitForTimeout(3000);
        
        // Check for platform errors
        const error = await communitiesPage.getError();
        if (error?.includes('authenticated')) {
          throw new Error(`Platform authentication issue in CREATE: ${error}`);
        } else if (error) {
          throw new Error(`Platform CREATE failed: ${error}`);
        }
        
        // Verify platform created the community
        const communityElement = page.locator('li').filter({ hasText: communityData.name });
        await expect(communityElement).toBeVisible({ timeout: 5000 });
        
        const communityTestId = await communityElement.getAttribute('data-testid');
        communityId = communityTestId?.replace('community-', '') || '';
        communityName = communityData.name;
      });

      // Test platform membership operations
      await test.step('Test platform membership operations', async () => {
        await ensurePlatformAuth(page);
        await communitiesPage.goto();
        await page.waitForLoadState('networkidle');
        
        // Test platform join/leave functionality
        const hasJoinButton = await communitiesPage.hasJoinButton(communityId);
        const hasLeaveButton = await communitiesPage.hasLeaveButton(communityId);
        
        if (hasJoinButton) {
          await communitiesPage.joinCommunity(communityId);
          await page.waitForTimeout(2000);
          
          const joinError = await communitiesPage.getError();
          if (joinError?.includes('authenticated')) {
            throw new Error(`Platform authentication issue in JOIN: ${joinError}`);
          } else if (joinError) {
            throw new Error(`Platform JOIN failed: ${joinError}`);
          }
          
          // Verify platform updated membership state
          await expect(page.locator(`[data-testid="leave-${communityId}"]`)).toBeVisible({ timeout: 5000 });
          
        } else if (hasLeaveButton) {
          await communitiesPage.leaveCommunity(communityId);
          await page.waitForTimeout(2000);
          
          const leaveError = await communitiesPage.getError();
          if (leaveError?.includes('authenticated')) {
            throw new Error(`Platform authentication issue in LEAVE: ${leaveError}`);
          } else if (leaveError) {
            throw new Error(`Platform LEAVE failed: ${leaveError}`);
          }
          
          // Verify platform updated membership state
          await expect(page.locator(`[data-testid="join-${communityId}"]`)).toBeVisible({ timeout: 5000 });
        }
      });

      // Test platform delete operation
      await test.step('Test platform community deletion', async () => {
        await ensurePlatformAuth(page);
        await communitiesPage.goto();
        await page.waitForLoadState('networkidle');
        
        const hasDeleteButton = await communitiesPage.hasDeleteButton(communityId);
        if (!hasDeleteButton) {
          throw new Error('Platform permission system error: DELETE button not available to creator');
        }
        
        page.once('dialog', dialog => dialog.accept());
        await communitiesPage.deleteCommunity(communityId);
        await page.waitForTimeout(3000);
        
        const deleteError = await communitiesPage.getError();
        if (deleteError?.includes('authenticated')) {
          throw new Error(`Platform authentication issue in DELETE: ${deleteError}`);
        } else if (deleteError) {
          throw new Error(`Platform DELETE failed: ${deleteError}`);
        }
        
        // Verify platform deleted the community
        await expect(page.locator(`[data-testid="community-${communityId}"]`)).not.toBeVisible({ timeout: 5000 });
        
        communityId = '';
        communityName = '';
      });

    } finally {
      // Cleanup any remaining test data
      if (communityId && communityName) {
        try {
          await ensurePlatformAuth(page);
          await communitiesPage.goto();
          await page.waitForLoadState('networkidle');
          
          if (await communitiesPage.hasDeleteButton(communityId)) {
            page.once('dialog', dialog => dialog.accept());
            await communitiesPage.deleteCommunity(communityId);
            await page.waitForTimeout(2000);
          }
        } catch (cleanupError) {
          test.info().annotations.push({ 
            type: 'warning', 
            description: `Cleanup failed: ${cleanupError}` 
          });
        }
      }
    }
  });

  test('should detect and report platform authentication issues', async ({ page }) => {
    const testUser = getGlobalTestUser();
    
    // Test auth persistence over time
    await authPage.goto();
    await authPage.signIn(testUser.email, testUser.password);
    await page.waitForTimeout(3000);
    
    const initialAuth = await authPage.isAuthenticated();
    expect(initialAuth).toBe(true);
    
    // Check auth state every 5 seconds for 30 seconds
    const authChecks = [];
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(5000);
      
      await authPage.goto();
      const authState = await authPage.isAuthenticated();
      const userEmail = await authPage.getUserEmail();
      
      authChecks.push({
        timeSeconds: (i + 1) * 5,
        isAuthenticated: authState,
        userEmail: userEmail
      });
      
      test.info().annotations.push({ 
        type: 'info', 
        description: `Auth check at ${(i + 1) * 5}s: ${authState}, email: ${userEmail}` 
      });
      
      if (!authState) {
        test.info().annotations.push({ 
          type: 'error', 
          description: `Platform auth session lost at ${(i + 1) * 5} seconds` 
        });
        break;
      }
    }
    
    // Report findings
    const authLossTime = authChecks.find(check => !check.isAuthenticated)?.timeSeconds;
    
    if (authLossTime) {
      throw new Error(`Platform authentication session lost after ${authLossTime} seconds - this is a platform bug that must be fixed before community operations can work reliably`);
    } else {
      test.info().annotations.push({ 
        type: 'success', 
        description: 'Authentication persisted for 30 seconds - session timeout is not the immediate issue' 
      });
    }
  });
});