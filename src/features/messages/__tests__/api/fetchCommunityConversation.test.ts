import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCommunityConversation } from '../../api/fetchCommunityConversation';
import { createMockSupabase } from '@/test-utils/supabase-mocks';
import type { CommunityConversation } from '../../types/conversation';

describe('fetchCommunityConversation', () => {
  const mockSupabase = createMockSupabase();
  const mockCommunityId = 'community-123';
  const mockConversationId = 'conversation-456';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth.getUser to return authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { 
        user: { id: 'user-789' } 
      },
      error: null
    } as any);
  });

  it('should fetch community conversation successfully', async () => {
    const mockConversationRow = {
      id: mockConversationId,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      last_message_at: '2024-01-01T12:00:00Z',
      last_message_preview: 'Welcome to the community!',
      last_message_sender_id: 'user-123',
      community_id: mockCommunityId,
      conversation_type: 'community'
    };

    const mockParticipantData = {
      last_read_at: '2024-01-01T11:00:00Z',
      unread_count: 5
    };

    // Mock the conversation query
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockConversationRow,
              error: null
            })
          })
        })
      })
    });

    // Mock participant count query
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: 10,
          error: null
        })
      })
    });

    // Mock current user participant data query  
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockParticipantData,
              error: null
            })
          })
        })
      })
    });

    const result = await fetchCommunityConversation(mockSupabase, mockCommunityId);

    expect(result).toEqual<CommunityConversation>({
      id: mockConversationId,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      lastMessageAt: new Date('2024-01-01T12:00:00Z'),
      lastMessagePreview: 'Welcome to the community!',
      lastMessageSenderId: 'user-123',
      communityId: mockCommunityId,
      conversationType: 'community',
      unreadCount: 5,
      lastReadAt: new Date('2024-01-01T11:00:00Z'),
      participantCount: 10
    });
  });

  it('should return null when no conversation exists for community', async () => {
    // Mock the conversation query to return no data
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows found' }
            })
          })
        })
      })
    });

    const result = await fetchCommunityConversation(mockSupabase, mockCommunityId);
    expect(result).toBeNull();
  });

  it('should throw error when conversation query fails', async () => {
    const mockError = new Error('Database error');

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError
            })
          })
        })
      })
    });

    await expect(fetchCommunityConversation(mockSupabase, mockCommunityId))
      .rejects.toThrow('Database error');
  });

  it('should throw error when user is not authenticated', async () => {
    const mockConversationRow = {
      id: mockConversationId,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      last_message_at: null,
      last_message_preview: null,
      last_message_sender_id: null,
      community_id: mockCommunityId,
      conversation_type: 'community'
    };

    // Mock successful conversation query
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockConversationRow,
              error: null
            })
          })
        })
      })
    });

    // Mock successful participant count query
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: 5,
          error: null
        })
      })
    });

    // Mock auth.getUser to return no user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    } as any);

    await expect(fetchCommunityConversation(mockSupabase, mockCommunityId))
      .rejects.toThrow('User not authenticated');
  });
});