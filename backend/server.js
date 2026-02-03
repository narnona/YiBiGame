// 引入 Express 和常用中间件
const express = require('express');
const cors = require('cors');
// 引入数据库连接、区块链索引服务和模型
const sequelize = require('./src/config/database');
const indexer = require('./src/services/indexer');
const Level = require('./src/models/Level');
const SolveRecord = require('./src/models/SolveRecord');
const { Op } = require('sequelize');

// 创建一个 Express 应用
const app = express();
const PORT = process.env.PORT || 3001;

// 开启跨域支持（允许前端不同域名访问）
app.use(cors());
// 解析 JSON 请求体
app.use(express.json());

// 路由：获取所有关卡（支持分页和排序）
// 参数：?page=1&limit=10&sort=levelId|createdAt|completionCount|size&order=asc|desc
// 默认：每页10项，不排序（按数据库默认顺序返回）
app.get('/levels', async (req, res) => {
  try {
    const { page = 1, limit = 10, sort, order } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    let queryOptions = {
      attributes: ['levelId', 'name', 'size', 'hintCount', 'completionCount', 'createdAt'],
      limit: limitNum,
      offset: offset
    };

    if (sort && order) {
      const orderField = sort === 'createdAt' ? 'createdAt' : 
                         sort === 'completionCount' ? 'completionCount' :
                         sort === 'size' ? 'size' : 'levelId';
      const orderDirection = order === 'asc' ? 'ASC' : 'DESC';
      queryOptions.order = [[orderField, orderDirection]];
    } else {
      queryOptions.order = [['levelId', 'ASC']];
    }

    const { count, rows } = await Level.findAndCountAll(queryOptions);

    const result = rows.map(l => ({
      index: l.levelId,
      levelId: l.levelId,
      name: l.name,
      size: l.size,
      hintCount: l.hintCount,
      completionCount: l.completionCount,
      createdAt: l.createdAt
    }));

    res.json({
      data: result,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 路由：获取单个关卡的完整数据（包含 hints）
app.get('/levels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const level = await Level.findByPk(id);
    if (!level) {
      return res.status(404).json({ error: 'Level not found' });
    }
    res.json(level);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 路由：获取某地址的统计数据
// 返回该地址创建过的关卡列表和通关记录列表
app.get('/stats/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const createdLevels = await Level.findAll({
      where: { creator: address },
      attributes: ['levelId', 'name', 'createdAt', 'completionCount']
    });
    const solvedRecords = await SolveRecord.findAll({
      where: { solverAddress: address }
    });
    res.json({
      created: createdLevels,
      solved: solvedRecords
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 路由：获取 indexer 状态（调试用）
app.get('/debug/indexer-status', async (req, res) => {
  try {
    res.json({
      hasWsProvider: !!indexer.wsProvider,
      hasContractWs: !!indexer.contractWs,
      isSyncing: indexer.isSyncing,
      lastSyncedBlock: indexer.lastSyncedBlock,
      wsUrl: process.env.WS_URL ? process.env.WS_URL.substring(0, 20) + '...' : 'none',
      contractAddress: process.env.CONTRACT_ADDRESS
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 启动函数：
// 1) 同步模型到数据库（如无表则创建）
// 2) 初始化区块链索引服务（同步历史 + 开启监听）
// 3) 启动 HTTP 服务
async function start() {
  try {
    console.log('[BOOT] Syncing database models...');
    await sequelize.sync();
    console.log('[BOOT] Database models synced.');
    console.log('[BOOT] Initializing blockchain indexer (realtime first, then historical)...');
    await indexer.init();
    console.log('[BOOT] Indexer initialized.');
    app.listen(PORT, () => {
      console.log(`[BOOT] HTTP server started at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
  }
}

start();
