// Sequelize 是一个常用的 Node.js ORM，用来操作 PostgreSQL
const { Sequelize } = require('sequelize');
const path = require('path');
// 加载根目录的 .env 文件，用于读取 DATABASE_URL
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

// 建立数据库连接
// 优先使用 .env 中的 DATABASE_URL，其次使用默认本地连接
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/yibigame_dev', {
  dialect: 'postgres',
  logging: false // 关闭 SQL 语句日志输出
});

module.exports = sequelize;
