# Unified Resources System Design Document

## Executive Summary

This document outlines the design for unifying the current resources and gatherings systems into a single, comprehensive resources system that supports both offers and requests with optional timeslots and claims management.

**Key Insight**: Gatherings are simply offers with one timeslot. By recognizing this pattern, we can create a unified system that handles:
- Multi-timeslot services (guitar lessons, workshops)
- Simple quantity-based offers (jam jars, tool lending)
- Event-style gatherings (community BBQ, meetings)
- Approval workflows and capacity management

## Problem Statement

### Current System Limitations

The platform currently has two separate but overlapping systems:

1. **Resources System**: Handles offers and requests for items/services
   - Basic offer/request categorization
   - Simple response system
   - No timeslot management
   - No sophisticated claims tracking

2. **Gatherings System**: Manages community events
   - Time-based events with RSVPs
   - Capacity management
   - Location handling
   - Mature API and hook system

### The Overlap Problem

Many use cases blur the line between resources and gatherings:
- "Free guitar lessons" - Is this an event or a service offer?
- "Cooking class for 8 people" - Event or educational service?
- "Tool lending Saturdays 9-12pm" - Resource sharing or recurring event?

This overlap creates:
- **Developer confusion**: Which system to use for new features?
- **User experience inconsistency**: Different interfaces for similar concepts
- **Code duplication**: Similar functionality in two systems
- **Maintenance burden**: Two systems to maintain and extend

## Design Philosophy

### Core Insight

**Gatherings are offers with one timeslot.**

This realization led to the unified approach:
- **Everything is a resource** (offer or request)
- **Timeslots are optional** (for time-based resources)
- **Claims unified RSVPs and resource claims** (same underlying mechanism)
- **UI differentiation, not data differentiation** (one model, multiple presentations)

### Design Principles

1. **Simplicity over Feature Richness**: Start with essential features, add complexity only when needed
2. **Backward Compatibility**: Existing resources and gatherings must continue working
3. **Unified API Surface**: One set of endpoints handles all resource types
4. **Flexible UI**: Data model supports multiple presentation styles
5. **Owner Control**: Resource owners have full control over availability and status

## Technical Specification

### Database Schema

#### Extended Resources Table

```sql
CREATE TABLE resources (
  -- Existing fields
  id uuid PRIMARY KEY,
  type enum ('offer', 'request'),
  title varchar NOT NULL,
  description text,
  category enum ('tools', 'skills', 'food', 'supplies', 'other', 'event'),
  owner_id uuid REFERENCES users(id),
  community_id uuid REFERENCES communities(id),
  image_urls text[],
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  
  -- New fields for unified system
  status enum ('open', 'completed', 'cancelled') DEFAULT 'open',
  max_claims integer, -- NULL = unlimited
  requires_approval boolean DEFAULT false,
  expires_at timestamp,
  location_name varchar,
  coordinates geometry -- PostGIS for spatial data
);
```

**Field Rationale**:
- `status`: Owner-controlled lifecycle (open/completed/cancelled)
- `max_claims`: Flexible capacity management
- `requires_approval`: Optional approval workflow
- `expires_at`: Time-based expiration for offers
- `location_name` + `coordinates`: Spatial features from gatherings

#### Resource Timeslots Table

```sql
CREATE TABLE resource_timeslots (
  id uuid PRIMARY KEY,
  resource_id uuid REFERENCES resources(id) ON DELETE CASCADE,
  start_time timestamp NOT NULL,
  end_time timestamp NOT NULL,
  max_claims integer DEFAULT 1,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

**Design Decisions**:
- **Optional timeslots**: Resources can exist without timeslots
- **Multiple timeslots per resource**: Enables recurring services
- **Individual capacity**: Each timeslot has its own capacity
- **Fixed times**: No negotiation, clear availability

#### Resource Claims Table

```sql
CREATE TABLE resource_claims (
  id uuid PRIMARY KEY,
  resource_id uuid REFERENCES resources(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  timeslot_id uuid REFERENCES resource_timeslots(id) ON DELETE CASCADE, -- nullable
  status enum ('pending', 'approved', 'rejected', 'completed', 'cancelled'),
  notes text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  
  -- Constraint: user can claim resource multiple times for different timeslots
  UNIQUE(resource_id, user_id, timeslot_id)
);
```

**Key Constraints**:
- **Unique constraint**: Prevents duplicate claims for same resource+user+timeslot
- **Allows multiple claims**: User can claim different timeslots of same resource
- **Nullable timeslot_id**: Supports non-timeslotted resources

### Status Definitions

#### Resource Status
- **`open`**: Resource is active and accepting claims/RSVPs
- **`completed`**: Resource was successfully finished
- **`cancelled`**: Resource was cancelled before completion

#### Claim Status
- **`pending`**: Claim submitted, awaiting approval (if required)
- **`approved`**: Claim accepted, resource allocated
- **`rejected`**: Claim denied by owner
- **`completed`**: Transaction/event completed successfully
- **`cancelled`**: Claim cancelled by claimer

### Business Logic Rules

1. **Capacity Management**:
   - For non-timeslotted resources: `COUNT(approved_claims) < max_claims`
   - For timeslotted resources: `COUNT(approved_claims_per_timeslot) < timeslot.max_claims`

2. **Approval Workflow**:
   - If `requires_approval = false`: Claims auto-approve
   - If `requires_approval = true`: Claims start as 'pending'

3. **Status Transitions**:
   - Only 'open' resources accept new claims
   - 'cancelled' resources auto-reject pending claims
   - 'completed' resources stop accepting claims

4. **Expiration**:
   - Expired resources (`expires_at < now()`) don't accept new claims
   - Existing claims remain valid

## Use Cases and Examples

### 1. Simple Quantity-Based Offers

```sql
-- "I have 5 jars of homemade jam"
INSERT INTO resources (type, title, max_claims, expires_at)
VALUES ('offer', 'Homemade jam jars', 5, '2024-01-20 23:59:59');

-- No timeslots created
-- Users claim directly against the resource
```

**User Flow**:
1. User sees "5 jars available" 
2. User claims one jar
3. System shows "4 jars available"
4. Owner marks 'completed' when all distributed

### 2. Multi-Timeslot Services

```sql
-- "Free guitar lessons - multiple times available"
INSERT INTO resources (type, title, requires_approval)
VALUES ('offer', 'Free guitar lessons', true);

-- Create multiple timeslots
INSERT INTO resource_timeslots (resource_id, start_time, end_time, max_claims)
VALUES 
  (resource_id, '2024-01-15 16:00', '2024-01-15 17:00', 1),
  (resource_id, '2024-01-17 16:00', '2024-01-17 17:00', 1),
  (resource_id, '2024-01-22 16:00', '2024-01-22 17:00', 1);
```

**User Flow**:
1. User sees available lesson times
2. User claims "Monday 4pm" slot
3. Claim goes to 'pending' (requires approval)
4. Teacher approves/rejects
5. If approved, user can also claim Wednesday slot

### 3. Event-Style Gatherings

```sql
-- "Community BBQ this Saturday"
INSERT INTO resources (type, title, max_claims, location_name, coordinates)
VALUES ('offer', 'Community BBQ', 50, 'Central Park Pavilion', ST_Point(-122.4, 37.8));

-- Single timeslot for the event
INSERT INTO resource_timeslots (resource_id, start_time, end_time, max_claims)
VALUES (resource_id, '2024-01-15 18:00', '2024-01-15 21:00', 50);
```

**User Flow**:
1. User sees "Community BBQ - 45 spots available"
2. User RSVPs (claims the timeslot)
3. System shows "44 spots available"
4. Event happens, owner marks 'completed'

### 4. Hybrid Workshop Series

```sql
-- "Cooking class series - 3 sessions, 8 people each"
INSERT INTO resources (type, title, max_claims, location_name)
VALUES ('offer', 'Italian Cooking Basics', NULL, 'Community Kitchen');

-- Three workshop sessions
INSERT INTO resource_timeslots (resource_id, start_time, end_time, max_claims)
VALUES 
  (resource_id, '2024-01-10 18:00', '2024-01-10 20:00', 8),
  (resource_id, '2024-01-17 18:00', '2024-01-17 20:00', 8),
  (resource_id, '2024-01-24 18:00', '2024-01-24 20:00', 8);
```

**User Flow**:
1. User sees three workshop dates
2. User can claim one, two, or all three sessions
3. Each session tracks its own capacity
4. Regular attendees build up over the series

### 5. Request with Fulfillment

```sql
-- "Looking for moving boxes"
INSERT INTO resources (type, title, max_claims)
VALUES ('request', 'Looking for moving boxes', 1);

-- Someone offers to fulfill
INSERT INTO resource_claims (resource_id, user_id, status)
VALUES (resource_id, helper_user_id, 'approved');
```

**User Flow**:
1. User posts request
2. Helper claims to fulfill
3. They coordinate exchange
4. Requester marks 'completed'

## Migration Strategy

### Phase 1: Extend Schema
1. Add new columns to existing resources table
2. Create resource_timeslots and resource_claims tables
3. Migrate existing resource_responses to resource_claims

### Phase 2: Convert Gatherings
1. Convert gathering records to resources with type='offer'
2. Create single timeslot for each gathering
3. Convert gathering_responses to resource_claims
4. Update gathering APIs to use unified system

### Phase 3: API Evolution
1. Extend existing resource APIs with new functionality
2. Create new timeslot and claim management endpoints
3. Update React Query hooks
4. Maintain backward compatibility

### Phase 4: Deprecation
1. Mark old gathering APIs as deprecated
2. Provide migration guide for consumers
3. Eventually remove old gathering system

## Implementation Roadmap

### Sprint 1: Foundation
- [ ] Database migration scripts
- [ ] Update TypeScript types
- [ ] Basic API functions for timeslots and claims
- [ ] Unit tests for core functionality

### Sprint 2: Resource Management
- [ ] Create/update/delete timeslots
- [ ] Capacity validation logic
- [ ] Status management (open/completed/cancelled)
- [ ] Expiration handling

### Sprint 3: Claims System
- [ ] Claim creation and management
- [ ] Approval workflow
- [ ] Status transitions
- [ ] Conflict resolution

### Sprint 4: Integration
- [ ] React Query hooks
- [ ] Gathering migration scripts
- [ ] End-to-end testing
- [ ] Performance optimization

### Sprint 5: Polish
- [ ] Error handling and edge cases
- [ ] Documentation updates
- [ ] Migration guide
- [ ] Monitoring and analytics

## Design Decisions Log

### Decision 1: Unified vs Separate Systems
**Options**: 
- A) Extend gatherings to support offers
- B) Extend resources to support timeslots
- C) Create new unified system

**Chosen**: B) Extend resources to support timeslots

**Rationale**: Resources already had the right conceptual foundation (offers/requests, ownership, categories). Gatherings were more specialized for events. Extending resources was more natural.

### Decision 2: Timeslot Model
**Options**:
- A) Embed timeslots in resources table
- B) Separate timeslots table
- C) Complex scheduling system

**Chosen**: B) Separate timeslots table

**Rationale**: Maintains flexibility for resources without timeslots, allows multiple timeslots per resource, keeps schema clean.

### Decision 3: Claims vs Responses
**Options**:
- A) Keep separate response types
- B) Unified claims system
- C) Complex state machine

**Chosen**: B) Unified claims system

**Rationale**: Same underlying mechanism (person wants resource), unified API surface, simpler to reason about.

### Decision 4: Approval Workflow
**Options**:
- A) Always require approval
- B) Never require approval
- C) Optional approval per resource

**Chosen**: C) Optional approval per resource

**Rationale**: Different use cases need different levels of control. Community events might auto-approve, while personal services might need approval.

### Decision 5: Status Terminology
**Options**:
- A) available/unavailable
- B) open/closed
- C) open/completed/cancelled

**Chosen**: C) open/completed/cancelled

**Rationale**: Distinguishes between successful completion and cancellation, important for events and offers.

### Decision 6: Multiple Claims per User
**Options**:
- A) One claim per user per resource
- B) One claim per user per timeslot
- C) Unlimited claims

**Chosen**: B) One claim per user per timeslot

**Rationale**: Enables series attendance (guitar lessons every Tuesday) while preventing duplicate claims for same timeslot.

## Future Considerations

### Potential Enhancements
1. **Recurring Timeslots**: Auto-generate weekly/monthly slots
2. **Waitlists**: Queue system for full resources
3. **Dependencies**: Prerequisites for claiming resources
4. **Negotiation**: Flexible timing and terms
5. **Partial Claims**: Claim portion of available quantity
6. **Analytics**: Success rates, popular times, etc.

### Scalability Considerations
1. **Indexing**: Optimize queries for large datasets
2. **Caching**: Cache capacity calculations
3. **Archiving**: Move old completed resources to archive
4. **Partitioning**: Split by community or date ranges

### Integration Points
1. **Notifications**: Alert users of status changes
2. **Messaging**: Enable communication between parties
3. **Calendar**: Export to personal calendars
4. **Payments**: Optional payment integration
5. **Reputation**: Track completion rates

## Conclusion

The unified resources system provides a flexible, scalable foundation for community sharing that handles both marketplace-style offers and event-style gatherings through a single, coherent data model. By recognizing that gatherings are simply offers with one timeslot, we create a system that's both powerful and intuitive.

The design prioritizes simplicity and owner control while maintaining the flexibility to support diverse community needs. The migration strategy ensures backward compatibility while providing a clear path to system unification.

This foundation enables rich sharing economy features while maintaining the simplicity and community focus that makes the platform valuable to users.