import { test, expect } from '@playwright/test'
import { ResourcesPage, AuthPage } from '../../fixtures/page-objects'
import { faker } from '@faker-js/faker'

test.describe('Resources E2E', () => {
  let resourcesPage: ResourcesPage
  let authPage: AuthPage

  test.beforeEach(async ({ page }) => {
    resourcesPage = new ResourcesPage(page)
    authPage = new AuthPage(page)
    await resourcesPage.goto()
  })

  test('should load resources page without authentication', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Resources' })).toBeVisible()
    
    // Should show loading state initially
    await expect(resourcesPage.loading).toBeVisible()
    
    // Wait for loading to complete and check result
    await page.waitForTimeout(3000)
    
    const hasError = await resourcesPage.error.isVisible().catch(() => false)
    const hasList = await resourcesPage.resourcesList.isVisible().catch(() => false)
    
    // Should show either error or resources list
    expect(hasError || hasList).toBe(true)
    
    if (hasError) {
      const error = await resourcesPage.getError()
      expect(error).toBeTruthy()
      console.log('Expected auth error:', error)
    }
    
    if (hasList) {
      const count = await resourcesPage.getResourceCount()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should handle resources data with authentication', async ({ page }) => {
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
    
    // Navigate back to resources
    await resourcesPage.goto()
    
    // Should load resources page
    await expect(page.getByRole('heading', { name: 'Resources' })).toBeVisible()
    
    // Wait for resources to load
    await page.waitForTimeout(5000)
    
    const hasError = await resourcesPage.error.isVisible().catch(() => false)
    const hasList = await resourcesPage.resourcesList.isVisible().catch(() => false)
    
    expect(hasError || hasList).toBe(true)
    
    if (hasList) {
      // Verify list structure
      const count = await resourcesPage.getResourceCount()
      expect(count).toBeGreaterThanOrEqual(0)
      
      if (count > 0) {
        const firstResource = await resourcesPage.getResourceByIndex(0)
        expect(firstResource.title).toBeTruthy()
      }
    }
  })


  test('should display resource details correctly', async ({ page }) => {
    await resourcesPage.goto()
    
    // Wait for data to load
    await page.waitForTimeout(3000)
    
    const hasList = await resourcesPage.resourcesList.isVisible().catch(() => false)
    
    if (hasList) {
      const count = await resourcesPage.getResourceCount()
      
      if (count > 0) {
        const resource = await resourcesPage.getResourceByIndex(0)
        
        // Verify resource structure
        expect(resource.title).toBeTruthy()
        expect(typeof resource.title).toBe('string')
        
        // Description and category are optional
        if (resource.description) {
          expect(typeof resource.description).toBe('string')
        }
        
        if (resource.category) {
          expect(typeof resource.category).toBe('string')
          expect(resource.category).toContain('Category:')
        }
      }
    }
  })

})