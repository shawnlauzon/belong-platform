# Messaging

Direct messaging between users and community chats with real-time updates.

## Purpose

The messaging feature provides:
- Direct 1:1 conversations between users
- Community-wide group chats
- Real-time message delivery via Supabase Realtime
- Message editing and deletion
- User blocking and reporting
- Unread message tracking
- Message encryption support

## Key Entities

### Message

Individual message in a conversation or community chat.

**Key Fields:**
- `id` - Message ID
- `conversationId` - Direct conversation ID (null for community messages)
- `communityId` - Community chat ID (null for direct messages)
- `senderId` - User who sent the message
- `content` - Message text
- `isEdited` - Whether message has been edited
- `isDeleted` - Whether message is deleted (soft delete)
- `encryptionVersion` - Encryption version number
- `createdAt`, `updatedAt` - Timestamps

**Notes:**
- Either `conversationId` OR `communityId` is set, never both
- Deleted messages show placeholder text
- Encryption version tracks security level

### Conversation

Direct 1:1 conversation between two users.

**Key Fields:**
- `id` - Conversation ID
- `lastMessage` - Most recent message (or null)
- `initiatorId` - User who started conversation
- `participants` - Array of participant user IDs (always 2)
- `createdAt`, `updatedAt` - Timestamps

**Notes:**
- Always has exactly 2 participants
- Created automatically when first message sent
- Participants cannot be changed after creation

### CommunityChat

Community-wide group chat.

**Key Fields:**
- `communityId` - Community ID (primary key)
- `lastMessage` - Most recent message (or null)

**Notes:**
- One chat per community
- All community members can participate
- No separate entity - messages linked directly to community

### MessageReport

Report of inappropriate message content.

**Key Fields:**
- `id` - Report ID
- `messageId` - Reported message
- `reporterId` - User who reported
- `reason` - `'spam'` | `'harassment'` | `'inappropriate'` | `'other'`
- `details` - Optional explanation
- `status` - `'pending'` | `'approved'` | `'rejected'`
- `reviewedAt`, `reviewedBy` - Review information

## Core Concepts

### Direct vs Community Messages

**Direct Conversations**
- 1:1 private messaging
- Between any two users
- Created on-demand
- Participants cannot be changed

**Community Chats**
- Group messaging for all community members
- One chat per community
- All members can participate
- Membership controlled by community membership

### Real-time Messaging

Uses Supabase Realtime for instant delivery:
- Messages broadcast via channels
- Subscribers receive updates instantly
- Optimistic UI updates supported
- Automatic reconnection handling

### Message Lifecycle

1. **Send** - User creates message
2. **Deliver** - Real-time broadcast to recipients
3. **Edit** (optional) - Sender can edit content
4. **Delete** (optional) - Sender can soft-delete

### Unread Tracking

System tracks unread messages:
- Per-conversation unread counts
- Per-community unread counts
- Mark as read functionality
- Total unread badge count

### User Blocking

Users can block others:
- Prevents receiving messages from blocked user
- Hides existing messages from blocked user
- Can be undone (unblock)

### Message Reporting

Users can report inappropriate messages:
- Reason selection
- Optional details
- Moderation review workflow
- Status tracking

## API Reference

### Query Hooks
- `useConversations()` - Get all conversations for current user
- `useConversation(id)` - Get single conversation
- `useCommunityChats()` - Get all community chats for user
- `useMessages(conversationId)` - Get messages in conversation
- `useCommunityMessages(communityId)` - Get messages in community chat
- `useMessageUnreadCount()` - Get total unread count
- `useCommunityUnreadCount(communityId)` - Get community unread count
- `useRealtimeMessaging(target)` - Subscribe to real-time updates

### Mutation Hooks
- `useStartConversation()` - Start new conversation with user
- `useSendMessage()` - Send message to conversation or community
- `useDeleteMessage()` - Delete message
- `useMarkConversationAsRead()` - Mark conversation as read
- `useMarkChatAsRead()` - Mark community chat as read
- `useBlockUser()` - Block user
- `useUnblockUser()` - Unblock user
- `useReportMessage()` - Report message

## Important Patterns

### Starting Conversations

```typescript
const startConversation = useStartConversation();

const conversation = await startConversation.mutateAsync({
  otherUserId: 'user-id'
});
```

### Sending Messages

```typescript
const sendMessage = useSendMessage();

// Direct message
await sendMessage.mutateAsync({
  conversationId: 'conv-id',
  content: 'Hello!'
});

// Community message
await sendMessage.mutateAsync({
  communityId: 'community-id',
  content: 'Hello everyone!'
});
```

### Real-time Subscriptions

```typescript
// Subscribe to conversation updates
useRealtimeMessaging({
  type: 'conversation',
  id: conversationId
});

// Subscribe to community chat updates
useRealtimeMessaging({
  type: 'community',
  id: communityId
});
```

### Fetching Messages

```typescript
// Get conversation messages
const { data: messages } = useMessages(conversationId);

// Get community messages
const { data: messages } = useCommunityMessages(communityId);
```

### Unread Counts

```typescript
// Total unread
const { data: unreadCount } = useMessageUnreadCount();

// Community unread
const { data: communityUnread } = useCommunityUnreadCount(communityId);
```

### Marking as Read

```typescript
const markAsRead = useMarkConversationAsRead();
await markAsRead.mutateAsync(conversationId);

const markChatAsRead = useMarkChatAsRead();
await markChatAsRead.mutateAsync(communityId);
```

### Message Actions

```typescript
// Delete message
const deleteMessage = useDeleteMessage();
await deleteMessage.mutateAsync({ messageId: 'msg-id' });

// Report message
const reportMessage = useReportMessage();
await reportMessage.mutateAsync({
  messageId: 'msg-id',
  reason: 'spam',
  details: 'Optional explanation'
});
```

### User Blocking

```typescript
// Block user
const blockUser = useBlockUser();
await blockUser.mutateAsync({ blockedUserId: 'user-id' });

// Unblock user
const unblockUser = useUnblockUser();
await unblockUser.mutateAsync({ blockedUserId: 'user-id' });
```