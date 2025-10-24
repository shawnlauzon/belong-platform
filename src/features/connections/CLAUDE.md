# Connections

User connection tracking with trust assessment.

## Purpose

The connections feature provides:
- Tracking relationships between users
- Trust-based assessment of connections
- Connection history per community
- Foundation for trust score calculations

## Key Entities

### UserConnection

Tracks relationships between users with trust assessment.

**Key Fields:**
- `id` - Connection ID
- `userId` - User who was invited
- `otherId` - User who sent the invitation
- `communityId` - Community context
- `type` - Connection type (currently only `'invited_by'`)
- `strength` - Trust level assessment (see ConnectionStrength below), `null` if not assessed
- `createdAt` - When connection was created

**Notes:**
- Created when invitation code is used (see invitations feature)
- Permanent record of relationship
- One connection per user pair per community
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
- `otherId` - The other user in the connection
- `communityId` - The community context
- `strength` - The trust level assessment

## Core Concepts

### Connection Lifecycle

1. User accepts invitation code → Connection created automatically
2. Connection starts with `strength: null` (not yet assessed)
3. Inviter can assess trust level at any time
4. Connection is permanent (cannot be deleted)

### Trust Assessment

Users can assess their trust level for connections:
- Assessment is optional (can remain `null`)
- Can be updated at any time
- Only the `userId` (invited person's inviter) can assess
- Used to weight trust scores and recommendations

## API Reference

### Hooks
- `useUserConnections(communityId)` - Get user's connections for a community
- `useUpdateConnection()` - Update connection properties

### Key Functions
- `fetchUserConnections(supabase, userId, communityId)` - Get user's connections
- `updateConnection(supabase, userId, input)` - Update connection

## Important Patterns

### Fetching User Connections

```typescript
const { data: connections } = useUserConnections(communityId);

connections?.forEach(conn => {
  console.log(`Connected to ${conn.otherId}`);
  console.log(`Trust level: ${conn.strength ?? 'Not assessed'}`);
});
```

### Updating Connection Strength

```typescript
const updateConnection = useUpdateConnection();

// Update trust assessment
await updateConnection.mutateAsync({
  otherId: 'user-id',
  communityId: 'community-id',
  strength: 'trusted' // or 'positive', 'neutral', 'negative', 'unknown', null
});

// Example: Prompt user to assess after invitation accepted
const handleInvitationAccepted = async (inviterId: string) => {
  const strength = await promptUserForTrustLevel(); // UI implementation

  if (strength) {
    await updateConnection.mutateAsync({
      otherId: inviterId,
      communityId: currentCommunityId,
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

- **Invitations** - Creates connections when invitation codes are accepted
- **Trust Scores** - Uses connection strength to calculate trust between users
- **Communities** - Connections are scoped to specific communities
