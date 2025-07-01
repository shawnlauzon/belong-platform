import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import {
  useAuth,
  useCommunities,
} from "../../../src";
import {
  TestDataFactory,
  authHelper,
  cleanupHelper,
  testWrapperManager,
  testUtils,
} from "../helpers";

/**
 * Community Operations Authentication Integration Tests
 * 
 * These tests reproduce the authentication timing issues described in the QA report:
 * - "User must be authenticated to perform this operation" errors during community operations
 * - Authentication state loss between CREATE and JOIN operations
 * - Race conditions in auth state management during rapid operations
 * 
 * Test scenarios based on E2E test failure at community-crud.spec.ts:218
 */

describe("Community Operations Authentication", () => {
  const wrapper = testWrapperManager.getWrapper();

  beforeAll(async () => {
    testWrapperManager.reset();
  });

  beforeEach(async () => {
    await cleanupHelper.ensureTestIsolation();
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500));
  });

  afterEach(async () => {
    await authHelper.ensureSignedOut();
    // Add delay after each test
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await cleanupHelper.cleanupAfterAllTests();
  });

  test("REPRODUCTION: Authentication state persists during rapid community operations", async () => {
    // This test reproduces the exact scenario from the QA report:
    // 1. User authenticates successfully (✅ works)
    // 2. User creates community (✅ works - requires auth)  
    // 3. User joins community (❌ fails - "User must be authenticated")
    
    const testUser = TestDataFactory.createUser();
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());
    const { result: communitiesResult } = await testUtils.renderHookWithWrapper(() => useCommunities());

    // Wait for hooks to initialize
    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signUp === 'function'
    );
    await testUtils.waitForHookToInitialize(
      communitiesResult,
      (communities) => typeof communities.create === 'function'
    );

    // Step 1: Sign up and sign in user (establishes auth state)
    await testUtils.performAsyncAction(
      () => authResult.current.signUp(testUser),
      "sign up for rapid operations test"
    );

    const signInResult = await testUtils.performAsyncAction(
      () => authResult.current.signIn({
        email: testUser.email,
        password: testUser.password,
      }),
      "sign in for rapid operations test"
    );

    console.log('🔍 Auth state after sign-in:', {
      signInResult: signInResult ? { id: signInResult.id, email: signInResult.email } : null,
      currentUser: authResult.current.currentUser ? {
        id: authResult.current.currentUser.id,
        email: authResult.current.currentUser.email,
      } : null,
      isAuthenticated: authResult.current.isAuthenticated,
    });

    // Wait for auth state to stabilize
    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated && authResult.current.currentUser !== null,
      "wait for auth state to stabilize after sign-in",
      5000
    );

    expect(authResult.current.isAuthenticated).toBe(true);
    expect(authResult.current.currentUser).toBeTruthy();

    // Step 2: Create community (this should work and does work in E2E)
    const communityData = TestDataFactory.createCommunity();
    const community = await testUtils.performAsyncAction(
      () => communitiesResult.current.create({
        ...communityData,
        organizerId: authResult.current.currentUser!.id,
        parentId: null,
      }),
      "create community immediately after auth"
    );

    expect(community).toMatchObject({
      name: communityData.name,
      description: communityData.description,
    });

    console.log('🔍 Auth state after community creation:', {
      currentUser: authResult.current.currentUser ? {
        id: authResult.current.currentUser.id,
        email: authResult.current.currentUser.email,
      } : null,
      isAuthenticated: authResult.current.isAuthenticated,
      communityCreated: { id: community.id, name: community.name },
    });

    // Step 3: Join a different community (this is where the bug occurs)
    // Create another community first for the user to join
    const anotherCommunityData = TestDataFactory.createCommunity();
    const anotherCommunity = await testUtils.performAsyncAction(
      () => communitiesResult.current.create({
        ...anotherCommunityData,
        organizerId: authResult.current.currentUser!.id,
        parentId: null,
      }),
      "create second community to join"
    );

    // Sign out and create a different user to be the organizer
    await testUtils.performAsyncAction(
      () => authResult.current.signOut(),
      "sign out first user"
    );

    const organizerUser = TestDataFactory.createUser();
    await testUtils.performAsyncAction(
      () => authResult.current.signUp(organizerUser),
      "sign up organizer"
    );

    await testUtils.performAsyncAction(
      () => authResult.current.signIn({
        email: organizerUser.email,
        password: organizerUser.password,
      }),
      "sign in organizer"
    );

    // Wait for organizer auth state
    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated && authResult.current.currentUser !== null,
      "wait for organizer auth state",
      5000
    );

    // Create a community that the original user can join
    const joinableCommunityData = TestDataFactory.createCommunity();
    const joinableCommunity = await testUtils.performAsyncAction(
      () => communitiesResult.current.create({
        ...joinableCommunityData,
        organizerId: authResult.current.currentUser!.id,
        parentId: null,
      }),
      "create joinable community"
    );

    // Sign out organizer and sign back in as original user
    await testUtils.performAsyncAction(
      () => authResult.current.signOut(),
      "sign out organizer"
    );

    await testUtils.performAsyncAction(
      () => authResult.current.signIn({
        email: testUser.email,
        password: testUser.password,
      }),
      "sign in original user"
    );

    // Wait for auth state to stabilize again
    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated && authResult.current.currentUser !== null,
      "wait for original user auth state",
      5000
    );

    console.log('🔍 Auth state before join operation:', {
      currentUser: authResult.current.currentUser ? {
        id: authResult.current.currentUser.id,
        email: authResult.current.currentUser.email,
      } : null,
      isAuthenticated: authResult.current.isAuthenticated,
      aboutToJoin: { id: joinableCommunity.id, name: joinableCommunity.name },
    });

    // This is where the bug should manifest - "User must be authenticated to perform this operation"
    const membership = await testUtils.performAsyncAction(
      () => communitiesResult.current.join(joinableCommunity.id, 'member'),
      "join community - this should reproduce the auth bug"
    );

    // If we reach here without error, the bug is NOT reproduced (test passes)
    expect(membership).toMatchObject({
      communityId: joinableCommunity.id,
      userId: authResult.current.currentUser!.id,
      role: 'member',
    });

    console.log("✅ Rapid operations test successful - no auth bug reproduced");
  });

  test("REPRODUCTION: Join operation fails immediately after sign-in", async () => {
    // This test focuses specifically on the timing issue:
    // Sign in → immediate join operation should work but currently fails
    
    const testUser = TestDataFactory.createUser();
    const organizerUser = TestDataFactory.createUser();
    
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());
    const { result: communitiesResult } = await testUtils.renderHookWithWrapper(() => useCommunities());

    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signUp === 'function'
    );
    await testUtils.waitForHookToInitialize(
      communitiesResult,
      (communities) => typeof communities.create === 'function'
    );

    // Setup: Create organizer and community to join
    await testUtils.performAsyncAction(
      () => authResult.current.signUp(organizerUser),
      "sign up organizer"
    );

    await testUtils.performAsyncAction(
      () => authResult.current.signIn({
        email: organizerUser.email,
        password: organizerUser.password,
      }),
      "sign in organizer"
    );

    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated,
      "wait for organizer auth"
    );

    const communityData = TestDataFactory.createCommunity();
    const community = await testUtils.performAsyncAction(
      () => communitiesResult.current.create({
        ...communityData,
        organizerId: authResult.current.currentUser!.id,
        parentId: null,
      }),
      "organizer creates community"
    );

    // Sign out organizer
    await testUtils.performAsyncAction(
      () => authResult.current.signOut(),
      "sign out organizer"
    );

    // Sign up the test user who will join
    await testUtils.performAsyncAction(
      () => authResult.current.signUp(testUser),
      "sign up test user"
    );

    // The critical test: Sign in and IMMEDIATELY try to join
    await testUtils.performAsyncAction(
      () => authResult.current.signIn({
        email: testUser.email,
        password: testUser.password,
      }),
      "sign in test user"
    );

    console.log('🔍 Auth state immediately after sign-in:', {
      currentUser: authResult.current.currentUser ? {
        id: authResult.current.currentUser.id,
        email: authResult.current.currentUser.email,
      } : null,
      isAuthenticated: authResult.current.isAuthenticated,
      isPending: authResult.current.isPending,
    });

    // Attempt join operation within 100ms of sign-in completion
    // This should reproduce the "User must be authenticated" error
    const membership = await testUtils.performAsyncAction(
      () => communitiesResult.current.join(community.id, 'member'),
      "immediate join after sign-in - should fail with auth error"
    );

    // If we reach here, the bug was NOT reproduced
    expect(membership).toMatchObject({
      communityId: community.id,
      userId: authResult.current.currentUser!.id,
      role: 'member',
    });

    console.log("✅ Immediate join test successful - no timing bug reproduced");
  });

  test("REPRODUCTION: Authentication state consistency across multiple operations", async () => {
    // This test reproduces the sequence: create → join → leave → delete
    // All operations should work with the same auth session
    
    const testUser = TestDataFactory.createUser();
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());
    const { result: communitiesResult } = await testUtils.renderHookWithWrapper(() => useCommunities());

    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signUp === 'function'
    );
    await testUtils.waitForHookToInitialize(
      communitiesResult,
      (communities) => typeof communities.create === 'function'
    );

    // Authenticate user
    await testUtils.performAsyncAction(
      () => authResult.current.signUp(testUser),
      "sign up for multi-operation test"
    );

    await testUtils.performAsyncAction(
      () => authResult.current.signIn({
        email: testUser.email,
        password: testUser.password,
      }),
      "sign in for multi-operation test"
    );

    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated,
      "wait for auth state"
    );

    const authStates: Array<{
      operation: string;
      isAuthenticated: boolean;
      hasUser: boolean;
      timestamp: number;
    }> = [];

    const trackAuthState = (operation: string) => {
      authStates.push({
        operation,
        isAuthenticated: authResult.current.isAuthenticated,
        hasUser: !!authResult.current.currentUser,
        timestamp: Date.now(),
      });
    };

    trackAuthState('initial');

    // Operation 1: Create community
    const communityData = TestDataFactory.createCommunity();
    const community = await testUtils.performAsyncAction(
      () => communitiesResult.current.create({
        ...communityData,
        organizerId: authResult.current.currentUser!.id,
        parentId: null,
      }),
      "create community in sequence"
    );
    trackAuthState('after_create');

    // Operation 2: Sign out and create a different user to create a joinable community
    const originalUserId = authResult.current.currentUser!.id;
    await testUtils.performAsyncAction(
      () => authResult.current.signOut(),
      "sign out original user"
    );
    trackAuthState('after_signout');

    // Create another user to be community organizer
    const otherUser = TestDataFactory.createUser();
    await testUtils.performAsyncAction(
      () => authResult.current.signUp(otherUser),
      "sign up other user"
    );
    await testUtils.performAsyncAction(
      () => authResult.current.signIn({
        email: otherUser.email,
        password: otherUser.password,
      }),
      "sign in other user"
    );
    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated,
      "wait for other user auth"
    );

    // Other user creates community
    const joinableCommunityData = TestDataFactory.createCommunity();
    const joinableCommunity = await testUtils.performAsyncAction(
      () => communitiesResult.current.create({
        ...joinableCommunityData,
        organizerId: authResult.current.currentUser!.id,
        parentId: null,
      }),
      "other user creates joinable community"
    );
    trackAuthState('after_other_user_create');

    // Sign back in as original user
    await testUtils.performAsyncAction(
      () => authResult.current.signOut(),
      "sign out other user"
    );
    await testUtils.performAsyncAction(
      () => authResult.current.signIn({
        email: testUser.email,
        password: testUser.password,
      }),
      "sign back in as original user"
    );
    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated && authResult.current.currentUser?.id === originalUserId,
      "wait for original user auth"
    );
    trackAuthState('after_signin_back');

    // Operation 3: Join community created by other user (this often fails in the bug scenario)
    const membership = await testUtils.performAsyncAction(
      () => communitiesResult.current.join(joinableCommunity.id, 'member'),
      "join community in sequence"
    );
    trackAuthState('after_join');

    // Operation 4: Leave the community that the user joined (not organized)
    await testUtils.performAsyncAction(
      () => communitiesResult.current.leave(joinableCommunity.id),
      "leave joined community in sequence"
    );
    trackAuthState('after_leave');

    // Operation 5: Delete community (this also often fails in the bug scenario)
    await testUtils.performAsyncAction(
      () => communitiesResult.current.delete(community.id),
      "delete community in sequence"
    );
    trackAuthState('after_delete');

    // Verify all operations succeeded and auth state remained consistent
    console.log('🔍 Auth state timeline:', authStates.map((state, index) => ({
      step: index,
      operation: state.operation,
      isAuthenticated: state.isAuthenticated,
      hasUser: state.hasUser,
      timestamp: state.timestamp,
    })));

    // Only check auth states for operations that should maintain authentication
    // (exclude signout states which are expected to be false)
    const authenticationRequiredStates = authStates.filter(state => 
      !state.operation.includes('signout') && !state.operation.includes('after_signout')
    );
    
    for (const state of authenticationRequiredStates) {
      expect(state.isAuthenticated).toBe(true);
      expect(state.hasUser).toBe(true);
    }

    // Final verification
    expect(membership).toMatchObject({
      communityId: joinableCommunity.id,
      role: 'member',
    });

    console.log("✅ Multi-operation sequence test successful - auth state remained consistent");
  });

  test("REPRODUCTION: Session validation during rapid operations", async () => {
    // This test focuses on session persistence and validation issues
    
    const testUser = TestDataFactory.createUser();
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());
    const { result: communitiesResult } = await testUtils.renderHookWithWrapper(() => useCommunities());

    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signUp === 'function'
    );
    await testUtils.waitForHookToInitialize(
      communitiesResult,
      (communities) => typeof communities.create === 'function'
    );

    // Authenticate
    await testUtils.performAsyncAction(
      () => authResult.current.signUp(testUser),
      "sign up for session validation test"
    );

    await testUtils.performAsyncAction(
      () => authResult.current.signIn({
        email: testUser.email,
        password: testUser.password,
      }),
      "sign in for session validation test"
    );

    // Give auth state extra time to stabilize
    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated && 
            authResult.current.currentUser !== null &&
            !authResult.current.isPending,
      "wait for complete auth state stabilization",
      10000
    );

    // Verify session is fully established
    expect(authResult.current.isAuthenticated).toBe(true);
    expect(authResult.current.currentUser).toBeTruthy();
    expect(authResult.current.isPending).toBe(false);

    console.log('🔍 Stable auth state before operations:', {
      currentUser: authResult.current.currentUser ? {
        id: authResult.current.currentUser.id,
        email: authResult.current.currentUser.email,
      } : null,
      isAuthenticated: authResult.current.isAuthenticated,
      isPending: authResult.current.isPending,
      isError: authResult.current.isError,
    });

    // Create community with stable session
    const communityData = TestDataFactory.createCommunity();
    const community = await testUtils.performAsyncAction(
      () => communitiesResult.current.create({
        ...communityData,
        organizerId: authResult.current.currentUser!.id,
        parentId: null,
      }),
      "create community with stable session"
    );

    // Verify auth state is still valid after create
    expect(authResult.current.isAuthenticated).toBe(true);
    expect(authResult.current.currentUser).toBeTruthy();

    // Attempt join operation with verified session
    const membership = await testUtils.performAsyncAction(
      () => communitiesResult.current.join(community.id, 'member'),
      "join with verified session - should not fail"
    );

    // Verify auth state is still valid after join
    expect(authResult.current.isAuthenticated).toBe(true);
    expect(authResult.current.currentUser).toBeTruthy();

    expect(membership).toMatchObject({
      communityId: community.id,
      userId: authResult.current.currentUser!.id,
      role: 'member',
    });

    console.log("✅ Session validation test successful - operations work with stable session");
  });
});