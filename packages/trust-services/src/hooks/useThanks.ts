import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, Thanks } from '@belongnetwork/core';
import { logger, logApiCall, logApiResponse } from '@belongnetwork/core';

export function useThanks() {
  return useQuery({
    queryKey: ['thanks'],
    queryFn: async (): Promise<Thanks[]> => {
      logger.debug('🙏 useThanks: Fetching all thanks');
      logApiCall('GET', '/thanks');

      const { data: thanks, error } = await supabase
        .from('thanks')
        .select(
          `
          *,
          from_user:profiles!thanks_from_user_id_fkey1 (
            id,
            email,
            user_metadata
          ),
          to_user:profiles!thanks_to_user_id_fkey1 (
            id,
            email,
            user_metadata
          ),
          resource:resources!thanks_resource_id_fkey (
            id,
            title,
            type,
            category,
            description,
            image_urls,
            location,
            creator_id,
            creator:profiles!resources_creator_id_fkey (
              id,
              email,
              user_metadata
            )
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) {
        logApiResponse('GET', '/thanks', null, error);
        throw error;
      }

      if (!thanks) {
        logApiResponse('GET', '/thanks', []);
        return [];
      }

      // Transform the data to match our Thanks interface
      const transformedThanks: Thanks[] = thanks.map((thank) => {
        const fromUserMetadata = thank.from_user?.user_metadata || {};
        const toUserMetadata = thank.to_user?.user_metadata || {};
        const resourceOwnerMetadata =
          thank.resource?.creator?.user_metadata || {};

        return {
          id: thank.id,
          from_member_id: thank.from_user_id,
          from_member: thank.from_user
            ? {
                id: thank.from_user.id,
                name:
                  fromUserMetadata.full_name ||
                  thank.from_user.email?.split('@')[0] ||
                  'Anonymous',
                first_name: fromUserMetadata.first_name || '',
                last_name: fromUserMetadata.last_name || '',
                avatar_url: fromUserMetadata.avatar_url || null,
                trust_score: 5.0, // Default until we implement trust scoring
                location: fromUserMetadata.location || { lat: 0, lng: 0 },
                community_tenure_months: 0,
                thanks_received: 0,
                resources_shared: 0,
                created_at:
                  thank.from_user.created_at || new Date().toISOString(),
              }
            : undefined,
          to_member_id: thank.to_user_id,
          to_member: thank.to_user
            ? {
                id: thank.to_user.id,
                name:
                  toUserMetadata.full_name ||
                  thank.to_user.email?.split('@')[0] ||
                  'Anonymous',
                first_name: toUserMetadata.first_name || '',
                last_name: toUserMetadata.last_name || '',
                avatar_url: toUserMetadata.avatar_url || null,
                trust_score: 5.0, // Default until we implement trust scoring
                location: toUserMetadata.location || { lat: 0, lng: 0 },
                community_tenure_months: 0,
                thanks_received: 0,
                resources_shared: 0,
                created_at:
                  thank.to_user.created_at || new Date().toISOString(),
              }
            : undefined,
          resource_id: thank.resource_id,
          resource: thank.resource
            ? {
                id: thank.resource.id,
                creator_id: thank.resource.creator_id,
                type: thank.resource.type,
                category: thank.resource.category,
                title: thank.resource.title,
                description: thank.resource.description,
                image_urls: thank.resource.image_urls || [],
                location: thank.resource.location
                  ? {
                      lat: thank.resource.location.coordinates[1],
                      lng: thank.resource.location.coordinates[0],
                    }
                  : { lat: 0, lng: 0 },
                pickup_instructions: '',
                parking_info: '',
                meetup_flexibility: 'home_only',
                availability: '',
                is_active: true,
                times_helped: 0,
                created_at:
                  thank.resource.created_at || new Date().toISOString(),
                owner: thank.resource.creator
                  ? {
                      id: thank.resource.creator.id,
                      name:
                        resourceOwnerMetadata.full_name ||
                        thank.resource.creator.email?.split('@')[0] ||
                        'Anonymous',
                      first_name: resourceOwnerMetadata.first_name || '',
                      last_name: resourceOwnerMetadata.last_name || '',
                      avatar_url: resourceOwnerMetadata.avatar_url || null,
                      trust_score: 5.0,
                      location: resourceOwnerMetadata.location || {
                        lat: 0,
                        lng: 0,
                      },
                      community_tenure_months: 0,
                      thanks_received: 0,
                      resources_shared: 0,
                      created_at:
                        thank.resource.creator.created_at ||
                        new Date().toISOString(),
                    }
                  : undefined,
              }
            : undefined,
          message: thank.message,
          image_urls: thank.image_urls || [],
          impact_description: thank.impact_description || '',
          created_at: thank.created_at,
        };
      });

      logApiResponse('GET', '/thanks', { count: transformedThanks.length });
      logger.info('🙏 useThanks: Thanks fetched successfully:', {
        count: transformedThanks.length,
      });

      return transformedThanks;
    },
  });
}

export function useThanksByMember(memberId: string) {
  return useQuery({
    queryKey: ['thanks', 'member', memberId],
    queryFn: async (): Promise<Thanks[]> => {
      logger.debug('🙏 useThanksByMember: Fetching thanks for member:', {
        memberId,
      });
      logApiCall('GET', `/thanks/member/${memberId}`);

      const { data: thanks, error } = await supabase
        .from('thanks')
        .select(
          `
          *,
          from_user:profiles!thanks_from_user_id_fkey1 (
            id,
            email,
            user_metadata
          ),
          to_user:profiles!thanks_to_user_id_fkey1 (
            id,
            email,
            user_metadata
          ),
          resource:resources!thanks_resource_id_fkey (
            id,
            title,
            type,
            category,
            description,
            image_urls,
            location,
            creator_id,
            creator:profiles!resources_creator_id_fkey (
              id,
              email,
              user_metadata
            )
          )
        `
        )
        .or(`from_user_id.eq.${memberId},to_user_id.eq.${memberId}`)
        .order('created_at', { ascending: false });

      if (error) {
        logApiResponse('GET', `/thanks/member/${memberId}`, null, error);
        throw error;
      }

      if (!thanks) {
        logApiResponse('GET', `/thanks/member/${memberId}`, []);
        return [];
      }

      // Transform the data (same logic as above)
      const transformedThanks: Thanks[] = thanks.map((thank) => {
        const fromUserMetadata = thank.from_user?.user_metadata || {};
        const toUserMetadata = thank.to_user?.user_metadata || {};
        const resourceOwnerMetadata =
          thank.resource?.creator?.user_metadata || {};

        return {
          id: thank.id,
          from_member_id: thank.from_user_id,
          from_member: thank.from_user
            ? {
                id: thank.from_user.id,
                name:
                  fromUserMetadata.full_name ||
                  thank.from_user.email?.split('@')[0] ||
                  'Anonymous',
                first_name: fromUserMetadata.first_name || '',
                last_name: fromUserMetadata.last_name || '',
                avatar_url: fromUserMetadata.avatar_url || null,
                trust_score: 5.0,
                location: fromUserMetadata.location || { lat: 0, lng: 0 },
                community_tenure_months: 0,
                thanks_received: 0,
                resources_shared: 0,
                created_at:
                  thank.from_user.created_at || new Date().toISOString(),
              }
            : undefined,
          to_member_id: thank.to_user_id,
          to_member: thank.to_user
            ? {
                id: thank.to_user.id,
                name:
                  toUserMetadata.full_name ||
                  thank.to_user.email?.split('@')[0] ||
                  'Anonymous',
                first_name: toUserMetadata.first_name || '',
                last_name: toUserMetadata.last_name || '',
                avatar_url: toUserMetadata.avatar_url || null,
                trust_score: 5.0,
                location: toUserMetadata.location || { lat: 0, lng: 0 },
                community_tenure_months: 0,
                thanks_received: 0,
                resources_shared: 0,
                created_at:
                  thank.to_user.created_at || new Date().toISOString(),
              }
            : undefined,
          resource_id: thank.resource_id,
          resource: thank.resource
            ? {
                id: thank.resource.id,
                creator_id: thank.resource.creator_id,
                type: thank.resource.type,
                category: thank.resource.category,
                title: thank.resource.title,
                description: thank.resource.description,
                image_urls: thank.resource.image_urls || [],
                location: thank.resource.location
                  ? {
                      lat: thank.resource.location.coordinates[1],
                      lng: thank.resource.location.coordinates[0],
                    }
                  : { lat: 0, lng: 0 },
                pickup_instructions: '',
                parking_info: '',
                meetup_flexibility: 'home_only',
                availability: '',
                is_active: true,
                times_helped: 0,
                created_at:
                  thank.resource.created_at || new Date().toISOString(),
                owner: thank.resource.creator
                  ? {
                      id: thank.resource.creator.id,
                      name:
                        resourceOwnerMetadata.full_name ||
                        thank.resource.creator.email?.split('@')[0] ||
                        'Anonymous',
                      first_name: resourceOwnerMetadata.first_name || '',
                      last_name: resourceOwnerMetadata.last_name || '',
                      avatar_url: resourceOwnerMetadata.avatar_url || null,
                      trust_score: 5.0,
                      location: resourceOwnerMetadata.location || {
                        lat: 0,
                        lng: 0,
                      },
                      community_tenure_months: 0,
                      thanks_received: 0,
                      resources_shared: 0,
                      created_at:
                        thank.resource.creator.created_at ||
                        new Date().toISOString(),
                    }
                  : undefined,
              }
            : undefined,
          message: thank.message,
          image_urls: thank.image_urls || [],
          impact_description: thank.impact_description || '',
          created_at: thank.created_at,
        };
      });

      logApiResponse('GET', `/thanks/member/${memberId}`, {
        count: transformedThanks.length,
      });
      logger.info('🙏 useThanksByMember: Member thanks fetched successfully:', {
        memberId,
        count: transformedThanks.length,
      });

      return transformedThanks;
    },
    enabled: !!memberId,
  });
}

export function useCreateThanks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (thanksData: {
      to_user_id: string;
      resource_id: string;
      message: string;
      image_urls?: string[];
      impact_description?: string;
    }): Promise<Thanks> => {
      logger.debug('🙏 useCreateThanks: Creating thanks:', thanksData);
      logApiCall('POST', '/thanks', thanksData);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('User must be authenticated to create thanks');
      }

      const { data: createdThanks, error } = await supabase
        .from('thanks')
        .insert([
          {
            from_user_id: user.id,
            to_user_id: thanksData.to_user_id,
            resource_id: thanksData.resource_id,
            message: thanksData.message,
            image_urls: thanksData.image_urls || [],
            impact_description: thanksData.impact_description || '',
          },
        ])
        .select(
          `
          *,
          from_user:profiles!thanks_from_user_id_fkey1 (
            id,
            email,
            user_metadata
          ),
          to_user:profiles!thanks_to_user_id_fkey1 (
            id,
            email,
            user_metadata
          ),
          resource:resources!thanks_resource_id_fkey (
            id,
            title,
            type,
            category,
            description,
            image_urls,
            location,
            creator_id,
            creator:profiles!resources_creator_id_fkey (
              id,
              email,
              user_metadata
            )
          )
        `
        )
        .single();

      if (error) {
        logApiResponse('POST', '/thanks', null, error);
        throw error;
      }

      if (!createdThanks) {
        throw new Error('Failed to create thanks');
      }

      // Transform the data
      const fromUserMetadata = createdThanks.from_user?.user_metadata || {};
      const toUserMetadata = createdThanks.to_user?.user_metadata || {};
      const resourceOwnerMetadata =
        createdThanks.resource?.creator?.user_metadata || {};

      const transformedThanks: Thanks = {
        id: createdThanks.id,
        from_member_id: createdThanks.from_user_id,
        from_member: createdThanks.from_user
          ? {
              id: createdThanks.from_user.id,
              name:
                fromUserMetadata.full_name ||
                createdThanks.from_user.email?.split('@')[0] ||
                'Anonymous',
              first_name: fromUserMetadata.first_name || '',
              last_name: fromUserMetadata.last_name || '',
              avatar_url: fromUserMetadata.avatar_url || null,
              trust_score: 5.0,
              location: fromUserMetadata.location || { lat: 0, lng: 0 },
              community_tenure_months: 0,
              thanks_received: 0,
              resources_shared: 0,
              created_at:
                createdThanks.from_user.created_at || new Date().toISOString(),
            }
          : undefined,
        to_member_id: createdThanks.to_user_id,
        to_member: createdThanks.to_user
          ? {
              id: createdThanks.to_user.id,
              name:
                toUserMetadata.full_name ||
                createdThanks.to_user.email?.split('@')[0] ||
                'Anonymous',
              first_name: toUserMetadata.first_name || '',
              last_name: toUserMetadata.last_name || '',
              avatar_url: toUserMetadata.avatar_url || null,
              trust_score: 5.0,
              location: toUserMetadata.location || { lat: 0, lng: 0 },
              community_tenure_months: 0,
              thanks_received: 0,
              resources_shared: 0,
              created_at:
                createdThanks.to_user.created_at || new Date().toISOString(),
            }
          : undefined,
        resource_id: createdThanks.resource_id,
        resource: createdThanks.resource
          ? {
              id: createdThanks.resource.id,
              creator_id: createdThanks.resource.creator_id,
              type: createdThanks.resource.type,
              category: createdThanks.resource.category,
              title: createdThanks.resource.title,
              description: createdThanks.resource.description,
              image_urls: createdThanks.resource.image_urls || [],
              location: createdThanks.resource.location
                ? {
                    lat: createdThanks.resource.location.coordinates[1],
                    lng: createdThanks.resource.location.coordinates[0],
                  }
                : { lat: 0, lng: 0 },
              pickup_instructions: '',
              parking_info: '',
              meetup_flexibility: 'home_only',
              availability: '',
              is_active: true,
              times_helped: 0,
              created_at:
                createdThanks.resource.created_at || new Date().toISOString(),
              owner: createdThanks.resource.creator
                ? {
                    id: createdThanks.resource.creator.id,
                    name:
                      resourceOwnerMetadata.full_name ||
                      createdThanks.resource.creator.email?.split('@')[0] ||
                      'Anonymous',
                    first_name: resourceOwnerMetadata.first_name || '',
                    last_name: resourceOwnerMetadata.last_name || '',
                    avatar_url: resourceOwnerMetadata.avatar_url || null,
                    trust_score: 5.0,
                    location: resourceOwnerMetadata.location || {
                      lat: 0,
                      lng: 0,
                    },
                    community_tenure_months: 0,
                    thanks_received: 0,
                    resources_shared: 0,
                    created_at:
                      createdThanks.resource.creator.created_at ||
                      new Date().toISOString(),
                  }
                : undefined,
            }
          : undefined,
        message: createdThanks.message,
        image_urls: createdThanks.image_urls || [],
        impact_description: createdThanks.impact_description || '',
        created_at: createdThanks.created_at,
      };

      logApiResponse('POST', '/thanks', { id: transformedThanks.id });
      logger.info('✅ useCreateThanks: Thanks created successfully:', {
        id: transformedThanks.id,
        fromUser: transformedThanks.from_member?.name,
        toUser: transformedThanks.to_member?.name,
      });

      return transformedThanks;
    },
    onSuccess: () => {
      // Invalidate thanks queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['thanks'] });
    },
  });
}
