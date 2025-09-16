import type {
  SupabaseClient,
  RealtimeChannel,
  RealtimeChannelSendResponse,
} from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';

class ChannelManager {
  private channels = new WeakMap<
    SupabaseClient<Database>,
    Map<string, RealtimeChannel>
  >();

  // Internal channel naming
  private channelNames = {
    messagesByConversation: (conversationId: string) =>
      `conversation:${conversationId}:messages`,
    conversationsByUser: (userId: string) => `user:${userId}:conversations`,
  };

  // Get or create channel cache for a specific supabase instance
  private getChannelCache(
    supabase: SupabaseClient<Database>,
  ): Map<string, RealtimeChannel> {
    if (!this.channels.has(supabase)) {
      this.channels.set(supabase, new Map());
    }
    return this.channels.get(supabase)!;
  }

  // Get channel for messages - subscribes automatically if needed
  getMessagesChannel(
    supabase: SupabaseClient<Database>,
    conversationId: string,
  ): RealtimeChannel {
    const channelName =
      this.channelNames.messagesByConversation(conversationId);
    const channelCache = this.getChannelCache(supabase);

    // Return existing channel if already subscribed
    if (channelCache.has(channelName)) {
      return channelCache.get(channelName)!;
    }

    // Create and subscribe to new channel
    const channel = supabase.channel(channelName).subscribe();
    channelCache.set(channelName, channel);

    logger.debug('Subscribed to messages channel', channelName);

    return channel;
  }

  // Get channel for conversations - subscribes automatically if needed
  getConversationsChannel(
    supabase: SupabaseClient<Database>,
    userId: string,
  ): RealtimeChannel {
    const channelName = this.channelNames.conversationsByUser(userId);
    const channelCache = this.getChannelCache(supabase);

    if (channelCache.has(channelName)) {
      return channelCache.get(channelName)!;
    }

    const channel = supabase.channel(channelName).subscribe();
    channelCache.set(channelName, channel);

    logger.debug('Subscribed to conversations channel', channelName);

    return channel;
  }

  // Broadcast helper - gets channel and sends
  async broadcast(
    channel: RealtimeChannel,
    event: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload?: any,
  ): Promise<RealtimeChannelSendResponse> {
    // For now, just send the broadcast immediately
    // The channel manager ensures the channel is subscribed
    return channel.send({ type: 'broadcast', event, payload });
  }

  // Clean up specific channel for a supabase instance
  unsubscribe(supabase: SupabaseClient<Database>, channelName: string): void {
    const channelCache = this.getChannelCache(supabase);
    const channel = channelCache.get(channelName);
    if (channel) {
      channel.unsubscribe();
      channelCache.delete(channelName);
      logger.debug('Unsubscribed from channel', channelName);
    }
  }

  // Clean up all channels for a supabase instance
  unsubscribeAll(supabase: SupabaseClient<Database>): void {
    const channelCache = this.getChannelCache(supabase);
    channelCache.forEach((channel, channelName) => {
      channel.unsubscribe();
      logger.debug('Unsubscribed from channel', channelName);
    });
    channelCache.clear();
  }

  // Get channel count for debugging for a supabase instance
  getChannelCount(supabase: SupabaseClient<Database>): number {
    const channelCache = this.getChannelCache(supabase);
    return channelCache.size;
  }

  // Get all channel names for debugging for a supabase instance
  getChannelNames(supabase: SupabaseClient<Database>): string[] {
    const channelCache = this.getChannelCache(supabase);
    return Array.from(channelCache.keys());
  }
}

export const channelManager = new ChannelManager();
