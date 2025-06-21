import { describe, it, expect, vi, beforeEach } from "vitest";
import { createResourceService } from "../services/resource.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@belongnetwork/types/database";

// Mock the logger
vi.mock("@belongnetwork/core", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Resource Service - Soft Delete Bug Fix", () => {
  let mockSupabase: any;
  let resourceService: ReturnType<typeof createResourceService>;

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    } as any;

    resourceService = createResourceService(mockSupabase as SupabaseClient<Database>);
    vi.clearAllMocks();
  });

  it("should only return active resources by default (service-level bug test)", async () => {
    // Arrange: Mock database returns mix of active and inactive resources
    const mockDbResources = [
      {
        id: "resource-active",
        type: "offer",
        category: "tools",
        title: "Active Resource",
        description: "This should appear",
        owner_id: "user-1",
        community_id: "community-1",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "resource-inactive",
        type: "offer",
        category: "tools", 
        title: "Inactive Resource",
        description: "This should NOT appear",
        owner_id: "user-1",
        community_id: "community-1",
        is_active: false, // This resource was soft-deleted
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Setup mock chain - the service should call .eq("is_active", true) by default
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue({ data: mockDbResources, error: null });

    // Act: Call fetchResources with no filters (should default to active only)
    const result = await resourceService.fetchResources();

    // Assert: Service should have applied default active filtering
    expect(mockSupabase.from).toHaveBeenCalledWith("resources");
    expect(mockSupabase.select).toHaveBeenCalledWith("*");
    expect(mockSupabase.eq).toHaveBeenCalledWith("is_active", true); // CRITICAL: Must filter for active
    expect(mockSupabase.order).toHaveBeenCalledWith("created_at", { ascending: false });

    // Should only return active resources due to application-level filtering
    expect(result).toHaveLength(1);
    expect(result[0].isActive).toBe(true);
    expect(result[0].id).toBe("resource-active");
    
    // Verify inactive resource was filtered out
    const inactiveResource = result.find(r => r.id === "resource-inactive");
    expect(inactiveResource).toBeUndefined();
  });

  it("should allow explicit inactive filtering when requested", async () => {
    // Arrange: Mock returns inactive resources when explicitly requested
    const mockInactiveResources = [
      {
        id: "resource-inactive",
        type: "offer",
        category: "tools",
        title: "Inactive Resource", 
        description: "This should appear when requested",
        owner_id: "user-1",
        community_id: "community-1",
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue({ data: mockInactiveResources, error: null });

    // Act: Explicitly request inactive resources
    const result = await resourceService.fetchResources({ isActive: false });

    // Assert: Should query for inactive resources when explicitly requested
    expect(mockSupabase.eq).toHaveBeenCalledWith("is_active", false);
    expect(result).toHaveLength(1);
    expect(result[0].isActive).toBe(false);
    expect(result[0].id).toBe("resource-inactive");
  });
});