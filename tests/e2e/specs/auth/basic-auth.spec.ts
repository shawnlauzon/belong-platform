import { test, expect } from "@playwright/test";
import { AuthPage } from "../../fixtures/page-objects";
import { faker } from "@faker-js/faker";
import { getGlobalTestUser } from "../../helpers/test-user";

test.describe("Basic Authentication", () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    await authPage.goto();
  });

  test("should show error for invalid credentials", async () => {
    // Use fake credentials that won't exist
    const email = faker.internet.email();
    const password = `${faker.internet.password({ length: 7, pattern: /[a-zA-Z0-9]/ })}Aa1`;

    await authPage.signIn(email, password);

    // Should show error message
    await expect(authPage.authError).toBeVisible({ timeout: 10000 });
    const error = await authPage.getAuthError();
    expect(error).toBeTruthy();
  });

  test("should successfully sign up new user", async ({ page }) => {
    // Generate test user credentials for this specific test
    const newUser = {
      email: faker.internet.email(),
      password: `${faker.internet.password({ length: 7, pattern: /[a-zA-Z0-9]/ })}Aa1`,
      firstName: faker.person.firstName()
    };

    // Sign up the test user
    await authPage.signUp(newUser.email, newUser.password, newUser.firstName);

    // Wait a moment for the platform signUp operation to complete
    await page.waitForTimeout(3000);

    // Verify platform authentication state after sign up
    expect(await authPage.isAuthenticated()).toBe(true);
    expect(await authPage.getUserEmail()).toBe(newUser.email.toLowerCase());
  });

  test("should successfully sign in existing user", async ({ page }) => {
    // Use the global test user created in setup
    const globalTestUser = getGlobalTestUser();

    // Verify user starts in signed out state
    expect(await authPage.isAuthenticated()).toBe(false);

    // Sign in with the global test user
    await authPage.signIn(globalTestUser.email, globalTestUser.password);

    // Wait a moment for the platform signIn operation to complete
    await page.waitForTimeout(3000);

    // Verify platform authentication state after sign in
    expect(await authPage.isAuthenticated()).toBe(true);
    expect(await authPage.getUserEmail()).toBe(globalTestUser.email.toLowerCase());
  });

  test("should successfully sign out user", async ({ page }) => {
    // Use the global test user created in setup
    const globalTestUser = getGlobalTestUser();

    // First sign in the global test user
    await authPage.signIn(globalTestUser.email, globalTestUser.password);
    
    // Wait for sign in to complete
    await page.waitForTimeout(3000);

    // Verify user is authenticated before sign out
    expect(await authPage.isAuthenticated()).toBe(true);

    // Sign out the user
    await authPage.signOut();

    // Wait a moment for the platform signOut operation to complete
    await page.waitForTimeout(3000);

    // Verify platform signOut worked - authentication state should be false
    expect(await authPage.isAuthenticated()).toBe(false);
  });
});
