import { readFileSync } from 'fs';
import { join } from 'path';

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
}

export function getGlobalTestUser(): TestUser {
  try {
    const testUserPath = join(process.cwd(), 'test-user.json');
    const testUserData = readFileSync(testUserPath, 'utf8');
    return JSON.parse(testUserData);
  } catch (error) {
    throw new Error('Global test user not found. Make sure global setup ran successfully.');
  }
}