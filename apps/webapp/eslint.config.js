import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // This repo intentionally uses `any` in a few boundary layers (Convex anyApi, window.Telegram, etc.).
      '@typescript-eslint/no-explicit-any': 'off',

      // shadcn/ui modules export both components and utilities (e.g. variants); allow this.
      'react-refresh/only-export-components': 'off',

      // Some UI helpers intentionally use randomization for skeletons; allow.
      'react-hooks/purity': 'off',

      // Allow unused parameters/vars prefixed with `_`.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
)
