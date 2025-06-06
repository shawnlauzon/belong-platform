import { supabase } from '@/lib/supabase';
import { mockMembers, mockThanks, mockResources } from '@/api/mockData';
import { logger, logApiCall, logApiResponse } from '@/lib/logger';

export class TrustCalculator {
  static async calculateScore(memberId: string): Promise<number> {
    logger.debug('🛡️ TrustCalculator: Calculating score for member:', { memberId });
    
    try {
      logApiCall('GET', `/trust/calculate/${memberId}`, { memberId });
      
      // In a real implementation, we would use Supabase for this
      // For the MVP, we'll use mock data
      
      // Get the member
      const member = mockMembers.find(m => m.id === memberId);
      if (!member) {
        logger.warn('🛡️ TrustCalculator: Member not found, returning default score');
        return 5.0; // Default score
      }
      
      // Get thanks received count
      const thanksReceived = mockThanks.filter(t => t.to_member_id === memberId).length;
      
      // Get resources shared count
      const resourcesShared = mockResources.filter(
        r => r.creator_id === memberId && r.type === 'offer'
      ).length;
      
      // Calculate tenure bonus (0.5 points per year, max 1.5)
      const tenureBonus = Math.min(member.community_tenure_months / 24, 1.5);
      
      // Calculate thanks bonus (0.2 points per thanks, max 3.0)
      const thanksBonus = Math.min(thanksReceived * 0.2, 3.0);
      
      // Calculate sharing bonus (0.1 points per resource, max 1.5)
      const sharingBonus = Math.min(resourcesShared * 0.1, 1.5);
      
      // Base score of 5.0 + bonuses, capped at 10.0
      const totalScore = Math.min(5.0 + tenureBonus + thanksBonus + sharingBonus, 10.0);
      const roundedScore = Math.round(totalScore * 10) / 10; // Round to 1 decimal place
      
      const scoreBreakdown = {
        baseScore: 5.0,
        tenureBonus,
        thanksBonus,
        sharingBonus,
        totalScore: roundedScore,
        thanksReceived,
        resourcesShared,
        tenureMonths: member.community_tenure_months
      };
      
      logApiResponse('GET', `/trust/calculate/${memberId}`, scoreBreakdown);
      logger.info('🛡️ TrustCalculator: Score calculated:', scoreBreakdown);
      
      return roundedScore;
    } catch (error) {
      logger.error('❌ TrustCalculator: Error calculating trust score:', error);
      logApiResponse('GET', `/trust/calculate/${memberId}`, null, error);
      return 5.0; // Default score
    }
  }
  
  static getTrustTier(score: number): 'New' | 'Building' | 'Established' | 'Exemplary' {
    logger.trace('🛡️ TrustCalculator: Getting trust tier for score:', { score });
    
    if (score < 4) return 'New';
    if (score < 6) return 'Building';
    if (score < 8) return 'Established';
    return 'Exemplary';
  }
  
  static async getBreakdown(memberId: string) {
    logger.debug('🛡️ TrustCalculator: Getting breakdown for member:', { memberId });
    
    try {
      logApiCall('GET', `/trust/breakdown/${memberId}`, { memberId });
      
      // Get the member
      const member = mockMembers.find(m => m.id === memberId);
      if (!member) {
        logger.warn('🛡️ TrustCalculator: Member not found for breakdown');
        return null;
      }
      
      // Get thanks received count
      const thanksReceived = mockThanks.filter(t => t.to_member_id === memberId).length;
      
      // Get resources shared count
      const resourcesShared = mockResources.filter(
        r => r.creator_id === memberId && r.type === 'offer'
      ).length;
      
      const breakdown = {
        thanksReceived,
        resourcesShared,
        tenureMonths: member.community_tenure_months,
        
        // Calculated contributions to score
        tenureContribution: Math.min(member.community_tenure_months / 24, 1.5),
        thanksContribution: Math.min(thanksReceived * 0.2, 3.0),
        sharingContribution: Math.min(resourcesShared * 0.1, 1.5),
        baseContribution: 5.0,
      };
      
      logApiResponse('GET', `/trust/breakdown/${memberId}`, breakdown);
      logger.debug('🛡️ TrustCalculator: Breakdown calculated:', breakdown);
      
      return breakdown;
    } catch (error) {
      logger.error('❌ TrustCalculator: Error getting trust breakdown:', error);
      logApiResponse('GET', `/trust/breakdown/${memberId}`, null, error);
      return null;
    }
  }
}