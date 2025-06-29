import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type {
  ConversationInfo,
  Conversation,
} from "@belongnetwork/types";
import { useConversations } from "../useConversations";

// Mock the auth provider
vi.mock("@belongnetwork/api/auth/providers/CurrentUserProvider", () => ({
  useSupabase: vi.fn(),
}));

// Mock the messaging service
vi.mock("@belongnetwork/api/messaging/services/messaging.service", () => ({
  createMessagingService: vi.fn(),
}));

import { useSupabase } from "@belongnetwork/api/auth/providers/CurrentUserProvider";
import { createMessagingService } from "@belongnetwork/api/messaging/services/messaging.service";

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateMessagingService = vi.mocked(createMessagingService);
const mockFetchConversations = vi.fn();

describe("useConversations consolidated hook", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();

    // Setup mocks
    mockUseSupabase.mockReturnValue({} as any);
    mockCreateMessagingService.mockReturnValue({
      fetchConversations: mockFetchConversations,
    } as any);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  describe("Test #1: Hook structure + list() method", () => {
    it("should provide list method that fetches conversations", async () => {
      // Arrange - mock data
      const mockConversationData: ConversationInfo[] = [
        {
          id: "conv-1",
          participant1Id: "user-1", 
          participant2Id: "user-2",
          lastMessageAt: new Date(),
          lastMessagePreview: "Hello there",
          unreadCount: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockFetchConversations.mockResolvedValue(mockConversationData);

      // Act - render hook
      const { result } = renderHook(() => useConversations(), { wrapper });

      // Assert - hook structure
      expect(result.current).toHaveProperty('list');
      expect(typeof result.current.list).toBe('function');

      // Assert - list method works
      const conversations = await result.current.list();
      expect(conversations).toEqual(mockConversationData);
      expect(mockFetchConversations).toHaveBeenCalledTimes(1);
    });
  });
});