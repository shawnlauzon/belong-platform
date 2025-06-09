// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/.pnpm/vite@5.4.19/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/.pnpm/@vitejs+plugin-react@4.5.1_vite@5.4.19/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { TanStackRouterVite } from "file:///home/project/node_modules/.pnpm/@tanstack+router-vite-plugin@1.120.18_@tanstack+react-router@1.120.18_vite@5.4.19/node_modules/@tanstack/router-vite-plugin/dist/esm/index.js";
import tsconfigPaths from "file:///home/project/node_modules/.pnpm/vite-tsconfig-paths@4.3.2_typescript@5.8.3_vite@5.4.19/node_modules/vite-tsconfig-paths/dist/index.mjs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
var __vite_injected_original_import_meta_url = "file:///home/project/packages/app/vite.config.ts";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  root: __dirname,
  base: "/",
  publicDir: "public",
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
      },
      // Add an alias for the root src directory
      {
        find: "src",
        replacement: resolve(__dirname, "src/$1")
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3BhY2thZ2VzL2FwcFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvcHJvamVjdC9wYWNrYWdlcy9hcHAvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvcHJvamVjdC9wYWNrYWdlcy9hcHAvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBUYW5TdGFja1JvdXRlclZpdGUgfSBmcm9tICdAdGFuc3RhY2svcm91dGVyLXZpdGUtcGx1Z2luJztcbmltcG9ydCB0c2NvbmZpZ1BhdGhzIGZyb20gJ3ZpdGUtdHNjb25maWctcGF0aHMnO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCc7XG5pbXBvcnQgeyBkaXJuYW1lLCByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5cbmNvbnN0IF9fZmlsZW5hbWUgPSBmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCk7XG5jb25zdCBfX2Rpcm5hbWUgPSBkaXJuYW1lKF9fZmlsZW5hbWUpO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcm9vdDogX19kaXJuYW1lLFxuICBiYXNlOiAnLycsXG4gIHB1YmxpY0RpcjogJ3B1YmxpYycsXG4gIHBsdWdpbnM6IFtcbiAgICB0c2NvbmZpZ1BhdGhzKHtcbiAgICAgIHByb2plY3RzOiBbXG4gICAgICAgIHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHNjb25maWcuanNvbicpLFxuICAgICAgICByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzY29uZmlnLmFwcC5qc29uJyksXG4gICAgICAgIHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHNjb25maWcubm9kZS5qc29uJyksXG4gICAgICAgIHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHNjb25maWcuYmFzZS5qc29uJyksXG4gICAgICBdLFxuICAgIH0pLFxuICAgIHJlYWN0KCksXG4gICAgVGFuU3RhY2tSb3V0ZXJWaXRlKCksXG4gIF0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgb3BlbjogdHJ1ZSxcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgIGZzOiB7XG4gICAgICAvLyBBbGxvdyBzZXJ2aW5nIGZpbGVzIGZyb20gdGhlIHByb2plY3Qgcm9vdFxuICAgICAgYWxsb3c6IFsnLi4nXSxcbiAgICB9LFxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IFtcbiAgICAgIHtcbiAgICAgICAgZmluZDogJ34nLFxuICAgICAgICByZXBsYWNlbWVudDogcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9jb3JlL3NyYycpLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZmluZDogJ0AnLFxuICAgICAgICByZXBsYWNlbWVudDogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGZpbmQ6ICdAYmVsb25nbmV0d29yay9jb3JlJyxcbiAgICAgICAgcmVwbGFjZW1lbnQ6IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vY29yZS9zcmMnKSxcbiAgICAgIH0sXG4gICAgICAvLyBBZGQgYW4gYWxpYXMgZm9yIHRoZSByb290IHNyYyBkaXJlY3RvcnlcbiAgICAgIHtcbiAgICAgICAgZmluZDogJ3NyYycsXG4gICAgICAgIHJlcGxhY2VtZW50OiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy8kMScpLFxuICAgICAgfSxcbiAgICBdLFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBleGNsdWRlOiBbJ2x1Y2lkZS1yZWFjdCddLFxuICB9LFxuICBidWlsZDoge1xuICAgIG91dERpcjogcmVzb2x2ZShfX2Rpcm5hbWUsICdkaXN0JyksXG4gICAgZW1wdHlPdXREaXI6IHRydWUsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgaW5wdXQ6IHtcbiAgICAgICAgbWFpbjogcmVzb2x2ZShfX2Rpcm5hbWUsICdpbmRleC5odG1sJyksXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBZ1EsU0FBUyxvQkFBb0I7QUFDN1IsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsMEJBQTBCO0FBQ25DLE9BQU8sbUJBQW1CO0FBQzFCLFNBQVMscUJBQXFCO0FBQzlCLFNBQVMsU0FBUyxlQUFlO0FBTDJILElBQU0sMkNBQTJDO0FBTzdNLElBQU0sYUFBYSxjQUFjLHdDQUFlO0FBQ2hELElBQU0sWUFBWSxRQUFRLFVBQVU7QUFHcEMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsTUFBTTtBQUFBLEVBQ04sTUFBTTtBQUFBLEVBQ04sV0FBVztBQUFBLEVBQ1gsU0FBUztBQUFBLElBQ1AsY0FBYztBQUFBLE1BQ1osVUFBVTtBQUFBLFFBQ1IsUUFBUSxXQUFXLHFCQUFxQjtBQUFBLFFBQ3hDLFFBQVEsV0FBVyx5QkFBeUI7QUFBQSxRQUM1QyxRQUFRLFdBQVcsMEJBQTBCO0FBQUEsUUFDN0MsUUFBUSxXQUFXLDBCQUEwQjtBQUFBLE1BQy9DO0FBQUEsSUFDRixDQUFDO0FBQUEsSUFDRCxNQUFNO0FBQUEsSUFDTixtQkFBbUI7QUFBQSxFQUNyQjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLElBQ1osSUFBSTtBQUFBO0FBQUEsTUFFRixPQUFPLENBQUMsSUFBSTtBQUFBLElBQ2Q7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTDtBQUFBLFFBQ0UsTUFBTTtBQUFBLFFBQ04sYUFBYSxRQUFRLFdBQVcsYUFBYTtBQUFBLE1BQy9DO0FBQUEsTUFDQTtBQUFBLFFBQ0UsTUFBTTtBQUFBLFFBQ04sYUFBYSxRQUFRLFdBQVcsS0FBSztBQUFBLE1BQ3ZDO0FBQUEsTUFDQTtBQUFBLFFBQ0UsTUFBTTtBQUFBLFFBQ04sYUFBYSxRQUFRLFdBQVcsYUFBYTtBQUFBLE1BQy9DO0FBQUE7QUFBQSxNQUVBO0FBQUEsUUFDRSxNQUFNO0FBQUEsUUFDTixhQUFhLFFBQVEsV0FBVyxRQUFRO0FBQUEsTUFDMUM7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGNBQWM7QUFBQSxFQUMxQjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUSxRQUFRLFdBQVcsTUFBTTtBQUFBLElBQ2pDLGFBQWE7QUFBQSxJQUNiLGVBQWU7QUFBQSxNQUNiLE9BQU87QUFBQSxRQUNMLE1BQU0sUUFBUSxXQUFXLFlBQVk7QUFBQSxNQUN2QztBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
