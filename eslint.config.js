import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  // Stricter rules for production code (exclude test files)
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.*", "**/__tests__/**", "**/__mocks__/**", "**/test-utils/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);