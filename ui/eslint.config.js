import js from "@eslint/js";
import globals from "globals";
import noOnlyTests from "eslint-plugin-no-only-tests";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist", "node_modules", "coverage"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-unused-vars": "off",
    },
  },
  {
    // Type-aware rules — src only, not test or config files
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/**/*.test.{ts,tsx}",
      "src/**/__tests__/**/*.{ts,tsx}",
    ],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
  {
    // no-only-tests: error in test files
    files: ["src/**/*.test.{ts,tsx,js,jsx}", "src/**/__tests__/**/*.{ts,tsx,js,jsx}"],
    plugins: {
      "no-only-tests": noOnlyTests,
    },
    rules: {
      "no-only-tests/no-only-tests": "error",
    },
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
  },
  {
    files: ["src/**/*.test.{ts,tsx}", "src/**/*.test.{js,jsx}", "vitest.config.ts"],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
  },
  {
    files: ["src/components/dashboard/widgetRegistry.tsx", "src/context/TweaksContext.jsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
