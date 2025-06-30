// @belongnetwork/platform/hooks - All React hooks

// Auth hooks
export {
  useAuth,
  useSignIn,
  useSignUp,
  useSignOut,
} from "../packages/api/src/auth/index";

// Community hooks
export {
  useCommunities,
} from "../packages/api/src/communities/index";

// Resource hooks
export {
  useResources,
} from "../packages/api/src/resources/index";

// Event hooks
export {
  useEvents,
} from "../packages/api/src/events/index";

// Shoutouts hooks
export {
  useShoutouts,
} from "../packages/api/src/shoutouts/index";

// User hooks
export {
  useUsers,
} from "../packages/api/src/users/index";

// Messaging hooks
export {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkAsRead,
  useMessaging,
} from "../packages/api/src/conversations/index";
