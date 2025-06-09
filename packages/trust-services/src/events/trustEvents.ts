// In trustEvents.ts
import { eventBus, logger } from '@belongnetwork/core';
import { TrustCalculator } from '../services/TrustCalculator';

// Define the event type for better type safety
interface ThanksCreatedEvent {
  data: {
    to_member_id: string; // or number, depending on your ID type
    // Add other properties that the event might have
  };
}

export function initializeTrustEvents() {
  // Listen for thanks created (update trust scores)
  // eventBus.on('thanks.created', (event: AppEvent) => {
  //   if (event.type !== 'thanks.created') return;
  //   logger.debug('🙏 Thanks created, updating trust score:', {
  //     toMemberId: event.data.to_member_id,
  //   });
  //   try {
  //     // Update the recipient's trust score
  //     const newScore = await TrustCalculator.calculateScore(
  //       event.data.to_member_id
  //     );
  //     // Emit trust updated event with proper typing
  //     eventBus.emit('trust.updated', {
  //       memberId: event.data.to_member_id,
  //       newScore,
  //     });
  //     logger.info('✅ Trust score updated:', {
  //       memberId: event.data.to_member_id,
  //       newScore,
  //     });
  //   } catch (error) {
  //     logger.error('❌ Error updating trust score:', error);
  //   }
  // });
}
