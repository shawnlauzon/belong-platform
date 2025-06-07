import { supabase } from '@/lib/supabase';
import { logger, logApiCall, logApiResponse } from '@/lib/logger';

export class TrustCalculator {
  static async calculateScore(memberId: string): Promise<number> {
    logger.debug('🛡️ TrustCalculator: Calculating score for member:', { memberId });
    
    try {
      logApiCall('GET', `/trust/calculate/${memberId}`, { memberId });
      
      // Get thanks received count from the database
      const { count: thanksReceived, error: thanksError } = await supabase
        .from('thanks')
        .select('*', { count: 'exact', head: true })
        .eq('to_user_id', memberId);

      if (thanksError) {
        logger.warn('🛡️ TrustCalculator: Error getting thanks count:', thanksError);
      }
      
      // Get resources shared count from the database
      const { count: resourcesShared, error: resourcesError } = await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', memberId)
        .eq('type', 'offer');

      if (resourcesError) {
        logger.warn('🛡️ TrustCalculator: Error getting resources count:', resourcesError);
      }

      // Get member tenure from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', memberId)
        .single();

      if (profileError) {
        logger.warn('🛡️ TrustCalculator: Error getting profile:', profileError);
      }

      // Calculate tenure in months
      const tenureMonths = profile?.created_at 
        ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
        : 0;
      
      // Calculate tenure bonus (0.5 points per year, max 1.5)
      const tenureBonus = Math.min(tenureMonths / 24, 1.5);
      
      // Calculate thanks bonus (0.2 points per thanks, max 3.0)
      const thanksBonus = Math.min((thanksReceived || 0) * 0.2, 3.0);
      
      // Calculate sharing bonus (0.1 points per resource, max 1.5)
      const sharingBonus = Math.min((resourcesShared || 0) * 0.1, 1.5);
      
      // Base score of 5.0 + bonuses, capped at 10.0
      const totalScore = Math.min(5.0 + tenureBonus + thanksBonus + sharingBonus, 10.0);
      const roundedScore = Math.round(totalScore * 10) / 10; // Round to 1 decimal place
      
      const scoreBreakdown = {
        baseScore: 5.0,
        tenureBonus,
        thanksBonus,
        sharingBonus,
        totalScore: roundedScore,
        thanksReceived: thanksReceived || 0,
        resourcesShared: resourcesShared || 0,
        tenureMonths
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
      
      // Get thanks received count from the database
      const { count: thanksReceived, error: thanksError } = await supabase
        .from('thanks')
        .select('*', { count: 'exact', head: true })
        .eq('to_user_id', memberId);

      if (thanksError) {
        logger.warn('🛡️ TrustCalculator: Error getting thanks count for breakdown:', thanksError);
      }
      
      // Get resources shared count from the database
      const { count: resourcesShared, error: resourcesError } = await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', memberId)
        .eq('type', 'offer');

      if (resourcesError) {
        logger.warn('🛡️ TrustCalculator: Error getting resources count for breakdown:', resourcesError);
      }

      // Get member tenure from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', memberId)
        .single();

      if (profileError) {
        logger.warn('🛡️ TrustCalculator: Error getting profile for breakdown:', profileError);
      }

      // Calculate tenure in months
      const tenureMonths = profile?.created_at 
        ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
        : 0;
      
      const breakdown = {
        thanksReceived: thanksReceived || 0,
        resourcesShared: resourcesShared || 0,
        tenureMonths,
        
        // Calculated contributions to score
        tenureContribution: Math.min(tenureMonths / 24, 1.5),
        thanksContribution: Math.min((thanksReceived || 0) * 0.2, 3.0),
        sharingContribution: Math.min((resourcesShared || 0) * 0.1, 1.5),
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