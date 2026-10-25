import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

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
    // Project-wide rule overrides
    rules: {
      // setState inside useEffect is a common and legitimate React pattern for:
      // - hydration guards (setMounted(true))
      // - syncing derived state from props
      // - loading data and updating loading/error state
      // The rule is too strict for this codebase.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // Test file overrides
    files: ["__tests__/**", "__mocks__/**", "jest.setup.ts"],
    rules: {
      // require() is necessary inside jest.mock() factory functions (hoisting)
      "@typescript-eslint/no-require-imports": "off",
      // Anonymous default exports are fine in mock files
      "import/no-anonymous-default-export": "off",
    },
  },
]);

export default eslintConfig;
