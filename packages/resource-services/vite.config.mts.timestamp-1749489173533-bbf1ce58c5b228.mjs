// vite.config.mts
import { defineConfig } from "file:///home/project/node_modules/.pnpm/vite@5.4.19_@types+node@20.19.0/node_modules/vite/dist/node/index.js";
import dts from "file:///home/project/node_modules/.pnpm/vite-plugin-dts@3.9.1_@types+node@20.19.0_typescript@5.8.3_vite@5.4.19/node_modules/vite-plugin-dts/dist/index.mjs";
import { resolve } from "path";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///home/project/packages/resource-services/vite.config.mts";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = resolve(__filename, "..");
var vite_config_default = defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ["src/**/*"],
      exclude: ["**/*.test.ts"]
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "BelongNetworkResourceService",
      fileName: (format) => `index.${format}.js`,
      formats: ["es", "cjs"]
    },
    rollupOptions: {
      external: [
        "@tanstack/react-query",
        /^@belongnetwork\//
      ]
    },
    sourcemap: true,
    emptyOutDir: true
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src")
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubXRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvcHJvamVjdC9wYWNrYWdlcy9yZXNvdXJjZS1zZXJ2aWNlc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvcHJvamVjdC9wYWNrYWdlcy9yZXNvdXJjZS1zZXJ2aWNlcy92aXRlLmNvbmZpZy5tdHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvcHJvamVjdC9wYWNrYWdlcy9yZXNvdXJjZS1zZXJ2aWNlcy92aXRlLmNvbmZpZy5tdHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCBkdHMgZnJvbSAndml0ZS1wbHVnaW4tZHRzJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICd1cmwnO1xuXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpO1xuY29uc3QgX19kaXJuYW1lID0gcmVzb2x2ZShfX2ZpbGVuYW1lLCAnLi4nKTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIGR0cyh7XG4gICAgICBpbnNlcnRUeXBlc0VudHJ5OiB0cnVlLFxuICAgICAgaW5jbHVkZTogWydzcmMvKiovKiddLFxuICAgICAgZXhjbHVkZTogWycqKi8qLnRlc3QudHMnXVxuICAgIH0pXG4gIF0sXG4gIGJ1aWxkOiB7XG4gICAgbGliOiB7XG4gICAgICBlbnRyeTogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvaW5kZXgudHMnKSxcbiAgICAgIG5hbWU6ICdCZWxvbmdOZXR3b3JrUmVzb3VyY2VTZXJ2aWNlJyxcbiAgICAgIGZpbGVOYW1lOiAoZm9ybWF0KSA9PiBgaW5kZXguJHtmb3JtYXR9LmpzYCxcbiAgICAgIGZvcm1hdHM6IFsnZXMnLCAnY2pzJ11cbiAgICB9LFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIGV4dGVybmFsOiBbXG4gICAgICAgICdAdGFuc3RhY2svcmVhY3QtcXVlcnknLFxuICAgICAgICAvXkBiZWxvbmduZXR3b3JrXFwvL1xuICAgICAgXVxuICAgIH0sXG4gICAgc291cmNlbWFwOiB0cnVlLFxuICAgIGVtcHR5T3V0RGlyOiB0cnVlXG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpXG4gICAgfVxuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNFMsU0FBUyxvQkFBb0I7QUFDelUsT0FBTyxTQUFTO0FBQ2hCLFNBQVMsZUFBZTtBQUN4QixTQUFTLHFCQUFxQjtBQUgySixJQUFNLDJDQUEyQztBQUsxTyxJQUFNLGFBQWEsY0FBYyx3Q0FBZTtBQUNoRCxJQUFNLFlBQVksUUFBUSxZQUFZLElBQUk7QUFFMUMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLE1BQ0Ysa0JBQWtCO0FBQUEsTUFDbEIsU0FBUyxDQUFDLFVBQVU7QUFBQSxNQUNwQixTQUFTLENBQUMsY0FBYztBQUFBLElBQzFCLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxLQUFLO0FBQUEsTUFDSCxPQUFPLFFBQVEsV0FBVyxjQUFjO0FBQUEsTUFDeEMsTUFBTTtBQUFBLE1BQ04sVUFBVSxDQUFDLFdBQVcsU0FBUyxNQUFNO0FBQUEsTUFDckMsU0FBUyxDQUFDLE1BQU0sS0FBSztBQUFBLElBQ3ZCO0FBQUEsSUFDQSxlQUFlO0FBQUEsTUFDYixVQUFVO0FBQUEsUUFDUjtBQUFBLFFBQ0E7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsV0FBVztBQUFBLElBQ1gsYUFBYTtBQUFBLEVBQ2Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssUUFBUSxXQUFXLEtBQUs7QUFBQSxJQUMvQjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
