// Test setup file for core package
import { vi } from "vitest";

// Mock environment variables
vi.stubEnv("DEV", "true");
vi.stubEnv("VITE_LOG_LEVEL", "debug");