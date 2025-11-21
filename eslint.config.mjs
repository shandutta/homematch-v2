import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import nextPlugin from '@next/eslint-plugin-next'
import jestPlugin from 'eslint-plugin-jest'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Global ignores to exclude legacy and generated/output directories from default lint
  {
    ignores: [
      'v1-reference/**/*',
      'migrated_data/**/*',
      'playwright-report/**/*',
      'test-results/**/*',
      '.next/**/*',
      '.next-test/**/*',
      'out/**/*',
      'dist/**/*',
      '.corepack-cache/**/*',
      'homematch-original-analysis/**/*',
      'node_modules/**/*',
      '.pnpm-store/**/*',
      'coverage/**/*',
    ],
  },
  js.configs.recommended,
  // JS-only block
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        React: 'readonly',
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      '@next/next': nextPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,

      '@next/next/no-html-link-for-pages': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
    settings: { react: { version: 'detect' } },
  },
  // TypeScript block with project-aware parser so DOM lib is respected
  // Limit to app source and tests to avoid project parse errors on top-level configs/scripts
  {
    files: [
      'src/**/*.{ts,tsx}',
      '__tests__/**/*.{ts,tsx}',
      'middleware.ts',
      'vitest.setup.ts',
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname,
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        React: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      '@next/next': nextPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,

      '@next/next/no-html-link-for-pages': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // Important in TS projects: rely on TS for undefined symbols
      'no-undef': 'off',
    },
    settings: { react: { version: 'detect' } },
  },
  {
    files: ['**/*.js', '*.config.{js,ts,mjs}', 'scripts/**/*', 'jest.setup.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off', // Often disabled in TS projects in favor of TS's own checks
    },
  },
  // Ensure Next config (ESM TS) is parsed with TS parser to avoid "Unexpected token {"
  {
    files: ['next.config.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },
  // Ensure Playwright configs are parsed with the TS parser (ESM)
  {
    files: ['playwright.config.ts', 'playwright.remote.config.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },
  // Legacy v1-reference override: fully relax rules and stop reporting in CI
  {
    files: ['v1-reference/**/*'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
      'no-useless-escape': 'off',
      'no-empty': 'off',
      'jest/no-disabled-tests': 'off',
      'jest/expect-expect': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-redeclare': 'off',
    },
  },
  {
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/__tests__/**/*',
      '**/__mocks__/**/*',
      'v1-reference/**/*.test.ts',
      'v1-reference/**/*.spec.ts',
      'v1-reference/lib/test-utils/**/*.ts',
    ],
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      'jest/no-conditional-expect': 'off', // TODO: Refactor test files to eliminate conditional expects
      'jest/expect-expect': [
        'warn',
        {
          assertFunctionNames: [
            'expect',
            'assertions.assertExists',
            'assertions.assertNotExists',
            'assertions.assertCount',
          ],
        },
      ],
    },
  },
  {
    files: ['**/__tests__/fixtures/**/*'],
    rules: {
      'react-hooks/rules-of-hooks': 'off', // Playwright fixtures use 'use' function which is not a React hook
    },
  },
  {
    ignores: [
      '.next/**/*',
      '.next-test/**/*',
      'out/**/*',
      'dist/**/*',
      'homematch-original-analysis/**/*',
      'node_modules/**/*',
      '.pnpm-store/**/*',
      'coverage/**/*',
    ],
  },
  prettierConfig,
]
