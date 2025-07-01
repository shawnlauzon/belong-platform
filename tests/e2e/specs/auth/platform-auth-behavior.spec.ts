import { test, expect } from '@playwright/test';
import { AuthPage, CommunitiesPage } from '../../fixtures/page-objects';
import { getGlobalTestUser } from '../../helpers/test-user';
import { markAsTestData } from '../../helpers/test-data-builders';
import { faker } from '@faker-js/faker';

test.describe('Community Authentication Issue Reproduction', () => {
  let authPage: AuthPage;
  let communitiesPage: CommunitiesPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    communitiesPage = new CommunitiesPage(page);
  });

  test('should reproduce the exact authentication failure from community CRUD tests', async ({ page }) => {
    const testUser = getGlobalTestUser();
    let communityId = '';
    let communityName = '';
    
    try {
      // Replicate exact same steps as failing community test
      await test.step('Step 1: Authenticate (same as working community test)', async () => {
        await authPage.goto();
        await authPage.signIn(testUser.email, testUser.password);
        await page.waitForTimeout(3000); // Same timing as original test
        
        // Verify authentication (this passes in original test)
        expect(await authPage.isAuthenticated()).toBe(true);
        expect(await authPage.getUserEmail()).toBe(testUser.email.toLowerCase());
      });

      await test.step('Step 2: Navigate to communities (same as original)', async () => {
        await communitiesPage.goto();
        await expect(page.getByRole('heading', { name: 'Communities' })).toBeVisible();
        await page.waitForTimeout(5000); // Same timing as original test
      });

      await test.step('Step 3: CREATE community (this works in original test)', async () => {
        const testCommunityName = markAsTestData(`Repro Test ${faker.location.city()}`);
        
        await expect(page.locator('[data-testid="create-community-button"]')).toBeVisible();
        await page.click('[data-testid="create-community-button"]');
        await expect(page.locator('[data-testid="community-form"]')).toBeVisible();
        
        await page.fill('[data-testid="community-name-input"]', testCommunityName);
        await page.fill('[data-testid="community-description-input"]', 'Reproduction test community');
        
        await page.click('[data-testid="community-submit-button"]');
        await page.waitForTimeout(3000); // Same timing as original test
        
        // Verify creation succeeded (this works in original test)
        const formClosed = !await page.locator('[data-testid="community-form"]').isVisible().catch(() => true);
        const communityAppeared = await page.locator(`text=${testCommunityName}`).isVisible().catch(() => false);
        const hasError = await page.locator('[data-testid="error"]').isVisible().catch(() => false);
        
        if (hasError) {
          const errorText = await page.locator('[data-testid="error"]').textContent();
          throw new Error(`CREATE failed: ${errorText}`);
        }
        
        if (!formClosed || !communityAppeared) {
          throw new Error(`CREATE failed: Form closed: ${formClosed}, Community appeared: ${communityAppeared}`);
        }
        
        // Get community info for next steps
        const communityElement = page.locator('li').filter({ hasText: testCommunityName });
        const communityTestId = await communityElement.getAttribute('data-testid');
        communityId = communityTestId?.replace('community-', '') || '';
        communityName = testCommunityName;
        
        test.info().annotations.push({ 
          type: 'success', 
          description: `CREATE operation succeeded. Community ID: ${communityId}` 
        });
        
        await page.waitForTimeout(2000); // Same timing as original test
      });

      await test.step('Step 4: Check auth state before JOIN (diagnostic)', async () => {
        // This step is NOT in the original test - adding it to diagnose the issue
        await authPage.goto();
        const isStillAuth = await authPage.isAuthenticated();
        const currentEmail = await authPage.getUserEmail();
        
        test.info().annotations.push({ 
          type: 'info', 
          description: `Auth state before JOIN: authenticated=${isStillAuth}, email=${currentEmail}` 
        });
        
        // Return to communities page
        await communitiesPage.goto();
        await page.waitForTimeout(1000);
      });

      await test.step('Step 5: Attempt JOIN operation (this fails in original test)', async () => {
        // Wait for membership data to load (same as original test)
        await page.waitForTimeout(3000);
        
        // Check button availability (same as original test)
        const hasLeaveButton = await page.locator(`[data-testid="leave-${communityId}"]`).isVisible().catch(() => false);
        const hasJoinButton = await page.locator(`[data-testid="join-${communityId}"]`).isVisible().catch(() => false);
        const hasError = await page.locator('[data-testid="error"]').isVisible().catch(() => false);
        
        test.info().annotations.push({ 
          type: 'info', 
          description: `Button state: Leave=${hasLeaveButton}, Join=${hasJoinButton}, Error=${hasError}` 
        });
        
        if (hasError) {
          const errorText = await page.locator('[data-testid="error"]').textContent();
          throw new Error(`Pre-existing error: ${errorText}`);
        }
        
        // Attempt JOIN operation (this is where original test fails)
        if (hasJoinButton) {
          test.info().annotations.push({ type: 'info', description: 'Attempting JOIN operation...' });
          
          await page.click(`[data-testid="join-${communityId}"]`);
          await page.waitForTimeout(2000); // Same timing as original test
          
          // Check for authentication error (this is where original test fails)
          const joinError = await page.locator('[data-testid="error"]').isVisible().catch(() => false);
          
          if (joinError) {
            const errorText = await page.locator('[data-testid="error"]').textContent();
            test.info().annotations.push({ 
              type: 'error', 
              description: `JOIN operation failed with: ${errorText}` 
            });
            
            // Check auth state after failure
            await authPage.goto();
            const authAfterError = await authPage.isAuthenticated();
            test.info().annotations.push({ 
              type: 'info', 
              description: `Auth state after JOIN error: ${authAfterError}` 
            });
            
            throw new Error(`JOIN operation failed: ${errorText}`);
          } else {
            // JOIN succeeded - check if leave button appeared
            const leaveAppeared = await page.locator(`[data-testid="leave-${communityId}"]`).isVisible().catch(() => false);
            
            if (leaveAppeared) {
              test.info().annotations.push({ 
                type: 'success', 
                description: 'JOIN operation succeeded - Leave button appeared' 
              });
            } else {
              throw new Error('JOIN operation unclear - no leave button appeared');
            }
          }
        } else if (hasLeaveButton) {
          test.info().annotations.push({ 
            type: 'info', 
            description: 'User already joined community - testing LEAVE operation instead' 
          });
          
          await page.click(`[data-testid="leave-${communityId}"]`);
          await page.waitForTimeout(2000);
          
          const leaveError = await page.locator('[data-testid="error"]').isVisible().catch(() => false);
          
          if (leaveError) {
            const errorText = await page.locator('[data-testid="error"]').textContent();
            throw new Error(`LEAVE operation failed: ${errorText}`);
          }
        } else {
          throw new Error('No membership buttons available - possible UI state issue');
        }
      });

    } finally {
      // Cleanup (same as original test)
      if (communityId && communityName) {
        await test.step(`Cleanup: Delete test community "${communityName}"`, async () => {
          try {
            // Check auth state before cleanup
            await authPage.goto();
            const authForCleanup = await authPage.isAuthenticated();
            test.info().annotations.push({ 
              type: 'info', 
              description: `Auth state for cleanup: ${authForCleanup}` 
            });
            
            await communitiesPage.goto();
            await page.waitForTimeout(1000);
            
            const hasDeleteButton = await page.locator(`[data-testid="delete-${communityId}"]`).isVisible().catch(() => false);
            
            if (hasDeleteButton) {
              page.once('dialog', dialog => {
                test.info().annotations.push({ type: 'info', description: `Cleanup confirmation: "${dialog.message()}"` });
                dialog.accept();
              });
              
              await page.click(`[data-testid="delete-${communityId}"]`);
              await page.waitForTimeout(2000);
              
              // Check for cleanup errors
              const cleanupError = await page.locator('[data-testid="error"]').isVisible().catch(() => false);
              if (cleanupError) {
                const errorText = await page.locator('[data-testid="error"]').textContent();
                test.info().annotations.push({ 
                  type: 'warning', 
                  description: `Cleanup failed: ${errorText}` 
                });
              } else {
                const communityGone = !await page.locator(`text=${communityName}`).isVisible().catch(() => true);
                test.info().annotations.push({ 
                  type: 'info', 
                  description: `Cleanup ${communityGone ? 'successful' : 'failed'}: Community deletion` 
                });
              }
            } else {
              test.info().annotations.push({ 
                type: 'warning', 
                description: `Cleanup skipped: Delete button not available for community ${communityId}` 
              });
            }
          } catch (cleanupError) {
            test.info().annotations.push({ type: 'warning', description: `Cleanup error: ${cleanupError}` });
          }
        });
      }
    }
  });

  test('should test minimal JOIN operation without CREATE', async ({ page }) => {
    // Test JOIN operation on an existing community to isolate the auth issue
    const testUser = getGlobalTestUser();
    
    await authPage.goto();
    await authPage.signIn(testUser.email, testUser.password);
    await page.waitForTimeout(3000);
    
    expect(await authPage.isAuthenticated()).toBe(true);
    
    await communitiesPage.goto();
    await page.waitForTimeout(5000);
    
    // Find any existing community to join
    const communityElements = await page.locator('[data-testid^="community-"]').all();
    
    if (communityElements.length === 0) {
      throw new Error('No communities available for JOIN test');
    }
    
    // Get the first community
    const firstCommunity = communityElements[0];
    const communityTestId = await firstCommunity.getAttribute('data-testid');
    const communityId = communityTestId?.replace('community-', '') || '';
    
    test.info().annotations.push({ 
      type: 'info', 
      description: `Testing JOIN on existing community: ${communityId}` 
    });
    
    // Check if we can join this community
    const hasJoinButton = await page.locator(`[data-testid="join-${communityId}"]`).isVisible().catch(() => false);
    
    if (hasJoinButton) {
      // Verify auth right before JOIN
      await authPage.goto();
      expect(await authPage.isAuthenticated()).toBe(true);
      await communitiesPage.goto();
      
      // Attempt JOIN
      await page.click(`[data-testid="join-${communityId}"]`);
      await page.waitForTimeout(2000);
      
      // Check result
      const joinError = await page.locator('[data-testid="error"]').isVisible().catch(() => false);
      
      if (joinError) {
        const errorText = await page.locator('[data-testid="error"]').textContent();
        throw new Error(`Minimal JOIN test failed: ${errorText}`);
      }
      
      test.info().annotations.push({ 
        type: 'success', 
        description: 'Minimal JOIN test succeeded' 
      });
      
      // Leave the community to clean up
      if (await page.locator(`[data-testid="leave-${communityId}"]`).isVisible().catch(() => false)) {
        await page.click(`[data-testid="leave-${communityId}"]`);
        await page.waitForTimeout(2000);
      }
    } else {
      test.info().annotations.push({ 
        type: 'info', 
        description: 'No joinable communities found - user may already be member of all communities' 
      });
    }
  });

  test('should test platform auth hook behavior directly', async ({ page }) => {
    // Test if the issue is with the platform hooks themselves
    const testUser = getGlobalTestUser();
    
    await authPage.goto();
    await authPage.signIn(testUser.email, testUser.password);
    await page.waitForTimeout(3000);
    
    expect(await authPage.isAuthenticated()).toBe(true);
    
    // Add JavaScript to monitor auth state changes
    await page.addInitScript(() => {
      window.authStateChanges = [];
      
      // Monitor auth state if possible
      if (window.React) {
        const originalConsoleLog = console.log;
        console.log = (...args) => {
          if (args[0] && typeof args[0] === 'string' && args[0].includes('auth')) {
            window.authStateChanges.push({ 
              timestamp: Date.now(), 
              message: args.join(' ') 
            });
          }
          originalConsoleLog.apply(console, args);
        };
      }
    });
    
    await communitiesPage.goto();
    await page.waitForTimeout(5000);
    
    // Try to get auth state changes
    const authChanges = await page.evaluate(() => window.authStateChanges || []);
    
    if (authChanges.length > 0) {
      test.info().annotations.push({ 
        type: 'info', 
        description: `Auth state changes detected: ${JSON.stringify(authChanges)}` 
      });
    }
    
    // Test multiple rapid auth checks to see if state is consistent
    const rapidAuthChecks = [];
    for (let i = 0; i < 5; i++) {
      await authPage.goto();
      const isAuth = await authPage.isAuthenticated();
      const email = await authPage.getUserEmail();
      rapidAuthChecks.push({ check: i + 1, isAuth, email });
      await communitiesPage.goto();
      await page.waitForTimeout(1000);
    }
    
    test.info().annotations.push({ 
      type: 'info', 
      description: `Rapid auth checks: ${JSON.stringify(rapidAuthChecks)}` 
    });
    
    // Verify all checks were consistent
    const authStates = rapidAuthChecks.map(check => check.isAuth);
    const allAuthenticated = authStates.every(state => state === true);
    
    if (!allAuthenticated) {
      throw new Error(`Inconsistent auth state detected: ${JSON.stringify(authStates)}`);
    }
  });
});