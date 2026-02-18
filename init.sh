#!/bin/bash

# ============================================
# 小A 开发环境初始化脚本
# ============================================
#
# 用途: 启动开发服务器并运行基本验证
# 使用: ./init.sh
#
# ============================================

set -e

echo "🚀 小A 开发环境初始化"
echo ""

# 检查 bun 是否安装
if ! command -v bun &> /dev/null; then
    echo "❌ 错误: bun 未安装"
    echo "   请访问 https://bun.sh 安装 bun"
    exit 1
fi

echo "✅ bun 已安装: $(bun --version)"

# 检查 node 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: node 未安装"
    exit 1
fi

echo "✅ node 已安装: $(node --version)"

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 安装依赖..."
    bun install
fi

echo ""
echo "📊 项目状态检查"
echo "-------------------"

# 类型检查
echo "🔍 类型检查..."
bun run check-types 2>/dev/null || echo "⚠️  类型检查有警告"

# 代码质量检查
echo "🔍 代码质量检查..."
bun run check 2>/dev/null || echo "⚠️  代码质量检查有警告"

echo ""
echo "🎯 可用命令"
echo "-------------------"
echo "  bun run start        - 启动开发模式"
echo "  bun run test         - 运行单元测试"
echo "  bun run test:e2e     - 运行端到端测试"
echo "  bun run package      - 打包应用"
echo ""
echo "📝 功能清单: feature_list.json"
echo "📝 进度记录: claude-progress.txt"
echo ""

# 询问是否启动开发服务器
read -p "是否启动开发服务器? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🎮 启动开发服务器..."
    bun run start
fi
