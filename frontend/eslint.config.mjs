import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Allow explicit any for rapid development - can be tightened later
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused vars prefixed with underscore
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      // Disable strict React Compiler rules that create false positives
      "react-hooks/immutability": "off",
      // Allow setState in effects - common pattern for data fetching on mount
      "react-hooks/set-state-in-effect": "off",
      // Allow impure functions in async handlers (common pattern)
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;
