# Invitations

Community invitation code system and user connection tracking.

## Purpose

The invitations feature provides:
- Unique invitation codes for community onboarding
- Tracking who invited whom
- Connection history between users
- Community membership via invitation codes

## Key Entities

### InvitationCode

Unique code for joining a community.

**Key Fields:**
- `code` - Unique invitation code string
- `userId` - User who created the code
- `communityId` - Community the code is for
- `isActive` - Whether code can still be used
- `createdAt`, `updatedAt` - Timestamps

**Notes:**
- One code per user per community
- Can be deactivated
- Permanent link between inviter and community

### UserConnection

Tracks invitation relationships between users with trust assessment.

**Key Fields:**
- `id` - Connection ID
- `userId` - User who was invited
- `otherId` - User who sent the invitation
- `communityId` - Community context
- `type` - Always `'invited_by'`
- `strength` - Trust level (see ConnectionStrength below), `null` if not assessed
- `createdAt` - When connection was created

**Notes:**
- Created when invitation code is used
- Permanent record of invitation
- One connection per user per community
- `strength` defaults to `null` (not yet assessed)

### ConnectionStrength

Trust assessment levels for user connections:

- `'trusted'` - "I know and trust them well"
- `'positive'` - "Don't know them well but seems trustworthy"
- `'neutral'` - "Don't know them well enough to say" / "No strong opinion"
- `'negative'` - "Had a bad experience / don't trust them"
- `'unknown'` - "Don't know them at all"
- `null` - Not yet answered (default)

### InvitationDetails

Extended information about an invitation.

**Key Fields:**
- `user` - UserSummary of inviter
- `communityId` - Community ID
- `isActive` - Code active status
- `createdAt` - When code was created

### ConnectionSummary

Summary of a user's connections.

**Key Fields:**
- `totalConnections` - Total number of connections
- `recentConnections` - Array of recent UserConnection objects

## Core Concepts

### Invitation Flow

1. User generates invitation code for community
2. Code is shared with potential member
3. New user uses code to join platform
4. UserConnection created linking users
5. New user joins community automatically

### Code Generation

Each user gets one code per community:
- Codes are unique strings
- Generated automatically
- Can be regenerated if needed
- Remains active until deactivated

### Connection Tracking

System tracks who invited whom:
- Permanent records
- Community-specific
- Used for trust score calculations
- Visible in user profiles

### Code Processing

When a code is used:
- Validates code is active
- Creates UserConnection
- May require joining community
- Returns success/failure response

## API Reference

### Hooks
- `useInvitationCode(communityId)` - Get user's invitation code for community
- `useGenerateInvitationCode()` - Generate or regenerate code
- `useProcessInvitationCode()` - Process/redeem invitation code
- `useInvitationDetails(code)` - Get details about an invitation code
- `useUserConnections(userId?)` - Get connections for user
- `useUpdateConnection()` - Update connection properties (currently: trust assessment)

### Key Functions
- `fetchInvitationCode(supabase, communityId)` - Fetch user's code
- `generateInvitationCode(supabase, communityId)` - Generate new code
- `processInvitationCode(supabase, code)` - Redeem invitation code
- `fetchInvitationDetails(supabase, code)` - Get code details
- `fetchUserConnections(supabase, userId)` - Get user's connections
- `updateConnectionStrength(supabase, userId, otherId, communityId, strength)` - Update connection strength

## Important Patterns

### Generating Invitation Codes

```typescript
const generateCode = useGenerateInvitationCode();

const invitation = await generateCode.mutateAsync({
  communityId: 'community-id'
});

console.log(`Share this code: ${invitation.code}`);
```

### Getting Existing Code

```typescript
const { data: invitation } = useInvitationCode('community-id');

if (invitation) {
  console.log(`Your code: ${invitation.code}`);
}
```

### Processing Invitation Codes

```typescript
const processCode = useProcessInvitationCode();

const result = await processCode.mutateAsync({
  code: 'ABC123'
});

if (result.success) {
  if (result.requiresJoinCommunity) {
    // Need to join community
    await joinCommunity(result.communityId);
  }
  console.log('Connection created!');
}
```

### Viewing Invitation Details

```typescript
const { data: details } = useInvitationDetails('ABC123');

if (details) {
  console.log(`Invited by: ${details.user.fullName}`);
  console.log(`Community: ${details.communityId}`);
  console.log(`Active: ${details.isActive}`);
}
```

### User Connections

```typescript
// Get current user's connections
const { data: connections } = useUserConnections();

console.log(`Total: ${connections?.totalConnections}`);
connections?.recentConnections.forEach(conn => {
  console.log(`Connected to ${conn.otherId} in ${conn.communityId}`);
});

// Get another user's connections
const { data: userConns } = useUserConnections('user-id');
```

### Updating Connection Strength

```typescript
const updateConnection = useUpdateConnection();

// Update trust assessment for a connection
await updateConnection.mutateAsync({
  otherId: 'user-id',
  communityId: 'community-id',
  strength: 'trusted' // or 'positive', 'neutral', 'negative', 'unknown', null
});

// Example: After accepting an invitation, prompt inviter to assess trust
const handleAcceptInvitation = async (inviterId: string) => {
  // ... invitation acceptance logic ...

  // Prompt user to assess their connection
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

### Sharing Codes

```typescript
const { data: invitation } = useInvitationCode(communityId);

if (invitation) {
  const shareUrl = `https://app.belong.com/invite/${invitation.code}`;
  // Share via email, SMS, etc.
}
```

### Deactivating Codes

```typescript
// Generate new code (deactivates old one)
const generateCode = useGenerateInvitationCode();

await generateCode.mutateAsync({
  communityId: 'community-id'
});
// Old code is now inactive, new code is active
```