import { test, expect } from '@playwright/test'
import { BasePage } from '../../fixtures/page-objects'

test.describe('Basic Navigation', () => {
  let basePage: BasePage

  test.beforeEach(async ({ page }) => {
    basePage = new BasePage(page)
    await basePage.goto()
  })

  test('should load the home page', async ({ page }) => {
    await expect(page).toHaveTitle(/Belong Platform E2E Test App/)
    await expect(page.getByText('E2E Test Home')).toBeVisible()
    await expect(page.getByTestId('status')).toHaveText('App loaded successfully')
  })

  test('should navigate to auth page', async ({ page }) => {
    await basePage.navigateToAuth()
    await expect(page).toHaveURL(/\/auth/)
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
  })

  test('should navigate to communities page', async ({ page }) => {
    await basePage.navigateToCommunities()
    await expect(page).toHaveURL(/\/communities/)
    await expect(page.getByRole('heading', { name: 'Communities' })).toBeVisible()
  })

  test('should navigate to resources page', async ({ page }) => {
    await basePage.navigateToResources()
    await expect(page).toHaveURL(/\/resources/)
    await expect(page.getByRole('heading', { name: 'Resources' })).toBeVisible()
  })

  test('should navigate to events page', async ({ page }) => {
    await basePage.navigateToEvents()
    await expect(page).toHaveURL(/\/events/)
    await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible()
  })

  test('should navigate back to home', async ({ page }) => {
    await basePage.navigateToCommunities()
    await basePage.navHome.click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('E2E Test Home')).toBeVisible()
  })
})