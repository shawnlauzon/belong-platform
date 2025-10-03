# Trust Scores

Gamified reputation system with points and levels per community.

## Purpose

The trust-scores feature provides:
- Community-specific reputation scores
- Point-based system for user actions
- Level progression based on points
- Action logging for transparency
- Trust score history tracking

## Key Entities

### TrustScore

User's trust score within a community.

**Key Fields:**
- `userId` - User ID
- `communityId` - Community ID
- `score` - Current point total
- `lastCalculatedAt` - Last update timestamp
- `createdAt`, `updatedAt` - Timestamps

**Notes:**
- Composite key: (userId, communityId)
- One score per user per community
- Score persists across sessions
- Cannot go below zero

### TrustScoreLog

Record of trust score changes.

**Key Fields:**
- `id` - Log entry ID
- `userId` - User whose score changed
- `communityId` - Community context
- `actionType` - Type of action (e.g., 'claim_completed', 'event_attended')
- `actionId` - ID of related entity (optional)
- `pointsChange` - Points added or removed
- `scoreBefore` - Score before change
- `scoreAfter` - Score after change
- `metadata` - Additional context (optional)
- `createdAt` - When change occurred

**Notes:**
- Immutable audit log
- Tracks all score changes
- Includes before/after values
- Links to source actions

### PlayerLevel

Level information based on score thresholds.

**Key Fields:**
- `level` - Level number (1, 2, 3, etc.)
- `minPoints` - Minimum points for level
- `maxPoints` - Maximum points for level (optional)
- `title` - Level name/title

**Notes:**
- Calculated from score, not stored
- Multiple levels defined in system
- Progression encourages engagement

## Core Concepts

### Community-Specific Scores

Trust scores are per-community:
- Same user has different scores in different communities
- Actions in one community don't affect others
- Encourages participation across communities

### Point System

Users earn points for positive actions:
- Creating resources
- Completing exchanges
- Attending events
- Receiving shoutouts
- Helping others

Points can be lost for negative actions:
- Flaking on events
- Cancelled claims
- Community violations

### Action Types

Common action types:
- `claim_completed` - Completed offer/request
- `event_attended` - Attended event
- `resource_created` - Created resource
- `shoutout_received` - Received appreciation
- `event_flaked` - No-show at event (negative points)

### Level Progression

Levels based on point thresholds:
- Level 1: 0-99 points
- Level 2: 100-299 points
- Level 3: 300-599 points
- (Additional levels continue)

### Trust Score Calculation

Scores calculated by database triggers:
- Automatic on qualifying actions
- Atomic updates
- Log entries created
- No manual calculation needed

## API Reference

### Hooks
- `useTrustScore(userId, communityId)` - Get user's trust score
- `useTrustScoreLogs(userId, communityId)` - Get score history
- `usePlayerLevel(score)` - Get level for score

### Key Functions
- `fetchTrustScore(supabase, userId, communityId)` - Fetch trust score
- `fetchTrustScoreLogs(supabase, userId, communityId)` - Fetch logs
- `calculatePlayerLevel(score)` - Calculate level from score

## Important Patterns

### Fetching Trust Scores

```typescript
// Get current user's score in a community
const { data: trustScore } = useTrustScore(userId, communityId);

console.log(`Score: ${trustScore?.score}`);
console.log(`Last updated: ${trustScore?.lastCalculatedAt}`);
```

### Viewing Score History

```typescript
const { data: logs } = useTrustScoreLogs(userId, communityId);

logs?.forEach(log => {
  console.log(`${log.actionType}: ${log.pointsChange > 0 ? '+' : ''}${log.pointsChange}`);
  console.log(`${log.scoreBefore} → ${log.scoreAfter}`);
});
```

### Calculating Level

```typescript
const { data: trustScore } = useTrustScore(userId, communityId);

if (trustScore) {
  const level = usePlayerLevel(trustScore.score);
  console.log(`Level ${level.level}: ${level.title}`);
  console.log(`Next level at ${level.maxPoints} points`);
}
```

### Displaying Score

```typescript
function TrustScoreBadge({ userId, communityId }: Props) {
  const { data: score } = useTrustScore(userId, communityId);
  const level = usePlayerLevel(score?.score ?? 0);

  return (
    <div>
      <div>Level {level.level}</div>
      <div>{score?.score} points</div>
      <div>{level.title}</div>
    </div>
  );
}
```

### Score Change Notifications

Trust score changes trigger notifications:
- `trustpoints.gained` notification type
- `trustpoints.lost` notification type
- `trustlevel.changed` notification type

### Automatic Score Updates

Scores update automatically via database triggers:
- No manual API calls needed
- Triggered by resource/claim/event actions
- Immediate updates
- Atomic transactions

### Filtering Logs

```typescript
// Get logs for specific action type
const { data: logs } = useTrustScoreLogs(userId, communityId);

const eventLogs = logs?.filter(log =>
  log.actionType.includes('event')
);

const gains = logs?.filter(log => log.pointsChange > 0);
const losses = logs?.filter(log => log.pointsChange < 0);
```