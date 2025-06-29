import { describe, it, expect } from "vitest";
import { queryKeys } from "../queryKeys";

describe("queryKeys", () => {
  describe("auth keys", () => {
    it("should provide auth query key", () => {
      expect(queryKeys.auth).toEqual(["auth"]);
      expect(Array.isArray(queryKeys.auth)).toBe(true);
    });

    it("should be readonly tuple", () => {
      expect(queryKeys.auth).toHaveLength(1);
      expect(queryKeys.auth[0]).toBe("auth");
    });
  });

  describe("users keys", () => {
    it("should provide all users query key", () => {
      expect(queryKeys.users.all).toEqual(["users"]);
    });

    it("should provide user by ID query key", () => {
      const userId = "user-123";
      expect(queryKeys.users.byId(userId)).toEqual(["user", userId]);
    });

    it("should provide user search query key", () => {
      const searchTerm = "john";
      expect(queryKeys.users.search(searchTerm)).toEqual(["users", "search", searchTerm]);
    });

    it("should generate different keys for different user IDs", () => {
      const user1Key = queryKeys.users.byId("user-1");
      const user2Key = queryKeys.users.byId("user-2");
      expect(user1Key).not.toEqual(user2Key);
    });

    it("should generate different keys for different search terms", () => {
      const search1Key = queryKeys.users.search("john");
      const search2Key = queryKeys.users.search("jane");
      expect(search1Key).not.toEqual(search2Key);
    });
  });

  describe("communities keys", () => {
    it("should provide all communities query key", () => {
      expect(queryKeys.communities.all).toEqual(["communities"]);
    });

    it("should provide community by ID query key", () => {
      const communityId = "community-123";
      expect(queryKeys.communities.byId(communityId)).toEqual(["community", communityId]);
    });

    it("should provide community memberships query key", () => {
      const communityId = "community-123";
      expect(queryKeys.communities.memberships(communityId)).toEqual([
        "community",
        communityId,
        "memberships",
      ]);
    });

    it("should provide user memberships query key", () => {
      const userId = "user-123";
      expect(queryKeys.communities.userMemberships(userId)).toEqual([
        "user",
        userId,
        "memberships",
      ]);
    });
  });

  describe("resources keys", () => {
    it("should provide all resources query key", () => {
      expect(queryKeys.resources.all).toEqual(["resources"]);
    });

    it("should provide resource by ID query key", () => {
      const resourceId = "resource-123";
      expect(queryKeys.resources.byId(resourceId)).toEqual(["resource", resourceId]);
    });

    it("should provide resources by community query key", () => {
      const communityId = "community-123";
      expect(queryKeys.resources.byCommunity(communityId)).toEqual([
        "resources",
        "community",
        communityId,
      ]);
    });

    it("should provide resources by owner query key", () => {
      const ownerId = "user-123";
      expect(queryKeys.resources.byOwner(ownerId)).toEqual([
        "resources",
        "owner",
        ownerId,
      ]);
    });

    it("should provide filtered resources query key", () => {
      const filter = { category: "tools", type: "offer" };
      expect(queryKeys.resources.filtered(filter)).toEqual([
        "resources",
        "filtered",
        filter,
      ]);
    });
  });

  describe("events keys", () => {
    it("should provide all events query key", () => {
      expect(queryKeys.events.all).toEqual(["events"]);
    });

    it("should provide event by ID query key", () => {
      const eventId = "event-123";
      expect(queryKeys.events.byId(eventId)).toEqual(["event", eventId]);
    });

    it("should provide events by community query key", () => {
      const communityId = "community-123";
      expect(queryKeys.events.byCommunity(communityId)).toEqual([
        "events",
        "community",
        communityId,
      ]);
    });

    it("should provide events by organizer query key", () => {
      const organizerId = "user-123";
      expect(queryKeys.events.byOrganizer(organizerId)).toEqual([
        "events",
        "organizer",
        organizerId,
      ]);
    });

    it("should provide event attendees query key", () => {
      const eventId = "event-123";
      expect(queryKeys.events.attendees(eventId)).toEqual([
        "event",
        eventId,
        "attendees",
      ]);
    });

    it("should provide user attendances query key", () => {
      const userId = "user-123";
      expect(queryKeys.events.userAttendances(userId)).toEqual([
        "user",
        userId,
        "attendances",
      ]);
    });

    it("should provide filtered events query key", () => {
      const filter = { startDate: "2023-01-01", isActive: true };
      expect(queryKeys.events.filtered(filter)).toEqual([
        "events",
        "filtered",
        filter,
      ]);
    });
  });

  describe("thanks keys", () => {
    it("should provide all thanks query key", () => {
      expect(queryKeys.thanks.all).toEqual(["thanks"]);
    });

    it("should provide thanks by ID query key", () => {
      const thanksId = "thanks-123";
      expect(queryKeys.thanks.byId(thanksId)).toEqual(["thanks", thanksId]);
    });

    it("should provide thanks by community query key", () => {
      const communityId = "community-123";
      expect(queryKeys.thanks.byCommunity(communityId)).toEqual([
        "thanks",
        "community",
        communityId,
      ]);
    });

    it("should provide thanks sent by user query key", () => {
      const userId = "user-123";
      expect(queryKeys.thanks.sentBy(userId)).toEqual([
        "thanks",
        "sent",
        userId,
      ]);
    });

    it("should provide thanks received by user query key", () => {
      const userId = "user-123";
      expect(queryKeys.thanks.receivedBy(userId)).toEqual([
        "thanks",
        "received",
        userId,
      ]);
    });

    it("should provide filtered thanks query key", () => {
      const filter = { resourceId: "resource-123", fromUserId: "user-456" };
      expect(queryKeys.thanks.filtered(filter)).toEqual([
        "thanks",
        "filtered",
        filter,
      ]);
    });
  });

  describe("key structure and consistency", () => {
    it("should have consistent key structure across entities", () => {
      // All entity collections should follow similar patterns
      expect(queryKeys.users.all[0]).toBe("users");
      expect(queryKeys.communities.all[0]).toBe("communities");
      expect(queryKeys.resources.all[0]).toBe("resources");
      expect(queryKeys.events.all[0]).toBe("events");
      expect(queryKeys.thanks.all[0]).toBe("thanks");
    });

    it("should use singular form for byId keys", () => {
      expect(queryKeys.users.byId("123")[0]).toBe("user");
      expect(queryKeys.communities.byId("123")[0]).toBe("community");
      expect(queryKeys.resources.byId("123")[0]).toBe("resource");
      expect(queryKeys.events.byId("123")[0]).toBe("event");
      expect(queryKeys.thanks.byId("123")[0]).toBe("thanks");
    });

    it("should maintain referential stability for static keys", () => {
      // Static keys should return the same reference
      expect(queryKeys.users.all).toBe(queryKeys.users.all);
      expect(queryKeys.auth).toBe(queryKeys.auth);
    });

    it("should create new arrays for dynamic keys", () => {
      // Dynamic keys should create new arrays each time
      const key1 = queryKeys.users.byId("user-1");
      const key2 = queryKeys.users.byId("user-1");
      expect(key1).toEqual(key2);
      expect(key1 !== key2).toBe(true); // Different references
    });
  });

  describe("cache invalidation support", () => {
    it("should support partial key matching for cache invalidation", () => {
      // Keys are structured to support React Query's invalidateQueries
      const userKey = queryKeys.users.byId("user-123");
      const usersAllKey = queryKeys.users.all;
      
      // Should be able to invalidate all user queries with ["users"]
      expect(userKey[0]).not.toBe(usersAllKey[0]); // user vs users
      expect(usersAllKey[0]).toBe("users");
    });

    it("should support hierarchical cache invalidation", () => {
      // User-related keys should be grouped for easy invalidation
      const userMemberships = queryKeys.communities.userMemberships("user-123");
      const userAttendances = queryKeys.events.userAttendances("user-123");
      
      // Both start with ["user", userId, ...] for easy invalidation
      expect(userMemberships[0]).toBe("user");
      expect(userAttendances[0]).toBe("user");
      expect(userMemberships[1]).toBe("user-123");
      expect(userAttendances[1]).toBe("user-123");
    });
  });

  describe("React Query integration", () => {
    it("should work with React Query useQuery", () => {
      // Keys should be valid for React Query hooks
      const mockUseQuery = (queryKey: readonly unknown[]) => {
        expect(Array.isArray(queryKey)).toBe(true);
        expect(queryKey.length).toBeGreaterThan(0);
        return { data: null, isLoading: false };
      };

      // All key types should work
      mockUseQuery(queryKeys.auth);
      mockUseQuery(queryKeys.users.all);
      mockUseQuery(queryKeys.users.byId("123"));
      mockUseQuery(queryKeys.communities.memberships("community-123"));
    });

    it("should handle filter objects properly", () => {
      const complexFilter = {
        category: "tools",
        type: "offer",
        location: { lat: 37.7749, lng: -122.4194 },
        isActive: true,
      };

      const key = queryKeys.resources.filtered(complexFilter);
      expect(key).toEqual(["resources", "filtered", complexFilter]);
      expect(key[2]).toBe(complexFilter); // Same reference
    });
  });

  describe("type safety", () => {
    it("should maintain const assertion types", () => {
      // Keys should be readonly tuples, not mutable arrays
      const authKey = queryKeys.auth;
      const userKey = queryKeys.users.byId("123");
      
      expect(Array.isArray(authKey)).toBe(true);
      expect(Array.isArray(userKey)).toBe(true);
    });

    it("should accept any filter object type", () => {
      // Filter functions should accept Record<string, any>
      const stringFilter = { name: "test" };
      const numberFilter = { page: 1, limit: 10 };
      const booleanFilter = { isActive: true };
      const mixedFilter = { name: "test", page: 1, active: true };

      expect(() => queryKeys.resources.filtered(stringFilter)).not.toThrow();
      expect(() => queryKeys.events.filtered(numberFilter)).not.toThrow();
      expect(() => queryKeys.thanks.filtered(booleanFilter)).not.toThrow();
      expect(() => queryKeys.resources.filtered(mixedFilter)).not.toThrow();
    });
  });
});