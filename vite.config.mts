import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ["src/**/*"],
      exclude: ["**/*.test.*", "**/*.spec.*", "**/test-utils/**"],
      tsConfigFilePath: "./tsconfig.types.json",
      skipDiagnostics: true,
      noEmitOnError: false,
      strictOutput: false,
      logLevel: "silent",
      rollupTypes: true,
      copyDtsFiles: false,
      bundledPackages: ["@belongnetwork/api", "@belongnetwork/types", "@belongnetwork/core"],
      beforeWriteFile: (filePath, content) => {
        // Remove any remaining relative imports to packages
        const fixedContent = content
          .replace(/from ['"]\.\.\/packages\/[^'"]+['"]/g, (match) => {
            // Extract the package name
            const packageMatch = match.match(/\.\.\/packages\/(api|types|core)/);
            if (packageMatch) {
              return `from '@belongnetwork/platform'`;
            }
            return match;
          })
          .replace(/import\(['"]\.\.\/packages\/[^'"]+['"]\)/g, "import('@belongnetwork/platform')");
        
        return {
          filePath,
          content: fixedContent,
        };
      },
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        hooks: resolve(__dirname, "src/hooks.ts"),
        types: resolve(__dirname, "src/types.ts"),
        providers: resolve(__dirname, "src/providers.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => {
        return `${entryName}.${format === "es" ? "es.js" : "cjs.js"}`;
      },
    },
    rollupOptions: {
      external: [
        "react",
        "@supabase/supabase-js",
        "@tanstack/react-query",
        "loglevel",
        "nanoid",
        "zod",
      ],
    },
  },
});
