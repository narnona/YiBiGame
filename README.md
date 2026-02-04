# YiBi Game

一个基于区块链的 N×N 网格连线益智游戏。玩家需要从数字 1 开始，连接相邻格子，按提示数字顺序完成路径。

Play: https://yibigame.fun/

## 功能特性

### 游戏规则

1. 游戏在 N×N 网格上进行
2. 玩家以 数字1 为起点
3. 连接上下左右相邻的格子
4. 必须按提示数字的顺序经过提示点
5. 最终按顺序连完所有格子，即为完成关卡

### 关卡创建

1. 绘制完整路径 (覆盖所有格子)
2. 选择提示点 (至少 1 个，不能全部)
3. 提交到区块链

## 技术栈

### 前端
- React 19 + TypeScript
- Vite 6
- Tailwind CSS 4
- Wagmi 2 + RainbowKit (Web3 集成)
- React Query (数据获取)
- React Router (路由)

### 后端
- Node.js + Express
- PostgreSQL + Sequelize ORM
- Ethers.js v6 (区块链交互)

### 智能合约
- Solidity
- Foundry (开发框架)
- 部署在 Ethereum Sepolia 测试网

## 项目结构

```
.
├── frontend/          # 前端应用
├── backend/           # 后端服务
├── contract/          # 智能合约
└── .env              # 环境变量配置
```

## 快速开始

### 前置要求

- Node.js 18+
- PostgreSQL
- Web3 钱包 (如 MetaMask)

### 1. 克隆项目

```bash
git clone https://github.com/narnona/YiBiGame.git
cd YiBiGame
```

### 2. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
# PostgreSQL 数据库
DATABASE_URL=postgres://<user>@localhost:5432/yibigame_dev

# 合约地址 (Sepolia 测试网， 于 10182959 区块部署)
CONTRACT_ADDRESS=0x1294CAD0eD3b97b8052AfceF040A3d65dF3C2811

# Alchemy RPC
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
WS_URL=wss://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# 历史同步起始区块 (设为 0 跳过历史同步)
START_BLOCK=0

# 每批同步区块数
BLOCK_BATCH_SIZE=10

# 后端服务端口
PORT=3001
```

在 `frontend/` 目录创建 `.env.local` 文件：

```env
VITE_CONTRACT_ADDRESS=0x1294CAD0eD3b97b8052AfceF040A3d65dF3C2811
```

### 3. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 4. 启动数据库

确保 PostgreSQL 服务正在运行，并创建数据库：

```bash
createdb yibigame_dev
```

### 5. 启动服务

```bash
# 启动后端 (终端 1)
cd backend
npm start

# 启动前端 (终端 2)
cd frontend
npm run dev
```

- 前端: http://localhost:3000
- 后端 API: http://localhost:3001


## API 文档

### GET /levels
获取关卡列表

参数:
- `sort`: `createdAt` | `completionCount` (排序方式)

返回:
```json
[
  {
    "id": 1,
    "name": "关卡名称",
    "size": 4,
    "hintCount": 3,
    "completionCount": 10,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### GET /levels/:id
获取关卡详情

返回:
```json
{
  "id": 1,
  "name": "关卡名称",
  "size": 4,
  "hints": [
    {"coord": {"x": 0, "y": 0}, "value": 1}
  ]
}
```

### GET /stats/:address
获取用户统计

返回:
```json
{
  "created": [...],
  "solved": [...]
}
```

## 数据库表结构

### Levels
| 字段 | 类型 | 说明 |
|------|------|------|
| levelId | INTEGER | 关卡 ID (链上) |
| name | STRING | 关卡名称 |
| size | INTEGER | 网格大小 |
| hintCount | INTEGER | 提示数量 |
| completionCount | INTEGER | 完成次数 |
| creator | STRING | 创建者地址 |
| createdAt | DATE | 创建时间 |

### SolveRecords
| 字段 | 类型 | 说明 |
|------|------|------|
| levelId | INTEGER | 关卡 ID |
| solverAddress | STRING | 解答者地址 |
| timestamp | DATE | 解答时间 |

---

## 智能合约部署

在 `contract/` 目录下：

```bash
# 配置 .env (参考 .env.example)
cp .env.example .env

# 部署到 Sepolia
forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast

# 更新 frontend/contract.ts 中的 CONTRACT_ADDRESS
# 更新 .env 中的 CONTRACT_ADDRESS
```
