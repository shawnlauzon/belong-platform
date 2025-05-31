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
          };
          pickup_instructions: string | null;
          parking_info: string | null;
          meetup_flexibility: 'home_only' | 'public_meetup_ok' | 'delivery_possible';
          availability: string | null;
          is_active: boolean;
          times_helped: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['resources']['Row'], 'id' | 'created_at' | 'times_helped'>;
        Update: Partial<Database['public']['Tables']['resources']['Insert']>;
      };
      api_keys: {
        Row: {
          id: string;
          service: string;
          key: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['api_keys']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['api_keys']['Insert']>;
      };
    };
  };
}