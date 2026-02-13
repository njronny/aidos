#!/bin/bash

# AIDOS 测试运行脚本
# 用法: 
#   ./scripts/test.sh all        - 运行所有测试
#   ./scripts/test.sh e2e        - 运行所有E2E测试
#   ./scripts/test.sh auth       - 运行认证测试
#   ./scripts/test.sh crud       - 运行CRUD测试
#   ./scripts/test.sh workflow   - 运行工作流测试
#   ./scripts/test.sh smoke      - 运行烟雾测试

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查服务是否运行
check_service() {
    if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
        print_warning "启动API服务..."
        npm run api &
        API_PID=$!
        # 等待服务启动
        for i in {1..30}; do
            if curl -s http://localhost:3000/health > /dev/null 2>&1; then
                print_success "API服务已启动"
                return 0
            fi
            sleep 1
        done
        print_error "API服务启动失败"
        return 1
    fi
    print_success "API服务已运行"
    return 0
}

# 运行E2E测试
run_e2e() {
    print_warning "运行E2E测试..."
    npx playwright test --project=chromium
}

# 运行认证测试
run_auth() {
    print_warning "运行认证测试..."
    npx playwright test e2e/auth.test.ts --project=chromium
}

# 运行CRUD测试
run_crud() {
    print_warning "运行CRUD测试..."
    npx playwright test e2e/crud.test.ts --project=chromium
}

# 运行工作流测试
run_workflow() {
    print_warning "运行工作流测试..."
    npx playwright test e2e/workflow-enhanced.test.ts --project=chromium
}

# 运行原有测试
run_original() {
    print_warning "运行原有E2E测试..."
    npx playwright test e2e/api.test.ts e2e/workflow.test.ts e2e/websocket.test.ts --project=chromium
}

# 运行烟雾测试
run_smoke() {
    print_warning "运行烟雾测试..."
    npx playwright test --grep="@smoke" --project=chromium
}

# 运行性能测试
run_performance() {
    print_warning "运行性能测试..."
    
    # 检查k6是否安装
    if ! command -v k6 &> /dev/null; then
        print_error "k6未安装，请先安装: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
    
    check_service
    
    k6 run performance/api-performance.js --duration=30s --vus=5
    k6 run performance/auth-performance.js --duration=30s --vus=5
}

# 主函数
case "$1" in
    all)
        print_warning "运行所有测试..."
        run_original
        run_auth
        run_crud
        run_workflow
        print_success "所有测试完成!"
        ;;
    e2e)
        run_e2e
        ;;
    auth)
        check_service
        run_auth
        ;;
    crud)
        check_service
        run_crud
        ;;
    workflow)
        check_service
        run_workflow
        ;;
    original)
        check_service
        run_original
        ;;
    smoke)
        check_service
        run_smoke
        ;;
    performance)
        run_performance
        ;;
    *)
        echo "用法: $0 {all|e2e|auth|crud|workflow|original|smoke|performance}"
        echo ""
        echo "测试选项:"
        echo "  all         - 运行所有测试"
        echo "  e2e         - 运行所有E2E测试"
        echo "  auth        - 运行认证测试"
        echo "  crud        - 运行CRUD测试"
        echo "  workflow    - 运行工作流测试"
        echo "  original    - 运行原有E2E测试"
        echo "  smoke       - 运行烟雾测试"
        echo "  performance - 运行性能测试"
        exit 1
        ;;
esac
