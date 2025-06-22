// @belongnetwork/platform/hooks - All React hooks

// Auth hooks
export {
  useAuth,
  useSignIn,
  useSignUp,
  useSignOut,
} from "../packages/api/src/auth/index.js";

// Community hooks
export {
  useCommunities,
  useCommunity,
  useCommunityMemberships,
  useUserMemberships,
} from "../packages/api/src/communities/index.js";

// Resource hooks
export {
  useResources,
  useResource,
} from "../packages/api/src/resources/index.js";

// Event hooks
export {
  useEvents,
  useEvent,
  useEventAttendees,
  useUserEventAttendances,
} from "../packages/api/src/events/index.js";

// Thanks hooks
export {
  useThanks,
  useThank,
} from "../packages/api/src/thanks/index.js";

// User hooks
export {
  useUsers,
  useUser,
} from "../packages/api/src/users/index.js";
