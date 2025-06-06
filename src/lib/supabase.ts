import { createClient } from '@supabase/supabase-js';

// Use environment variables or fallback to local development values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://example.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Debug logging for environment variables
console.log('🔧 Supabase Client Debug Info:');
console.log('  URL:', supabaseUrl);
console.log('  Anon Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...');
console.log('  URL is valid:', supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co'));
console.log('  Anon Key is valid format:', supabaseAnonKey.startsWith('eyJ') && supabaseAnonKey.length > 100);

// Validate environment variables
if (!supabaseUrl || supabaseUrl === 'https://example.supabase.co') {
  console.error('❌ VITE_SUPABASE_URL is not set or is using the default placeholder value');
}

if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key') {
  console.error('❌ VITE_SUPABASE_ANON_KEY is not set or is using the default placeholder value');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Test the client connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase client connection test failed:', error);
  } else {
    console.log('✅ Supabase client initialized successfully');
    console.log('  Session exists:', !!data.session);
  }
}).catch((error) => {
  console.error('❌ Supabase client initialization error:', error);
});