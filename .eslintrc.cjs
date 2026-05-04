/** Root ESLint config — apps/packages may extend with their own .eslintrc.cjs */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
  ],
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-unresolved': 'off',
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
  },
  settings: {
    'import/resolver': {
      typescript: { project: ['tsconfig.base.json', 'apps/*/tsconfig.json', 'packages/*/tsconfig.json'] },
      node: true,
    },
  },
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    'coverage',
    'unpackage',
    '*.cjs',
    '*.js',
    '!.eslintrc.cjs',
  ],
};
