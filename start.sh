#!/bin/bash
# 舆论分析系统启动脚本

echo "=========================================="
echo "舆论分析系统 - 舆论传播机制与意见领袖分析"
echo "=========================================="

# 设置工作目录
cd "$(dirname "$0")"

# 检查Python环境
echo "检查Python环境..."
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到python3"
    exit 1
fi

# 启动后端服务
echo ""
echo "启动后端服务 (端口 8000)..."
cd backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 检查后端是否启动成功
if curl -s http://localhost:8000/ > /dev/null 2>&1; then
    echo "后端服务启动成功!"
else
    echo "警告: 后端服务可能启动失败，请检查..."
fi

echo ""
echo "=========================================="
echo "服务已启动!"
echo "=========================================="
echo ""
echo "前端开发服务器: http://localhost:3000"
echo "后端API: http://localhost:8000"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

# 等待用户中断
wait
