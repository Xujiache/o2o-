-- O2O 数据库初始化(仅创建库与字符集;表结构由 TypeORM migration 创建)
CREATE DATABASE IF NOT EXISTS `o2o`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `o2o_test`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- 业务用户授权(MYSQL_USER 已由镜像创建,这里再补全 o2o_test 权限)
GRANT ALL PRIVILEGES ON `o2o`.* TO 'o2o'@'%';
GRANT ALL PRIVILEGES ON `o2o_test`.* TO 'o2o'@'%';
FLUSH PRIVILEGES;
