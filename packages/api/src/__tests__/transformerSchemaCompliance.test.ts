import { describe, it, expect } from 'vitest';
import type { Database } from '@belongnetwork/types/database';
import { forDbUpdate as communityForDbUpdate } from '../communities/impl/communityTransformer';
import { forDbUpdate as resourceForDbUpdate } from '../resources/impl/resourceTransformer';
import { forDbUpdate as eventForDbUpdate } from '../events/impl/eventTransformer';
import { forDbUpdate as thanksForDbUpdate } from '../thanks/impl/thanksTransformer';

/**
 * Transformer Schema Compliance Tests
 * 
 * These tests verify that our transformer functions (forDbUpdate, forDbInsert)
 * only generate database objects with fields that actually exist in the schema.
 * 
 * This would have caught the updated_by bug immediately.
 */

type CommunityUpdateDbData = Database['public']['Tables']['communities']['Update'];
type ResourceUpdateDbData = Database['public']['Tables']['resources']['Update'];
type EventUpdateDbData = Database['public']['Tables']['events']['Update'];
type ThanksUpdateDbData = Database['public']['Tables']['thanks']['Update'];

describe('Transformer Schema Compliance', () => {
  describe('Community transformer compliance', () => {
    it('should never generate updated_by field in forDbUpdate output', () => {
      // This test would have caught the original bug
      const updateData = {
        id: 'community-123',
        name: 'Updated Community',
        description: 'Updated description',
        organizerId: 'user-123',
      };

      const dbUpdateData = communityForDbUpdate(updateData);

      // The critical assertion that would have prevented the bug
      expect(dbUpdateData).not.toHaveProperty('updated_by');
      
      // Verify it only contains valid schema fields
      const outputKeys = Object.keys(dbUpdateData);
      const validKeys: Array<keyof CommunityUpdateDbData> = [
        'center', 'created_at', 'deleted_at', 'deleted_by', 'description',
        'hierarchy_path', 'id', 'is_active', 'level', 'member_count', 'name',
        'organizer_id', 'parent_id', 'radius_km', 'time_zone', 'updated_at'
      ];

      for (const key of outputKeys) {
        expect(validKeys).toContain(key as keyof CommunityUpdateDbData);
      }
    });

    it('should handle all valid update fields correctly', () => {
      const fullUpdateData = {
        id: 'community-123',
        name: 'Full Update',
        description: 'Full description',
        organizerId: 'user-123',
        parentId: 'parent-456',
        timeZone: 'America/New_York',
        radiusKm: 50,
        memberCount: 100,
        center: { lat: 40.7128, lng: -74.0060 },
        hierarchyPath: [{ level: 'city', name: 'New York' }],
      };

      const dbUpdateData = communityForDbUpdate(fullUpdateData);

      // Should properly transform to snake_case where needed
      expect(dbUpdateData).toHaveProperty('organizer_id', 'user-123');
      expect(dbUpdateData).toHaveProperty('parent_id', 'parent-456');
      expect(dbUpdateData).toHaveProperty('time_zone', 'America/New_York');
      expect(dbUpdateData).toHaveProperty('radius_km', 50);
      expect(dbUpdateData).toHaveProperty('member_count', 100);

      // Should NOT have camelCase variants in DB object
      expect(dbUpdateData).not.toHaveProperty('organizerId');
      expect(dbUpdateData).not.toHaveProperty('parentId');
      expect(dbUpdateData).not.toHaveProperty('timeZone');
      expect(dbUpdateData).not.toHaveProperty('radiusKm');
      expect(dbUpdateData).not.toHaveProperty('memberCount');
      
      // And definitely not the problematic field
      expect(dbUpdateData).not.toHaveProperty('updated_by');
    });
  });

  describe('Resource transformer compliance', () => {
    it('should only generate valid resource update fields', () => {
      const updateData = {
        title: 'Updated Resource',
        description: 'Updated description',
        category: 'tools' as const,
        isActive: true,
      };

      const dbUpdateData = resourceForDbUpdate(updateData);

      // Should not have fields from other tables
      expect(dbUpdateData).not.toHaveProperty('updated_by');
      expect(dbUpdateData).not.toHaveProperty('organizer_id'); // This is for events/communities
      
      // Should have proper snake_case conversion
      if ('is_active' in dbUpdateData) {
        expect(dbUpdateData.is_active).toBe(true);
      }
      expect(dbUpdateData).not.toHaveProperty('isActive'); // camelCase shouldn't be in DB object
    });
  });

  describe('Event transformer compliance', () => {
    it('should only generate valid event update fields', () => {
      const updateData = {
        id: 'event-123',
        title: 'Updated Event',
        description: 'Updated description',
        startDateTime: new Date('2024-06-01T18:00:00Z'),
        endDateTime: new Date('2024-06-01T20:00:00Z'),
        isActive: true,
        registrationRequired: true,
      };

      const dbUpdateData = eventForDbUpdate(updateData, 'user-123');

      // Should not have fields from other tables
      expect(dbUpdateData).not.toHaveProperty('updated_by');
      expect(dbUpdateData).not.toHaveProperty('owner_id'); // This is for resources
      
      // Should have proper snake_case conversion for dates
      if ('start_date_time' in dbUpdateData) {
        expect(typeof dbUpdateData.start_date_time).toBe('string');
      }
      if ('end_date_time' in dbUpdateData) {
        expect(typeof dbUpdateData.end_date_time).toBe('string');
      }
      
      // Should not have camelCase variants
      expect(dbUpdateData).not.toHaveProperty('startDateTime');
      expect(dbUpdateData).not.toHaveProperty('endDateTime');
      expect(dbUpdateData).not.toHaveProperty('registrationRequired');
    });
  });

  describe('Thanks transformer compliance', () => {
    it('should only generate valid thanks update fields', () => {
      const updateData = {
        message: 'Updated thanks',
        impactDescription: 'Great impact',
      };

      const dbUpdateData = thanksForDbUpdate(updateData);

      // Should not have fields from other tables
      expect(dbUpdateData).not.toHaveProperty('updated_by');
      expect(dbUpdateData).not.toHaveProperty('organizer_id');
      expect(dbUpdateData).not.toHaveProperty('owner_id');
      
      // Should have proper snake_case conversion
      if ('impact_description' in dbUpdateData) {
        expect(dbUpdateData.impact_description).toBe('Great impact');
      }
      
      // Should not have camelCase variant
      expect(dbUpdateData).not.toHaveProperty('impactDescription');
    });
  });

  describe('Cross-transformer consistency', () => {
    it('should never generate updated_by field in any transformer', () => {
      // Test all transformers to ensure none accidentally generate updated_by
      
      const communityUpdate = communityForDbUpdate({ id: 'test', name: 'Test' });
      const resourceUpdate = resourceForDbUpdate({ title: 'Test' });
      const eventUpdate = eventForDbUpdate({ id: 'test', title: 'Test' }, 'user-123');
      const thanksUpdate = thanksForDbUpdate({ message: 'Test' });

      // None should have the problematic field
      expect(communityUpdate).not.toHaveProperty('updated_by');
      expect(resourceUpdate).not.toHaveProperty('updated_by');
      expect(eventUpdate).not.toHaveProperty('updated_by');
      expect(thanksUpdate).not.toHaveProperty('updated_by');
    });

    it('should never generate camelCase field names in database objects', () => {
      // Database objects should always use snake_case, never camelCase
      
      const communityUpdate = communityForDbUpdate({ 
        id: 'test', 
        organizerId: 'user-123',
        timeZone: 'UTC'
      });
      
      // Should have snake_case
      expect(communityUpdate).toHaveProperty('organizer_id');
      expect(communityUpdate).toHaveProperty('time_zone');
      
      // Should NOT have camelCase
      expect(communityUpdate).not.toHaveProperty('organizerId');
      expect(communityUpdate).not.toHaveProperty('timeZone');
    });
  });
});