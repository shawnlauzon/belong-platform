import { eventBus, logger } from '@belongnetwork/core';
import { TrustCalculator } from '../services/TrustCalculator';

export function initializeTrustEvents() {
  // Listen for thanks created (update trust scores)
  eventBus.on('thanks.created', async (event) => {
    logger.debug('🙏 Thanks created, updating trust score:', {
      toMemberId: event.data.to_member_id,
    });

    try {
      // Update the recipient's trust score
      const newScore = await TrustCalculator.calculateScore(
        event.data.to_member_id
      );

      // Emit trust updated event
      eventBus.emit('trust.updated', {
        memberId: event.data.to_member_id,
        newScore,
      });

      logger.info('✅ Trust score updated:', {
        memberId: event.data.to_member_id,
        newScore,
      });
    } catch (error) {
      logger.error('❌ Error updating trust score:', error);
    }
  });
}
