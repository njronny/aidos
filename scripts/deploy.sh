#!/bin/bash
# ============================================
# Aidos 一键部署脚本
# 支持 Docker 和 Kubernetes 部署
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认配置
DEPLOY_MODE="${DEPLOY_MODE:-docker}"  # docker | k8s
NAMESPACE="${NAMESPACE:-aidos}"
IMAGE_NAME="${IMAGE_NAME:-aidos/api}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-}"

# 打印函数
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助
show_help() {
    cat << EOF
Aidos 一键部署脚本

用法: $0 [选项]

选项:
    -m, --mode MODE       部署模式: docker | k8s (默认: docker)
    -n, --namespace NS    Kubernetes 命名空间 (默认: aidos)
    -i, --image IMAGE     Docker 镜像名称 (默认: aidos/api)
    -t, --tag TAG         Docker 镜像标签 (默认: latest)
    -r, --registry URL   Docker Registry 地址
    -h, --help            显示帮助信息

示例:
    # Docker 部署
    $0 --mode docker

    # Kubernetes 部署
    $0 --mode k8s --namespace production

    # 指定镜像
    $0 --mode k8s --image my-registry.com/aidos/api --tag v1.0.0

环境变量:
    DEPLOY_MODE     部署模式
    NAMESPACE       Kubernetes 命名空间
    IMAGE_NAME      Docker 镜像名称
    IMAGE_TAG       Docker 镜像标签
    REGISTRY        Docker Registry 地址

EOF
}

# 解析参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -m|--mode)
                DEPLOY_MODE="$2"
                shift 2
                ;;
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            -i|--image)
                IMAGE_NAME="$2"
                shift 2
                ;;
            -t|--tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            -r|--registry)
                REGISTRY="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                print_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# 检查依赖
check_dependencies() {
    print_info "检查依赖..."
    
    if [[ "$DEPLOY_MODE" == "docker" ]]; then
        if ! command -v docker &> /dev/null; then
            print_error "Docker 未安装"
            exit 1
        fi
        if ! command -v docker-compose &> /dev/null; then
            print_error "Docker Compose 未安装"
            exit 1
        fi
    elif [[ "$DEPLOY_MODE" == "k8s" ]]; then
        if ! command -v kubectl &> /dev/null; then
            print_error "kubectl 未安装"
            exit 1
        fi
    fi
    
    print_success "依赖检查完成"
}

# Docker 部署
deploy_docker() {
    print_info "开始 Docker 部署..."
    
    # 构建镜像
    FULL_IMAGE="${REGISTRY}${IMAGE_NAME}:${IMAGE_TAG}"
    print_info "构建镜像: ${FULL_IMAGE}"
    
    docker build -t "${FULL_IMAGE}" .
    
    # 启动服务
    print_info "启动 Docker Compose 服务..."
    docker-compose up -d
    
    print_success "Docker 部署完成!"
    print_info "服务地址: http://localhost:3000"
}

# Kubernetes 部署
deploy_k8s() {
    print_info "开始 Kubernetes 部署..."
    
    # 构建镜像
    FULL_IMAGE="${REGISTRY}${IMAGE_NAME}:${IMAGE_TAG}"
    print_info "镜像: ${FULL_IMAGE}"
    
    # 构建并推送镜像
    if [[ -n "$REGISTRY" ]]; then
        print_info "构建并推送镜像到 Registry..."
        docker build -t "${FULL_IMAGE}" .
        docker push "${FULL_IMAGE}"
    else
        print_warning "未指定 Registry，使用本地镜像"
        docker build -t "${FULL_IMAGE}" .
    fi
    
    # 创建命名空间
    print_info "创建命名空间: ${NAMESPACE}"
    kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
    
    # 部署 ConfigMap
    print_info "部署 ConfigMap..."
    kubectl apply -f k8s/configmap.yaml -n "${NAMESPACE}"
    
    # 部署 Deployment
    print_info "部署 Deployment..."
    # 替换镜像
    sed "s|image: aidos/api:latest|image: ${FULL_IMAGE}|g" k8s/deployment.yaml | kubectl apply -n "${NAMESPACE}" -f -
    
    # 部署 Service
    print_info "部署 Service..."
    kubectl apply -f k8s/service.yaml -n "${NAMESPACE}"
    
    # 部署 Ingress (可选)
    if [[ "$DEPLOY_INGRESS" == "true" ]]; then
        print_info "部署 Ingress..."
        kubectl apply -f k8s/ingress.yaml -n "${NAMESPACE}"
    fi
    
    # 等待部署完成
    print_info "等待 Pod 就绪..."
    kubectl rollout status deployment/aidos-api -n "${NAMESPACE}" --timeout=300s
    
    # 显示状态
    print_success "部署完成!"
    print_info "服务状态:"
    kubectl get all -n "${NAMESPACE}"
    
    # 显示 Ingress (如果部署)
    if [[ "$DEPLOY_INGRESS" == "true" ]]; then
        print_info "Ingress 状态:"
        kubectl get ingress -n "${NAMESPACE}"
    fi
}

# 主函数
main() {
    parse_args "$@"
    
    echo "========================================"
    echo "  Aidos 部署脚本"
    echo "========================================"
    echo "部署模式: ${DEPLOY_MODE}"
    echo "命名空间: ${NAMESPACE}"
    echo "镜像: ${IMAGE_NAME}:${IMAGE_TAG}"
    echo "========================================"
    
    check_dependencies
    
    case "$DEPLOY_MODE" in
        docker)
            deploy_docker
            ;;
        k8s)
            deploy_k8s
            ;;
        *)
            print_error "不支持的部署模式: ${DEPLOY_MODE}"
            show_help
            exit 1
            ;;
    esac
}

# 入口点
main "$@"
