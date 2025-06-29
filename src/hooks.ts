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
} from "../packages/api/src/communities/index.js";

// Resource hooks
export {
  useResources,
} from "../packages/api/src/resources/index.js";

// Event hooks
export {
  useEvents,
} from "../packages/api/src/events/index.js";

// Shoutouts hooks
export {
  useShoutouts,
} from "../packages/api/src/shoutouts/index.js";

// User hooks
export {
  useUsers,
} from "../packages/api/src/users/index.js";

// Messaging hooks
export {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkAsRead,
  useMessaging,
} from "../packages/api/src/conversations/index.js";
