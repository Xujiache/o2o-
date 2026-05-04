module.exports = {
  // Vue SFC 走 prettier(根 eslint 未装 vue-eslint-parser;各端 vitest 已覆盖逻辑)
  '*.vue': ['prettier --write'],
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml,html,css,scss,less}': ['prettier --write'],
};
