module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "prettier", // Disable ESLint rules that conflict with Prettier
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  rules: {
    // TypeScript specific rules
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/prefer-const": "error",

    // General rules
    "no-console": "off", // Allow console.log in backend
    "prefer-const": "error",
    "no-var": "error",
    "object-shorthand": "error",
    "prefer-arrow-callback": "error",
  },
  ignorePatterns: [
    "dist",
    "node_modules",
    "*.js", // Ignore compiled JS files
    "coverage",
  ],
};

