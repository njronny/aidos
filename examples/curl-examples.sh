# AIDOS API cURL 示例
# 
# 使用方法: 将命令中的变量替换为实际值后执行
# 
# 基础URL
BASE_URL="${BASE_URL:-http://localhost:3000}"

# ============================================
# 健康检查
# ============================================

# API信息
curl -X GET "$BASE_URL/api"

# 健康检查
curl -X GET "$BASE_URL/health"


# ============================================
# Projects API
# ============================================

# 获取项目列表
curl -X GET "$BASE_URL/api/projects?page=1&limit=10"

# 创建项目
curl -X POST "$BASE_URL/api/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "我的项目",
    "description": "项目描述"
  }'

# 获取单个项目 (替换 {id})
curl -X GET "$BASE_URL/api/projects/{id}"

# 更新项目 (替换 {id})
curl -X PUT "$BASE_URL/api/projects/{id}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "更新后的项目名",
    "status": "active"
  }'

# 删除项目 (替换 {id})
curl -X DELETE "$BASE_URL/api/projects/{id}"


# ============================================
# Requirements API
# ============================================

# 获取需求列表
curl -X GET "$BASE_URL/api/requirements?page=1&limit=10"

# 获取某个项目的需求
curl -X GET "$BASE_URL/api/requirements?projectId={projectId}"

# 创建需求 (需要有效的 projectId)
curl -X POST "$BASE_URL/api/requirements" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "{projectId}",
    "title": "用户登录功能",
    "description": "实现用户登录功能",
    "priority": "high"
  }'

# 获取单个需求 (替换 {id})
curl -X GET "$BASE_URL/api/requirements/{id}"

# 更新需求 (替换 {id})
curl -X PUT "$BASE_URL/api/requirements/{id}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "priority": "critical"
  }'

# 删除需求 (替换 {id})
curl -X DELETE "$BASE_URL/api/requirements/{id}"


# ============================================
# Tasks API
# ============================================

# 获取任务列表
curl -X GET "$BASE_URL/api/tasks?page=1&limit=10"

# 获取某个需求的任务
curl -X GET "$BASE_URL/api/tasks?requirementId={requirementId}"

# 创建任务 (需要有效的 requirementId)
curl -X POST "$BASE_URL/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "requirementId": "{requirementId}",
    "title": "实现登录API",
    "description": "实现RESTful登录接口"
  }'

# 获取单个任务 (替换 {id})
curl -X GET "$BASE_URL/api/tasks/{id}"

# 更新任务 (替换 {id})
curl -X PUT "$BASE_URL/api/tasks/{id}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "result": "任务完成"
  }'

# 删除任务 (替换 {id})
curl -X DELETE "$BASE_URL/api/tasks/{id}"


# ============================================
# Agents API
# ============================================

# 获取代理列表
curl -X GET "$BASE_URL/api/agents?page=1&limit=10"

# 按类型筛选
curl -X GET "$BASE_URL/api/agents?type=developer"

# 按状态筛选
curl -X GET "$BASE_URL/api/agents?status=idle"

# 创建代理
curl -X POST "$BASE_URL/api/agents" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "开发者代理",
    "type": "developer",
    "capabilities": ["code_generation", "code_review"]
  }'

# 获取单个代理 (替换 {id})
curl -X GET "$BASE_URL/api/agents/{id}"

# 更新代理 (替换 {id})
curl -X PUT "$BASE_URL/api/agents/{id}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "busy",
    "currentTaskId": "{taskId}"
  }'

# 删除代理 (替换 {id})
curl -X DELETE "$BASE_URL/api/agents/{id}"


# ============================================
# 完整工作流示例
# ============================================

# 1. 创建项目
PROJECT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "新功能开发项目",
    "description": "开发新功能"
  }')
PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r '.data.id')
echo "创建项目: $PROJECT_ID"

# 2. 创建需求
REQ_RESPONSE=$(curl -s -X POST "$BASE_URL/api/requirements" \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"title\": \"用户管理模块\",
    \"priority\": \"high\"
  }")
REQ_ID=$(echo $REQ_RESPONSE | jq -r '.data.id')
echo "创建需求: $REQ_ID"

# 3. 创建任务
TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/tasks" \
  -H "Content-Type: application/json" \
  -d "{
    \"requirementId\": \"$REQ_ID\",
    \"title\": \"实现用户CRUD接口\"
  }")
TASK_ID=$(echo $TASK_RESPONSE | jq -r '.data.id')
echo "创建任务: $TASK_ID"

# 4. 创建代理
AGENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "全栈开发代理",
    "type": "developer",
    "capabilities": ["frontend", "backend"]
  }')
AGENT_ID=$(echo $AGENT_RESPONSE | jq -r '.data.id')
echo "创建代理: $AGENT_ID"

# 5. 分配任务给代理
curl -s -X PUT "$BASE_URL/api/tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"agentId\": \"$AGENT_ID\",
    \"status\": \"assigned\"
  }"

# 6. 查看结果
echo ""
echo "=== 项目详情 ==="
curl -s "$BASE_URL/api/projects/$PROJECT_ID" | jq '.'

echo ""
echo "=== 需求详情 ==="
curl -s "$BASE_URL/api/requirements/$REQ_ID" | jq '.'

echo ""
echo "=== 任务详情 ==="
curl -s "$BASE_URL/api/tasks/$TASK_ID" | jq '.'
