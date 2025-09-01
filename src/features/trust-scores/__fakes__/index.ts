import { faker } from '@faker-js/faker';
import type { TrustScore, TrustScoreData } from '../types';

/**
 * Creates a fake domain TrustScore object
 */
export function createFakeTrustScore(overrides: Partial<TrustScore> = {}): TrustScore {
  const now = faker.date.recent();
  
  return {
    userId: faker.string.uuid(),
    communityId: faker.string.uuid(),
    score: faker.number.int({ min: 0, max: 5000 }),
    lastCalculatedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Creates fake TrustScore data without persisted fields
 */
export function createFakeTrustScoreData(overrides: Partial<TrustScoreData> = {}): TrustScoreData {
  return {
    userId: faker.string.uuid(),
    communityId: faker.string.uuid(),
    score: faker.number.int({ min: 0, max: 5000 }),
    lastCalculatedAt: faker.date.recent(),
    ...overrides,
  };
}