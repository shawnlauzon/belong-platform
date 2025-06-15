// vite.config.mts
import { defineConfig } from "file:///home/project/node_modules/.pnpm/vite@5.4.19/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/.pnpm/@vitejs+plugin-react@4.5.1_vite@5.4.19/node_modules/@vitejs/plugin-react/dist/index.mjs";
import dts from "file:///home/project/node_modules/.pnpm/vite-plugin-dts@3.9.1_typescript@5.8.3_vite@5.4.19/node_modules/vite-plugin-dts/dist/index.mjs";
import { resolve } from "path";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///home/project/packages/core/vite.config.mts";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = resolve(__filename, "..");
var config = {
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ["src/**/*"],
      exclude: ["**/*.test.ts"]
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "BelongNetworkCore",
      fileName: (format) => `index.${format}.js`,
      formats: ["es", "cjs"]
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "zod",
        "mapbox-gl",
        "@supabase/supabase-js",
        "zustand",
        "loglevel"
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          zod: "zod",
          "mapbox-gl": "mapboxgl",
          "@supabase/supabase-js": "supabase",
          zustand: "zustand",
          loglevel: "loglevel"
        }
      }
    },
    sourcemap: true,
    emptyOutDir: true
  },
  optimizeDeps: {
    exclude: ["lucide-react"]
  }
};
var vite_config_default = defineConfig(config);
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubXRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvcHJvamVjdC9wYWNrYWdlcy9jb3JlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3BhY2thZ2VzL2NvcmUvdml0ZS5jb25maWcubXRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3QvcGFja2FnZXMvY29yZS92aXRlLmNvbmZpZy5tdHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgZHRzIGZyb20gJ3ZpdGUtcGx1Z2luLWR0cyc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJztcblxuY29uc3QgX19maWxlbmFtZSA9IGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKTtcbmNvbnN0IF9fZGlybmFtZSA9IHJlc29sdmUoX19maWxlbmFtZSwgJy4uJyk7XG5cbi8vIEJhc2UgY29uZmlndXJhdGlvbiBmb3IgYm90aCBidWlsZCBhbmQgdGVzdFxuY29uc3QgY29uZmlnID0ge1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBkdHMoe1xuICAgICAgaW5zZXJ0VHlwZXNFbnRyeTogdHJ1ZSxcbiAgICAgIGluY2x1ZGU6IFsnc3JjLyoqLyonXSxcbiAgICAgIGV4Y2x1ZGU6IFsnKiovKi50ZXN0LnRzJ11cbiAgICB9KVxuICBdLFxuICBidWlsZDoge1xuICAgIGxpYjoge1xuICAgICAgZW50cnk6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2luZGV4LnRzJyksXG4gICAgICBuYW1lOiAnQmVsb25nTmV0d29ya0NvcmUnLFxuICAgICAgZmlsZU5hbWU6IChmb3JtYXQpID0+IGBpbmRleC4ke2Zvcm1hdH0uanNgLFxuICAgICAgZm9ybWF0czogWydlcycsICdjanMnXVxuICAgIH0sXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgZXh0ZXJuYWw6IFtcbiAgICAgICAgJ3JlYWN0JyxcbiAgICAgICAgJ3JlYWN0LWRvbScsXG4gICAgICAgICd6b2QnLFxuICAgICAgICAnbWFwYm94LWdsJyxcbiAgICAgICAgJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcycsXG4gICAgICAgICd6dXN0YW5kJyxcbiAgICAgICAgJ2xvZ2xldmVsJ1xuICAgICAgXSxcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBnbG9iYWxzOiB7XG4gICAgICAgICAgcmVhY3Q6ICdSZWFjdCcsXG4gICAgICAgICAgJ3JlYWN0LWRvbSc6ICdSZWFjdERPTScsXG4gICAgICAgICAgem9kOiAnem9kJyxcbiAgICAgICAgICAnbWFwYm94LWdsJzogJ21hcGJveGdsJyxcbiAgICAgICAgICAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJzogJ3N1cGFiYXNlJyxcbiAgICAgICAgICB6dXN0YW5kOiAnenVzdGFuZCcsXG4gICAgICAgICAgbG9nbGV2ZWw6ICdsb2dsZXZlbCdcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgc291cmNlbWFwOiB0cnVlLFxuICAgIGVtcHR5T3V0RGlyOiB0cnVlXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0J11cbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKGNvbmZpZyk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFRLFNBQVMsb0JBQW9CO0FBQ2xTLE9BQU8sV0FBVztBQUNsQixPQUFPLFNBQVM7QUFDaEIsU0FBUyxlQUFlO0FBQ3hCLFNBQVMscUJBQXFCO0FBSmlJLElBQU0sMkNBQTJDO0FBTWhOLElBQU0sYUFBYSxjQUFjLHdDQUFlO0FBQ2hELElBQU0sWUFBWSxRQUFRLFlBQVksSUFBSTtBQUcxQyxJQUFNLFNBQVM7QUFBQSxFQUNiLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLElBQUk7QUFBQSxNQUNGLGtCQUFrQjtBQUFBLE1BQ2xCLFNBQVMsQ0FBQyxVQUFVO0FBQUEsTUFDcEIsU0FBUyxDQUFDLGNBQWM7QUFBQSxJQUMxQixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsS0FBSztBQUFBLE1BQ0gsT0FBTyxRQUFRLFdBQVcsY0FBYztBQUFBLE1BQ3hDLE1BQU07QUFBQSxNQUNOLFVBQVUsQ0FBQyxXQUFXLFNBQVMsTUFBTTtBQUFBLE1BQ3JDLFNBQVMsQ0FBQyxNQUFNLEtBQUs7QUFBQSxJQUN2QjtBQUFBLElBQ0EsZUFBZTtBQUFBLE1BQ2IsVUFBVTtBQUFBLFFBQ1I7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNGO0FBQUEsTUFDQSxRQUFRO0FBQUEsUUFDTixTQUFTO0FBQUEsVUFDUCxPQUFPO0FBQUEsVUFDUCxhQUFhO0FBQUEsVUFDYixLQUFLO0FBQUEsVUFDTCxhQUFhO0FBQUEsVUFDYix5QkFBeUI7QUFBQSxVQUN6QixTQUFTO0FBQUEsVUFDVCxVQUFVO0FBQUEsUUFDWjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxXQUFXO0FBQUEsSUFDWCxhQUFhO0FBQUEsRUFDZjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGNBQWM7QUFBQSxFQUMxQjtBQUNGO0FBRUEsSUFBTyxzQkFBUSxhQUFhLE1BQU07IiwKICAibmFtZXMiOiBbXQp9Cg==
