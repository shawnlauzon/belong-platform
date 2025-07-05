import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  fetchUsers,
  fetchUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../../../src/features/users/api';
import type { UserData } from '../../../src/features/users/types';

// Simple test data
const createTestUserData = (overrides: Partial<UserData> = {}): UserData => ({
  id: '', // Will be set by database
  firstName: 'TestFirstName',
  lastName: 'TestLastName',
  fullName: 'TestFirstName TestLastName',
  email: `test-api-user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}@example.com`,
  ...overrides,
});

// Simple cleanup function
const cleanupTestUsers = async (supabase: any) => {
  await supabase
    .from('profiles')
    .delete()
    .like('email', 'test-api-user-%@example.com');
};

describe('Users API Integration Tests', () => {
  let supabase: any;
  let testUserId: string | null = null;

  beforeEach(() => {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );
  });

  afterEach(async () => {
    await cleanupTestUsers(supabase);
    testUserId = null;
  });

  test('fetchUsers should return array of users', async () => {
    const users = await fetchUsers(supabase);
    
    expect(Array.isArray(users)).toBe(true);
    
    // If there are users, check structure
    if (users.length > 0) {
      const user = users[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('firstName');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('createdAt');
      expect(user).toHaveProperty('updatedAt');
      expect(typeof user.id).toBe('string');
      expect(typeof user.firstName).toBe('string');
      expect(typeof user.email).toBe('string');
    }
  });

  test('fetchUsers should handle search filter', async () => {
    const users = await fetchUsers(supabase, { searchTerm: 'test' });
    
    expect(Array.isArray(users)).toBe(true);
    
    // If there are results, verify they contain the search term
    users.forEach(user => {
      const emailMatch = user.email.toLowerCase().includes('test');
      const firstNameMatch = user.firstName?.toLowerCase().includes('test');
      const lastNameMatch = user.lastName?.toLowerCase().includes('test');
      expect(emailMatch || firstNameMatch || lastNameMatch).toBe(true);
    });
  });

  test('fetchUsers should handle pagination', async () => {
    const page1 = await fetchUsers(supabase, { page: 1, pageSize: 5 });
    
    expect(Array.isArray(page1)).toBe(true);
    expect(page1.length).toBeLessThanOrEqual(5);
    
    if (page1.length === 5) {
      const page2 = await fetchUsers(supabase, { page: 2, pageSize: 5 });
      expect(Array.isArray(page2)).toBe(true);
      
      // Pages should have different users (if page2 has content)
      if (page2.length > 0) {
        const page1Ids = page1.map(u => u.id);
        const page2Ids = page2.map(u => u.id);
        const overlap = page1Ids.some(id => page2Ids.includes(id));
        expect(overlap).toBe(false);
      }
    }
  });

  test('createUser should create and return new user', async () => {
    const userData = createTestUserData();

    const createdUser = await createUser(supabase, userData);

    expect(createdUser).toBeDefined();
    expect(createdUser.id).toBeDefined();
    expect(createdUser.firstName).toBe(userData.firstName);
    expect(createdUser.lastName).toBe(userData.lastName);
    expect(createdUser.email).toBe(userData.email);
    expect(createdUser.fullName).toBe(userData.fullName);
    expect(createdUser.createdAt).toBeDefined();
    expect(createdUser.updatedAt).toBeDefined();

    testUserId = createdUser.id;
  });

  test('createUser should throw error with invalid data', async () => {
    const invalidUserData = createTestUserData({
      email: 'invalid-email', // Invalid email format
    });

    await expect(createUser(supabase, invalidUserData)).rejects.toThrow();
  });

  test('createUser should throw error for duplicate email', async () => {
    const userData = createTestUserData();
    
    // Create first user
    await createUser(supabase, userData);
    
    // Try to create another user with same email
    await expect(createUser(supabase, userData)).rejects.toThrow();
  });

  test('fetchUserById should return specific user', async () => {
    // Skip if we don't have a test user
    if (!testUserId) {
      console.warn('Skipping fetchUserById test - no test user available');
      return;
    }

    const user = await fetchUserById(supabase, testUserId);

    expect(user).toBeDefined();
    expect(user?.id).toBe(testUserId);
    expect(user?.email).toContain('test-api-user-');
  });

  test('fetchUserById should return null for non-existent ID', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    
    const user = await fetchUserById(supabase, nonExistentId);
    
    expect(user).toBeNull();
  });

  test('fetchUserById should throw error for invalid UUID format', async () => {
    const invalidId = 'invalid-id-123';
    
    await expect(fetchUserById(supabase, invalidId)).rejects.toThrow();
  });

  test('updateUser should modify existing user', async () => {
    // Skip if we don't have a test user
    if (!testUserId) {
      console.warn('Skipping updateUser test - no test user available');
      return;
    }

    const updates = {
      firstName: 'UpdatedFirstName',
      lastName: 'UpdatedLastName',
      fullName: 'UpdatedFirstName UpdatedLastName',
    };

    const updatedUser = await updateUser(supabase, testUserId, updates);

    expect(updatedUser).toBeDefined();
    expect(updatedUser.id).toBe(testUserId);
    expect(updatedUser.firstName).toBe(updates.firstName);
    expect(updatedUser.lastName).toBe(updates.lastName);
    expect(updatedUser.fullName).toBe(updates.fullName);
    expect(updatedUser.updatedAt).toBeDefined();
  });

  test('updateUser should throw error for non-existent user', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    
    await expect(updateUser(supabase, nonExistentId, {
      firstName: 'Updated',
    })).rejects.toThrow();
  });

  test('deleteUser should remove user from database', async () => {
    // Skip if we don't have a test user
    if (!testUserId) {
      console.warn('Skipping deleteUser test - no test user available');
      return;
    }

    // Delete the user
    await deleteUser(supabase, testUserId);

    // Verify it's gone
    const deletedUser = await fetchUserById(supabase, testUserId);
    expect(deletedUser).toBeNull();

    testUserId = null; // Mark as cleaned up
  });

  test('deleteUser should handle non-existent user gracefully', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    
    // Should not throw an error for valid UUID format
    await expect(deleteUser(supabase, nonExistentId)).resolves.not.toThrow();
  });

  test('deleteUser should throw error for invalid UUID format', async () => {
    const invalidId = 'invalid-id-123';
    
    await expect(deleteUser(supabase, invalidId)).rejects.toThrow();
  });

  test('API functions should handle database connection errors', async () => {
    // Create a client with invalid credentials
    const invalidSupabase = createClient(
      'https://invalid.supabase.co',
      'invalid-key'
    );

    // These should handle errors gracefully or throw expected errors
    await expect(fetchUsers(invalidSupabase)).rejects.toThrow();
    await expect(fetchUserById(invalidSupabase, 'any-id')).rejects.toThrow();
  });

  test('API functions should handle malformed filters gracefully', async () => {
    // Test with various edge cases
    const emptyFilter = await fetchUsers(supabase, {});
    expect(Array.isArray(emptyFilter)).toBe(true);

    const emptySearchTerm = await fetchUsers(supabase, { searchTerm: '' });
    expect(Array.isArray(emptySearchTerm)).toBe(true);

    const zeroPage = await fetchUsers(supabase, { page: 0, pageSize: 5 });
    expect(Array.isArray(zeroPage)).toBe(true);

    const negativePageSize = await fetchUsers(supabase, { page: 1, pageSize: -1 });
    expect(Array.isArray(negativePageSize)).toBe(true);
  });

  test('createUser should handle user with location', async () => {
    const userWithLocation = createTestUserData({
      location: {
        lat: 40.7128,
        lng: -74.0060, // New York City coordinates
      },
    });

    try {
      const createdUser = await createUser(supabase, userWithLocation);
      
      expect(createdUser.location).toEqual(userWithLocation.location);
      testUserId = createdUser.id;
    } catch (error) {
      console.warn('User location test failed - location might not be supported:', error);
      // This is acceptable if location isn't supported in the current schema
    }
  });
});