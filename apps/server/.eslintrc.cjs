/** Server-specific ESLint extends root */
module.exports = {
  extends: ['../../.eslintrc.cjs'],
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  env: {
    node: true,
    jest: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-extraneous-class': 'off',
  },
  ignorePatterns: ['dist', 'node_modules', '*.cjs', '*.js'],
};
