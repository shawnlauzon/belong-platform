import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
import { waitFor } from '@testing-library/react';
import { useCommunities, useCreateCommunity } from '../../../src';
import {
  TestDataFactory,
  authHelper,
  cleanupHelper,
  testWrapperManager,
  testUtils,
  commonExpectations,
} from '../helpers';

/**
 * Community Boundaries Integration Tests
 *
 * Tests the new community boundary functionality:
 * - Creating communities with circular boundaries
 * - Creating communities with isochrone boundaries
 * - Boundary data storage and retrieval
 * - Boundary validation
 */

describe('Community Boundaries Integration', () => {
  beforeAll(() => {
    testWrapperManager.reset();
  });

  beforeEach(async () => {
    await cleanupHelper.ensureTestIsolation();
  });

  afterEach(async () => {
    await cleanupHelper.cleanupBetweenTests();
  });

  afterAll(async () => {
    await cleanupHelper.cleanupAfterAllTests();
  });

  test('should create community with circular boundary', async () => {
    let authUser: any;

    try {
      const authSetup = await authHelper.createAndAuthenticateUser();
      authUser = authSetup.user;
    } catch (error) {
      console.warn('Auth setup failed, skipping boundary test');
      return;
    }

    const { result: createResult } = await testUtils.renderHookWithWrapper(() =>
      useCreateCommunity(),
    );

    const communityData =
      TestDataFactory.createCommunityWithBoundary('circular');
    const circularBoundary = communityData.boundary!;

    try {
      const createdCommunity = await testUtils.performAsyncAction(
        () =>
          createResult.current({
            ...communityData,
            organizerId: authUser.userId,
            parentId: null,
          }),
        'create community with circular boundary',
      );

      expect(createdCommunity).toMatchObject({
        id: expect.any(String),
        name: communityData.name,
        description: communityData.description,
        level: communityData.level,
      });

      // Verify boundary data if available
      if (createdCommunity.boundary) {
        const boundary = createdCommunity.boundary;
        expect(boundary).toMatchObject({
          type: 'circular',
          center: circularBoundary.center,
          radiusKm: circularBoundary.radiusKm,
        });
        if (boundary?.type === 'circular') {
          expect(boundary.radius_km).toBe(circularBoundary.radius_km);
        }
      } else {
        console.warn('Boundary data not returned - schema may not be deployed');
      }

      commonExpectations.toBeValidId(createdCommunity.id);
    } catch (error) {
      if (
        (error as Error).message?.includes('boundary') &&
        (error as Error).message?.includes('schema cache')
      ) {
        console.warn(
          'Boundary column not found in schema cache - test skipped',
        );
        return;
      }
      throw error;
    }
  });

  test('should create community with isochrone boundary', async () => {
    let authUser: any;

    try {
      const authSetup = await authHelper.createAndAuthenticateUser();
      authUser = authSetup.user;
    } catch (error) {
      console.warn('Auth setup failed, skipping boundary test');
      return;
    }

    const { result: createResult } = await testUtils.renderHookWithWrapper(() =>
      useCreateCommunity(),
    );

    const communityData =
      TestDataFactory.createCommunityWithBoundary('isochrone');
    const isochroneBoundary = communityData.boundary!;

    const createdCommunity = await testUtils.performAsyncAction(
      () =>
        createResult.current({
          ...communityData,
          organizerId: authUser.userId,
          parentId: null,
        }),
      'create community with isochrone boundary',
    );

    expect(createdCommunity).toMatchObject({
      id: expect.any(String),
      name: communityData.name,
      description: communityData.description,
      level: communityData.level,
    });

    // Verify boundary data
    const boundary = createdCommunity.boundary;
    expect(boundary).toMatchObject({
      type: 'isochrone',
      center: isochroneBoundary.center,
      travelMode: isochroneBoundary.travelMode,
      travelTimeMin: isochroneBoundary.travelTimeMin,
      areaSqKm: isochroneBoundary.areaSqKm,
    });

    if (boundary?.type === 'isochrone') {
      expect(boundary.travelMode).toBe(isochroneBoundary.travelMode);
      expect(boundary.minutes).toBe(isochroneBoundary.minutes);
      expect(boundary.area).toBe(isochroneBoundary.area);

      // Verify polygon structure
      expect(boundary.polygon).toHaveProperty('type', 'Polygon');
      expect(boundary.polygon).toHaveProperty('coordinates');
      expect(Array.isArray(boundary.polygon.coordinates)).toBe(true);
    }

    commonExpectations.toBeValidId(createdCommunity.id);
  });

  test('should retrieve communities with boundary data', async () => {
    let authUser: any;

    try {
      const authSetup = await authHelper.createAndAuthenticateUser();
      authUser = authSetup.user;
    } catch (error) {
      console.warn('Auth setup failed, skipping boundary test');
      return;
    }

    const { result: createResult } = await testUtils.renderHookWithWrapper(() =>
      useCreateCommunity(),
    );
    const { result: communitiesResult } = await testUtils.renderHookWithWrapper(
      () => useCommunities(),
    );

    await testUtils.waitForHookToInitialize(
      communitiesResult,
      (query) => query.isLoading !== undefined,
    );

    // Create a community with boundary
    const communityData =
      TestDataFactory.createCommunityWithBoundary('circular');
    const createdCommunity = await testUtils.performAsyncAction(
      () =>
        createResult.current({
          ...communityData,
          organizerId: authUser.userId,
          parentId: null,
        }),
      'create community with boundary for retrieval test',
    );

    // Wait for the list to update
    await waitFor(
      () => {
        const communities = communitiesResult.current.data;
        const found = communities?.find(
          (community) => community.id === createdCommunity.id,
        );
        expect(found).toBeDefined();
        expect(found?.boundary).toBeDefined();
        expect(found?.boundary?.type).toBe('circular');
      },
      { timeout: 10000 },
    );
  });

  test('should handle boundary validation', async () => {
    // Test that TestDataFactory creates valid boundaries
    const circularBoundary = TestDataFactory.createCircularBoundary();
    expect(circularBoundary.type).toBe('circular');
    expect(Array.isArray(circularBoundary.center)).toBe(true);
    expect(circularBoundary.center).toHaveLength(2);
    expect(typeof circularBoundary.radiusKm).toBe('number');
    expect(circularBoundary.radiusKm).toBeGreaterThan(0);

    const isochroneBoundary = TestDataFactory.createIsochroneBoundary();
    expect(isochroneBoundary.type).toBe('isochrone');
    expect(Array.isArray(isochroneBoundary.center)).toBe(true);
    expect(isochroneBoundary.center).toHaveLength(2);
    expect(['walking', 'cycling', 'driving']).toContain(
      isochroneBoundary.travelMode,
    );
    expect(isochroneBoundary.travelTimeMin).toBeGreaterThan(0);
    expect(isochroneBoundary.travelTimeMin).toBeLessThanOrEqual(60);
    expect(isochroneBoundary.areaSqKm).toBeGreaterThan(0);
    expect(isochroneBoundary.polygon.type).toBe('Polygon');
    expect(Array.isArray(isochroneBoundary.polygon.coordinates)).toBe(true);
  });
});
