# Connections

Platform-level user connection tracking with trust assessment.

## Purpose

The connections feature provides:
- Platform-wide relationship tracking between users
- Personal trust-based assessment of people you invited
- Foundation for trust score calculations and recommendations
- Transparent social graph

## Key Entities

### UserConnection

Tracks platform-level relationships between users with trust assessment.

**Key Fields:**
- `id` - Connection ID
- `userId` - User who invited (the inviter)
- `otherId` - User who was invited (the invitee)
- `type` - Connection type (currently only `'invited'`)
- `strength` - Trust level assessment (see ConnectionStrength below), `null` if not assessed
- `createdAt` - When connection was created

**Notes:**
- Platform-level: one connection per user pair (not community-specific)
- Created automatically when invitation code is accepted (see invitations feature)
- Permanent record of "I invited this person" relationship
- Only system can create `'invited'` connections (SECURITY DEFINER function)
- Only the inviter (userId) can assess trust strength
- `strength` defaults to `null` (not yet assessed)

### ConnectionStrength

Trust assessment levels for user connections:

- **`'trusted'`** - "I know and trust them well"
- **`'positive'`** - "Don't know them well but seems trustworthy"
- **`'neutral'`** - "Don't know them well enough to say" / "No strong opinion"
- **`'negative'`** - "Had a bad experience / don't trust them"
- **`'unknown'`** - "Don't know them at all"
- **`null`** - Not yet answered (default)

**Use Cases:**
- Influencing trust score calculations (closer connections = more weight)
- Informing resource recommendations
- Privacy/visibility settings
- Community health metrics

### UpdateConnectionInput

Input for updating connection properties.

**Fields:**
- `otherId` - The user you invited
- `strength` - The trust level assessment

## Core Concepts

### Connection Lifecycle

1. User accepts invitation code → Platform-level connection created automatically
2. Connection starts with `strength: null` (not yet assessed)
3. Inviter can assess trust level at any time
4. Connection is permanent (cannot be deleted)
5. Only one connection exists per user pair (platform-wide)

### Trust Assessment

Inviters can assess their trust level for people they invited:
- Assessment is optional (can remain `null`)
- Can be updated at any time
- Only the inviter (`userId`) can assess their invitees
- Assessment is personal, not community-specific
- Used to weight trust scores and recommendations

### Platform-Level Design

Connections are NOT community-specific:
- One connection per relationship (not per community)
- Trust is personal, not contextual
- Simpler model: "I invited this person to the platform"
- Prevents duplicate assessments across communities

### Public Transparency

All authenticated users can view all connections:
- Promotes trust and accountability
- Enables social graph analysis
- Shows who vouched for whom
- Only creation of `'invited'` connections is system-controlled

## API Reference

### Hooks
- `useUserConnections()` - Get all your platform-level connections
- `useUpdateConnection()` - Update connection trust assessment

### Key Functions
- `fetchUserConnections(supabase, userId)` - Get user's connections
- `updateConnection(supabase, userId, input)` - Update connection strength

## Important Patterns

### Fetching User Connections

```typescript
// Get all people you invited to the platform
const { data: connections } = useUserConnections();

connections?.forEach(conn => {
  console.log(`I invited ${conn.otherId}`);
  console.log(`My trust assessment: ${conn.strength ?? 'Not assessed yet'}`);
  console.log(`Connection created: ${conn.createdAt}`);
});
```

### Updating Connection Strength

```typescript
const updateConnection = useUpdateConnection();

// Update trust assessment for someone you invited
await updateConnection.mutateAsync({
  otherId: 'user-id',
  strength: 'trusted' // or 'positive', 'neutral', 'negative', 'unknown', null
});

// Example: Prompt user to assess people they invited
const handleAssessConnection = async (inviteeId: string) => {
  const strength = await promptUserForTrustLevel(); // UI implementation

  if (strength) {
    await updateConnection.mutateAsync({
      otherId: inviteeId,
      strength,
    });
  }
};
```

### Connection with Trust Scores

Connections influence trust scores:
- Connections with higher `strength` carry more weight
- `null` strength connections have minimal impact
- Negative connections can reduce trust propagation

## Related Features

- **Invitations** - Creates platform-level connections when invitation codes are accepted
- **Trust Scores** - Uses connection strength to calculate trust between users
- **Communities** - Invitations bring users to communities, but connections are platform-level
