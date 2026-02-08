import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'supabase/',
      '.expo/',
      'dist/',
      'build/',
      'scripts/',
      'babel.config.js',
      'metro.config.js',
      'tailwind.config.js',
      'nativewind-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // React hooks — the critical ones
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // TypeScript essentials
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],

      // Turn off base rule (TS plugin handles it)
      'no-unused-vars': 'off',

      // Allow require() for RN image imports
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
