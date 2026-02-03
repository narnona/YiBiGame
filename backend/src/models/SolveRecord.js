// SolveRecord 表模型定义，记录玩家通关的链上事件
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SolveRecord = sequelize.define('SolveRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  levelId: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  solverAddress: {
    type: DataTypes.STRING,
    allowNull: false
  },
  txHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE, // 区块时间（从 LevelSolved 事件对应区块获取）
    allowNull: false
  }
}, {
  timestamps: false, // 关闭 Sequelize 自动的时间戳
  indexes: [
    { fields: ['levelId'] },
    { fields: ['solverAddress'] }
  ]
});

module.exports = SolveRecord;
