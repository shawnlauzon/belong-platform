import { Page, Locator } from '@playwright/test';

/**
 * Helper functions for error checking patterns in E2E tests
 */

export interface OperationResult {
  success: boolean;
  hasError: boolean;
  errorMessage?: string;
  diagnostics: Record<string, boolean>;
}

/**
 * Check for error messages on the page
 */
export async function checkForErrors(page: Page): Promise<{ hasError: boolean; errorMessage?: string }> {
  const hasError = await page.locator('[data-testid="error"]').isVisible().catch(() => false);
  
  if (hasError) {
    const errorMessage = await page.locator('[data-testid="error"]').textContent().catch(() => 'Unknown error');
    return { hasError: true, errorMessage };
  }
  
  return { hasError: false };
}

/**
 * Check if an element is visible with fallback
 */
export async function isVisible(locator: Locator): Promise<boolean> {
  return await locator.isVisible().catch(() => false);
}

/**
 * Check if an element is hidden (not visible)
 */
export async function isHidden(locator: Locator): Promise<boolean> {
  return !await locator.isVisible().catch(() => true);
}

/**
 * Validate CRUD operation result
 */
export async function validateCrudOperation(
  page: Page,
  operation: string,
  expectedConditions: Record<string, () => Promise<boolean>>,
  requiredConditions?: string[]
): Promise<OperationResult> {
  
  // Check for errors first
  const { hasError, errorMessage } = await checkForErrors(page);
  
  // Evaluate all conditions
  const diagnostics: Record<string, boolean> = {};
  for (const [name, condition] of Object.entries(expectedConditions)) {
    diagnostics[name] = await condition();
  }
  
  // Determine success
  let success = false;
  
  if (hasError) {
    console.log(`❌ Platform Bug: ${operation} operation failed - ${errorMessage}`);
    success = false;
  } else if (requiredConditions) {
    // All required conditions must be true
    success = requiredConditions.every(condition => diagnostics[condition]);
    
    if (success) {
      console.log(`✅ ${operation} operation succeeded`);
    } else {
      console.log(`🐛 Platform Bug: ${operation} operation had unexpected result`);
      console.log('Diagnostics:', diagnostics);
    }
  } else {
    // At least one condition must be true (OR logic)
    success = Object.values(diagnostics).some(result => result);
    
    if (success) {
      console.log(`✅ ${operation} operation succeeded`);
    } else {
      console.log(`🐛 Platform Bug: ${operation} operation failed - no expected conditions met`);
      console.log('Diagnostics:', diagnostics);
    }
  }
  
  return {
    success,
    hasError,
    errorMessage,
    diagnostics
  };
}

/**
 * Helper for form submission validation
 */
export async function validateFormSubmission(
  page: Page,
  operation: string,
  formSelector: string,
  successConditions: Record<string, () => Promise<boolean>>
): Promise<OperationResult> {
  
  await page.waitForTimeout(2000); // Allow operation to complete
  
  const conditions = {
    formClosed: async () => isHidden(page.locator(formSelector)),
    ...successConditions
  };
  
  return await validateCrudOperation(
    page, 
    operation, 
    conditions,
    ['formClosed'] // Form must close for success
  );
}

/**
 * Helper for membership operation validation
 */
export async function validateMembershipOperation(
  page: Page,
  operation: string,
  communityId: string,
  expectedButtonType: 'join' | 'leave'
): Promise<OperationResult> {
  
  await page.waitForTimeout(2000); // Allow operation to complete
  
  const expectedButton = `[data-testid="${expectedButtonType}-${communityId}"]`;
  
  const conditions = {
    expectedButtonVisible: async () => isVisible(page.locator(expectedButton))
  };
  
  return await validateCrudOperation(page, operation, conditions);
}

/**
 * Log operation diagnostics
 */
export function logOperationStart(operation: string, details?: string): void {
  const icons = {
    CREATE: '🏗️',
    READ: '👀', 
    UPDATE: '✏️',
    DELETE: '🗑️',
    JOIN: '🔗',
    LEAVE: '🚪'
  };
  
  const icon = icons[operation.toUpperCase() as keyof typeof icons] || '🔄';
  console.log(`${icon} Testing ${operation} operation${details ? `: ${details}` : ''}...`);
}

/**
 * Assert operation result (throws if operation failed due to platform bug)
 */
export function assertOperationResult(result: OperationResult, operation: string): void {
  if (result.hasError) {
    throw new Error(`${operation} failed: ${result.errorMessage}`);
  }
  
  if (!result.success) {
    const diagnosticsStr = Object.entries(result.diagnostics)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    throw new Error(`${operation} unclear - expected conditions not met. Diagnostics: ${diagnosticsStr}`);
  }
}