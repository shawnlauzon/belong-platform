import { supabase } from '@/lib/supabase';
import { mockThanks, mockMembers, mockResources } from '@/api/mockData';
import { eventBus } from '@/core/eventBus';
import { Thanks } from '@/types';
import { TrustCalculator } from '@/features/trust/TrustCalculator';

export class ThanksManager {
  static async getThanksFeed(communityId: string): Promise<Thanks[]> {
    try {
      // In a real implementation, we would use Supabase for this
      // For the MVP, we'll use mock data
      
      // Return sorted by date
      return [...mockThanks].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.error('Error getting thanks feed:', error);
      return [];
    }
  }
  
  static async createThanks(thanksData: Partial<Thanks>): Promise<Thanks | null> {
    try {
      // In a real implementation, we would use Supabase for this
      // For the MVP, we'll use mock data and generate an ID
      
      // Get the member and resource data
      const fromMember = mockMembers.find(m => m.id === thanksData.from_member_id);
      const toMember = mockMembers.find(m => m.id === thanksData.to_member_id);
      const resource = mockResources.find(r => r.id === thanksData.resource_id);
      
      if (!fromMember || !toMember || !resource) {
        throw new Error('Invalid member or resource data');
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
        // Recalculate trust score
        const newScore = await TrustCalculator.calculateScore(toMember.id);
        
        // Update the mock data (in a real app, this would be a DB update)
        const memberIndex = mockMembers.findIndex(m => m.id === toMember.id);
        if (memberIndex !== -1) {
          mockMembers[memberIndex].trust_score = newScore;
        }
        
        // Emit trust updated event
        eventBus.emit('trust.updated', {
          memberId: toMember.id,
          newScore
        });
      }
      
      // Emit thanks created event
      eventBus.emit('thanks.created', newThanks);
      
      return newThanks;
    } catch (error) {
      console.error('Error creating thanks:', error);
      return null;
    }
  }
  
  static async getThanksByMemberId(memberId: string): Promise<Thanks[]> {
    try {
      // In a real implementation, we would use Supabase for this
      // For the MVP, we'll use mock data
      
      return mockThanks.filter(
        t => t.from_member_id === memberId || t.to_member_id === memberId
      );
    } catch (error) {
      console.error('Error getting thanks by member ID:', error);
      return [];
    }
  }
}