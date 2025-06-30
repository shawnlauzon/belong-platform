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
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        hooks: resolve(__dirname, "src/hooks.ts"),
        types: resolve(__dirname, "src/types.ts"),
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
