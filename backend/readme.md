# Backend

YiBiGame 后端服务，使用 Express 提供 REST API，使用 Sequelize 连接 PostgreSQL，使用 ethers 监听链上合约事件并将数据写入数据库。

详细部署指南请查看 [项目根目录 README](../README.md)。

## 概述
- 技术栈：Node.js、Express、Sequelize、PostgreSQL、ethers v6
- 职责划分：
  - HTTP API：提供关卡列表、关卡详情、地址统计等
  - 索引器：通过 WebSocket 订阅实时事件、通过 HTTP 批量同步历史事件
  - 数据存储：使用 PostgreSQL 保存关卡与通关记录

## 目录结构
```
backend/
  server.js                 // 应用入口：启动数据库同步、索引器、HTTP 服务
  package.json              // 依赖与启动脚本
  src/
    config/database.js      // 数据库连接（读取根目录 .env 的 DATABASE_URL）
    models/Level.js         // 关卡模型
    models/SolveRecord.js   // 通关记录模型
    services/indexer.js     // 区块链索引服务（历史 + 实时）
  contract/
    YiBiGame.abi            // 合约 ABI（索引器读取）
```

注意：.env 放在仓库根目录（与 backend 同级），索引器与数据库配置均读取根目录的 .env。

## 先决条件
- Node.js（建议 18+）
- PostgreSQL（本地或远程实例均可访问）

## 安装与启动
1) 安装依赖
```bash
cd backend
npm install
```
2) 配置环境变量（在仓库根目录创建 .env，示例见下文）
3) 启动服务
```bash
npm start         # 或 node server.js
```
启动日志包含阶段标识：
- [BOOT] 同步数据库模型、初始化索引器、启动 HTTP 服务
- [INDEXER] 初始化 Provider、绑定合约、启动实时监听、同步历史事件

## 环境变量
在仓库根目录创建 .env，示例：
```
# PostgreSQL 连接串（示例为本地数据库 yibigame_dev）
DATABASE_URL=postgres://<user>@localhost:5432/yibigame_dev

# 合约与 RPC
CONTRACT_ADDRESS=0xYourYiBiGameContractAddress
RPC_URL=http://127.0.0.1:8545
WS_URL=ws://127.0.0.1:8546

# 历史同步起始区块（>0 生效；未配置或 <=0 将跳过历史同步）
START_BLOCK=1
# 每批同步的区块数量（默认 10）
BLOCK_BATCH_SIZE=10

# 后端 HTTP 服务端口（默认 3001）
PORT=3001
```
说明：
- WS_URL 必须配置；未配置将直接抛错并停止索引器初始化
- 历史同步在启动时读取固定的当前区块作为上限，并按 BLOCK_BATCH_SIZE 批量查询

## 区块链索引器行为
- 实时监听：使用 WS Provider 订阅 LevelCreated、LevelSolved 事件，事件到达即写入数据库
- 历史同步：当 START_BLOCK > 0 时，使用 HTTP Provider 从 START_BLOCK 到启动时的最新块批量回放事件
- 关键文件：[indexer.js](file:///Users/jlyao/OtherPOJ/YiBiGameBackend_Trae/backend/src/services/indexer.js)

## API 设计
基础 URL：`http://localhost:3001`
- GET `/levels?sort=createdAt|completionCount`
  - 返回关卡列表（包含 index、name、size、hintCount、completionCount、createdAt）
  - `sort` 可选：按创建时间或完成次数排序
- GET `/levels/:id`
  - 返回指定关卡的完整数据（包含 hints）
- GET `/stats/:address`
  - 返回该地址创建过的关卡列表与通关记录列表

示例：
```bash
curl http://localhost:3001/levels
curl http://localhost:3001/levels/1
curl http://localhost:3001/stats/0xYourAddress
```

## 查看与清空数据库
连接 PostgreSQL 后，可使用 SQL 查询：
```sql
SELECT * FROM "Levels" ORDER BY "createdAt" DESC;
SELECT * FROM "SolveRecords" ORDER BY "timestamp" DESC;
```
清空表数据（谨慎执行）：
```sql
TRUNCATE TABLE "Levels" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "SolveRecords" RESTART IDENTITY CASCADE;
```

## 常见问题
- 角色不存在或连接失败
  - 确认 DATABASE_URL 用户存在并有权限；确保 PostgreSQL 服务已启动
- WS_URL 未配置
  - 索引器会报错停止；请在 .env 中配置 WS_URL（ws 或 wss）
- ABI 文件缺失
  - 确保 `backend/contract/YiBiGame.abi` 存在且与部署的合约一致

## 开发提示
- `npm start` 与 `npm run dev` 都执行 `node server.js`
- CORS 默认开启，前端可跨域访问
- Sequelize 默认关闭 SQL 日志；如需排查可在 `src/config/database.js` 打开 `logging`

