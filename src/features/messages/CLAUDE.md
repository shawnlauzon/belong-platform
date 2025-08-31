# Real-Time 1x1 Messaging Implementation

## Overview

This document outlines the implementation of a secure, real-time 1x1 messaging system for the Belong Network Platform. The system uses Supabase Realtime with server-side encryption for the web platform, with a clear migration path to client-side end-to-end encryption for future mobile applications.

## Table of Contents

1. [Technical Architecture](#technical-architecture)
2. [Database Schema](#database-schema)
3. [API Implementation](#api-implementation)
4. [Real-time Infrastructure](#real-time-infrastructure)
5. [React Hooks](#react-hooks)
6. [UX/UI Specifications](#uxui-specifications)
7. [Safety & Moderation](#safety--moderation)
8. [Testing Requirements](#testing-requirements)
9. [Performance Considerations](#performance-considerations)
10. [Future E2E Encryption](#future-e2e-encryption)

## Technical Architecture

### Core Principles

- **Privacy First**: Messages are private between participants only
- **Community Focused**: Users must share at least one community to message
- **Real-time**: Instant message delivery using Supabase Realtime
- **Scalable**: Designed for growth with proper indexing and pagination
- **Future-proof**: Architecture supports migration to E2E encryption

### Technology Stack

- **Database**: PostgreSQL with RLS policies
- **Real-time**: Supabase Realtime channels
- **Frontend**: React with TypeScript
- **State Management**: TanStack Query v5
- **Encryption**: Supabase's encryption at rest (server-side)

## Database Schema

### Tables

#### `conversations`
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT, -- Encrypted preview for list view
  last_message_sender_id UUID REFERENCES profiles(id)
);
```

#### `conversation_participants`
```sql
CREATE TABLE conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  PRIMARY KEY (conversation_id, user_id)
);

-- Ensure exactly 2 participants per conversation
CREATE UNIQUE INDEX idx_conversation_participants ON conversation_participants(conversation_id);
ALTER TABLE conversation_participants 
ADD CONSTRAINT check_max_participants 
CHECK ((SELECT COUNT(*) FROM conversation_participants cp WHERE cp.conversation_id = conversation_id) = 2);
```

#### `messages`
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system')),
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  encryption_version INTEGER DEFAULT 1, -- For future E2E migration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
```

#### `message_status`
```sql
CREATE TABLE message_status (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  PRIMARY KEY (message_id, user_id)
);
```

#### `blocked_users`
```sql
CREATE TABLE blocked_users (
  blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);
```

#### `message_reports`
```sql
CREATE TABLE message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id),
  reporter_id UUID REFERENCES profiles(id),
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'other')),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

```sql
-- Conversations: Users can only see their own conversations
CREATE POLICY "Users can view their conversations"
ON conversations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);

-- Messages: Only conversation participants can view messages
CREATE POLICY "Participants can view messages"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

-- Messages: Only participants can send messages
CREATE POLICY "Participants can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
  AND sender_id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = auth.uid() AND blocked_id = messages.sender_id)
    OR (blocked_id = auth.uid() AND blocker_id = messages.sender_id)
  )
);

-- Realtime: Private channel authorization
CREATE POLICY "Users can receive realtime messages"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE user_id = auth.uid()
    AND conversation_id::text = realtime.topic()
  )
);
```

### Helper Functions

```sql
-- Check if users share a community
CREATE OR REPLACE FUNCTION users_share_community(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM community_memberships cm1
    JOIN community_memberships cm2 ON cm1.community_id = cm2.community_id
    WHERE cm1.user_id = user1_id 
    AND cm2.user_id = user2_id
  );
END;
$$ LANGUAGE plpgsql;

-- Get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
BEGIN
  -- Check if users share a community
  IF NOT users_share_community(auth.uid(), other_user_id) THEN
    RAISE EXCEPTION 'Users must share a community to message';
  END IF;

  -- Check for existing conversation
  SELECT c.id INTO conv_id
  FROM conversations c
  WHERE EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.user_id = auth.uid()
  ) AND EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.user_id = other_user_id
  );

  -- Create new conversation if none exists
  IF conv_id IS NULL THEN
    INSERT INTO conversations DEFAULT VALUES RETURNING id INTO conv_id;
    INSERT INTO conversation_participants (conversation_id, user_id) 
    VALUES (conv_id, auth.uid()), (conv_id, other_user_id);
  END IF;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql;
```

## API Implementation

### Directory Structure
```
src/features/messages/
├── api/
│   ├── index.ts
│   ├── fetchConversations.ts
│   ├── fetchConversation.ts
│   ├── fetchMessages.ts
│   ├── sendMessage.ts
│   ├── markAsRead.ts
│   ├── startConversation.ts
│   ├── deleteMessage.ts
│   ├── blockUser.ts
│   ├── unblockUser.ts
│   └── reportMessage.ts
├── hooks/
│   ├── index.ts
│   ├── useConversations.ts
│   ├── useConversation.ts
│   ├── useMessages.ts
│   ├── useSendMessage.ts
│   ├── useTypingIndicator.ts
│   ├── useUnreadCount.ts
│   ├── useMarkAsRead.ts
│   ├── useBlockUser.ts
│   ├── useUnblockUser.ts
│   └── useStartConversation.ts
├── transformers/
│   ├── index.ts
│   ├── messageTransformer.ts
│   └── conversationTransformer.ts
├── types/
│   ├── index.ts
│   ├── message.ts
│   ├── conversation.ts
│   └── messageRow.ts
├── queries.ts
└── index.ts
```

### Core API Functions

#### `fetchConversations`
- Returns paginated list of user's conversations
- Includes last message preview and unread count
- Sorted by last_message_at DESC

#### `fetchMessages`
- Returns paginated messages for a conversation
- 50 messages per page
- Cursor-based pagination using created_at
- Includes sender profile information

#### `sendMessage`
- Validates user is participant
- Checks for blocked users
- Updates conversation's last_message_at
- Triggers real-time broadcast

#### `markAsRead`
- Updates last_read_at for user
- Resets unread_count to 0
- Updates message_status read_at

## Real-time Infrastructure

### Channel Structure

```typescript
// Per-conversation channel for messages
const conversationChannel = supabase.channel(`conversation:${conversationId}`, {
  config: { private: true }
});

// User notification channel
const notificationChannel = supabase.channel(`user:${userId}:notifications`, {
  config: { private: true }
});
```

### Message Broadcasting

```typescript
// Send typing indicator
conversationChannel.send({
  type: 'broadcast',
  event: 'typing',
  payload: { userId, isTyping: true }
});

// Subscribe to new messages
conversationChannel
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      // Handle new message
    }
  )
  .on('broadcast', { event: 'typing' }, (payload) => {
    // Handle typing indicator
  })
  .subscribe();
```

## React Hooks

### Core Hooks Implementation

#### `useConversations`
```typescript
export function useConversations() {
  // Fetch conversations with real-time updates
  // Subscribe to new messages across all conversations
  // Update last message and unread counts
}
```

#### `useMessages`
```typescript
export function useMessages(conversationId: string) {
  // Fetch paginated message history
  // Subscribe to new messages in conversation
  // Handle optimistic updates for sending
  // Implement infinite scroll pagination
}
```

#### `useTypingIndicator`
```typescript
export function useTypingIndicator(conversationId: string) {
  // Send typing status with debouncing (300ms)
  // Auto-clear after 3 seconds
  // Subscribe to other user's typing status
}
```

## UX/UI Specifications

### Design Principles

1. **Simplicity**: Clean, minimal interface focused on conversation
2. **Familiarity**: Follow common messaging app patterns
3. **Accessibility**: WCAG 2.1 AA compliant
4. **Responsiveness**: Mobile-first design
5. **Performance**: Instant feedback with optimistic updates

### User Flows

#### Starting a Conversation

1. User clicks "New Message" button
2. Modal/page shows list of community members
3. Search/filter by name
4. Select recipient
5. Type and send first message
6. Redirect to conversation view

#### Conversation List View

**Layout:**
- Left sidebar on desktop (full screen on mobile)
- Search bar at top
- List of conversations sorted by most recent
- Each item shows:
  - Avatar and name
  - Last message preview (truncated to 50 chars)
  - Timestamp (relative: "2m ago", "Yesterday")
  - Unread indicator (blue dot or count badge)
  - Typing indicator if active

**Interactions:**
- Click conversation to open message thread
- Swipe left (mobile) to reveal delete/archive options
- Long press (mobile) for context menu
- Pull to refresh (mobile)

#### Message Thread View

**Layout:**
- Header with recipient name, avatar, online status
- Message list with infinite scroll
- Messages grouped by date
- Input bar at bottom with send button

**Message Bubble Design:**
- Sent messages: Right-aligned, primary color
- Received messages: Left-aligned, gray background
- System messages: Centered, subtle styling
- Timestamps on hover/tap
- Read receipts below sent messages

**Message States:**
- Sending: Lighter opacity with spinner
- Sent: Single checkmark
- Delivered: Double checkmark
- Read: Double checkmark (blue)
- Failed: Red exclamation with retry option

#### Message Input

**Features:**
- Auto-expanding textarea (max 5 lines)
- Character counter (appears at 1000 chars)
- Send button (disabled when empty)
- Typing indicator shown above input
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)

**Mobile Considerations:**
- Input stays above keyboard
- Scroll to bottom when keyboard opens
- Haptic feedback on send

### Component Specifications

#### ConversationList Component
```typescript
interface ConversationListProps {
  onConversationSelect: (conversationId: string) => void;
  activeConversationId?: string;
}

// Features:
// - Virtual scrolling for large lists
// - Search with debouncing
// - Real-time updates
// - Unread count in header
// - Empty state with CTA
```

#### MessageThread Component
```typescript
interface MessageThreadProps {
  conversationId: string;
  onBack?: () => void; // Mobile navigation
}

// Features:
// - Infinite scroll with 50 messages per page
// - Auto-scroll to bottom on new message
// - Jump to bottom button when scrolled up
// - Message grouping by date
// - Loading states (skeleton screens)
```

#### Message Component
```typescript
interface MessageProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean; // First in group
  showTimestamp?: boolean; // Last in group
}

// Features:
// - Long press/right-click context menu
// - Copy text option
// - Delete option (soft delete)
// - Report option
// - Link detection and preview
```

#### TypingIndicator Component
```typescript
interface TypingIndicatorProps {
  users: User[]; // Who is typing
}

// Display:
// - "Jane is typing..."
// - "Jane and John are typing..."
// - Animated dots (...)
// - Auto-hide after 3 seconds
```

### Visual Design Requirements

#### Colors
- Primary: Brand color for sent messages
- Secondary: #F3F4F6 for received messages
- Danger: #EF4444 for destructive actions
- Success: #10B981 for read receipts
- Text: #111827 primary, #6B7280 secondary

#### Typography
- Message text: 14px/20px regular
- Timestamps: 12px/16px regular
- Names: 14px/20px semibold
- System messages: 12px/16px italic

#### Spacing
- Message padding: 8px 12px
- Message gap: 4px
- Group gap: 16px
- Conversation item: 12px padding

#### Animations
- Message appear: Fade in (200ms)
- Typing indicator: Pulse (1.5s loop)
- Send button: Scale on press
- Read receipts: Fade transition

### Accessibility Requirements

1. **Keyboard Navigation**
   - Tab through conversations
   - Arrow keys to navigate messages
   - Enter to send, Escape to cancel
   - Keyboard shortcuts with visible hints

2. **Screen Readers**
   - Proper ARIA labels
   - Announce new messages
   - Describe message states
   - Role="log" for message list

3. **Visual Accessibility**
   - 4.5:1 contrast ratio minimum
   - Focus indicators
   - Respect prefers-reduced-motion
   - Support browser zoom to 200%

### Mobile-Specific UX

1. **Navigation**
   - Slide between list and thread
   - Back button/gesture to return to list
   - Pull to refresh in both views

2. **Input Handling**
   - Adjust viewport when keyboard appears
   - Maintain scroll position
   - Show "scroll to bottom" FAB

3. **Performance**
   - Lazy load images
   - Virtualize long lists
   - Optimistic updates
   - Offline queue for messages

### Error States

1. **Connection Lost**
   - Banner notification
   - Queue messages locally
   - Auto-retry with exponential backoff

2. **Failed Message**
   - Inline error with retry button
   - Clear error message
   - Don't block other messages

3. **Empty States**
   - No conversations: Illustration + CTA
   - No messages: Friendly prompt
   - Search no results: Suggestion to clear

### Loading States

1. **Initial Load**
   - Skeleton screens matching layout
   - Progressive loading (list -> messages)

2. **Pagination**
   - Spinner at top when loading history
   - Maintain scroll position

3. **Sending**
   - Immediate optimistic update
   - Visual indication of sending state

## Safety & Moderation

### Blocking Users

- Blocked users cannot send messages
- Existing conversations are hidden
- No notification sent to blocked user
- Can unblock from settings

### Reporting Messages

- Report options: Spam, Harassment, Inappropriate, Other
- Include context (surrounding messages)
- Forward to moderation queue
- Option to block user after reporting

### Rate Limiting

- Max 100 messages per minute per user
- Max 10 conversation starts per hour
- Typing indicator throttled to 1/second

## Testing Requirements

### Unit Tests

```typescript
// API Functions
- fetchConversations: pagination, filtering, error handling
- sendMessage: validation, blocking, optimistic updates
- markAsRead: batch updates, real-time sync

// Hooks
- useMessages: subscription, pagination, cache updates
- useTypingIndicator: debouncing, timeout, cleanup

// Transformers
- Message formatting, date grouping, link detection
```

### Integration Tests

```typescript
// End-to-end flows
- Send and receive messages
- Real-time updates across clients
- Community membership validation
- Block and report functionality
- Read receipts synchronization
- Typing indicators
```

### UX Testing

1. **Usability Testing**
   - Task completion rates
   - Time to send first message
   - Error recovery paths
   - Mobile gesture recognition

2. **Performance Testing**
   - Time to interactive (< 3s)
   - Message send latency (< 500ms)
   - Scroll performance (60fps)
   - Memory usage over time

3. **Accessibility Testing**
   - Screen reader navigation
   - Keyboard-only usage
   - Color contrast validation
   - Focus management

## Performance Considerations

### Database Optimization

- Indexes on frequently queried columns
- Partitioning for messages table (future)
- Cached unread counts
- Efficient pagination queries

### Frontend Optimization

- Virtual scrolling for long lists
- Message batching for bulk updates
- Debounced search and typing
- Lazy loading for user avatars
- Service worker for offline support

### Real-time Optimization

- Subscribe only to active conversation
- Batch presence updates
- Connection pooling
- Automatic reconnection with backoff

## Future E2E Encryption

### Migration Strategy

1. **Phase 1: Web Platform (Current)**
   - Server-side encryption at rest
   - Simple key management
   - Cross-device access

2. **Phase 2: Mobile App**
   - Generate keypair on install
   - Store in Keychain/Keystore
   - Exchange public keys per conversation
   - Implement Signal Protocol

3. **Phase 3: Web Compatibility**
   - Show encrypted messages as locked
   - Prompt to use mobile app
   - Optional: Web Crypto API support

### Database Preparation

```sql
-- Future tables for E2E
CREATE TABLE user_keys (
  user_id UUID REFERENCES profiles(id),
  device_id UUID,
  device_name TEXT,
  public_key TEXT,
  key_version INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, device_id)
);

CREATE TABLE conversation_keys (
  conversation_id UUID REFERENCES conversations(id),
  key_id UUID,
  encrypted_key TEXT, -- Per participant
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Implementation Notes

- Use Signal Protocol or Double Ratchet
- Forward secrecy with ephemeral keys
- Key rotation every 30 days
- Backup keys with recovery phrase
- Handle key exchange failures gracefully

## Implementation Timeline

### Week 1: Foundation
- Database schema and migrations
- Basic CRUD operations
- Conversation management

### Week 2: Real-time
- Supabase Realtime setup
- Message subscriptions
- Typing indicators
- Read receipts

### Week 3: React Integration
- All hooks implementation
- Basic UI components
- Conversation and message views

### Week 4: Polish & Safety
- Blocking functionality
- Message reporting
- Error handling
- Performance optimization
- Comprehensive testing

### Week 5: UX Refinement
- Animations and transitions
- Loading and error states
- Mobile optimizations
- Accessibility improvements

## Success Metrics

- Message delivery time < 500ms (p99)
- UI responsiveness < 100ms
- Zero message loss
- 99.9% uptime
- User satisfaction > 4.5/5

## Security Considerations

- All messages encrypted at rest
- RLS policies enforce access control
- Rate limiting prevents abuse
- Content moderation for reported messages
- Regular security audits
- GDPR compliance for data deletion

## Support & Maintenance

- Monitor error rates and performance
- Regular database maintenance
- Update dependencies monthly
- User feedback integration
- Progressive feature rollout
- A/B testing for UX improvements