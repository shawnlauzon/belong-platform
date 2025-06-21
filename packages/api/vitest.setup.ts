import { vi } from 'vitest';

// Mock @belongnetwork/core module globally
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn(),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}));