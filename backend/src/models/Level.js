// Level 表模型定义，存储链上创建的关卡信息
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Level = sequelize.define('Level', {
  levelId: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  creator: {
    type: DataTypes.STRING,
    allowNull: false
  },
  txHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  hints: {
    type: DataTypes.JSON, // 存储提示坐标数组，如 [{coord:{x,y}, value}]
    allowNull: false
  },
  hintCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  completionCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  createdAt: {
    type: DataTypes.DATE, // 区块时间（从链上事件的区块时间戳转换）
    allowNull: false
  }
}, {
  timestamps: false, // 关闭 Sequelize 自动的 createdAt/updatedAt
  indexes: [
    { fields: ['creator'] },
    { fields: ['createdAt'] },
    { fields: ['completionCount'] }
  ]
});

module.exports = Level;
