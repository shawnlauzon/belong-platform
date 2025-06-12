import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock any global browser APIs if needed
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock environment variables
vi.stubEnv('VITE_MAPBOX_PUBLIC_TOKEN', 'test-token');
vi.stubEnv('VITE_SUPABASE_URL', 'http://test-supabase-url.com');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');