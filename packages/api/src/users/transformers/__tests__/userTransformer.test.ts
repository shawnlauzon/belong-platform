import { describe, it, expect, vi } from "vitest";
import { 
  toDomainUser, 
  forDbInsert, 
  forDbUpdate, 
  createUserMetadata 
} from "../userTransformer";
import { createMockDbProfile } from "../../../test-utils/mocks";
import type { User, UserData } from "@belongnetwork/types";

describe("userTransformer", () => {
  describe("toDomainUser", () => {
    it("should transform a complete profile row to domain user", () => {
      // Arrange
      const mockProfile = createMockDbProfile({
        id: "user-123",
        email: "test@example.com",
        user_metadata: {
          first_name: "John",
          last_name: "Doe",
          full_name: "John Doe",
          avatar_url: "https://example.com/avatar.jpg",
          location: { lat: 37.7749, lng: -122.4194 },
        },
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-02T00:00:00Z",
      });

      // Act
      const result = toDomainUser(mockProfile);

      // Assert
      expect(result).toEqual({
        id: "user-123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        fullName: "John Doe",
        avatarUrl: "https://example.com/avatar.jpg",
        location: { lat: 37.7749, lng: -122.4194 },
        createdAt: new Date("2023-01-01T00:00:00Z"),
        updatedAt: new Date("2023-01-02T00:00:00Z"),
      });
    });

    it("should handle profile with minimal metadata", () => {
      // Arrange
      const mockProfile = createMockDbProfile({
        id: "user-456",
        email: "minimal@example.com",
        user_metadata: {
          first_name: "Jane",
        },
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
      });

      // Act
      const result = toDomainUser(mockProfile);

      // Assert
      expect(result).toEqual({
        id: "user-456",
        email: "minimal@example.com",
        firstName: "Jane",
        lastName: undefined,
        fullName: undefined,
        avatarUrl: undefined,
        location: undefined,
        createdAt: new Date("2023-01-01T00:00:00Z"),
        updatedAt: new Date("2023-01-01T00:00:00Z"),
      });
    });

    it("should handle profile with null user_metadata", () => {
      // Arrange
      const mockProfile = createMockDbProfile({
        id: "user-789",
        email: "empty@example.com",
        user_metadata: null,
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
      });

      // Act
      const result = toDomainUser(mockProfile);

      // Assert
      expect(result).toEqual({
        id: "user-789",
        email: "empty@example.com",
        firstName: "",
        lastName: undefined,
        fullName: undefined,
        avatarUrl: undefined,
        location: undefined,
        createdAt: new Date("2023-01-01T00:00:00Z"),
        updatedAt: new Date("2023-01-01T00:00:00Z"),
      });
    });

    it("should handle profile with null email", () => {
      // Arrange
      const mockProfile = createMockDbProfile({
        id: "user-null-email",
        email: null,
        user_metadata: {
          first_name: "NoEmail",
        },
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
      });

      // Act
      const result = toDomainUser(mockProfile);

      // Assert
      expect(result.email).toBe("");
      expect(result.firstName).toBe("NoEmail");
    });

    it("should parse date strings correctly", () => {
      // Arrange
      const createdAt = "2023-06-15T14:30:00.000Z";
      const updatedAt = "2023-06-16T09:15:30.500Z";
      const mockProfile = createMockDbProfile({
        created_at: createdAt,
        updated_at: updatedAt,
      });

      // Act
      const result = toDomainUser(mockProfile);

      // Assert
      expect(result.createdAt).toEqual(new Date(createdAt));
      expect(result.updatedAt).toEqual(new Date(updatedAt));
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("forDbInsert", () => {
    it("should transform complete user data for database insertion", () => {
      // Arrange
      const userData: UserData & { id: string } = {
        id: "user-123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        fullName: "John Doe",
        avatarUrl: "https://example.com/avatar.jpg",
        location: { lat: 37.7749, lng: -122.4194 },
      };

      // Act
      const result = forDbInsert(userData);

      // Assert
      expect(result).toEqual({
        id: "user-123",
        email: "test@example.com",
        user_metadata: {
          first_name: "John",
          last_name: "Doe",
          full_name: "John Doe",
          avatar_url: "https://example.com/avatar.jpg",
          location: { lat: 37.7749, lng: -122.4194 },
        },
      });
    });

    it("should handle minimal user data for insertion", () => {
      // Arrange
      const userData: UserData & { id: string } = {
        id: "user-456",
        email: "minimal@example.com",
        firstName: "Jane",
      };

      // Act
      const result = forDbInsert(userData);

      // Assert
      expect(result).toEqual({
        id: "user-456",
        email: "minimal@example.com",
        user_metadata: {
          first_name: "Jane",
          last_name: undefined,
          full_name: undefined,
          avatar_url: undefined,
          location: undefined,
        },
      });
    });

    it("should handle empty location object", () => {
      // Arrange
      const userData: UserData & { id: string } = {
        id: "user-location",
        email: "location@example.com", 
        firstName: "Location",
        location: { lat: 0, lng: 0 },
      };

      // Act
      const result = forDbInsert(userData);

      // Assert
      expect(result.user_metadata.location).toEqual({ lat: 0, lng: 0 });
    });
  });

  describe("forDbUpdate", () => {
    it("should transform user data for database update with timestamp", () => {
      // Arrange
      const userData: Partial<UserData> & { id: string } = {
        id: "user-123",
        firstName: "UpdatedJohn",
        lastName: "UpdatedDoe",
        avatarUrl: "https://example.com/new-avatar.jpg",
      };

      // Mock Date to get consistent test results
      const fixedDate = new Date("2023-06-15T12:00:00.000Z");
      const originalDate = Date;
      global.Date = vi.fn(() => fixedDate) as any;
      global.Date.prototype = originalDate.prototype;

      // Act
      const result = forDbUpdate(userData);

      // Assert
      expect(result).toEqual({
        user_metadata: {
          first_name: "UpdatedJohn",
          last_name: "UpdatedDoe",
          full_name: undefined,
          avatar_url: "https://example.com/new-avatar.jpg",
          location: undefined,
        },
        updated_at: "2023-06-15T12:00:00.000Z",
      });

      // Restore original Date
      global.Date = originalDate;
    });

    it("should handle partial updates with only some fields", () => {
      // Arrange
      const userData: Partial<UserData> & { id: string } = {
        id: "user-456",
        firstName: "OnlyFirstName",
      };

      // Act
      const result = forDbUpdate(userData);

      // Assert
      expect(result.user_metadata).toEqual({
        first_name: "OnlyFirstName",
        last_name: undefined,
        full_name: undefined,
        avatar_url: undefined,
        location: undefined,
      });
      expect(result.updated_at).toBeDefined();
      expect(typeof result.updated_at).toBe("string");
    });

    it("should update location independently", () => {
      // Arrange
      const userData: Partial<UserData> & { id: string } = {
        id: "user-location-update",
        location: { lat: 40.7128, lng: -74.0060 },
      };

      // Act
      const result = forDbUpdate(userData);

      // Assert
      expect(result.user_metadata.location).toEqual({ lat: 40.7128, lng: -74.0060 });
      expect(result.user_metadata.first_name).toBeUndefined();
    });
  });

  describe("createUserMetadata", () => {
    it("should create metadata from complete user data", () => {
      // Arrange
      const userData: UserData = {
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        fullName: "John Doe",
        avatarUrl: "https://example.com/avatar.jpg",
        location: { lat: 37.7749, lng: -122.4194 },
      };

      // Act
      const result = createUserMetadata(userData);

      // Assert
      expect(result).toEqual({
        first_name: "John",
        last_name: "Doe",
        full_name: "John Doe",
        avatar_url: "https://example.com/avatar.jpg",
        location: { lat: 37.7749, lng: -122.4194 },
      });
    });

    it("should create metadata from partial user data", () => {
      // Arrange
      const userData: Partial<UserData> = {
        firstName: "Jane",
        avatarUrl: "https://example.com/jane.jpg",
      };

      // Act
      const result = createUserMetadata(userData);

      // Assert
      expect(result).toEqual({
        first_name: "Jane",
        last_name: undefined,
        full_name: undefined,
        avatar_url: "https://example.com/jane.jpg",
        location: undefined,
      });
    });

    it("should handle empty user data", () => {
      // Arrange
      const userData: Partial<UserData> = {};

      // Act
      const result = createUserMetadata(userData);

      // Assert
      expect(result).toEqual({
        first_name: undefined,
        last_name: undefined,
        full_name: undefined,
        avatar_url: undefined,
        location: undefined,
      });
    });

    it("should handle null/undefined location gracefully", () => {
      // Arrange
      const userData: Partial<UserData> = {
        firstName: "Test",
        location: undefined,
      };

      // Act
      const result = createUserMetadata(userData);

      // Assert
      expect(result.location).toBeUndefined();
      expect(result.first_name).toBe("Test");
    });
  });

  describe("round-trip transformation", () => {
    it("should preserve data through toDomainUser -> forDbInsert -> toDomainUser", () => {
      // Arrange
      const originalProfile = createMockDbProfile({
        id: "roundtrip-user",
        email: "roundtrip@example.com",
        user_metadata: {
          first_name: "RoundTrip",
          last_name: "User",
          full_name: "RoundTrip User",
          avatar_url: "https://example.com/roundtrip.jpg",
          location: { lat: 51.5074, lng: -0.1278 },
        },
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
      });

      // Act
      const domainUser = toDomainUser(originalProfile);
      const insertData = forDbInsert(domainUser);

      // Reconstruct profile row for second transformation
      const reconstructedProfile = {
        ...originalProfile,
        id: insertData.id!,
        email: insertData.email!,
        user_metadata: insertData.user_metadata!,
      };

      const finalDomainUser = toDomainUser(reconstructedProfile);

      // Assert - Key user data should be preserved
      expect(finalDomainUser.id).toBe(domainUser.id);
      expect(finalDomainUser.email).toBe(domainUser.email);
      expect(finalDomainUser.firstName).toBe(domainUser.firstName);
      expect(finalDomainUser.lastName).toBe(domainUser.lastName);
      expect(finalDomainUser.fullName).toBe(domainUser.fullName);
      expect(finalDomainUser.avatarUrl).toBe(domainUser.avatarUrl);
      expect(finalDomainUser.location).toEqual(domainUser.location);
    });
  });
});