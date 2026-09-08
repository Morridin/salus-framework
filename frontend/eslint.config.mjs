import js from "@eslint/js";
import globals from "globals";

const sourceFiles = ["plugins/a11e/js/**/*.js", "plugins/5e61/main.js"];

export default [
    {
        ignores: ["**/node_modules/**", "www-root/**"],
    },
    {
        files: [...sourceFiles, "tests/**/*.js", "eslint.config.mjs"],
        rules: {
            ...js.configs.recommended.rules,
            "eqeqeq": ["error", "always"],
            "no-var": "error",
            "prefer-const": "error",
            // Destructuring may intentionally omit fields before forwarding data.
            "no-unused-vars": ["error", {ignoreRestSiblings: true}],
        },
    },
    {
        files: sourceFiles,
        languageOptions: {
            sourceType: "module",
            globals: globals.browser,
        },
    },
    {
        files: ["plugins/5e61/main.js"],
        languageOptions: {sourceType: "script"},
    },
    {
        files: ["tests/**/*.js"],
        languageOptions: {
            // Existing tests use both ESM and CommonJS; Node detects ESM syntax.
            sourceType: "module",
            globals: globals.node,
        },
    },
    {
        files: ["eslint.config.mjs"],
        languageOptions: {globals: globals.node},
    },
];
