// vite.config.mts
import { defineConfig } from "file:///home/project/node_modules/.pnpm/vite@5.4.19_@types+node@20.19.0/node_modules/vite/dist/node/index.js";
import dts from "file:///home/project/node_modules/.pnpm/vite-plugin-dts@3.9.1_@types+node@20.19.0_typescript@5.8.3_vite@5.4.19/node_modules/vite-plugin-dts/dist/index.mjs";
import { resolve } from "path";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///home/project/packages/community-services/vite.config.mts";
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
      name: "BelongNetworkCommunityService",
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubXRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvcHJvamVjdC9wYWNrYWdlcy9jb21tdW5pdHktc2VydmljZXNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3Byb2plY3QvcGFja2FnZXMvY29tbXVuaXR5LXNlcnZpY2VzL3ZpdGUuY29uZmlnLm10c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9wcm9qZWN0L3BhY2thZ2VzL2NvbW11bml0eS1zZXJ2aWNlcy92aXRlLmNvbmZpZy5tdHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCBkdHMgZnJvbSAndml0ZS1wbHVnaW4tZHRzJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICd1cmwnO1xuXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpO1xuY29uc3QgX19kaXJuYW1lID0gcmVzb2x2ZShfX2ZpbGVuYW1lLCAnLi4nKTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIGR0cyh7XG4gICAgICBpbnNlcnRUeXBlc0VudHJ5OiB0cnVlLFxuICAgICAgaW5jbHVkZTogWydzcmMvKiovKiddLFxuICAgICAgZXhjbHVkZTogWycqKi8qLnRlc3QudHMnXVxuICAgIH0pXG4gIF0sXG4gIGJ1aWxkOiB7XG4gICAgbGliOiB7XG4gICAgICBlbnRyeTogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvaW5kZXgudHMnKSxcbiAgICAgIG5hbWU6ICdCZWxvbmdOZXR3b3JrQ29tbXVuaXR5U2VydmljZScsXG4gICAgICBmaWxlTmFtZTogKGZvcm1hdCkgPT4gYGluZGV4LiR7Zm9ybWF0fS5qc2AsXG4gICAgICBmb3JtYXRzOiBbJ2VzJywgJ2NqcyddXG4gICAgfSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBleHRlcm5hbDogW1xuICAgICAgICAnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5JyxcbiAgICAgICAgL15AYmVsb25nbmV0d29ya1xcLy9cbiAgICAgIF1cbiAgICB9LFxuICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICBlbXB0eU91dERpcjogdHJ1ZVxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKVxuICAgIH1cbiAgfVxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQStTLFNBQVMsb0JBQW9CO0FBQzVVLE9BQU8sU0FBUztBQUNoQixTQUFTLGVBQWU7QUFDeEIsU0FBUyxxQkFBcUI7QUFINkosSUFBTSwyQ0FBMkM7QUFLNU8sSUFBTSxhQUFhLGNBQWMsd0NBQWU7QUFDaEQsSUFBTSxZQUFZLFFBQVEsWUFBWSxJQUFJO0FBRTFDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLElBQUk7QUFBQSxNQUNGLGtCQUFrQjtBQUFBLE1BQ2xCLFNBQVMsQ0FBQyxVQUFVO0FBQUEsTUFDcEIsU0FBUyxDQUFDLGNBQWM7QUFBQSxJQUMxQixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsS0FBSztBQUFBLE1BQ0gsT0FBTyxRQUFRLFdBQVcsY0FBYztBQUFBLE1BQ3hDLE1BQU07QUFBQSxNQUNOLFVBQVUsQ0FBQyxXQUFXLFNBQVMsTUFBTTtBQUFBLE1BQ3JDLFNBQVMsQ0FBQyxNQUFNLEtBQUs7QUFBQSxJQUN2QjtBQUFBLElBQ0EsZUFBZTtBQUFBLE1BQ2IsVUFBVTtBQUFBLFFBQ1I7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFdBQVc7QUFBQSxJQUNYLGFBQWE7QUFBQSxFQUNmO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLFFBQVEsV0FBVyxLQUFLO0FBQUEsSUFDL0I7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
