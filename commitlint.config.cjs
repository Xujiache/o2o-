/** Conventional Commits with extended type list for monorepo. */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 修 bug
        'docs',     // 文档
        'style',    // 代码风格(不影响逻辑)
        'refactor', // 重构
        'perf',     // 性能优化
        'test',     // 测试
        'build',    // 构建/工具
        'ci',       // CI 配置
        'chore',    // 杂项
        'revert',   // 回滚
        'wip',      // 进行中(慎用,不应进入主分支)
      ],
    ],
    'subject-case': [0],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
