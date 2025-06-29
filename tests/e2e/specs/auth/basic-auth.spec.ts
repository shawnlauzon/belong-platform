import { test, expect } from '@playwright/test'
import { AuthPage } from '../../fixtures/page-objects'
import { faker } from '@faker-js/faker'

test.describe('Basic Authentication', () => {
  let authPage: AuthPage

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page)
    await authPage.goto()
  })

  test('should display sign in form by default', async ({ page }) => {
    await expect(authPage.emailInput).toBeVisible()
    await expect(authPage.passwordInput).toBeVisible()
    await expect(authPage.signInButton).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
  })

  test('should toggle between sign in and sign up', async ({ page }) => {
    // Start with sign in
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
    
    // Toggle to sign up
    await authPage.toggleAuthMode.click()
    await expect(page.getByRole('heading', { name: 'Sign Up' })).toBeVisible()
    await expect(authPage.signUpButton).toBeVisible()
    
    // Toggle back to sign in
    await authPage.toggleAuthMode.click()
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
    await expect(authPage.signInButton).toBeVisible()
  })

  test('should validate required fields', async () => {
    // Try to submit without filling fields
    await authPage.signInButton.click()
    
    // HTML5 validation should prevent submission
    const emailValidity = await authPage.emailInput.evaluate((el: HTMLInputElement) => el.validity.valid)
    const passwordValidity = await authPage.passwordInput.evaluate((el: HTMLInputElement) => el.validity.valid)
    
    expect(emailValidity).toBe(false)
    expect(passwordValidity).toBe(false)
  })

  test('should show error for invalid credentials', async () => {
    // Use fake credentials that won't exist
    const email = faker.internet.email()
    const password = faker.internet.password()
    
    await authPage.signIn(email, password)
    
    // Should show error message
    await expect(authPage.authError).toBeVisible({ timeout: 10000 })
    const error = await authPage.getAuthError()
    expect(error).toBeTruthy()
  })

  test('should successfully sign up and sign in', async () => {
    // This test requires a real Supabase instance with email sign-ups enabled
    
    const email = faker.internet.email()
    const password = faker.internet.password({ length: 10 })
    
    // Sign up
    await authPage.signUp(email, password)
    
    // Should not show any auth errors
    try {
      await authPage.authError.waitFor({ timeout: 2000 })
      const error = await authPage.getAuthError()
      if (error) {
        throw new Error(`Sign-up failed with error: ${error}`)
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('Sign-up failed')) {
        throw e
      }
      // No error element found, which is expected for successful sign-up
    }
    
    await expect(authPage.authStatus).toBeVisible({ timeout: 15000 })
    
    // Verify authenticated state
    expect(await authPage.isAuthenticated()).toBe(true)
    expect(await authPage.getUserEmail()).toBe(email)
    
    // Sign out
    await authPage.signOut()
    await expect(authPage.signInButton).toBeVisible()
    
    // Sign in again
    await authPage.signIn(email, password)
    await expect(authPage.authStatus).toBeVisible({ timeout: 15000 })
    expect(await authPage.isAuthenticated()).toBe(true)
  })
})