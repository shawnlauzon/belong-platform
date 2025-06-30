// @belongnetwork/platform/types - All type exports

// Database types
export {
  type Database,
  type Tables,
  type Enums,
} from "../packages/types/src/database";

// Enum exports
export {
  ResourceCategory,
  MeetupFlexibility,
  EventAttendanceStatus,
} from "../packages/types/src/types";

// Domain types
export {
  type User,
  type UserInfo,
  type Community,
  type CommunityInfo,
  type CommunityMembership,
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
} from "../packages/types/src/types";

// Auth types
export {
  type AuthState,
  type BelongConfig,
} from "../packages/api/src/auth/index";
