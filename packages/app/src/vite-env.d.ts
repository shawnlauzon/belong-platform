/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_MAPBOX_TOKEN: string;
  readonly VITE_DEFAULT_LOCATION_LAT: string;
  readonly VITE_DEFAULT_LOCATION_LNG: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}