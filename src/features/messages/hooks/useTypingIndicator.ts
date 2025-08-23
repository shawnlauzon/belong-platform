import { useEffect, useState, useCallback, useRef } from 'react';
import { useSupabase } from '../../../shared/hooks';
import { TypingIndicator } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseTypingIndicatorOptions {
  conversationId: string;
  debounceMs?: number;
  timeoutMs?: number;
}

export function useTypingIndicator({
  conversationId,
  debounceMs = 300,
  timeoutMs = 3000,
}: UseTypingIndicatorOptions) {
  const client = useSupabase();
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingIndicator>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);

  // Send typing indicator
  const sendTyping = useCallback(
    async (isTyping: boolean) => {
      if (!client || !channelRef.current) return;

      const now = Date.now();
      
      // Debounce typing events
      if (isTyping && now - lastTypingRef.current < debounceMs) {
        return;
      }
      
      lastTypingRef.current = now;

      const { data: userData } = await client.auth.getUser();
      if (!userData?.user) return;

      await channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: userData.user.id,
          isTyping,
          timestamp: now,
        },
      });

      // Auto-stop typing after timeout
      if (isTyping) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
          sendTyping(false);
        }, timeoutMs);
      } else {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    },
    [client, debounceMs, timeoutMs]
  );

  // Setup realtime subscription
  useEffect(() => {
    if (!client || !conversationId) return;

    const setupChannel = async () => {
      const { data: userData } = await client.auth.getUser();
      if (!userData?.user) return;

      const userId = userData.user.id;

      channelRef.current = client
        .channel(`conversation:${conversationId}:typing`, {
          config: {
            broadcast: {
              self: false, // Don't receive own typing events
            },
          },
        })
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          const indicator = payload as TypingIndicator;
          
          if (indicator.userId === userId) return; // Ignore own typing
          
          setTypingUsers((prev) => {
            const next = new Map(prev);
            
            if (indicator.isTyping) {
              next.set(indicator.userId, indicator);
              
              // Remove typing indicator after timeout
              setTimeout(() => {
                setTypingUsers((p) => {
                  const n = new Map(p);
                  const stored = n.get(indicator.userId);
                  
                  // Only remove if it's the same timestamp
                  if (stored?.timestamp === indicator.timestamp) {
                    n.delete(indicator.userId);
                  }
                  
                  return n;
                });
              }, timeoutMs + 1000); // Add buffer
            } else {
              next.delete(indicator.userId);
            }
            
            return next;
          });
        })
        .subscribe();
    };

    setupChannel();

    return () => {
      if (channelRef.current) {
        client.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      setTypingUsers(new Map());
    };
  }, [client, conversationId, timeoutMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Send stop typing when component unmounts
      sendTyping(false);
    };
  }, [sendTyping]);

  return {
    typingUsers: Array.from(typingUsers.values()),
    sendTyping,
    isAnyoneTyping: typingUsers.size > 0,
  };
}