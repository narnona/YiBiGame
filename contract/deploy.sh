#!/bin/bash

# YiBiGame 合约部署脚本 - Sepolia 测试网
# 使用方法: source .env && ./deploy.sh

set -e

echo "========================================="
echo "  YiBiGame 合约部署 - Sepolia 测试网"
echo "========================================="
echo ""

# 检查环境变量
if [ -z "$RPC_URL" ]; then
    echo "❌ 错误: RPC_URL 未设置"
    echo "   请先运行: source .env"
    exit 1
fi

if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ 错误: PRIVATE_KEY 未设置"
    echo "   请先运行: source .env"
    exit 1
fi

if [ -z "$ETHERSCAN_API_KEY" ]; then
    echo "⚠️  警告: ETHERSCAN_API_KEY 未设置"
    echo "   合约将无法自动验证"
    echo ""
    read -p "是否继续？(y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        exit 1
    fi
fi

# 显示部署信息
echo "📋 部署配置:"
echo "   RPC URL: ${RPC_URL:0:50}..."
echo "   Chain ID: 11155111 (Sepolia)"
echo ""

# 检查余额
DEPLOYER_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
echo "🔍 部署地址: $DEPLOYER_ADDRESS"

BALANCE=$(cast balance $RPC_URL $DEPLOYER_ADDRESS)
echo "💰 账户余额: $BALANCE ETH"
echo ""

# 检查余额是否足够
BALANCE_WEI=$(echo $BALANCE | awk '{print $1}')
BALANCE_ETH=$(cast to-unit $BALANCE_WEI ether)
MIN_BALANCE=0.01

if (( $(echo "$BALANCE_ETH < $MIN_BALANCE" | bc -l) )); then
    echo "❌ 错误: 余额不足！"
    echo "   当前余额: $BALANCE_ETH ETH"
    echo "   需要至少: $MIN_BALANCE ETH"
    echo ""
    echo "   请从水龙头获取测试币:"
    echo "   https://sepoliafaucet.com/"
    exit 1
fi

echo "✅ 余额充足，开始部署..."
echo ""

# 编译合约
echo "🔨 编译合约..."
forge build
echo "✅ 编译完成"
echo ""

# 模拟部署
echo "🔍 模拟部署..."
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY
echo "✅ 模拟成功"
echo ""

# 确认部署
read -p "确认部署到 Sepolia？(y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "部署已取消"
    exit 0
fi

# 部署合约
echo "🚀 正在部署..."
echo ""

if [ -n "$ETHERSCAN_API_KEY" ]; then
    # 自动验证
    forge script script/Deploy.s.sol:DeployScript \
        --rpc-url $RPC_URL \
        --private-key $PRIVATE_KEY \
        --broadcast \
        --verify \
        --etherscan-api-key $ETHERSCAN_API_KEY \
        --delay 15
else
    # 不验证
    forge script script/Deploy.s.sol:DeployScript \
        --rpc-url $RPC_URL \
        --private-key $PRIVATE_KEY \
        --broadcast
fi

echo ""
echo "========================================="
echo "  ✅ 部署完成！"
echo "========================================="
echo ""
echo "📝 后续步骤:"
echo "   1. 记录上面的合约地址"
echo "   2. 在 Etherscan 查看合约:"
echo "      https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS"
echo "   3. 更新 docs/API.md 中的合约地址"
echo ""
