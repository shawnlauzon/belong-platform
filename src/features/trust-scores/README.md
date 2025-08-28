# Trust Scores & Player Levels

This feature provides trust score tracking and player level calculation for the Belong Network platform. Trust scores are automatically updated based on community activities, and player levels are dynamically calculated from trust scores.

## Features

### Trust Scores
- Per-community trust scores stored in database
- Automatic point awarding via database triggers
- Real-time score tracking and history

### Player Levels
- 20 ocean-themed levels from Plankton to Whale
- Dynamic calculation based on trust scores
- Progress tracking to next level
- Works for individual communities or total across all communities

## Trust Score Point Values

| Action | Points | Description |
|--------|--------|-------------|
| Community Creation | 1,000 | Creating a new community |
| Shoutout Received | 100 | Receiving recognition from peers |
| Resource Completion | 50 | Completing a claimed resource |
| Community Join | 50 | Joining a community |
| Resource Offer | 50 | Offering a resource to community |
| Resource Claim Confirmed | 25 | Having a resource claim confirmed |
| Shoutout Sent | 10 | Giving recognition to others |
| Resource Claim Initial | 5 | Initial resource claim |

## Player Levels

The platform uses 20 ocean-themed levels:

| Level | Name | Emoji | Min Score | Description |
|-------|------|-------|-----------|-------------|
| 1 | Plankton | 🦠 | 0 | Just joined, going with the flow |
| 2 | Hermit Crab | 🐚 | 50 | Coming out of shell |
| 3 | Shrimp | 🦐 | 100 | Small but active |
| 4 | Crab | 🦀 | 200 | Moving sideways into community |
| 5 | Sea Snail | 🐌 | 350 | Slow and steady progress |
| 6 | Lobster | 🦞 | 500 | Getting stronger |
| 7 | Starfish | ⭐ | 750 | Spreading out connections |
| 8 | Jellyfish | 🪼 | 1,000 | Floating up, more visible |
| 9 | Clownfish | 🐠 | 1,500 | Colorful contributor |
| 10 | Tuna | 🐟 | 2,000 | Strong swimmer |
| 11 | Pufferfish | 🐡 | 3,000 | Building confidence |
| 12 | Squid | 🦑 | 4,000 | Reaching in many directions |
| 13 | Octopus | 🐙 | 5,500 | Problem solver, very helpful |
| 14 | Sea Turtle | 🐢 | 7,500 | Wise and steady |
| 15 | Sea Otter | 🦦 | 10,000 | Playful and clever |
| 16 | Penguin | 🐧 | 13,000 | Expert swimmer, beloved |
| 17 | Seal | 🦭 | 17,000 | Agile helper |
| 18 | Shark | 🦈 | 22,000 | Powerful presence |
| 19 | Dolphin | 🐬 | 28,000 | Intelligent communicator |
| 20 | Whale | 🐋 | 35,000 | Gentle giant, community pillar |

## Usage

### Get Trust Scores

```tsx
import { useTrustScores } from '@belongnetwork/platform';

function UserTrustScores({ userId }: { userId: string }) {
  const { data: trustScores, isPending } = useTrustScores(userId);

  if (isPending) return <div>Loading...</div>;

  return (
    <div>
      <h3>Trust Scores</h3>
      {trustScores?.map((score) => (
        <div key={score.id}>
          Community {score.communityId}: {score.score} points
        </div>
      ))}
    </div>
  );
}
```

### Get Player Level (Overall)

```tsx
import { usePlayerLevel } from '@belongnetwork/platform';

function PlayerLevelDisplay({ userId }: { userId: string }) {
  const { data: levelProgress, isPending } = usePlayerLevel(userId);

  if (isPending) return <div>Loading level...</div>;
  if (!levelProgress) return null;

  return (
    <div>
      <div style={{ fontSize: '2rem' }}>
        {levelProgress.currentLevel.emoji} {levelProgress.currentLevel.name}
      </div>
      <div>Level {levelProgress.currentLevel.index + 1}/20</div>
      <div>{levelProgress.currentLevel.description}</div>
      <div>Score: {levelProgress.currentScore} points</div>
      
      {levelProgress.nextLevel && (
        <div>
          <div>Progress: {levelProgress.progress.toFixed(0)}%</div>
          <div>{levelProgress.pointsToNext} points to next level</div>
          <div>Next: {levelProgress.nextLevel.emoji} {levelProgress.nextLevel.name}</div>
        </div>
      )}
    </div>
  );
}
```

### Get Player Level (Community-Specific)

```tsx
import { usePlayerLevel } from '@belongnetwork/platform';

function CommunityPlayerLevel({ userId, communityId }: {
  userId: string;
  communityId: string;
}) {
  const { data: levelProgress } = usePlayerLevel(userId, communityId);

  if (!levelProgress) return null;

  return (
    <div>
      <span>{levelProgress.currentLevel.emoji}</span>
      <span>{levelProgress.currentLevel.name}</span>
      <div>Community Level: {levelProgress.currentLevel.index + 1}</div>
    </div>
  );
}
```

### Level Calculations (Utilities)

```tsx
import { 
  calculateLevel,
  getProgressToNextLevel,
  getAllLevels,
  PLAYER_LEVELS 
} from '@belongnetwork/platform';

// Calculate level from score
const level = calculateLevel(1200); // Returns Jellyfish level
console.log(`${level.emoji} ${level.name}: ${level.description}`);

// Get progress information
const progress = getProgressToNextLevel(1200);
console.log(`Progress to next level: ${progress.progress}%`);

// Get all available levels
const allLevels = getAllLevels();
console.log(`Total levels available: ${allLevels.length}`);

// Access level configuration
console.log(PLAYER_LEVELS[7]); // Jellyfish level
```

### Level Leaderboards

```tsx
import { usePlayerLevel } from '@belongnetwork/platform';

function CommunityLeaderboard({ userIds, communityId }: {
  userIds: string[];
  communityId: string;
}) {
  return (
    <div>
      <h3>Community Leaderboard</h3>
      {userIds.map((userId) => (
        <LeaderboardEntry
          key={userId}
          userId={userId}
          communityId={communityId}
        />
      ))}
    </div>
  );
}

function LeaderboardEntry({ userId, communityId }: {
  userId: string;
  communityId: string;
}) {
  const { data: levelProgress } = usePlayerLevel(userId, communityId);

  if (!levelProgress) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span>{levelProgress.currentLevel.emoji}</span>
      <span>{levelProgress.currentLevel.name}</span>
      <span>({levelProgress.currentScore} points)</span>
    </div>
  );
}
```

## Implementation Notes

- **No Database Storage**: Player levels are calculated dynamically from trust scores, not stored in the database
- **Real-time**: Levels update automatically when trust scores change
- **Flexible**: Can show levels per community or across all communities
- **Efficient**: Uses React Query caching for optimal performance
- **Type-safe**: Full TypeScript support with comprehensive type definitions

## Level Progression Examples

- **New User (Plankton)**: Starts at 0 points
- **Joins Community (Hermit Crab)**: 50 points from joining
- **Receives Shoutout (Shrimp)**: 150 points total (50 + 100)
- **Active Contributor (Jellyfish)**: 1,000+ points from various activities
- **Community Leader (Whale)**: 35,000+ points from sustained engagement