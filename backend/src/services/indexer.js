// 区块链索引服务：负责连接 RPC（HTTP）用于历史同步，连接 WS（WebSocket）用于实时事件监听
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const Level = require('../models/Level');
const SolveRecord = require('../models/SolveRecord');
// 加载 .env 以读取 RPC_URL、CONTRACT_ADDRESS、START_BLOCK 等
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

class IndexerService {
  constructor() {
    this.httpProvider = null;   // 用于历史数据同步
    this.wsProvider = null;     // 用于实时事件监听
    this.contractHttp = null;
    this.contractWs = null;
    this.isSyncing = false;
    this.lastSyncedBlock = null;
  }

  async init() {
    try {
      console.log('[INDEXER] init begin');
      // 初始化 HTTP Provider（历史同步）
      this.httpProvider = new ethers.JsonRpcProvider(process.env.RPC_URL);
      console.log(`[INDEXER] http provider: ${process.env.RPC_URL}`);
      // 初始化 WebSocket Provider（实时监听），如果未提供则回退到轮询模式
      if (!process.env.WS_URL) {
        throw new Error('WS_URL is not configured. Please set WS_URL in .env to enable realtime event subscription.');
      }
      this.wsProvider = new ethers.WebSocketProvider(process.env.WS_URL);
      console.log(`[INDEXER] ws provider: ${process.env.WS_URL}`);
      // 读取 ABI 文件并创建合约实例（只读）
      const abiPath = path.resolve(__dirname, '../../../contract/YiBiGame.abi');
      const abiRaw = fs.readFileSync(abiPath, 'utf8');
      const abi = JSON.parse(abiRaw);
      this.contractHttp = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, this.httpProvider);
      if (this.wsProvider) {
        this.contractWs = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, this.wsProvider);
      }
      console.log(`[INDEXER] contracts bound at ${process.env.CONTRACT_ADDRESS}`);
      // 先启动实时监听，再进行历史同步
      console.log('[INDEXER] starting realtime listeners...');
      this.startListening();
      console.log('[INDEXER] realtime listeners started.');
      console.log('[INDEXER] starting historical sync...');
      await this.syncHistoricalEvents();
      console.log('[INDEXER] historical sync finished.');
    } catch (error) {
      console.error('Indexer init failed:', error);
    }
  }

  async syncHistoricalEvents(startOverride) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      // 从 .env 读取 START_BLOCK；未配置或 <= 0 则跳过历史同步
      const startEnv = process.env.START_BLOCK;
      const configuredStart = typeof startOverride === 'number' ? startOverride : Number(startEnv);
      if (!startEnv || !Number.isFinite(configuredStart) || configuredStart <= 0) {
        console.warn('[INDEXER] START_BLOCK not configured or <= 0; skipping historical sync.');
        return;
      }
      // 固定当前块高度，作为历史同步的上限
      const endBlock = await this.httpProvider.getBlockNumber();
      console.log(`[INDEXER] sync plan: from ${configuredStart} to ${endBlock}`);
      // 批大小
      const batchSize = process.env.BLOCK_BATCH_SIZE ? Number(process.env.BLOCK_BATCH_SIZE) : 10;
      console.log(`[INDEXER] batch size: ${batchSize}`);
      // 逐批同步，从 START_BLOCK 到固定的 endBlock
      let from = configuredStart;
      while (from <= endBlock) {
        const to = Math.min(from + batchSize - 1, endBlock);
        const createdEvents = await this.contractHttp.queryFilter('LevelCreated', from, to);
        for (const event of createdEvents) {
          await this.handleLevelCreated(event);
        }
        const solvedEvents = await this.contractHttp.queryFilter('LevelSolved', from, to);
        for (const event of solvedEvents) {
          await this.handleLevelSolved(event);
        }
        console.log(`[INDEXER] processed batch ${from}-${to}: created=${createdEvents.length}, solved=${solvedEvents.length}`);
        this.lastSyncedBlock = to;
        from = to + 1;
        // 每批处理完后延时 0.2 秒，避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      console.log(`[INDEXER] sync complete at block ${this.lastSyncedBlock}`);
    } catch (error) {
      console.error('Error syncing history:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  startListening() {
    if (!this.contractWs) {
      throw new Error('WebSocket provider not initialized; cannot start realtime listeners.');
    }
    console.log('[INDEXER] attaching realtime listeners...');
    
    this.contractWs.on('LevelCreated', async (levelId, creator, name, size, hintsCount, event) => {
      console.log(`[INDEXER][RT] LevelCreated id=${levelId} creator=${creator} size=${size} hints=${hintsCount}`);
      await this.handleLevelCreated(event);
    });
    
    this.contractWs.on('LevelSolved', async (levelId, solver, pathLength, isFirst, event) => {
      console.log(`[INDEXER][RT] LevelSolved id=${levelId} solver=${solver} pathLen=${pathLength} isFirst=${isFirst}`);
      await this.handleLevelSolved(event);
    });
    
    console.log('[INDEXER] realtime listeners attached successfully');
    console.log('[INDEXER] listeners check: LevelCreated?', typeof this.contractWs.listenerCount === 'function' ? this.contractWs.listenerCount('LevelCreated') : 'unknown');
    console.log('[INDEXER] listeners check: LevelSolved?', typeof this.contractWs.listenerCount === 'function' ? this.contractWs.listenerCount('LevelSolved') : 'unknown');
  }

  async handleLevelCreated(event) {
    try {
      const args = event.args;
      const levelId = args.levelId || args[0];
      const creator = args.creator || args[1];
      const name = args.name || args[2];
      const size = args.size || args[3];
      const hintsCount = args.hintsCount || args[4];
      const txHash = event.log?.transactionHash || event.transactionHash || null;
      
      if (!txHash) {
        console.error('[INDEXER] LevelCreated event missing txHash:', event);
        return;
      }
      
      const existing = await Level.findByPk(levelId.toString());
      if (existing) return;
      
      let createdAt;
      try {
        if (event.log && event.log.getBlock) {
          const block = await event.log.getBlock();
          createdAt = new Date(block.timestamp * 1000);
        } else if (event.getBlock) {
          const block = await event.getBlock();
          createdAt = new Date(block.timestamp * 1000);
        } else {
          throw new Error('No getBlock method available');
        }
      } catch (blockErr) {
        console.warn('[INDEXER] Failed to get block for createdAt:', blockErr.message);
        createdAt = new Date();
      }
      
      const levelData = await this.contractHttp.getLevel(levelId);
      const hintsJson = levelData.hints.map(h => ({
        coord: { x: Number(h.coord.x), y: Number(h.coord.y) },
        value: Number(h.value)
      }));
      
      await Level.create({
        levelId: levelId.toString(),
        name: name,
        size: Number(size),
        creator: creator,
        txHash: txHash,
        hints: hintsJson,
        hintCount: Number(hintsCount),
        completionCount: 0,
        createdAt: createdAt
      });
      console.log(`[INDEXER] saved Level ${levelId} (name=${name}) txHash=${txHash}`);
    } catch (err) {
      console.error('Failed to handle LevelCreated:', err);
    }
  }

  async handleLevelSolved(event) {
    try {
      const args = event.args;
      const levelId = args.levelId || args[0];
      const solver = args.solver || args[1];
      const txHash = event.log?.transactionHash || event.transactionHash || null;
      
      if (!txHash) {
        console.error('[INDEXER] LevelSolved event missing txHash:', event);
        return;
      }
      
      let timestamp;
      try {
        if (event.log && event.log.getBlock) {
          const block = await event.log.getBlock();
          timestamp = new Date(block.timestamp * 1000);
        } else if (event.getBlock) {
          const block = await event.getBlock();
          timestamp = new Date(block.timestamp * 1000);
        } else {
          throw new Error('No getBlock method available');
        }
      } catch (blockErr) {
        console.warn('[INDEXER] Failed to get block for timestamp:', blockErr.message);
        timestamp = new Date();
      }
      
      // 写入通关记录
      await SolveRecord.create({
        levelId: levelId.toString(),
        solverAddress: solver,
        txHash: txHash,
        timestamp: timestamp
      });
      // 增加该关卡的完成次数
      const level = await Level.findByPk(levelId.toString());
      if (level) {
        await level.increment('completionCount');
      }
      console.log(`[INDEXER] saved SolveRecord level=${levelId} solver=${solver} txHash=${txHash}`);
    } catch (err) {
      console.error('Failed to handle LevelSolved:', err);
    }
  }
}

module.exports = new IndexerService();
