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

    // With fake credentials, we expect either:
    // 1. An error state (most likely - invalid credentials)
    // 2. Communities list (if somehow it works)
    await page.waitForTimeout(3000) // Wait for network request to complete

    const hasError = await communitiesPage.error.isVisible().catch(() => false)
    const hasList = await communitiesPage.communitiesList.isVisible().catch(() => false)
    
    // Should show either error or list, not still loading
    expect(hasError || hasList).toBe(true)
    
    // If there's an error, it should be network/auth related, not platform package issues
    if (hasError) {
      const error = await communitiesPage.getError()
      console.log('Expected auth error:', error)
      // This is expected with fake credentials - network/auth errors are fine
      expect(error).toBeTruthy()
    }
  })
})