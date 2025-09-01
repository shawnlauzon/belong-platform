# Resource Claim State Management System - Implementation Documentation

## Executive Summary

The Belong Platform uses a comprehensive state transition system for resource claims that enforces business rules at the database level. The system distinguishes between three resource types (offers, requests, events) with different state machines and role-based permissions, ensuring data integrity through database-level validation.

## Current System Architecture

### Entity Relationships

```
Resource (1) → (N) ResourceTimeslots (1) → (N) ResourceClaims
```

- **Resources**: Events, offers, or requests with a `requires_approval` flag
- **Timeslots**: Time-bounded availability windows for resources
- **Claims**: Individual user claims on timeslots with enforced state transitions

### Database Schema

#### Resource Types

- `offer` - User offering something to the community (owner gives to claimant)
- `request` - User requesting something from the community (claimant gives to owner)
- `event` - Scheduled gathering or activity

#### Claim Status Enum (Current Implementation)

- `pending` - Initial state for claims requiring approval
- `approved` - Claim has been approved (or initial state when no approval required)
- `rejected` - Claim has been rejected by resource owner
- `completed` - Transaction/event completed successfully (requires two-party confirmation)
- `cancelled` - Claim cancelled by claimant only
- `interested` - Initial state for events not requiring approval
- `given` - Resource has been given (by appropriate party based on type)
- `received` - Resource has been received (by appropriate party based on type)
- `going` - Event-specific: attendee confirmed they will attend
- `attended` - Event-specific: owner confirmed attendance
- `flaked` - Event-specific: no-show or failure to attend

## Implemented State Transition Rules

### Core Principles

1. **Role-Based Permissions**: Only specific roles can make certain transitions
2. **No State Skipping**: Cannot go directly from `approved` to `completed` - requires handshake
3. **Two-Party Confirmation**: Both parties must participate for completion (offers/requests)
4. **Type-Specific Rules**: Different state machines for offers, requests, and events
5. **Database Enforcement**: All rules enforced via database trigger `validate_claim_state_transition()`

### State Machines by Resource Type

#### OFFERS (Owner Giving to Claimant)

**Initial State Logic:**

- If `requires_approval = true` → `pending`
- If `requires_approval = false` → `approved`

**State Transitions:**
| From State | To State | Who Can Transition | Description |
|------------|----------|-------------------|-------------|
| pending | approved | Owner only | Owner approves the claim |
| pending | rejected | Owner only | Owner rejects the claim |
| approved | given | Owner only | Owner marks as given |
| approved | received | Claimant only | Claimant marks as received |
| given | completed | Claimant only | Claimant confirms receipt |
| received | completed | Owner only | Owner confirms handoff |
| Any (except rejected/completed) | cancelled | Claimant only | Claimant cancels |

**Key Rules:**

- Owner gives, claimant receives
- Both parties must confirm for completion
- Cannot skip from approved directly to completed

#### REQUESTS (Claimant Giving to Owner)

**Initial State Logic:**

- If `requires_approval = true` → `pending`
- If `requires_approval = false` → `approved`

**State Transitions:**
| From State | To State | Who Can Transition | Description |
|------------|----------|-------------------|-------------|
| pending | approved | Owner only | Owner approves fulfillment offer |
| pending | rejected | Owner only | Owner rejects fulfillment offer |
| approved | given | Claimant only | Claimant marks as given |
| approved | received | Owner only | Owner marks as received |
| given | completed | Owner only | Owner confirms receipt |
| received | completed | Claimant only | Claimant confirms handoff |
| Any (except rejected/completed) | cancelled | Claimant only | Claimant cancels |

**Key Rules:**

- Claimant gives, owner receives (inverse of offers)
- Both parties must confirm for completion
- Cannot skip from approved directly to completed

#### EVENTS

Resources vs Claims:

- Events (Resources) - The actual events themselves (e.g., "Community BBQ", "Book Club Meeting")
- Event Registrations (Claims) - Individual user registrations/claims for attending those events

**Initial State Logic:**

- If `requires_approval = true` → `pending`
- If `requires_approval = false` → `interested`

**State Transitions:**
| From State | To State | Who Can Transition | Description |
|------------|----------|-------------------|-------------|
| pending | interested | Owner only | Event owner approves registration |
| pending | rejected | Owner only | Event owner rejects registration |
| interested | going | Claimant only | Attendee confirms attendance |
| going | attended | Owner only | Event owner marks as attended |
| going | flaked | Owner only | Event owner marks as no-show |
| Any (except rejected/attended/flaked) | cancelled | Claimant only | Attendee cancels |

**Key Rules:**

- One-directional flow (no going back)
- Only owner can mark final attendance status
- Transition to attended / flaked can only happen after the event has completed
- Transition to cancelled can only happen before the event has completed

## Implementation Details

### Initial Status Determination

The initial status is determined automatically by the API based on:

```typescript
// In createResourceClaim API
let initialStatus: ResourceClaimStatus;
if (resource.type === 'event') {
  initialStatus = resource.requiresApproval ? 'pending' : 'interested';
} else {
  initialStatus = resource.requiresApproval ? 'pending' : 'approved';
}
```

### Database Validation Function

The `validate_claim_state_transition()` PostgreSQL function enforces all rules:

```sql
-- Key validation logic
-- 1. Determines user role (owner vs claimant)
-- 2. Checks resource type
-- 3. Validates transition based on state machine rules
-- 4. Returns clear error messages for violations

-- Example error messages:
-- "Only resource owner can approve or reject claims"
-- "Cannot skip to completed. Both parties must confirm the exchange (given/received) first."
-- "Event registrations cannot be cancelled. Please contact the event organizer."
```

### Trust Score Points System

Points are awarded based on state transitions:

#### Events

| Status     | Points | When Awarded                              |
| ---------- | ------ | ----------------------------------------- |
| interested | 5      | Initial registration (no approval needed) |
| approved   | 25     | When moving from pending to approved      |
| going      | 25     | When confirming attendance                |
| attended   | 50     | When marked as attended                   |

#### Offers/Requests

| Status    | Points | When Awarded                                   |
| --------- | ------ | ---------------------------------------------- |
| approved  | 25     | Initial claim (no approval needed) or approval |
| completed | 50     | When transaction completes                     |

## API Integration

### Type Changes

```typescript
// ResourceClaimInput no longer includes status
export type ResourceClaimInput = {
  resourceId: string;
  timeslotId: string;
  notes?: string;
  // status removed - determined by API
};
```

### Creating Claims

```typescript
// API automatically determines initial status
const claim = await createResourceClaim(supabase, {
  resourceId: 'xxx',
  timeslotId: 'yyy',
  notes: 'optional notes',
});
// Status will be set based on resource type and approval requirements
```

### Updating Claim Status

```typescript
// Database will validate transitions
try {
  await updateResourceClaim(supabase, {
    id: claimId,
    status: 'given',
  });
} catch (error) {
  // Database returns clear error messages
  // e.g., "Only resource owner can mark an offer as given"
}
```

## Error Handling

The database provides specific error messages for invalid transitions:

### Common Error Messages

- **Wrong Role**: "Only resource owner can approve or reject claims"
- **Invalid Transition**: "Approved offer claims can only transition to given or received"
- **Skipping States**: "Cannot skip to completed. Both parties must confirm the exchange"
- **Terminal States**: "Cannot transition from completed status"
- **Event Specific**: "Event registrations cannot be cancelled"

## Summary

The current implementation provides a robust, database-enforced state transition system that:

- Ensures data integrity through validation triggers
- Provides clear feedback through specific error messages
- Supports three distinct workflows for different resource types
- Requires appropriate participation from both parties
- Awards trust score points to incentivize participation
- Prevents invalid states through comprehensive validation

The system is designed to be maintainable, extensible, and provides a solid foundation for future enhancements while ensuring current operations are reliable and secure.
