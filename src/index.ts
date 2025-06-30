// @belongnetwork/platform - Main entry point

// Auth exports
export {
  useAuth,
  useSignIn,
  useSignUp,
  useSignOut,
  BelongProvider,
  type BelongConfig,
  type AuthState,
} from "../packages/api/src/auth/index";

// Community exports
export {
  useCommunities,
} from "../packages/api/src/communities/index";

// Community types
export {
  type Community,
  type CommunityMembership,
  type CommunityInfo,
} from "../packages/types/src/types";

// Resource exports
export {
  useResources,
} from "../packages/api/src/resources/index";

// Event exports
export {
  useEvents,
} from "../packages/api/src/events/index";

// Shoutouts exports
export {
  useShoutouts,
} from "../packages/api/src/shoutouts/index";

// User exports
export {
  useUsers,
} from "../packages/api/src/users/index";

// Type exports
export {
  type Database,
  type Tables,
  type Enums,
  ResourceCategory,
  MeetupFlexibility,
  EventAttendanceStatus,
  type Resource,
  type ResourceInfo,
  type ResourceFilter,
  type Event,
  type EventInfo,
  type EventAttendance,
  type EventFilter,
  type Shoutout,
  type ShoutoutInfo,
  type ShoutoutFilter,
  type User,
  type UserInfo,
} from "../packages/types/src/types";

// Core exports
export {
  createBelongClient,
  createSupabaseClient,
  createMapboxClient,
  createLogger,
  logger,
  logApiCall,
  logApiResponse,
  logComponentRender,
  logEvent,
  logStateChange,
  logUserAction,
  calculateDrivingTime,
  StorageManager,
} from "../packages/core/src/index";

// Import and re-export namespaces (workaround for vite-plugin-dts limitation)
import * as hooks from "./hooks";
import * as types from "./types";
export { hooks, types };
