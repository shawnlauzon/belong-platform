import { test, expect } from '@playwright/test'
import { CommunitiesPage } from '../../fixtures/page-objects'

test.describe('Platform Integration', () => {
  test('should load @belongnetwork/platform without errors', async ({ page }) => {
    // Check for console errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify no console errors related to platform package
    const platformErrors = consoleErrors.filter(error => 
      error.includes('@belongnetwork/platform') || 
      error.includes('BelongProvider') ||
      error.includes('useAuth') ||
      error.includes('useCommunities')
    )

    expect(platformErrors).toHaveLength(0)
  })

  test('should render BelongProvider without blank page', async ({ page }) => {
    await page.goto('/')
    
    // Page should not be blank
    const bodyText = await page.textContent('body')
    expect(bodyText).not.toBe('')
    
    // Main app should be visible
    await expect(page.getByText('Belong Platform E2E Test App')).toBeVisible()
  })

  test('should access platform hooks', async ({ page }) => {
    const communitiesPage = new CommunitiesPage(page)
    await communitiesPage.goto()

    // Should show loading state initially
    await expect(communitiesPage.loading).toBeVisible()

    // Should eventually show communities list or empty state
    await expect(communitiesPage.communitiesList).toBeVisible({ timeout: 15000 })
    
    // Should not show error state if properly configured
    const error = await communitiesPage.getError()
    if (error) {
      // If there's an error, it should be related to missing env vars, not package issues
      expect(error).toMatch(/VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY|configuration/i)
    }
  })
})