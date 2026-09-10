import js from "@eslint/js";
import {defineConfig} from "eslint/config";
import tseslint from "typescript-eslint";
import globals from "globals";
import stylistic from "@stylistic/eslint-plugin";

export default defineConfig([
    {ignores: ["**/node_modules/**", "www-root/**", "plugins/*/dist/**", "test-build/**"]},
    {
        files: ["**/*.ts"],
        extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
        plugins: {"@stylistic": stylistic},
        languageOptions: {
            parserOptions: {projectService: true, tsconfigRootDir: import.meta.dirname},
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unused-vars": ["error", {ignoreRestSiblings: true}],
            "@typescript-eslint/consistent-type-imports": "error",
            "eqeqeq": ["error", "always"],
            "no-var": "error",
            "prefer-const": "error",
            "curly": ["error", "all"],
            "@stylistic/lines-between-class-members": ["error", "always"],
            "@stylistic/padding-line-between-statements": [
                "error",
                // Separate local setup from the statements that use it, while
                // allowing related declarations to stay in one compact group.
                {blankLine: "always", prev: "*", next: ["const", "let"]},
                {blankLine: "always", prev: ["const", "let"], next: "*"},
                {blankLine: "any", prev: ["const", "let"], next: ["const", "let"]},
                {blankLine: "always", prev: "import", next: "*"},
                {blankLine: "never", prev: "import", next: "import"},
                {blankLine: "always", prev: "*", next: ["function", "class", "interface", "type", "if", "for", "while", "do", "switch", "try", "return"]},
                {blankLine: "always", prev: ["function", "class", "interface", "type", "block-like"], next: "*"},
                {blankLine: "always", prev: "export", next: "*"},
                {blankLine: "always", prev: "*", next: "export"},
                // Keep overload signatures together with their implementation.
                {blankLine: "any", prev: "function-overload", next: ["function-overload", "function"]},
            ],
        },
    },
    {
        files: ["**/*.js", "**/*.mjs"],
        extends: [js.configs.recommended],
        languageOptions: {globals: globals.node},
        rules: {"no-unused-vars": ["error", {ignoreRestSiblings: true}]},
    },
]);
