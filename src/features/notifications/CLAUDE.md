# Notification System Implementation

## Overview

A comprehensive notification system for the Belong Platform supporting badge counts, real-time notifications, and user preference controls across 19 notification types. The system is fully implemented with database triggers, React Query hooks, and granular user controls.

## Notification Types & User Controls

### Permission Group 1: **Social Interactions**

Controls notifications about direct interactions with other users:

- `comment` - Someone comments on your resource
- `comment_reply` - Someone replies to your comment
- `shoutout_received` - Someone gives you a shoutout
- `connection_request` - Someone wants to connect with you
- `connection_accepted` - Your connection request was accepted

**Database columns**: `comments_on_resources`, `comment_replies`, `shoutout_received`, `connection_request`, `connection_accepted`

### Permission Group 2: **My Resources**

Controls notifications about resources you own:

- `claim` - Someone claims your resource
- `resource_claim_cancelled` - Someone cancelled their claim on your resource
- `resource_claim_completed` - Someone marked their claim as completed on your resource

**Database columns**: `resource_claims`, `resource_claim_cancelled`, `resource_claim_completed`

### Permission Group 3: **My Registrations**

Controls notifications about things you've signed up for (claims/event registrations):

- `claim_approved` - Your claim/registration was approved by the resource owner
- `claim_rejected` - Your claim/registration was rejected by the resource owner
- `claimed_resource_updated` - A resource/event you claimed/registered for was updated
- `claimed_resource_cancelled` - A resource/event you claimed/registered for was cancelled

**Database columns**: `claim_approved`, `claim_rejected`, `claimed_resource_updated`, `claimed_resource_cancelled`

### Permission Group 4: **My Communities** (as organizer)

Controls notifications about communities you organize:

- `community_member_joined` - Someone joined your community
- `community_member_left` - Someone left your community

**Database columns**: `community_member_joined`, `community_member_left`

### Permission Group 5: **Community Activity** (as member)

Controls notifications about communities you're a member of:

- `new_resource` - New resource added to a community you're in
- `new_event` - New event created in your community

**Database columns**: `community_resources`, `new_event`

### Permission Group 6: **Trust & Recognition**

Controls notifications about achievements:

- `trust_points_received` - You received trust points from an action
- `trust_level_changed` - You reached a new trust level

**Database columns**: `trust_points_received`, `trust_level_changed`

### Permission Group 7: **Messages**

Controls messaging notifications with granular control:

- `direct_message` - Direct message received (1:1 conversations)
- `community_message` - Community chat message received

**Database columns**: `direct_messages`, `community_messages` (both user-controllable)

## Key Design Principles

1. **Clear Ownership Separation**: Distinguishes between "my stuff" (resources I own, communities I organize) and "their stuff" (resources I've claimed, communities I'm a member of)

2. **Unified Registrations**: Treats event attendance and resource claims uniformly as "registrations" since they use the same underlying system

3. **Minimal Overlap**: Each notification type belongs to exactly one group with no duplication

4. **User-Friendly Grouping**: Groups make intuitive sense to users managing their notification preferences

5. **Granular Message Control**: Separate user controls for direct messages vs community chat to respect different communication contexts

6. **Trigger-Based Reliability**: All notifications are created automatically via database triggers, ensuring consistency

## Database Implementation

### Notification Triggers (All Functional)

✅ **Implemented Database Triggers:**

- `shoutout_notification_trigger` → `notify_on_shoutout()`
- `connection_request_notification_trigger` → `notify_on_connection_request()`
- `connection_acceptance_notification_trigger` → `notify_on_connection_accepted()`
- `claim_status_notification_trigger` → `notify_on_claim_status_change()`
- `resource_update_notification_trigger` → `notify_on_resource_update()`
- `resource_cancellation_notification_trigger` → `notify_on_resource_cancellation()`
- `membership_join_notification_trigger` → `notify_on_membership_join()`
- `membership_leave_notification_trigger` → `notify_on_membership_leave()`
- `trust_points_notification_trigger` → `notify_on_trust_points()`
- `trust_level_notification_trigger` → `notify_on_trust_level_change()`

### Notification Preferences Schema

```sql
-- notification_preferences table columns (all user-controllable)
comments_on_resources          BOOLEAN DEFAULT TRUE
comment_replies                BOOLEAN DEFAULT TRUE
shoutout_received             BOOLEAN DEFAULT TRUE
connection_request            BOOLEAN DEFAULT TRUE
connection_accepted           BOOLEAN DEFAULT TRUE
resource_claims               BOOLEAN DEFAULT TRUE
resource_claim_cancelled      BOOLEAN DEFAULT TRUE
resource_claim_completed      BOOLEAN DEFAULT TRUE
claim_approved                BOOLEAN DEFAULT TRUE
claim_rejected                BOOLEAN DEFAULT TRUE
claimed_resource_updated      BOOLEAN DEFAULT TRUE
claimed_resource_cancelled    BOOLEAN DEFAULT TRUE
community_member_joined       BOOLEAN DEFAULT TRUE
community_member_left         BOOLEAN DEFAULT TRUE
community_resources           BOOLEAN DEFAULT TRUE
new_event                     BOOLEAN DEFAULT TRUE
trust_points_received         BOOLEAN DEFAULT TRUE
trust_level_changed           BOOLEAN DEFAULT TRUE
direct_messages               BOOLEAN DEFAULT TRUE
community_messages            BOOLEAN DEFAULT TRUE
```

Channel: `user:{userId}:notifications` - 'new_notification' event with the notification object
