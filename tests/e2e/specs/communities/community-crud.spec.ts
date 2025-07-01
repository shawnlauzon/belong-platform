import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { getGlobalTestUser } from '../../helpers/test-user';
import { createTestCommunity, markAsTestData } from '../../helpers/test-data-builders';
import { AuthPage } from '../../fixtures/page-objects/AuthPage';
import { CommunitiesPage } from '../../fixtures/page-objects/CommunitiesPage';

test.describe('Community CRUD Operations', () => {
  let authPage: AuthPage;
  let communitiesPage: CommunitiesPage;
  
  // Test data
  const communityData = createTestCommunity({
    name: markAsTestData(faker.location.city() + ' Community')
  });
  const updatedData = {
    name: markAsTestData(faker.location.city() + ' Updated'),
    description: faker.lorem.sentence()
  };

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    communitiesPage = new CommunitiesPage(page);
  });

  test('should handle basic community CRUD operations (Create, Read, Update, Delete)', async ({ page }) => {
    let communityId: string = '';
    let communityName: string = '';
    
    try {
      // Setup: Sign in with global test user
      const testUser = getGlobalTestUser();
      
      await authPage.goto();
      await authPage.signIn(testUser.email, testUser.password);
      await page.waitForTimeout(3000);
      
      // Verify authentication
      expect(await authPage.isAuthenticated()).toBe(true);
      expect(await authPage.getUserEmail()).toBe(testUser.email.toLowerCase());

      // Navigate to communities page
      await communitiesPage.goto();
      await expect(page.getByRole('heading', { name: 'Communities' })).toBeVisible();
      await page.waitForTimeout(5000);

      // Step 1: CREATE - Create a new community
      await test.step('Create new community', async () => {
        await expect(page.locator('[data-testid="create-community-button"]')).toBeVisible();
        await page.click('[data-testid="create-community-button"]');
        await expect(page.locator('[data-testid="community-form"]')).toBeVisible();
        
        await page.fill('[data-testid="community-name-input"]', communityData.name);
        await page.fill('[data-testid="community-description-input"]', communityData.description);
        
        await test.step(`Creating community: "${communityData.name}"`, async () => {
          await page.click('[data-testid="community-submit-button"]');
          await page.waitForTimeout(3000);
        });
        
        // Check result
        const formClosed = !await page.locator('[data-testid="community-form"]').isVisible().catch(() => true);
        const communityAppeared = await page.locator(`text=${communityData.name}`).isVisible().catch(() => false);
        const hasError = await page.locator('[data-testid="error"]').isVisible().catch(() => false);
        
        if (hasError) {
          const errorText = await page.locator('[data-testid="error"]').textContent();
          test.info().annotations.push({ type: 'error', description: `Create operation failed: ${errorText}` });
          throw new Error(`Community creation failed: ${errorText}`);
        } else if (formClosed && communityAppeared) {
          test.info().annotations.push({ type: 'success', description: `Community "${communityData.name}" created successfully` });
        } else {
          test.info().annotations.push({ 
            type: 'error', 
            description: `Create operation unexpected result - Form closed: ${formClosed}, Community appeared: ${communityAppeared}` 
          });
          throw new Error('Community creation failed - unexpected result');
        }
        
        // Capture community info for cleanup
        communityName = communityData.name;
        await page.waitForTimeout(2000);
      });

      // Step 2: READ - Find and verify the created community exists
      await test.step('Read community data', async () => {
        const communityElement = page.locator('li').filter({ hasText: communityData.name });
        await expect(communityElement).toBeVisible();
        
        const communityTestId = await communityElement.getAttribute('data-testid');
        communityId = communityTestId?.replace('community-', '') || '';
        test.info().annotations.push({ type: 'info', description: `Community ID: ${communityId}` });
      });

      // Step 3: UPDATE - Edit the community
      await test.step('Update community', async () => {
        await expect(page.locator(`[data-testid="edit-${communityId}"]`)).toBeVisible();
        await page.click(`[data-testid="edit-${communityId}"]`);
        await expect(page.locator('[data-testid="community-form"]')).toBeVisible();
        
        await page.fill('[data-testid="community-name-input"]', updatedData.name);
        await page.fill('[data-testid="community-description-input"]', updatedData.description);
        
        await test.step(`Updating community to: "${updatedData.name}"`, async () => {
          await page.click('[data-testid="community-submit-button"]');
          await page.waitForTimeout(3000);
        });
        
        // Check result
        const formClosed = !await page.locator('[data-testid="community-form"]').isVisible().catch(() => true);
        const updatedNameAppeared = await page.locator(`text=${updatedData.name}`).isVisible().catch(() => false);
        const originalNameGone = !await page.locator(`text=${communityData.name}`).isVisible().catch(() => true);
        const hasError = await page.locator('[data-testid="error"]').isVisible().catch(() => false);
        
        if (hasError) {
          const errorText = await page.locator('[data-testid="error"]').textContent();
          test.info().annotations.push({ type: 'error', description: `Update operation failed: ${errorText}` });
          throw new Error(`Community update failed: ${errorText}`);
        } else if (formClosed && updatedNameAppeared && originalNameGone) {
          test.info().annotations.push({ type: 'success', description: `Community renamed to "${updatedData.name}"` });
          // Update community name for cleanup
          communityName = updatedData.name;
        } else {
          test.info().annotations.push({ 
            type: 'error', 
            description: `Update operation unexpected result - Form closed: ${formClosed}, Updated name appeared: ${updatedNameAppeared}, Original name gone: ${originalNameGone}` 
          });
          throw new Error('Community update failed - unexpected result');
        }
      });

      // Step 4: DELETE - Delete the community
      await test.step('Delete community', async () => {
        const hasDeleteButton = await page.locator(`[data-testid="delete-${communityId}"]`).isVisible().catch(() => false);
        const hasError = await page.locator('[data-testid="error"]').isVisible().catch(() => false);
        
        test.info().annotations.push({ 
          type: 'info', 
          description: `Delete button available: ${hasDeleteButton}, Error visible: ${hasError}` 
        });
        
        if (hasError) {
          const errorText = await page.locator('[data-testid="error"]').textContent();
          test.info().annotations.push({ type: 'error', description: `Cannot delete - error present: ${errorText}` });
          throw new Error(`Delete operation failed: ${errorText}`);
        }
        
        if (!hasDeleteButton) {
          test.info().annotations.push({ type: 'error', description: 'Delete button not visible for community creator' });
          throw new Error('Delete button not visible for community creator - permission system bug');
        }
        
        // Handle confirmation dialog
        page.once('dialog', dialog => {
          test.info().annotations.push({ type: 'info', description: `Confirmation dialog: "${dialog.message()}"` });
          dialog.accept();
        });
        
        await test.step(`Deleting community: "${communityName}"`, async () => {
          await page.click(`[data-testid="delete-${communityId}"]`);
          await page.waitForTimeout(3000);
        });
        
        // Check result
        const communityGone = !await page.locator(`text=${communityName}`).isVisible().catch(() => true);
        const deletionError = await page.locator('[data-testid="error"]').isVisible().catch(() => false);
        
        if (deletionError) {
          const errorText = await page.locator('[data-testid="error"]').textContent();
          test.info().annotations.push({ type: 'error', description: `Delete operation failed: ${errorText}` });
          throw new Error(`Community deletion failed: ${errorText}`);
        } else if (communityGone) {
          test.info().annotations.push({ type: 'success', description: `Community "${communityName}" removed from list` });
          // Clear IDs since community was successfully deleted
          communityId = '';
          communityName = '';
        } else {
          test.info().annotations.push({ type: 'error', description: 'Delete operation appeared to succeed but community still visible' });
          throw new Error('Community deletion unclear - no error but community still visible');
        }
      });

    } finally {
      // Cleanup: Delete test community if it still exists
      if (communityId && communityName) {
        await test.step(`Cleanup: Delete test community "${communityName}"`, async () => {
          try {
            const hasDeleteButton = await page.locator(`[data-testid="delete-${communityId}"]`).isVisible().catch(() => false);
            
            if (hasDeleteButton) {
              page.once('dialog', dialog => {
                test.info().annotations.push({ type: 'info', description: `Cleanup confirmation: "${dialog.message()}"` });
                dialog.accept();
              });
              
              await page.click(`[data-testid="delete-${communityId}"]`);
              await page.waitForTimeout(2000);
              
              const communityGone = !await page.locator(`text=${communityName}`).isVisible().catch(() => true);
              test.info().annotations.push({ 
                type: 'info', 
                description: `Cleanup ${communityGone ? 'successful' : 'failed'}: Community deletion` 
              });
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

  test('should handle community membership operations (Join/Leave)', async ({ page }) => {
    let communityId: string = '';
    let communityName: string = '';
    
    try {
      // Setup: Sign in and create a test community for membership testing
      const testUser = getGlobalTestUser();
      
      await authPage.goto();
      await authPage.signIn(testUser.email, testUser.password);
      await page.waitForTimeout(3000);
      
      expect(await authPage.isAuthenticated()).toBe(true);

      await communitiesPage.goto();
      await expect(page.getByRole('heading', { name: 'Communities' })).toBeVisible();
      await page.waitForTimeout(5000);

      // Create a test community for membership operations
      await test.step('Setup: Create test community', async () => {
        await expect(page.locator('[data-testid="create-community-button"]')).toBeVisible();
        await page.click('[data-testid="create-community-button"]');
        await expect(page.locator('[data-testid="community-form"]')).toBeVisible();
        
        const membershipTestName = markAsTestData('Membership Test ' + faker.location.city());
        await page.fill('[data-testid="community-name-input"]', membershipTestName);
        await page.fill('[data-testid="community-description-input"]', 'Community for testing join/leave operations');
        
        await page.click('[data-testid="community-submit-button"]');
        await page.waitForTimeout(3000);
        
        // Verify community was created
        const communityAppeared = await page.locator(`text=${membershipTestName}`).isVisible().catch(() => false);
        const hasError = await page.locator('[data-testid="error"]').isVisible().catch(() => false);
        
        if (hasError) {
          const errorText = await page.locator('[data-testid="error"]').textContent();
          test.info().annotations.push({ type: 'error', description: `Setup failed - community creation failed: ${errorText}` });
          throw new Error(`Test setup failed - community creation failed: ${errorText}`);
        } else if (!communityAppeared) {
          test.info().annotations.push({ type: 'error', description: 'Setup failed - community not created' });
          throw new Error('Test setup failed - community not created');
        }
        
        // Get community ID for membership operations
        const communityElement = page.locator('li').filter({ hasText: membershipTestName });
        const communityTestId = await communityElement.getAttribute('data-testid');
        communityId = communityTestId?.replace('community-', '') || '';
        communityName = membershipTestName;
        
        test.info().annotations.push({ 
          type: 'success', 
          description: `Setup complete: Test community "${communityName}" created with ID: ${communityId}` 
        });
        await page.waitForTimeout(2000);
      });

      // Test membership operations
      await test.step('Test membership operations', async () => {
        // Wait for membership data to load
        await page.waitForTimeout(3000);
        
        // Check what membership buttons are available initially
        const hasLeaveButton = await page.locator(`[data-testid="leave-${communityId}"]`).isVisible().catch(() => false);
        const hasJoinButton = await page.locator(`[data-testid="join-${communityId}"]`).isVisible().catch(() => false);
        const hasError = await page.locator('[data-testid="error"]').isVisible().catch(() => false);
        
        test.info().annotations.push({ 
          type: 'info', 
          description: `Initial state: Leave=${hasLeaveButton}, Join=${hasJoinButton}, Error=${hasError}` 
        });
        
        if (hasError) {
          const errorText = await page.locator('[data-testid="error"]').textContent();
          test.info().annotations.push({ type: 'error', description: `Error during membership check: ${errorText}` });
          throw new Error(`Membership operations failed: ${errorText}`);
        }
        
        // At least one membership button should be visible
        expect(hasLeaveButton || hasJoinButton).toBe(true);
        
        if (hasLeaveButton) {
          // Test LEAVE operation
          await test.step('Test LEAVE operation', async () => {
            await page.click(`[data-testid="leave-${communityId}"]`);
            await page.waitForTimeout(2000);
            
            const joinAppeared = await page.locator(`[data-testid="join-${communityId}"]`).isVisible().catch(() => false);
            const leaveError = await page.locator('[data-testid="error"]').isVisible().catch(() => false);
            
            if (leaveError) {
              const errorText = await page.locator('[data-testid="error"]').textContent();
              test.info().annotations.push({ type: 'error', description: `Leave operation failed: ${errorText}` });
              throw new Error(`Leave operation failed: ${errorText}`);
            } else if (joinAppeared) {
              test.info().annotations.push({ type: 'success', description: 'Leave operation succeeded - Join button appeared' });
            } else {
              test.info().annotations.push({ type: 'error', description: 'Leave operation unclear - no join button or error' });
              throw new Error('Leave operation failed: UI did not update properly after leave');
            }
          });
          
          // Test JOIN operation
          await test.step('Test JOIN operation', async () => {
            await page.click(`[data-testid="join-${communityId}"]`);
            await page.waitForTimeout(2000);
            
            const leaveReappeared = await page.locator(`[data-testid="leave-${communityId}"]`).isVisible().catch(() => false);
            const joinError = await page.locator('[data-testid="error"]').isVisible().catch(() => false);
            
            if (joinError) {
              const errorText = await page.locator('[data-testid="error"]').textContent();
              test.info().annotations.push({ type: 'error', description: `Join operation failed: ${errorText}` });
              throw new Error(`Join operation failed: ${errorText}`);
            } else if (leaveReappeared) {
              test.info().annotations.push({ type: 'success', description: 'Join operation succeeded - Leave button reappeared' });
            } else {
              test.info().annotations.push({ type: 'error', description: 'Join operation unclear - no leave button or error' });
              throw new Error('Join operation failed: UI did not update properly after join');
            }
          });
          
        } else if (hasJoinButton) {
          // Test JOIN operation first
          await test.step('Test JOIN operation first', async () => {
          
            await page.click(`[data-testid="join-${communityId}"]`);
            await page.waitForTimeout(2000);
            
            const leaveAppeared = await page.locator(`[data-testid="leave-${communityId}"]`).isVisible().catch(() => false);
            const joinError = await page.locator('[data-testid="error"]').isVisible().catch(() => false);
            
            if (joinError) {
              const errorText = await page.locator('[data-testid="error"]').textContent();
              test.info().annotations.push({ type: 'error', description: `Join operation failed: ${errorText}` });
              throw new Error(`Join operation failed: ${errorText}`);
            } else if (leaveAppeared) {
              test.info().annotations.push({ type: 'success', description: 'Join operation succeeded - Leave button appeared' });
            } else {
              test.info().annotations.push({ type: 'error', description: 'Join operation unclear - no leave button or error' });
              throw new Error('Join operation failed: UI did not update properly after join');
            }
          });
          
          // Test LEAVE operation
          await test.step('Test LEAVE operation', async () => {
            await page.click(`[data-testid="leave-${communityId}"]`);
            await page.waitForTimeout(2000);
            
            const joinReappeared = await page.locator(`[data-testid="join-${communityId}"]`).isVisible().catch(() => false);
            const leaveError = await page.locator('[data-testid="error"]').isVisible().catch(() => false);
            
            if (leaveError) {
              const errorText = await page.locator('[data-testid="error"]').textContent();
              test.info().annotations.push({ type: 'error', description: `Leave operation failed: ${errorText}` });
              throw new Error(`Leave operation failed: ${errorText}`);
            } else if (joinReappeared) {
              test.info().annotations.push({ type: 'success', description: 'Leave operation succeeded - Join button reappeared' });
            } else {
              test.info().annotations.push({ type: 'error', description: 'Leave operation unclear - no join button or error' });
              throw new Error('Leave operation failed: UI did not update properly after leave');
            }
          });
        }
        
        test.info().annotations.push({ type: 'success', description: 'Membership operations test completed successfully' });
      });

    } finally {
      // Cleanup: Delete test community
      if (communityId && communityName) {
        await test.step(`Cleanup: Delete test community "${communityName}"`, async () => {
          try {
            const hasDeleteButton = await page.locator(`[data-testid="delete-${communityId}"]`).isVisible().catch(() => false);
            
            if (hasDeleteButton) {
              page.once('dialog', dialog => {
                test.info().annotations.push({ type: 'info', description: `Cleanup confirmation: "${dialog.message()}"` });
                dialog.accept();
              });
              
              await page.click(`[data-testid="delete-${communityId}"]`);
              await page.waitForTimeout(2000);
              
              const communityGone = !await page.locator(`text=${communityName}`).isVisible().catch(() => true);
              test.info().annotations.push({ 
                type: 'info', 
                description: `Cleanup ${communityGone ? 'successful' : 'failed'}: Community deletion` 
              });
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




});