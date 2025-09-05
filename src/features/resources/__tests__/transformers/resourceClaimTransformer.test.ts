import { describe, it, expect } from 'vitest';
import {
  toDomainResourceClaim,
  toResourceClaimInsertRow,
  forDbClaimUpdate,
  toDomainResourceClaimSummary,
} from '../../transformers/resourceClaimTransformer';
import {
  createFakeResourceClaimInput,
  createFakeResourceClaimRow,
} from '../../__fakes__';
import { createFakeResourceTimeslotRow } from '../../__fakes__';

describe('ResourceClaim Transformer', () => {
  describe('toResourceClaimInsertRow', () => {
    it('should transform a domain resource claim input to database format', () => {
      const claimInput = createFakeResourceClaimInput({
        commitmentLevel: 'committed',
        notes: 'Test notes',
      });

      const dbClaim = toResourceClaimInsertRow(claimInput);

      expect(dbClaim).toMatchObject({
        resource_id: claimInput.resourceId,
        timeslot_id: claimInput.timeslotId,
        notes: claimInput.notes,
        commitment_level: 'committed',
      });
    });

    it('should default commitment level to interested when not provided', () => {
      const claimInput = createFakeResourceClaimInput({
        commitmentLevel: undefined,
      });

      const dbClaim = toResourceClaimInsertRow(claimInput);

      expect(dbClaim.commitment_level).toBe('interested');
    });

    it('should handle null notes', () => {
      const claimInput = createFakeResourceClaimInput({
        notes: undefined,
      });

      const dbClaim = toResourceClaimInsertRow(claimInput);

      expect(dbClaim.notes).toBeUndefined();
    });
  });

  describe('forDbClaimUpdate', () => {
    it('should transform commitment level updates', () => {
      const updateData = forDbClaimUpdate({
        commitmentLevel: 'committed',
      });

      expect(updateData).toMatchObject({
        commitment_level: 'committed',
      });
    });

    it('should transform status updates', () => {
      const updateData = forDbClaimUpdate({
        status: 'approved',
      });

      expect(updateData).toMatchObject({
        status: 'approved',
      });
    });

    it('should handle combined updates', () => {
      const updateData = forDbClaimUpdate({
        status: 'going',
        commitmentLevel: 'committed',
        notes: 'Updated notes',
      });

      expect(updateData).toMatchObject({
        status: 'going',
        commitment_level: 'committed',
        notes: 'Updated notes',
      });
    });

    it('should not include undefined fields', () => {
      const updateData = forDbClaimUpdate({
        status: 'approved',
      });

      expect(updateData).not.toHaveProperty('commitment_level');
      expect(updateData).not.toHaveProperty('notes');
    });
  });

  describe('toDomainResourceClaim', () => {
    it('should transform database claim to domain object with commitment level', () => {
      const timeslot = createFakeResourceTimeslotRow();
      const dbClaim = {
        ...createFakeResourceClaimRow({
          commitment_level: 'committed',
          status: 'approved',
        }),
        resources: { owner_id: 'owner-123' },
        resource_timeslots: timeslot,
      };

      const claim = toDomainResourceClaim(dbClaim);

      expect(claim).toMatchObject({
        id: dbClaim.id,
        resourceId: dbClaim.resource_id,
        resourceOwnerId: 'owner-123',
        claimantId: dbClaim.claimant_id,
        timeslotId: dbClaim.timeslot_id,
        status: dbClaim.status,
        commitmentLevel: 'committed',
        notes: dbClaim.notes ?? undefined,
      });
      expect(claim.timeslot).toBeDefined();
      expect(claim.createdAt).toBeInstanceOf(Date);
      expect(claim.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle null commitment level by defaulting to interested', () => {
      const timeslot = createFakeResourceTimeslotRow();
      const dbClaim = {
        ...createFakeResourceClaimRow({
          commitment_level: null,
        }),
        resources: { owner_id: 'owner-123' },
        resource_timeslots: timeslot,
      };

      const claim = toDomainResourceClaim(dbClaim);

      expect(claim.commitmentLevel).toBe('interested');
    });

    it('should handle null notes', () => {
      const timeslot = createFakeResourceTimeslotRow();
      const dbClaim = {
        ...createFakeResourceClaimRow({
          notes: null,
        }),
        resources: { owner_id: 'owner-123' },
        resource_timeslots: timeslot,
      };

      const claim = toDomainResourceClaim(dbClaim);

      expect(claim.notes).toBeUndefined();
    });

    it('should not return any field names with underscores', () => {
      const timeslot = createFakeResourceTimeslotRow();
      const dbClaim = {
        ...createFakeResourceClaimRow(),
        resources: { owner_id: 'owner-123' },
        resource_timeslots: timeslot,
      };

      const claim = toDomainResourceClaim(dbClaim);

      const fieldNames = Object.keys(claim);
      const underscoreFields = fieldNames.filter((name) => name.includes('_'));
      expect(underscoreFields).toEqual([]);
    });
  });

  describe('toDomainResourceClaimSummary', () => {
    it('should transform database claim to summary object', () => {
      const dbClaim = createFakeResourceClaimRow();

      const summary = toDomainResourceClaimSummary(dbClaim);

      expect(summary).toMatchObject({
        id: dbClaim.id,
        resourceId: dbClaim.resource_id,
        claimantId: dbClaim.claimant_id,
        timeslotId: dbClaim.timeslot_id,
        status: dbClaim.status,
      });
    });

    it('should not include commitment level in summary', () => {
      const dbClaim = createFakeResourceClaimRow({
        commitment_level: 'committed',
      });

      const summary = toDomainResourceClaimSummary(dbClaim);

      expect(summary).not.toHaveProperty('commitmentLevel');
    });
  });
});