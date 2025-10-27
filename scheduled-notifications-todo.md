# Scheduled Notifications Implementation TODO

## Overview

This document tracks the implementation of scheduled notifications for:
- **`resource.expiring`** - Notify resource owners when their resource deadline is approaching
- **`event.starting`** - Notify event owners and claimants when an event is about to start

These notifications require periodic background jobs to check for upcoming deadlines and events.

---

## Phase 1: Database Functions

### 1.1 Create `send_resource_expiring_notifications()` Function

**Purpose:** Find resources with approaching deadlines and send notifications to owners.

**Requirements:**
- Query resources where deadline is within 24 hours
- Only notify for resources with `status = 'scheduled'`
- Only send one notification per resource (use a flag or check existing notifications)
- Send `resource.expiring` notification type
- Include metadata: `{"resource_title": title, "deadline": deadline_at}`
- Call `create_notification_base()` for each resource owner

**Implementation Details:**
```sql
CREATE OR REPLACE FUNCTION send_resource_expiring_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resource_record RECORD;
  notification_count INTEGER := 0;
BEGIN
  -- Find resources expiring in 24 hours that haven't been notified
  FOR resource_record IN
    SELECT r.id, r.owner_id, r.title, r.deadline_at
    FROM resources r
    WHERE r.status = 'scheduled'
      AND r.deadline_at IS NOT NULL
      AND r.deadline_at > NOW()
      AND r.deadline_at <= NOW() + INTERVAL '24 hours'
      -- Ensure we haven't already sent this notification
      AND NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE type = 'resource.expiring'
          AND resource_id = r.id
          AND created_at > NOW() - INTERVAL '24 hours'
      )
  LOOP
    -- Create notification
    PERFORM create_notification_base(
      p_user_id := resource_record.owner_id,
      p_type := 'resource.expiring',
      p_actor_id := resource_record.owner_id, -- Self-notification
      p_resource_id := resource_record.id,
      p_metadata := jsonb_build_object(
        'resource_title', resource_record.title,
        'deadline', resource_record.deadline_at
      )
    );

    notification_count := notification_count + 1;
  END LOOP;

  RETURN notification_count;
END;
$$;
```

**Checklist:**
- [ ] Create function in migration
- [ ] Test with resources at various deadline intervals
- [ ] Verify only one notification sent per resource
- [ ] Verify push notification is triggered
- [ ] Document in CLAUDE.md

### 1.2 Create `send_event_starting_notifications()` Function

**Purpose:** Find events starting soon and notify owners and claimants.

**Requirements:**
- Query events where start time is within 24 hours OR 1 hour
- Only notify for events with `status = 'scheduled'`
- Send to event owner + all claimants with status `approved` or `going`
- Send `event.starting` notification type
- Include metadata: `{"resource_title": title, "start_time": start_at, "warning_hours": 24|1}`
- Use notification check to avoid duplicate notifications

**Implementation Details:**
```sql
CREATE OR REPLACE FUNCTION send_event_starting_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_record RECORD;
  claimant_record RECORD;
  notification_count INTEGER := 0;
  warning_hours INTEGER;
BEGIN
  -- Find events starting in 24 hours or 1 hour
  FOR event_record IN
    SELECT r.id, r.owner_id, r.title, r.start_at,
           CASE
             WHEN r.start_at > NOW() + INTERVAL '23 hours'
                  AND r.start_at <= NOW() + INTERVAL '24 hours'
             THEN 24
             WHEN r.start_at > NOW() + INTERVAL '59 minutes'
                  AND r.start_at <= NOW() + INTERVAL '1 hour'
             THEN 1
             ELSE NULL
           END as warning_hours
    FROM resources r
    WHERE r.type = 'event'
      AND r.status = 'scheduled'
      AND r.start_at IS NOT NULL
      AND (
        -- 24 hour warning
        (r.start_at > NOW() + INTERVAL '23 hours'
         AND r.start_at <= NOW() + INTERVAL '24 hours')
        OR
        -- 1 hour warning
        (r.start_at > NOW() + INTERVAL '59 minutes'
         AND r.start_at <= NOW() + INTERVAL '1 hour')
      )
  LOOP
    warning_hours := event_record.warning_hours;

    -- Notify event owner
    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE type = 'event.starting'
        AND resource_id = event_record.id
        AND user_id = event_record.owner_id
        AND metadata->>'warning_hours' = warning_hours::text
        AND created_at > NOW() - INTERVAL '2 hours'
    ) THEN
      PERFORM create_notification_base(
        p_user_id := event_record.owner_id,
        p_type := 'event.starting',
        p_actor_id := event_record.owner_id,
        p_resource_id := event_record.id,
        p_metadata := jsonb_build_object(
          'resource_title', event_record.title,
          'start_time', event_record.start_at,
          'warning_hours', warning_hours
        )
      );
      notification_count := notification_count + 1;
    END IF;

    -- Notify all active claimants
    FOR claimant_record IN
      SELECT DISTINCT claimant_id
      FROM resource_claims
      WHERE resource_id = event_record.id
        AND status IN ('approved', 'going')
        AND claimant_id != event_record.owner_id
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE type = 'event.starting'
          AND resource_id = event_record.id
          AND user_id = claimant_record.claimant_id
          AND metadata->>'warning_hours' = warning_hours::text
          AND created_at > NOW() - INTERVAL '2 hours'
      ) THEN
        PERFORM create_notification_base(
          p_user_id := claimant_record.claimant_id,
          p_type := 'event.starting',
          p_actor_id := event_record.owner_id,
          p_resource_id := event_record.id,
          p_metadata := jsonb_build_object(
            'resource_title', event_record.title,
            'start_time', event_record.start_at,
            'warning_hours', warning_hours
          )
        );
        notification_count := notification_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN notification_count;
END;
$$;
```

**Checklist:**
- [ ] Create function in migration
- [ ] Test with events at 24h, 1h, and other intervals
- [ ] Verify owner + claimants receive notifications
- [ ] Verify two separate notifications (24h and 1h warnings)
- [ ] Verify no duplicate notifications
- [ ] Verify push notification is triggered
- [ ] Document in CLAUDE.md

---

## Phase 2: Schedule with pg_cron

### 2.1 Install pg_cron Extension

**Requirements:**
- Enable pg_cron extension in Supabase
- Verify extension is available

**Checklist:**
- [ ] Add to migration: `CREATE EXTENSION IF NOT EXISTS pg_cron;`
- [ ] Verify extension loads successfully
- [ ] Check pg_cron is enabled in Supabase project

### 2.2 Create Scheduled Jobs

**Requirements:**
- Run `send_resource_expiring_notifications()` every hour
- Run `send_event_starting_notifications()` every 15 minutes (to catch 1h warnings)

**Implementation:**
```sql
-- Schedule resource expiring notifications (every hour)
SELECT cron.schedule(
  'send-resource-expiring-notifications',
  '0 * * * *', -- Every hour at minute 0
  $$SELECT send_resource_expiring_notifications()$$
);

-- Schedule event starting notifications (every 15 minutes)
SELECT cron.schedule(
  'send-event-starting-notifications',
  '*/15 * * * *', -- Every 15 minutes
  $$SELECT send_event_starting_notifications()$$
);
```

**Alternative: Supabase Edge Functions with Cron**

If pg_cron is not available in Supabase, use Supabase's built-in cron functionality:
1. Create Edge Functions for each job
2. Schedule via Supabase Dashboard or CLI

**Checklist:**
- [ ] Add cron jobs to migration
- [ ] Verify jobs are scheduled correctly
- [ ] Monitor job execution logs
- [ ] Test manual execution of functions
- [ ] Document scheduling approach in README

---

## Phase 3: Testing

### 3.1 Unit Tests (Database Functions)

**Test `send_resource_expiring_notifications()`:**
- [ ] Returns 0 when no resources expiring
- [ ] Sends notification for resource expiring in 23.5 hours
- [ ] Does NOT send for resource expiring in 25 hours
- [ ] Does NOT send for resource expiring in 1 hour
- [ ] Does NOT send duplicate notification if run twice
- [ ] Only sends to resource owner
- [ ] Includes correct metadata

**Test `send_event_starting_notifications()`:**
- [ ] Returns 0 when no events starting
- [ ] Sends 24h warning for event in 23.5 hours
- [ ] Sends 1h warning for event in 59 minutes
- [ ] Does NOT send for event starting in 2 hours
- [ ] Sends to owner + all claimants with status approved/going
- [ ] Does NOT send to rejected/cancelled claimants
- [ ] Sends both 24h and 1h warnings (two separate notifications)
- [ ] Does NOT send duplicate warnings
- [ ] Includes correct metadata

### 3.2 Integration Tests

**Test Full Flow:**
- [ ] Create resource with deadline in 23 hours
- [ ] Run scheduled function
- [ ] Verify notification created
- [ ] Verify push notification sent (if push enabled)

**Test Event Flow:**
- [ ] Create event starting in 23 hours with 2 claimants
- [ ] Run scheduled function
- [ ] Verify 3 notifications created (owner + 2 claimants)
- [ ] Wait until event is 59 minutes away
- [ ] Run scheduled function again
- [ ] Verify 3 more notifications created (second warning)

### 3.3 Manual Testing

**Checklist:**
- [ ] Create test resource expiring in 23 hours
- [ ] Manually call `SELECT send_resource_expiring_notifications()`
- [ ] Verify notification appears in app
- [ ] Verify push notification received (if subscribed)
- [ ] Create test event starting in 59 minutes
- [ ] Manually call `SELECT send_event_starting_notifications()`
- [ ] Verify notifications for owner and claimants

---

## Phase 4: Documentation

### 4.1 Update CLAUDE.md

**Add sections for:**
- [ ] Scheduled notification types (`resource.expiring`, `event.starting`)
- [ ] Timing windows (24h for resources, 24h + 1h for events)
- [ ] Who receives notifications (owners for resources, owners + claimants for events)
- [ ] Metadata structure for these notification types

### 4.2 Create README for Scheduled Jobs

**Document:**
- [ ] How scheduled notifications work
- [ ] Cron schedule configuration
- [ ] How to manually trigger jobs (for testing)
- [ ] How to monitor job execution
- [ ] How to disable scheduled notifications (if needed)

### 4.3 Update Migration Documentation

**Document:**
- [ ] pg_cron extension requirement
- [ ] How to verify cron jobs are running
- [ ] Alternative approaches if pg_cron unavailable

---

## Phase 5: Deployment

### 5.1 Pre-Deployment Checklist

- [ ] Verify pg_cron extension is enabled in Supabase
- [ ] Test functions on staging database
- [ ] Verify cron schedule syntax is correct
- [ ] Document rollback procedure

### 5.2 Deployment Steps

1. [ ] Run database migration (includes functions + cron jobs)
2. [ ] Verify cron jobs are scheduled: `SELECT * FROM cron.job;`
3. [ ] Monitor first execution: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
4. [ ] Test with real data (create expiring resource/event)
5. [ ] Verify notifications are created and delivered

### 5.3 Post-Deployment Monitoring

- [ ] Monitor cron job execution logs daily for first week
- [ ] Check for any failed executions
- [ ] Verify notification delivery rates
- [ ] Gather user feedback on notification timing

---

## Notes

### Design Decisions

**Why 24 hours for resources?**
- Gives users adequate time to respond to expiring resources
- Single notification avoids notification fatigue

**Why 24h + 1h for events?**
- 24h warning: Plan ahead (arrange transportation, adjust schedule)
- 1h warning: Final reminder (leave now, get ready)
- Two notifications appropriate for time-sensitive events

**Why every 15 minutes for event checking?**
- Ensures 1h warnings are sent within acceptable window (45-60 min before)
- Balance between timeliness and database load

### Alternative Approaches

**If pg_cron is not available:**
1. Use Supabase Edge Functions with built-in cron
2. Use external cron service (like GitHub Actions, AWS EventBridge)
3. Use application-level scheduling (Node.js cron, etc.)

**Notification deduplication strategy:**
- Check for existing notifications within time window
- Use metadata field `warning_hours` to distinguish 24h vs 1h warnings
- 2-hour window prevents duplicates even if jobs run multiple times

### Success Criteria

- [ ] Functions execute without errors
- [ ] Notifications are sent at correct times (within 5 minute window)
- [ ] No duplicate notifications
- [ ] Push notifications delivered successfully
- [ ] Users receive appropriate warnings for their resources/events
- [ ] Cron jobs run reliably without manual intervention

### Future Enhancements

- Configurable notification timing (user preferences for 24h, 12h, 6h, 1h)
- Timezone-aware notifications
- Snooze/dismiss functionality for warnings
- Reminder escalation for critical events
