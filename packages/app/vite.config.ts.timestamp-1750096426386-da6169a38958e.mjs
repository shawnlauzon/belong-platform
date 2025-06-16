// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/.pnpm/vite@5.4.19_@types+node@20.19.0/node_modules/vite/dist/node/index.js";
import tailwindcss from "file:///home/project/node_modules/.pnpm/@tailwindcss+vite@4.1.10_vite@5.4.19/node_modules/@tailwindcss/vite/dist/index.mjs";
import react from "file:///home/project/node_modules/.pnpm/@vitejs+plugin-react@4.5.1_vite@5.4.19/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { TanStackRouterVite } from "file:///home/project/node_modules/.pnpm/@tanstack+router-vite-plugin@1.120.20_vite@5.4.19/node_modules/@tanstack/router-vite-plugin/dist/esm/index.js";
import tsconfigPaths from "file:///home/project/node_modules/.pnpm/vite-tsconfig-paths@4.3.2_typescript@5.8.3_vite@5.4.19/node_modules/vite-tsconfig-paths/dist/index.mjs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
var __vite_injected_original_import_meta_url = "file:///home/project/packages/app/vite.config.ts";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig(({ command, mode }) => {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5173;
  return {
    root: __dirname,
    base: "/",
    publicDir: "public",
    envDir: resolve(__dirname, "../../"),
    plugins: [
      tailwindcss(),
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
      port,
      host: true,
      // Listen on all addresses
      open: true,
      strictPort: false,
      // Allow fallback to next available port
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
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3BhY2thZ2VzL2FwcFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvcHJvamVjdC9wYWNrYWdlcy9hcHAvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvcHJvamVjdC9wYWNrYWdlcy9hcHAvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSc7XG5cbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBUYW5TdGFja1JvdXRlclZpdGUgfSBmcm9tICdAdGFuc3RhY2svcm91dGVyLXZpdGUtcGx1Z2luJztcbmltcG9ydCB0c2NvbmZpZ1BhdGhzIGZyb20gJ3ZpdGUtdHNjb25maWctcGF0aHMnO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCc7XG5pbXBvcnQgeyBkaXJuYW1lLCByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5cbmNvbnN0IF9fZmlsZW5hbWUgPSBmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCk7XG5jb25zdCBfX2Rpcm5hbWUgPSBkaXJuYW1lKF9fZmlsZW5hbWUpO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IGNvbW1hbmQsIG1vZGUgfSkgPT4ge1xuICAvLyBHZXQgcG9ydCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlIG9yIGRlZmF1bHQgdG8gNTE3M1xuICAvLyBWaXRlIGF1dG9tYXRpY2FsbHkgaGFuZGxlcyAtLXBvcnQgQ0xJIGFyZ3VtZW50LCBzbyB3ZSBqdXN0IG5lZWQgdG8gaGFuZGxlIGVudiB2YXJcbiAgY29uc3QgcG9ydCA9IHByb2Nlc3MuZW52LlBPUlQgPyBwYXJzZUludChwcm9jZXNzLmVudi5QT1JUKSA6IDUxNzM7XG5cbiAgcmV0dXJuIHtcbiAgICByb290OiBfX2Rpcm5hbWUsXG4gICAgYmFzZTogJy8nLFxuICAgIHB1YmxpY0RpcjogJ3B1YmxpYycsXG4gICAgZW52RGlyOiByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uLycpLFxuICAgIHBsdWdpbnM6IFtcbiAgICAgIHRhaWx3aW5kY3NzKCksXG4gICAgICB0c2NvbmZpZ1BhdGhzKHtcbiAgICAgICAgcHJvamVjdHM6IFtcbiAgICAgICAgICByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzY29uZmlnLmpzb24nKSxcbiAgICAgICAgICByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzY29uZmlnLmFwcC5qc29uJyksXG4gICAgICAgICAgcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90c2NvbmZpZy5ub2RlLmpzb24nKSxcbiAgICAgICAgICByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzY29uZmlnLmJhc2UuanNvbicpLFxuICAgICAgICBdLFxuICAgICAgfSksXG4gICAgICByZWFjdCgpLFxuICAgICAgVGFuU3RhY2tSb3V0ZXJWaXRlKCksXG4gICAgXSxcbiAgICBzZXJ2ZXI6IHtcbiAgICAgIHBvcnQ6IHBvcnQsXG4gICAgICBob3N0OiB0cnVlLCAvLyBMaXN0ZW4gb24gYWxsIGFkZHJlc3Nlc1xuICAgICAgb3BlbjogdHJ1ZSxcbiAgICAgIHN0cmljdFBvcnQ6IGZhbHNlLCAvLyBBbGxvdyBmYWxsYmFjayB0byBuZXh0IGF2YWlsYWJsZSBwb3J0XG4gICAgICBmczoge1xuICAgICAgICAvLyBBbGxvdyBzZXJ2aW5nIGZpbGVzIGZyb20gdGhlIHByb2plY3Qgcm9vdFxuICAgICAgICBhbGxvdzogWycuLiddLFxuICAgICAgfSxcbiAgICB9LFxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBmaW5kOiAnficsXG4gICAgICAgICAgcmVwbGFjZW1lbnQ6IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vY29yZS9zcmMnKSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGZpbmQ6ICdAJyxcbiAgICAgICAgICByZXBsYWNlbWVudDogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGZpbmQ6ICdAYmVsb25nbmV0d29yay9jb3JlJyxcbiAgICAgICAgICByZXBsYWNlbWVudDogcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9jb3JlL3NyYycpLFxuICAgICAgICB9LFxuICAgICAgICAvLyBBZGQgYW4gYWxpYXMgZm9yIHRoZSByb290IHNyYyBkaXJlY3RvcnlcbiAgICAgICAge1xuICAgICAgICAgIGZpbmQ6ICdzcmMnLFxuICAgICAgICAgIHJlcGxhY2VtZW50OiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy8kMScpLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgZXhjbHVkZTogWydsdWNpZGUtcmVhY3QnXSxcbiAgICB9LFxuICAgIGJ1aWxkOiB7XG4gICAgICBvdXREaXI6IHJlc29sdmUoX19kaXJuYW1lLCAnZGlzdCcpLFxuICAgICAgZW1wdHlPdXREaXI6IHRydWUsXG4gICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgbWFpbjogcmVzb2x2ZShfX2Rpcm5hbWUsICdpbmRleC5odG1sJyksXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBZ1EsU0FBUyxvQkFBb0I7QUFDN1IsT0FBTyxpQkFBaUI7QUFFeEIsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsMEJBQTBCO0FBQ25DLE9BQU8sbUJBQW1CO0FBQzFCLFNBQVMscUJBQXFCO0FBQzlCLFNBQVMsU0FBUyxlQUFlO0FBUDJILElBQU0sMkNBQTJDO0FBUzdNLElBQU0sYUFBYSxjQUFjLHdDQUFlO0FBQ2hELElBQU0sWUFBWSxRQUFRLFVBQVU7QUFHcEMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxTQUFTLEtBQUssTUFBTTtBQUdqRCxRQUFNLE9BQU8sUUFBUSxJQUFJLE9BQU8sU0FBUyxRQUFRLElBQUksSUFBSSxJQUFJO0FBRTdELFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFdBQVc7QUFBQSxJQUNYLFFBQVEsUUFBUSxXQUFXLFFBQVE7QUFBQSxJQUNuQyxTQUFTO0FBQUEsTUFDUCxZQUFZO0FBQUEsTUFDWixjQUFjO0FBQUEsUUFDWixVQUFVO0FBQUEsVUFDUixRQUFRLFdBQVcscUJBQXFCO0FBQUEsVUFDeEMsUUFBUSxXQUFXLHlCQUF5QjtBQUFBLFVBQzVDLFFBQVEsV0FBVywwQkFBMEI7QUFBQSxVQUM3QyxRQUFRLFdBQVcsMEJBQTBCO0FBQUEsUUFDL0M7QUFBQSxNQUNGLENBQUM7QUFBQSxNQUNELE1BQU07QUFBQSxNQUNOLG1CQUFtQjtBQUFBLElBQ3JCO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTjtBQUFBLE1BQ0EsTUFBTTtBQUFBO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixZQUFZO0FBQUE7QUFBQSxNQUNaLElBQUk7QUFBQTtBQUFBLFFBRUYsT0FBTyxDQUFDLElBQUk7QUFBQSxNQUNkO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0w7QUFBQSxVQUNFLE1BQU07QUFBQSxVQUNOLGFBQWEsUUFBUSxXQUFXLGFBQWE7QUFBQSxRQUMvQztBQUFBLFFBQ0E7QUFBQSxVQUNFLE1BQU07QUFBQSxVQUNOLGFBQWEsUUFBUSxXQUFXLEtBQUs7QUFBQSxRQUN2QztBQUFBLFFBQ0E7QUFBQSxVQUNFLE1BQU07QUFBQSxVQUNOLGFBQWEsUUFBUSxXQUFXLGFBQWE7QUFBQSxRQUMvQztBQUFBO0FBQUEsUUFFQTtBQUFBLFVBQ0UsTUFBTTtBQUFBLFVBQ04sYUFBYSxRQUFRLFdBQVcsUUFBUTtBQUFBLFFBQzFDO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLGNBQWM7QUFBQSxNQUNaLFNBQVMsQ0FBQyxjQUFjO0FBQUEsSUFDMUI7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLFFBQVEsUUFBUSxXQUFXLE1BQU07QUFBQSxNQUNqQyxhQUFhO0FBQUEsTUFDYixlQUFlO0FBQUEsUUFDYixPQUFPO0FBQUEsVUFDTCxNQUFNLFFBQVEsV0FBVyxZQUFZO0FBQUEsUUFDdkM7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
