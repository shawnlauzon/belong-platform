import { supabase } from '@/lib/supabase';
import { mockMembers, mockThanks, mockResources } from '@/api/mockData';

export class TrustCalculator {
  static async calculateScore(memberId: string): Promise<number> {
    try {
      // In a real implementation, we would use Supabase for this
      // For the MVP, we'll use mock data
      
      // Get the member
      const member = mockMembers.find(m => m.id === memberId);
      if (!member) return 5.0; // Default score
      
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
      
      return Math.round(totalScore * 10) / 10; // Round to 1 decimal place
    } catch (error) {
      console.error('Error calculating trust score:', error);
      return 5.0; // Default score
    }
  }
  
  static getTrustTier(score: number): 'New' | 'Building' | 'Established' | 'Exemplary' {
    if (score < 4) return 'New';
    if (score < 6) return 'Building';
    if (score < 8) return 'Established';
    return 'Exemplary';
  }
  
  static async getBreakdown(memberId: string) {
    try {
      // Get the member
      const member = mockMembers.find(m => m.id === memberId);
      if (!member) return null;
      
      // Get thanks received count
      const thanksReceived = mockThanks.filter(t => t.to_member_id === memberId).length;
      
      // Get resources shared count
      const resourcesShared = mockResources.filter(
        r => r.creator_id === memberId && r.type === 'offer'
      ).length;
      
      return {
        thanksReceived,
        resourcesShared,
        tenureMonths: member.community_tenure_months,
        
        // Calculated contributions to score
        tenureContribution: Math.min(member.community_tenure_months / 24, 1.5),
        thanksContribution: Math.min(thanksReceived * 0.2, 3.0),
        sharingContribution: Math.min(resourcesShared * 0.1, 1.5),
        baseContribution: 5.0,
      };
    } catch (error) {
      console.error('Error getting trust breakdown:', error);
      return null;
    }
  }
}