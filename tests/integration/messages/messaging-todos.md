# Messaging System Integration Tests - TODO List

## Overview

This document outlines all tasks required to implement comprehensive integration tests for the Belong Network messaging system. The tests will validate the complete 1x1 messaging functionality including conversations, messages, blocking, reporting, read status, and real-time features.

### Testing Strategy
- Use local Supabase test database
- Create isolated test data with TEST_PREFIX
- Clean up all test data after completion
- Test both happy paths and error conditions
- Validate database state, not just API responses

### Key Principles
- Creating a test user automatically signs them in
- Users must share a community to message
- Only create User B when needed for interaction
- Use `cleanupAllTestData()` for cleanup
- Don't validate exact error messages, just verify operations fail

---

## Test Files Checklist

- [ ] **conversations-crud.test.ts** - Basic conversation CRUD operations
- [ ] **messages-crud.test.ts** - Message sending, editing, deletion
- [ ] **messages-permissions.test.ts** - Authorization and RLS policies  
- [ ] **messages-blocking.test.ts** - User blocking functionality
- [ ] **messages-read-status.test.ts** - Read receipts and unread counts
- [ ] **messages-reporting.test.ts** - Message reporting system
- [ ] **messages-realtime.test.ts** - Real-time subscriptions and updates
- [ ] **messaging-helpers.ts** - Shared test utilities

---

## Detailed Tasks

### 1. Helper Functions (`messaging-helpers.ts`)

#### Setup Helpers
- [ ] `createTestConversation(supabase, userBId)` - Uses get_or_create_conversation RPC
- [ ] `setupMessagingUsers(supabase)` - Creates two users in same community
- [ ] `sendTestMessage(supabase, conversationId, content)` - Wrapper for sendMessage
- [ ] `blockTestUser(supabase, blockedId)` - Wrapper for blockUser
- [ ] `reportTestMessage(supabase, messageId, reason)` - Wrapper for reportMessage

#### Validation Helpers
- [ ] `assertConversationExists(supabase, conversationId)` - Verify conversation in DB
- [ ] `assertMessageDelivered(supabase, messageId, userId)` - Check message_status
- [ ] `assertUnreadCount(supabase, conversationId, userId, expectedCount)` - Validate unread count

---

### 2. Conversations CRUD (`conversations-crud.test.ts`)

#### Basic Operations
- [ ] Create conversation between two users in same community
- [ ] Get existing conversation (idempotent operation)
- [ ] Fetch user's conversation list
- [ ] Fetch single conversation details
- [ ] Validate conversation has exactly 2 participants

#### Pagination
- [ ] Test conversation list pagination with limit
- [ ] Test cursor-based pagination
- [ ] Verify conversations ordered by last_message_at DESC

#### Edge Cases
- [ ] Cannot create conversation with yourself
- [ ] Cannot create conversation without shared community
- [ ] Handle non-existent user ID
- [ ] Empty conversation list for new user

---

### 3. Messages CRUD (`messages-crud.test.ts`)

#### Sending Messages
- [ ] Send text message in conversation
- [ ] Send multiple messages in sequence
- [ ] Verify message order (newest last)
- [ ] Test message content with unicode/emoji
- [ ] Test very long messages (>1000 chars)

#### Fetching Messages
- [ ] Fetch message history
- [ ] Test pagination with limit (default 50)
- [ ] Test cursor-based pagination
- [ ] Verify messages include sender profile info
- [ ] Test empty conversation

#### Editing Messages
- [ ] Edit own message
- [ ] Cannot edit other user's message
- [ ] is_edited flag updates correctly
- [ ] updated_at timestamp changes

#### Deleting Messages
- [ ] Soft delete own message
- [ ] Cannot delete other user's message
- [ ] is_deleted flag updates correctly
- [ ] Message content preserved but marked deleted

#### Conversation Updates
- [ ] last_message_at updates on new message
- [ ] last_message_preview updates correctly
- [ ] last_message_sender_id tracks correctly

---

### 4. Permissions & Authorization (`messages-permissions.test.ts`)

#### RLS Policies - Conversations
- [ ] Users can only view their own conversations
- [ ] Non-participants cannot access conversation
- [ ] Cannot fetch messages for unauthorized conversation

#### RLS Policies - Messages
- [ ] Only participants can send messages
- [ ] Only participants can view messages
- [ ] sender_id must match authenticated user
- [ ] Cannot send message to non-existent conversation

#### Community Requirements
- [ ] Users must share community to start conversation
- [ ] Error when users don't share community
- [ ] Multiple shared communities allowed
- [ ] Handle user leaving shared community

#### Self-Messaging Prevention
- [ ] Cannot create conversation with self
- [ ] get_or_create_conversation fails for same user

---

### 5. Blocking System (`messages-blocking.test.ts`)

#### Block Operations
- [ ] Block a user successfully
- [ ] Cannot block yourself
- [ ] Cannot block same user twice
- [ ] Blocked user appears in blocked list

#### Messaging Restrictions
- [ ] Cannot send message to blocked user
- [ ] Cannot receive message from blocked user
- [ ] Cannot start new conversation when blocked
- [ ] Existing conversation still visible but inactive

#### Unblock Operations
- [ ] Unblock a user successfully
- [ ] Can message after unblocking
- [ ] Can start new conversation after unblock

#### Bidirectional Blocking
- [ ] User A blocks User B - both cannot message
- [ ] User B cannot bypass block from their side

---

### 6. Read Status & Receipts (`messages-read-status.test.ts`)

#### Mark as Read
- [ ] Mark single message as read
- [ ] Batch mark messages as read using mark_messages_as_read
- [ ] read_at timestamp updates in message_status
- [ ] Only recipient can mark as read

#### Unread Count Management
- [ ] unread_count increments on new message
- [ ] unread_count resets to 0 when marked read
- [ ] unread_count in conversation_participants syncs
- [ ] Correct count with multiple unread messages

#### Last Read Tracking
- [ ] last_read_at updates in conversation_participants
- [ ] Tracks per-user read status independently
- [ ] Persists across sessions

#### Delivery Status
- [ ] delivered_at populated on message creation
- [ ] Message status created for recipient
- [ ] Sender doesn't get message_status record

---

### 7. Reporting System (`messages-reporting.test.ts`)

#### Report Creation
- [ ] Report message as spam
- [ ] Report message as harassment  
- [ ] Report message as inappropriate
- [ ] Report with 'other' reason and details
- [ ] Report includes reporter_id automatically

#### Report Validation
- [ ] Cannot report same message twice by same user
- [ ] Different users can report same message
- [ ] Cannot report own message
- [ ] Report status defaults to 'pending'

#### Report Management
- [ ] Fetch pending reports (status filter)
- [ ] Update report status to 'reviewed'
- [ ] Update report status to 'resolved'
- [ ] Track reviewed_by and reviewed_at

---

### 8. Real-time Features (`messages-realtime.test.ts`)

#### Message Subscriptions
- [ ] Subscribe to conversation channel
- [ ] Receive new messages in real-time
- [ ] Handle INSERT events for messages table
- [ ] Unsubscribe and cleanup properly

#### Typing Indicators
- [ ] Send typing indicator via broadcast
- [ ] Receive typing indicator from other user
- [ ] Typing indicator includes userId and timestamp
- [ ] Clear typing indicator after timeout

#### Presence/Online Status
- [ ] Track user presence in conversation
- [ ] Handle connection/disconnection
- [ ] Presence updates across clients

#### Error Handling
- [ ] Handle connection loss gracefully
- [ ] Reconnection logic works
- [ ] Duplicate subscription prevention
- [ ] Channel cleanup on error

---

## Test Scenarios Matrix

### Happy Path Scenarios
| Scenario | Test File | Status |
|----------|-----------|--------|
| Two users in same community exchange messages | messages-crud.test.ts | ⏳ |
| User reads messages and count updates | messages-read-status.test.ts | ⏳ |
| Real-time message appears instantly | messages-realtime.test.ts | ⏳ |
| Conversation list shows latest message | conversations-crud.test.ts | ⏳ |
| User blocks harasser successfully | messages-blocking.test.ts | ⏳ |

### Edge Cases
| Scenario | Test File | Status |
|----------|-----------|--------|
| Empty conversation (no messages) | messages-crud.test.ts | ⏳ |
| Very long message (>1000 chars) | messages-crud.test.ts | ⏳ |
| Unicode and emoji in messages | messages-crud.test.ts | ⏳ |
| Rapid message sending | messages-crud.test.ts | ⏳ |
| User leaves shared community | messages-permissions.test.ts | ⏳ |

### Error Conditions
| Scenario | Test File | Status |
|----------|-----------|--------|
| Message without shared community | messages-permissions.test.ts | ⏳ |
| Message to non-existent conversation | messages-permissions.test.ts | ⏳ |
| Edit another user's message | messages-crud.test.ts | ⏳ |
| Report same message twice | messages-reporting.test.ts | ⏳ |
| Message while blocked | messages-blocking.test.ts | ⏳ |

---

## Implementation Order

### Phase 1: Foundation
1. Create messaging-helpers.ts with basic utilities
2. Implement conversations-crud.test.ts
3. Implement messages-crud.test.ts

### Phase 2: Security & Permissions  
4. Implement messages-permissions.test.ts
5. Implement messages-blocking.test.ts

### Phase 3: Features
6. Implement messages-read-status.test.ts
7. Implement messages-reporting.test.ts

### Phase 4: Real-time
8. Implement messages-realtime.test.ts
9. Integration testing across all features

---

## Coverage Tracking

### API Functions to Test
- [x] `startConversation` - via get_or_create_conversation
- [ ] `fetchConversations`
- [ ] `fetchConversation` 
- [ ] `fetchMessages`
- [ ] `sendMessage`
- [ ] `deleteMessage`
- [ ] `markAsRead`
- [ ] `blockUser`
- [ ] `unblockUser`
- [ ] `reportMessage`

### Database Functions to Test
- [ ] `users_share_community(user1_id, user2_id)`
- [ ] `get_or_create_conversation(other_user_id)`
- [ ] `mark_messages_as_read(p_conversation_id)`
- [ ] `validate_conversation_participants()` trigger
- [ ] `update_conversation_on_message()` trigger
- [ ] `update_message_status_on_insert()` trigger
- [ ] `increment_unread_count()` trigger

### RLS Policies to Validate
- [ ] Conversations - Users can view their conversations
- [ ] Messages - Participants can view messages
- [ ] Messages - Participants can send messages
- [ ] Message Status - Recipients can update read status
- [ ] Blocked Users - Users manage their block list
- [ ] Reports - Users can report messages

---

## Testing Guidelines

### User Creation Pattern
```typescript
// User A created first (auto-signed in)
const userA = await createTestUser(supabase);
const community = await createTestCommunity(supabase);

// User A actions...

// Only create User B when needed
const userB = await createTestUser(supabase); // Now signed in as User B
await joinCommunity(supabase, community.id);

// User B actions...
```

### Cleanup Strategy
- Use `cleanupAllTestData()` in afterAll
- No need for manual cleanup per test
- Test data identified by TEST_PREFIX

### Error Validation
```typescript
// Just verify failure, not specific message
await expect(operation()).rejects.toThrow();
```

### Real-time Testing
- Set up actual Supabase Realtime subscriptions
- Test actual message delivery via channels
- Clean up subscriptions properly
- Use timeouts for async operations

---

## Notes & Considerations

- Community membership is checked via `community_memberships` table with status='active'
- Conversations limited to exactly 2 participants (enforced by trigger)
- Messages use soft delete (is_deleted flag)
- All timestamps use TIMESTAMPTZ
- Message content limited by TEXT type (no hard limit)
- Encryption version field reserved for future E2E encryption
- Rate limiting not enforced at database level (handle in API)

---

## Progress Tracking

**Status Legend:**
- ⏳ Pending
- 🚧 In Progress  
- ✅ Complete
- ❌ Blocked

**Overall Progress:** 0/8 test files complete

Last Updated: [Current Date]