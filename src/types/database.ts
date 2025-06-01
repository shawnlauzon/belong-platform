export interface Database {
  public: {
    Tables: {
      resources: {
        Row: {
          id: string;
          member_id: string;
          type: 'offer' | 'request';
          category: 'tools' | 'skills' | 'food' | 'supplies' | 'other';
          title: string;
          description: string;
          image_urls: string[];
          location: {
            coordinates: [number, number];
            crs: { properties: { name: string }; type: string };
            type: string;
          } | null;
          pickup_instructions: string | null;
          parking_info: string | null;
          meetup_flexibility: 'home_only' | 'public_meetup_ok' | 'delivery_possible' | null;
          availability: string | null;
          is_active: boolean;
          times_helped: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['resources']['Row'], 'id' | 'created_at' | 'times_helped'>;
        Update: Partial<Database['public']['Tables']['resources']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          user_metadata: {
            first_name?: string;
            last_name?: string;
            full_name?: string;
            avatar_url?: string;
            location?: {
              lat: number;
              lng: number;
            };
          } | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          user_metadata?: Database['public']['Tables']['profiles']['Row']['user_metadata'];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
    };
    Views: {
      [key: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Functions: Record<string, unknown>;
    Enums: Record<string, unknown>;
  };
}