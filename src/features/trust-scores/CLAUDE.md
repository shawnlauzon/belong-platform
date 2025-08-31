# Trust Scores Feature

Trust scores track user engagement and contributions within communities through an automated point system.

## Overview

- Each user has one trust score per community they participate in
- Points are awarded automatically for various community actions
- Scores accumulate over time and map to player levels
- All point awards are logged for audit purposes

## Point System

The system awards points for the following actions:

| Action | Points | Description |
|--------|--------|-------------|
| Community Creation | 1000 | Creating a new community |
| Community Join | 50 | Joining an existing community |
| Resource Offer | 50 | Creating a resource to share |
| Event Registration | 5 | Registering for an event |
| Event Approval | 25 | Having event registration approved |
| Event Going | 25 | Confirming attendance at event |
| Event Attended | 50 | Actually attending an event |
| Offer Approved | 25 | Having resource offer approved |
| Offer Completed | 50 | Successfully completing resource exchange |
| Request Approved | 25 | Having resource request approved |
| Request Completed | 50 | Successfully fulfilling resource request |
| Shoutout Sent | 10 | Sending a shoutout to another user |
| Shoutout Received | 100 | Receiving a shoutout from another user |

## Automatic Behaviors

### Community Creation
When a user creates a community:
1. Automatically awards **COMMUNITY_CREATION** points (1000)
2. Automatically awards **COMMUNITY_JOIN** points (50) 
3. Creates a trust_scores entry for the creator
4. User becomes the community organizer and first member

### Community Joining
When a user joins a community:
1. Awards **COMMUNITY_JOIN** points (50)
2. Creates trust_scores entry if none exists for that user-community pair

### Resource Creation
When a user creates a resource (offer/request/event):
1. Awards **RESOURCE_OFFER** points (50)
2. Logs the action in trust_score_logs

## Database Structure

### trust_scores Table
- `user_id` + `community_id`: Unique constraint (one score per user per community)
- `score`: Accumulated points total
- `last_calculated_at`: When score was last updated

### trust_score_logs Table
- Audit log of all point awards
- Tracks `action_type`, `points_change`, and context

## Player Levels

Trust scores map to themed marine life levels:
- Different score thresholds unlock different levels
- Each level has a name, emoji, and minimum score requirement
- Progress calculation shows advancement toward next level
- Level information used for gamification and user engagement

## Key Behaviors for Development

1. **Trust scores are created automatically** - you don't need to manually create them
2. **Points accumulate** - scores increase with each qualifying action
3. **One score per user-community pair** - enforced by database constraint
4. **All changes are logged** - every point award creates a log entry
5. **Calculations happen in real-time** - scores update immediately when actions occur

## API Surface

- `fetchTrustScores(supabase, userId)` - Get all trust scores for a user
- `calculateLevel(score)` - Get level information for a score
- `getProgressToNextLevel(score)` - Get progress information for UI

## Business Logic Notes

- Shoutouts award the most points to recipients (100) to encourage community recognition
- Community creation awards significant points (1000) as it's a major contribution
- Event attendance requires confirmation to prevent gaming the system
- All point values are configurable via POINTS_CONFIG constant