import { supabase } from '@/lib/supabase';
import { mockThanks, mockMembers, mockResources } from '@/api/mockData';
import { eventBus } from '@/core/eventBus';
import { Thanks } from '@/types';
import { TrustCalculator } from '@/features/trust/TrustCalculator';
import { logger, logApiCall, logApiResponse } from '@/lib/logger';

export class ThanksManager {
  static async getThanksFeed(communityId: string): Promise<Thanks[]> {
    logger.debug('🙏 ThanksManager: Getting thanks feed:', { communityId });
    
    try {
      logApiCall('GET', '/thanks', { communityId });
      
      // In a real implementation, we would use Supabase for this
      // For the MVP, we'll use mock data
      
      // Return sorted by date
      const sortedThanks = [...mockThanks].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      logApiResponse('GET', '/thanks', { count: sortedThanks.length });
      logger.info('🙏 ThanksManager: Thanks feed retrieved:', { count: sortedThanks.length });
      
      return sortedThanks;
    } catch (error) {
      logger.error('❌ ThanksManager: Error getting thanks feed:', error);
      logApiResponse('GET', '/thanks', null, error);
      return [];
    }
  }
  
  static async createThanks(thanksData: Partial<Thanks>): Promise<Thanks | null> {
    logger.debug('🙏 ThanksManager: Creating thanks:', thanksData);
    
    try {
      logApiCall('POST', '/thanks', thanksData);
      
      // In a real implementation, we would use Supabase for this
      // For the MVP, we'll use mock data and generate an ID
      
      // Get the member and resource data
      const fromMember = mockMembers.find(m => m.id === thanksData.from_member_id);
      const toMember = mockMembers.find(m => m.id === thanksData.to_member_id);
      const resource = mockResources.find(r => r.id === thanksData.resource_id);
      
      if (!fromMember || !toMember || !resource) {
        const error = 'Invalid member or resource data';
        logger.error('❌ ThanksManager: ' + error, { 
          hasFromMember: !!fromMember, 
          hasToMember: !!toMember, 
          hasResource: !!resource 
        });
        logApiResponse('POST', '/thanks', null, error);
        throw new Error(error);
      }
      
      const newThanks: Thanks = {
        id: `mock-${Date.now()}`,
        from_member_id: thanksData.from_member_id || '',
        from_member: fromMember,
        to_member_id: thanksData.to_member_id || '',
        to_member: toMember,
        resource_id: thanksData.resource_id || '',
        resource: resource,
        message: thanksData.message || '',
        image_urls: thanksData.image_urls || [],
        impact_description: thanksData.impact_description || '',
        created_at: new Date().toISOString(),
      };
      
      // Update the recipient's trust score
      if (toMember) {
        logger.debug('🙏 ThanksManager: Updating trust score for recipient:', { memberId: toMember.id });
        
        // Recalculate trust score
        const newScore = await TrustCalculator.calculateScore(toMember.id);
        
        // Update the mock data (in a real app, this would be a DB update)
        const memberIndex = mockMembers.findIndex(m => m.id === toMember.id);
        if (memberIndex !== -1) {
          mockMembers[memberIndex].trust_score = newScore;
          logger.debug('🙏 ThanksManager: Trust score updated in mock data:', { 
            memberId: toMember.id, 
            newScore 
          });
        }
        
        // Emit trust updated event
        eventBus.emit('trust.updated', {
          memberId: toMember.id,
          newScore
        });
      }
      
      // Emit thanks created event
      eventBus.emit('thanks.created', newThanks);
      
      logApiResponse('POST', '/thanks', { id: newThanks.id });
      logger.info('✅ ThanksManager: Thanks created:', { 
        id: newThanks.id, 
        fromMember: fromMember.name, 
        toMember: toMember.name 
      });
      
      return newThanks;
    } catch (error) {
      logger.error('❌ ThanksManager: Error creating thanks:', error);
      logApiResponse('POST', '/thanks', null, error);
      return null;
    }
  }
  
  static async getThanksByMemberId(memberId: string): Promise<Thanks[]> {
    logger.debug('🙏 ThanksManager: Getting thanks by member ID:', { memberId });
    
    try {
      logApiCall('GET', `/thanks/member/${memberId}`, { memberId });
      
      // In a real implementation, we would use Supabase for this
      // For the MVP, we'll use mock data
      
      const memberThanks = mockThanks.filter(
        t => t.from_member_id === memberId || t.to_member_id === memberId
      );
      
      logApiResponse('GET', `/thanks/member/${memberId}`, { count: memberThanks.length });
      logger.info('🙏 ThanksManager: Member thanks retrieved:', { 
        memberId, 
        count: memberThanks.length 
      });
      
      return memberThanks;
    } catch (error) {
      logger.error('❌ ThanksManager: Error getting thanks by member ID:', error);
      logApiResponse('GET', `/thanks/member/${memberId}`, null, error);
      return [];
    }
  }
}