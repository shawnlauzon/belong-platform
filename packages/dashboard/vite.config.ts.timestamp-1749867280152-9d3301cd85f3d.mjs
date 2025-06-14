// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/.pnpm/vite@5.4.19_@types+node@20.19.0/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/.pnpm/@vitejs+plugin-react@4.5.1_vite@5.4.19/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { TanStackRouterVite } from "file:///home/project/node_modules/.pnpm/@tanstack+router-vite-plugin@1.120.20_vite@5.4.19/node_modules/@tanstack/router-vite-plugin/dist/esm/index.js";
import tsconfigPaths from "file:///home/project/node_modules/.pnpm/vite-tsconfig-paths@5.1.4_typescript@5.8.3_vite@5.4.19/node_modules/vite-tsconfig-paths/dist/index.js";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
var __vite_injected_original_import_meta_url = "file:///home/project/packages/dashboard/vite.config.ts";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  root: __dirname,
  base: "/",
  publicDir: "public",
  envDir: resolve(__dirname, "../../"),
  plugins: [
    tsconfigPaths({
      projects: [
        resolve(__dirname, "../../tsconfig.json"),
        resolve(__dirname, "../../tsconfig.app.json"),
        resolve(__dirname, "../../tsconfig.node.json"),
        resolve(__dirname, "../../tsconfig.base.json")
      ]
    }),
    react(),
    TanStackRouterVite()
  ],
  server: {
    port: 5173,
    open: true,
    strictPort: true,
    fs: {
      // Allow serving files from the project root
      allow: [".."]
    }
  },
  resolve: {
    alias: [
      {
        find: "~",
        replacement: resolve(__dirname, "../core/src")
      },
      {
        find: "@",
        replacement: resolve(__dirname, "src")
      },
      {
        find: "@belongnetwork/core",
        replacement: resolve(__dirname, "../core/src")
      }
    ]
  },
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html")
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3BhY2thZ2VzL2Rhc2hib2FyZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvcHJvamVjdC9wYWNrYWdlcy9kYXNoYm9hcmQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvcHJvamVjdC9wYWNrYWdlcy9kYXNoYm9hcmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBUYW5TdGFja1JvdXRlclZpdGUgfSBmcm9tICdAdGFuc3RhY2svcm91dGVyLXZpdGUtcGx1Z2luJztcbmltcG9ydCB0c2NvbmZpZ1BhdGhzIGZyb20gJ3ZpdGUtdHNjb25maWctcGF0aHMnO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCc7XG5pbXBvcnQgeyBkaXJuYW1lLCByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5cbmNvbnN0IF9fZmlsZW5hbWUgPSBmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCk7XG5jb25zdCBfX2Rpcm5hbWUgPSBkaXJuYW1lKF9fZmlsZW5hbWUpO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcm9vdDogX19kaXJuYW1lLFxuICBiYXNlOiAnLycsXG4gIHB1YmxpY0RpcjogJ3B1YmxpYycsXG4gIGVudkRpcjogcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi8nKSxcbiAgcGx1Z2luczogW1xuICAgIHRzY29uZmlnUGF0aHMoe1xuICAgICAgcHJvamVjdHM6IFtcbiAgICAgICAgcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90c2NvbmZpZy5qc29uJyksXG4gICAgICAgIHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHNjb25maWcuYXBwLmpzb24nKSxcbiAgICAgICAgcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90c2NvbmZpZy5ub2RlLmpzb24nKSxcbiAgICAgICAgcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90c2NvbmZpZy5iYXNlLmpzb24nKSxcbiAgICAgIF0sXG4gICAgfSksXG4gICAgcmVhY3QoKSxcbiAgICBUYW5TdGFja1JvdXRlclZpdGUoKSxcbiAgXSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3MyxcbiAgICBvcGVuOiB0cnVlLFxuICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gICAgZnM6IHtcbiAgICAgIC8vIEFsbG93IHNlcnZpbmcgZmlsZXMgZnJvbSB0aGUgcHJvamVjdCByb290XG4gICAgICBhbGxvdzogWycuLiddLFxuICAgIH0sXG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczogW1xuICAgICAge1xuICAgICAgICBmaW5kOiAnficsXG4gICAgICAgIHJlcGxhY2VtZW50OiByZXNvbHZlKF9fZGlybmFtZSwgJy4uL2NvcmUvc3JjJyksXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBmaW5kOiAnQCcsXG4gICAgICAgIHJlcGxhY2VtZW50OiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZmluZDogJ0BiZWxvbmduZXR3b3JrL2NvcmUnLFxuICAgICAgICByZXBsYWNlbWVudDogcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9jb3JlL3NyYycpLFxuICAgICAgfSxcbiAgICBdLFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBleGNsdWRlOiBbJ2x1Y2lkZS1yZWFjdCddLFxuICB9LFxuICBidWlsZDoge1xuICAgIG91dERpcjogcmVzb2x2ZShfX2Rpcm5hbWUsICdkaXN0JyksXG4gICAgZW1wdHlPdXREaXI6IHRydWUsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgaW5wdXQ6IHtcbiAgICAgICAgbWFpbjogcmVzb2x2ZShfX2Rpcm5hbWUsICdpbmRleC5odG1sJyksXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQWtSLFNBQVMsb0JBQW9CO0FBQy9TLE9BQU8sV0FBVztBQUNsQixTQUFTLDBCQUEwQjtBQUNuQyxPQUFPLG1CQUFtQjtBQUMxQixTQUFTLHFCQUFxQjtBQUM5QixTQUFTLFNBQVMsZUFBZTtBQUx1SSxJQUFNLDJDQUEyQztBQU96TixJQUFNLGFBQWEsY0FBYyx3Q0FBZTtBQUNoRCxJQUFNLFlBQVksUUFBUSxVQUFVO0FBR3BDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQSxFQUNOLE1BQU07QUFBQSxFQUNOLFdBQVc7QUFBQSxFQUNYLFFBQVEsUUFBUSxXQUFXLFFBQVE7QUFBQSxFQUNuQyxTQUFTO0FBQUEsSUFDUCxjQUFjO0FBQUEsTUFDWixVQUFVO0FBQUEsUUFDUixRQUFRLFdBQVcscUJBQXFCO0FBQUEsUUFDeEMsUUFBUSxXQUFXLHlCQUF5QjtBQUFBLFFBQzVDLFFBQVEsV0FBVywwQkFBMEI7QUFBQSxRQUM3QyxRQUFRLFdBQVcsMEJBQTBCO0FBQUEsTUFDL0M7QUFBQSxJQUNGLENBQUM7QUFBQSxJQUNELE1BQU07QUFBQSxJQUNOLG1CQUFtQjtBQUFBLEVBQ3JCO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixJQUFJO0FBQUE7QUFBQSxNQUVGLE9BQU8sQ0FBQyxJQUFJO0FBQUEsSUFDZDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMO0FBQUEsUUFDRSxNQUFNO0FBQUEsUUFDTixhQUFhLFFBQVEsV0FBVyxhQUFhO0FBQUEsTUFDL0M7QUFBQSxNQUNBO0FBQUEsUUFDRSxNQUFNO0FBQUEsUUFDTixhQUFhLFFBQVEsV0FBVyxLQUFLO0FBQUEsTUFDdkM7QUFBQSxNQUNBO0FBQUEsUUFDRSxNQUFNO0FBQUEsUUFDTixhQUFhLFFBQVEsV0FBVyxhQUFhO0FBQUEsTUFDL0M7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGNBQWM7QUFBQSxFQUMxQjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUSxRQUFRLFdBQVcsTUFBTTtBQUFBLElBQ2pDLGFBQWE7QUFBQSxJQUNiLGVBQWU7QUFBQSxNQUNiLE9BQU87QUFBQSxRQUNMLE1BQU0sUUFBUSxXQUFXLFlBQVk7QUFBQSxNQUN2QztBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
