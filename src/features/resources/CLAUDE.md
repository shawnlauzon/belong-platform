# Resources

Core resource sharing system enabling community members to create offers, requests, and events with time-based scheduling and claim workflows.

## Purpose

The resources feature enables community members to:
- Share items, services, or skills (offers)
- Request help or items from others (requests)
- Organize and attend community events

All resources support time-based availability through timeslots, claim/registration workflows with approval options, and two-party confirmation for completing exchanges.

## Key Entities

### Resource

The main entity representing an offer, request, or event.

**Key Fields:**
- `type` - `'offer'` | `'request'` | `'event'`
- `category` - Optional categorization (e.g., 'tools', 'food', 'skills')
- `title`, `description` - What's being shared
- `locationName`, `coordinates` - Where it happens
- `communityIds` - Which communities can see it (array)
- `imageUrls` - Visual representation (array)
- `status` - `'active'` | `'inactive'` | `'expired'`
- `claimLimit` - Maximum number of claims allowed
- `claimLimitPer` - `'total'` | `'timeslot'`
- `requiresApproval` - Whether claims need owner approval
- `areTimeslotsFlexible` - Whether timing is negotiable
- `isRecurring` - Whether resource repeats
- `lastRenewedAt`, `expiresAt` - Lifecycle management
- `ownerId` - User who created the resource
- `timeslots` - Array of ResourceTimeslot
- `commentCount` - Number of comments

### ResourceTimeslot

Time-based availability windows for resources.

**Key Fields:**
- `resourceId` - Parent resource
- `startTime`, `endTime` - When it's available
- `status` - `'available'` | `'claimed'` | `'completed'`

**Notes:**
- Resources can have multiple timeslots
- Flexible resources allow negotiation of timeslot details

### ResourceClaim

User registrations/claims on timeslots.

**Key Fields:**
- `resourceId`, `timeslotId` - What's being claimed
- `claimantId` - Who's claiming
- `resourceOwnerId` - Owner of the resource
- `status` - Current state in workflow
- `commitmentLevel` - `'interested'` | `'committed'` | `'none'` (separate from status)
- `notes` - Optional message to owner
- `timeslot` - Full timeslot object

**Notes:**
- `commitment_level` and `status` are separate fields
- `commitment_level` tracks how committed someone is (can be updated independently)
- `status` tracks position in the approval/completion workflow

## Core Concepts

### Resource Types

**Offers (Owner Gives to Claimant)**
- Owner has something to share with community
- Owner marks as `given`, claimant confirms by marking `completed`
- Examples: lending tools, sharing food, offering services

**Requests (Claimant Gives to Owner)**
- Owner needs something from community
- Claimant marks as `given`, owner confirms by marking `completed`
- Examples: asking for help, requesting items, seeking skills

**Events**
- Scheduled gatherings or activities
- Uses `going` status for attendance confirmation
- Owner marks final attendance as `attended` or `flaked`
- Examples: community BBQ, book club, workshops

### Claim Workflows

All resource types support optional approval:
- `requiresApproval: true` → Claims start as `pending`, must be approved by owner
- `requiresApproval: false` → Claims start as `approved`, automatically accepted

### Two-Party Completion

Offers and requests require both parties to participate:
- One party marks as `given` or `received`
- Other party confirms by transitioning to `completed`
- This prevents disputes and ensures mutual agreement

### Commitment Levels

Separate from status, commitment levels track attendee intent (primarily for events):
- `interested` - Registered but not firmly committed
- `committed` - Confirmed attendance
- `none` - No specific commitment level

Claimants can update their commitment level independently of status changes.

### Claim Limits

Resources can restrict how many claims are accepted:
- `claimLimitPer: 'total'` - Total limit across all timeslots
- `claimLimitPer: 'timeslot'` - Limit per individual timeslot

### Resource Lifecycle

- Resources automatically expire after inactivity
- `lastRenewedAt` tracks when owner last engaged
- `expiresAt` is calculated based on renewal
- Owners can manually renew to extend expiration

## State Machines

### Claim Status Enum

`pending` | `approved` | `rejected` | `completed` | `cancelled` | `given` | `received` | `going` | `attended` | `flaked`

### Initial Status

Determined automatically by API based on resource type and approval requirements:

```typescript
if (resource.requiresApproval) {
  initialStatus = 'pending';
} else {
  initialStatus = 'approved'; // applies to all types
}
```

### Offers (Owner Gives to Claimant)

| From | To | Who | Description |
|------|----|----|-------------|
| pending | approved | Owner | Owner approves claim |
| pending | rejected | Owner | Owner rejects claim |
| approved | given | Owner | Owner marks as given |
| approved | received | Claimant | Claimant marks as received |
| approved | cancelled | Claimant | Claimant cancels |
| given | completed | Claimant | Claimant confirms receipt |
| received | completed | Owner | Owner confirms handoff |

**Terminal States:** `rejected`, `completed`, `cancelled`

### Requests (Claimant Gives to Owner)

| From | To | Who | Description |
|------|----|----|-------------|
| pending | approved | Owner | Owner approves who will help |
| pending | rejected | Owner | Owner rejects offer to help |
| approved | given | Claimant | Claimant marks as given |
| approved | received | Owner | Owner marks as received |
| approved | cancelled | Claimant | Claimant cancels |
| given | completed | Owner | Owner confirms receipt |
| received | completed | Claimant | Claimant confirms handoff |

**Terminal States:** `rejected`, `completed`, `cancelled`

**Note:** Semantics are reversed from offers - claimant gives, owner receives.

### Events

| From | To | Who | Description |
|------|----|----|-------------|
| pending | approved | Owner | Owner approves registration |
| pending | rejected | Owner | Owner rejects registration |
| approved | going | Claimant | Attendee confirms they're going |
| approved | cancelled | Claimant | Attendee cancels registration |
| going | attended | Owner | Owner marks as attended |
| going | flaked | Owner | Owner marks as no-show |
| going | cancelled | Claimant | Attendee cancels before event |

**Terminal States:** `rejected`, `attended`, `flaked`, `cancelled`

**Key Differences:**
- Uses `going` status instead of `given`/`received`
- Can be cancelled from both `approved` and `going` states
- Owner controls final attendance status

## State Transition Rules

1. **Role-Based Permissions** - Only specific roles can make certain transitions
2. **No State Skipping** - Cannot go from `approved` directly to `completed`
3. **Terminal States** - Cannot transition from `rejected`, `completed`, `cancelled`, `attended`, or `flaked`
4. **Database Enforcement** - All rules enforced via `validate_claim_state_transition()` trigger
5. **Clear Error Messages** - Database returns specific messages for invalid transitions

## API Reference

### Resource Hooks
- `useResources(filter?)` - Query resources with optional filters
- `useResource(id)` - Get single resource by ID
- `useResourcesById(ids)` - Get multiple resources by IDs
- `useCreateResource()` - Create new resource
- `useUpdateResource()` - Update resource details
- `useDeleteResource()` - Delete resource
- `useRenewResource()` - Extend expiration date

### Timeslot Hooks
- `useResourceTimeslots(resourceId)` - Query timeslots for resource
- `useCreateResourceTimeslot()` - Add timeslot to resource
- `useUpdateResourceTimeslot()` - Update timeslot details
- `useDeleteResourceTimeslot()` - Remove timeslot

### Claim Hooks
- `useResourceClaims(filter)` - Query claims with filters
- `useCreateResourceClaim()` - Create claim/registration
- `useUpdateResourceClaim()` - Update claim status
- `useUpdateCommitmentLevel()` - Update commitment level independently

### Transformers
- `resourceTransformer` - DB row → Resource domain model (with timeslots and communities)
- `resourceTimeslotTransformer` - DB row → ResourceTimeslot
- `resourceClaimTransformer` - DB row → ResourceClaim (with timeslot details)

### Key Functions
- `fetchResources(supabase, filter?)` - Fetch resources with communities and timeslots
- `fetchResourceById(supabase, id)` - Fetch single resource
- `fetchResourceClaims(supabase, filter)` - Fetch claims with filters
- `fetchResourceTimeslots(supabase, resourceId)` - Fetch timeslots for resource
- `createResourceClaim(supabase, input)` - Create claim (determines initial status automatically)
- `updateResourceClaim(supabase, update)` - Update claim status (validates transitions)
- `updateCommitmentLevel(supabase, claimId, level)` - Update commitment level only

## Important Patterns

### Status vs Commitment Level

These are separate, independent fields:
- **status** - Where in the workflow (pending → approved → going → attended)
- **commitment_level** - How committed the person is (interested/committed/none)

Commitment level can be updated independently without changing status.

### Database Joins

Resources are typically fetched with related data:
```typescript
// Resources include communities and timeslots
SELECT_RESOURCES_JOIN_COMMUNITIES_JOIN_TIMESLOTS

// Claims include resource owner and timeslot details
SELECT_RESOURCE_CLAIMS_JOIN_RESOURCE_JOIN_TIMESLOT
```

### Automatic Initial Status

Creating a claim automatically determines the initial status based on:
1. Resource type (offer, request, or event)
2. Whether `requiresApproval` is true

The `status` field is not included in `ResourceClaimInput` - it's determined by the API.

### State Validation

State transitions are validated at the database level via triggers. Client code should:
- Handle validation errors gracefully
- Display clear error messages to users
- Use the specific error messages from the database

### Type Discrimination

Use resource type to determine appropriate workflow:
```typescript
if (resource.type === 'event') {
  // Use 'going' status and commitment levels
} else if (resource.type === 'offer') {
  // Owner gives, claimant receives
} else {
  // Owner receives, claimant gives (request)
}
```