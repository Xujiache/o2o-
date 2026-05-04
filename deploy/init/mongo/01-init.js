// O2O MongoDB 初始化:创建业务库与读写用户
const dbName = process.env.MONGO_INITDB_DATABASE || 'o2o';
const appUser = 'o2o';
const appPwd = 'o2o_mongo_dev';

db = db.getSiblingDB(dbName);

// 创建业务用户(若已存在则跳过)
const existing = db.getUser(appUser);
if (!existing) {
  db.createUser({
    user: appUser,
    pwd: appPwd,
    roles: [
      { role: 'readWrite', db: dbName },
      { role: 'readWrite', db: `${dbName}_test` },
    ],
  });
}

// 预创建集合(便于索引在 T11/T15 时附加)
['audit_log_detail', 'operation_log', 'trace_log'].forEach((c) => {
  if (!db.getCollectionNames().includes(c)) {
    db.createCollection(c);
  }
});

print(`[o2o] mongo init done for db=${dbName}`);
