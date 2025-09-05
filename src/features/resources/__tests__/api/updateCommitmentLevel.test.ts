import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateCommitmentLevel } from '../../api/updateCommitmentLevel';
import { createFakeResourceClaimRow, createFakeResourceTimeslotRow } from '../../__fakes__';
import { logger } from '@/shared';

// Mock logger
vi.mock('@/shared', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('updateCommitmentLevel', () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  const mockUpdate = vi.fn();
  const mockEq = vi.fn();
  const mockSelect = vi.fn();
  const mockSingle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase.from.mockReturnValue({
      update: mockUpdate,
    });
    
    mockUpdate.mockReturnValue({
      eq: mockEq,
    });
    
    mockEq.mockReturnValue({
      select: mockSelect,
    });
    
    mockSelect.mockReturnValue({
      single: mockSingle,
    });
  });

  it('should successfully update commitment level', async () => {
    const timeslot = createFakeResourceTimeslotRow();
    const dbClaim = {
      ...createFakeResourceClaimRow({
        id: 'claim-123',
        commitment_level: 'committed',
      }),
      resources: { owner_id: 'owner-123' },
      resource_timeslots: timeslot,
    };

    mockSingle.mockResolvedValue({
      data: dbClaim,
      error: null,
    });

    const result = await updateCommitmentLevel(
      mockSupabase as any,
      'claim-123',
      'committed'
    );

    expect(mockSupabase.from).toHaveBeenCalledWith('resource_claims');
    expect(mockUpdate).toHaveBeenCalledWith({ commitment_level: 'committed' });
    expect(mockEq).toHaveBeenCalledWith('id', 'claim-123');
    expect(mockSelect).toHaveBeenCalledWith('*, resources!inner(owner_id), resource_timeslots(*)');
    expect(mockSingle).toHaveBeenCalled();

    expect(result.commitmentLevel).toBe('committed');
    expect(result.id).toBe('claim-123');

    expect(logger.debug).toHaveBeenCalledWith(
      '🏘️ API: Successfully updated commitment level',
      {
        claimId: 'claim-123',
        commitmentLevel: 'committed',
      }
    );
  });

  it('should handle database errors', async () => {
    const error = { message: 'Database error' };
    mockSingle.mockResolvedValue({
      data: null,
      error,
    });

    await expect(
      updateCommitmentLevel(mockSupabase as any, 'claim-123', 'interested')
    ).rejects.toThrow('Database error');

    expect(logger.error).toHaveBeenCalledWith(
      '🏘️ API: Failed to update commitment level',
      {
        error,
        claimId: 'claim-123',
        commitmentLevel: 'interested',
      }
    );
  });

  it('should handle missing data response', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(
      updateCommitmentLevel(mockSupabase as any, 'claim-123', 'committed')
    ).rejects.toThrow('No data returned from commitment level update');

    expect(logger.error).toHaveBeenCalledWith(
      '🏘️ API: No data returned from commitment level update',
      {
        claimId: 'claim-123',
        commitmentLevel: 'committed',
      }
    );
  });

  it('should update from interested to committed', async () => {
    const timeslot = createFakeResourceTimeslotRow();
    const dbClaim = {
      ...createFakeResourceClaimRow({
        id: 'claim-123',
        commitment_level: 'committed',
        status: 'approved',
      }),
      resources: { owner_id: 'owner-123' },
      resource_timeslots: timeslot,
    };

    mockSingle.mockResolvedValue({
      data: dbClaim,
      error: null,
    });

    const result = await updateCommitmentLevel(
      mockSupabase as any,
      'claim-123',
      'committed'
    );

    expect(result.commitmentLevel).toBe('committed');
    expect(result.status).toBe('approved');
  });

  it('should update from committed to interested', async () => {
    const timeslot = createFakeResourceTimeslotRow();
    const dbClaim = {
      ...createFakeResourceClaimRow({
        id: 'claim-123',
        commitment_level: 'interested',
        status: 'approved',
      }),
      resources: { owner_id: 'owner-123' },
      resource_timeslots: timeslot,
    };

    mockSingle.mockResolvedValue({
      data: dbClaim,
      error: null,
    });

    const result = await updateCommitmentLevel(
      mockSupabase as any,
      'claim-123',
      'interested'
    );

    expect(result.commitmentLevel).toBe('interested');
    expect(result.status).toBe('approved');
  });
});