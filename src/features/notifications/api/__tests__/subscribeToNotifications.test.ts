import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { subscribeToNotifications } from '../subscribeToNotifications';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

// Mock logger
vi.mock('@/shared', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('subscribeToNotifications retry logic', () => {
  let mockSupabase: SupabaseClient<Database>;
  let mockChannel: RealtimeChannel;
  let subscribeCallback: (status: string, error?: unknown) => void;

  beforeEach(() => {
    // Create mock channel with subscribe method
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        subscribeCallback = callback;
        return mockChannel;
      }),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    } as unknown as RealtimeChannel;

    // Create mock supabase client
    mockSupabase = {
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn(),
      realtime: {
        isConnected: vi.fn().mockReturnValue(true),
        connect: vi.fn(),
        connectionState: vi.fn().mockReturnValue('open'),
      },
    } as unknown as SupabaseClient<Database>;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should retry on CHANNEL_ERROR status', async () => {
    vi.useFakeTimers();
    
    const statusChanges: Array<{ status: string; error?: unknown }> = [];
    const onStatusChange = vi.fn((status: string, error?: unknown) => {
      statusChanges.push({ status, error });
    });

    // Create subscription with retry settings
    const subscriptionPromise = subscribeToNotifications(
      mockSupabase,
      'test-user-id',
      {
        onNotification: vi.fn(),
        onStatusChange,
      },
      {
        maxRetries: 3,
        retryDelayMs: 100,
      }
    );

    // Wait for initial subscription
    await subscriptionPromise;

    // Simulate CHANNEL_ERROR
    const testError = new Error('Channel connection failed');
    subscribeCallback('CHANNEL_ERROR', testError);

    // Fast-forward through retry delay
    await vi.advanceTimersByTimeAsync(100);

    // Verify retry was attempted
    expect(mockSupabase.channel).toHaveBeenCalledTimes(2); // Initial + 1 retry
    expect(onStatusChange).toHaveBeenCalledWith('CHANNEL_ERROR', testError);

    vi.useRealTimers();
  });

  it('should retry on TIMED_OUT status', async () => {
    vi.useFakeTimers();
    
    const statusChanges: Array<{ status: string; error?: unknown }> = [];
    const onStatusChange = vi.fn((status: string, error?: unknown) => {
      statusChanges.push({ status, error });
    });

    // Create subscription with retry settings
    const subscriptionPromise = subscribeToNotifications(
      mockSupabase,
      'test-user-id',
      {
        onNotification: vi.fn(),
        onStatusChange,
      },
      {
        maxRetries: 3,
        retryDelayMs: 100,
      }
    );

    await subscriptionPromise;

    // Simulate TIMED_OUT
    const timeoutError = new Error('Connection timed out');
    subscribeCallback('TIMED_OUT', timeoutError);

    // Fast-forward through retry delay
    await vi.advanceTimersByTimeAsync(100);

    // Verify retry was attempted
    expect(mockSupabase.channel).toHaveBeenCalledTimes(2); // Initial + 1 retry
    expect(onStatusChange).toHaveBeenCalledWith('TIMED_OUT', timeoutError);

    vi.useRealTimers();
  });

  it('should not retry on other error statuses', async () => {
    const statusChanges: Array<{ status: string; error?: unknown }> = [];
    const onStatusChange = vi.fn((status: string, error?: unknown) => {
      statusChanges.push({ status, error });
    });

    const subscriptionPromise = subscribeToNotifications(
      mockSupabase,
      'test-user-id',
      {
        onNotification: vi.fn(),
        onStatusChange,
      },
      {
        maxRetries: 3,
        retryDelayMs: 100,
      }
    );

    await subscriptionPromise;

    // Simulate other error status (should not retry)
    const otherError = new Error('Some other error');
    subscribeCallback('CLOSED', otherError);

    // Wait a bit to ensure no retry is attempted
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should not have retried
    expect(mockSupabase.channel).toHaveBeenCalledTimes(1); // Only initial call
    expect(onStatusChange).toHaveBeenCalledWith('CLOSED', otherError);
  });

  it('should stop retrying after max attempts', async () => {
    vi.useFakeTimers();
    
    const maxRetries = 2;
    const onStatusChange = vi.fn();

    const subscriptionPromise = subscribeToNotifications(
      mockSupabase,
      'test-user-id',
      {
        onNotification: vi.fn(),
        onStatusChange,
      },
      {
        maxRetries,
        retryDelayMs: 100,
      }
    );

    await subscriptionPromise;

    // Simulate multiple CHANNEL_ERROR events
    for (let i = 0; i <= maxRetries; i++) {
      const error = new Error(`Error attempt ${i + 1}`);
      subscribeCallback('CHANNEL_ERROR', error);
      
      if (i < maxRetries) {
        // Fast-forward through retry delay
        await vi.advanceTimersByTimeAsync(100);
      }
    }

    // Should have made initial + maxRetries attempts
    expect(mockSupabase.channel).toHaveBeenCalledTimes(1 + maxRetries);

    // Last error should not trigger another retry
    const finalError = new Error('Final error');
    subscribeCallback('CHANNEL_ERROR', finalError);
    
    await vi.advanceTimersByTimeAsync(200);
    
    // Should still be the same number of calls (no additional retry)
    expect(mockSupabase.channel).toHaveBeenCalledTimes(1 + maxRetries);

    vi.useRealTimers();
  });

  it('should reset retry count on successful SUBSCRIBED status', async () => {
    vi.useFakeTimers();
    
    const onStatusChange = vi.fn();

    const subscriptionPromise = subscribeToNotifications(
      mockSupabase,
      'test-user-id',
      {
        onNotification: vi.fn(),
        onStatusChange,
      },
      {
        maxRetries: 3,
        retryDelayMs: 100,
      }
    );

    await subscriptionPromise;

    // Simulate error, then success, then error again
    subscribeCallback('CHANNEL_ERROR', new Error('First error'));
    await vi.advanceTimersByTimeAsync(100);
    
    // Simulate successful subscription
    subscribeCallback('SUBSCRIBED');
    
    // Simulate another error (should retry again since count was reset)
    subscribeCallback('CHANNEL_ERROR', new Error('Second error'));
    await vi.advanceTimersByTimeAsync(100);

    // Should have made 3 channel calls: initial + retry1 + retry2
    expect(mockSupabase.channel).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });
});