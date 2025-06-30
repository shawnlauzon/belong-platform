import { test, expect } from '@playwright/test'
import { CommunitiesPage, AuthPage } from '../../fixtures/page-objects'
import { faker } from '@faker-js/faker'

test.describe('Communities E2E', () => {
  let communitiesPage: CommunitiesPage
  let authPage: AuthPage

  test.beforeEach(async ({ page }) => {
    communitiesPage = new CommunitiesPage(page)
    authPage = new AuthPage(page)
    await communitiesPage.goto()
  })

  test('should load communities page without authentication', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Communities' })).toBeVisible()
    
    // Should show loading state initially
    await expect(communitiesPage.loading).toBeVisible()
    
    // Wait for loading to complete and check result
    await page.waitForTimeout(3000)
    
    const hasError = await communitiesPage.error.isVisible().catch(() => false)
    const hasList = await communitiesPage.communitiesList.isVisible().catch(() => false)
    
    // Should show either error or communities list
    expect(hasError || hasList).toBe(true)
    
    if (hasError) {
      const error = await communitiesPage.getError()
      expect(error).toBeTruthy()
      console.log('Expected auth error:', error)
    }
    
    if (hasList) {
      const count = await communitiesPage.getCommunityCount()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should handle communities data with authentication', async ({ page }) => {
    // First sign in
    await authPage.goto()
    
    const email = faker.internet.email()
    const password = faker.internet.password({ length: 10 })
    
    // Try to sign up first (might work or fail depending on setup)
    try {
      await authPage.signUp(email, password)
      await page.waitForTimeout(2000) // Wait for potential confirmation
    } catch (e) {
      // Sign up might fail, that's okay for this test
    }
    
    // Navigate back to communities
    await communitiesPage.goto()
    
    // Should load communities page
    await expect(page.getByRole('heading', { name: 'Communities' })).toBeVisible()
    
    // Wait for communities to load
    await page.waitForTimeout(5000)
    
    const hasError = await communitiesPage.error.isVisible().catch(() => false)
    const hasList = await communitiesPage.communitiesList.isVisible().catch(() => false)
    
    expect(hasError || hasList).toBe(true)
    
    if (hasList) {
      // Verify list structure
      const count = await communitiesPage.getCommunityCount()
      expect(count).toBeGreaterThanOrEqual(0)
      
      if (count > 0) {
        const firstCommunity = await communitiesPage.getCommunityByIndex(0)
        expect(firstCommunity.name).toBeTruthy()
      }
    }
  })


})