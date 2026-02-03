# Smart Contracts

YiBi Game 智能合约，使用 Foundry 开发。

详细部署指南请查看 [项目根目录 README](../README.md)。

## Foundry 工具

- **Forge**: 以太坊测试框架
- **Cast**: 交互命令行工具
- **Anvil**: 本地以太坊节点

## 本地开发

### 安装 Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 构建

```bash
forge build
```

### 测试

```bash
forge test
```

### 格式化

```bash
forge fmt
```

### 本地节点

```bash
anvil
```

## 部署到 Sepolia

1. 配置环境变量 (参考 `.env.example`):

```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入你的 RPC URL 和私钥

3. 部署合约:

```bash
forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

4. 部署成功后，更新以下文件中的合约地址:
   - `../.env` 中的 `CONTRACT_ADDRESS`
   - `../frontend/.env.local` 中的 `VITE_CONTRACT_ADDRESS`

## 合约验证

在 Etherscan 上验证合约:

```bash
forge verify-contract <CONTRACT_ADDRESS> src/YiBiGame.sol:YiBiGame --chain-id 11155111 --watch
```

## 使用 Cast 交互

```bash
# 读取合约状态
cast call <CONTRACT_ADDRESS> "levelCount()" --rpc-url $RPC_URL

# 发送交易
cast send <CONTRACT_ADDRESS> "createLevel((string,uint8,uint8,(uint8,uint8)[],address)[],uint8[])" "..." --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```
