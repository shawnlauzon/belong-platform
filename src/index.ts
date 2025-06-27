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
} from "../packages/api/src/auth/index.js";

// Community exports
export {
  useCommunities,
} from "../packages/api/src/communities/index.js";

// Community types
export {
  type Community,
  type CommunityMembership,
  type CommunityInfo,
} from "../packages/types/src/types.js";

// Resource exports
export {
  useResources,
} from "../packages/api/src/resources/index.js";

// Event exports
export {
  useEvents,
} from "../packages/api/src/events/index.js";

// Thanks exports
export {
  useThanks,
} from "../packages/api/src/thanks/index.js";

// User exports
export {
  useUsers,
} from "../packages/api/src/users/index.js";

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
  type Thanks,
  type ThanksInfo,
  type ThanksFilter,
  type User,
  type UserInfo,
} from "../packages/types/src/types.js";

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
} from "../packages/core/src/index.js";

// Import and re-export namespaces (workaround for vite-plugin-dts limitation)
import * as hooks from "./hooks.js";
import * as types from "./types.js";
export { hooks, types };
