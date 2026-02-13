/**
 * AIDOS API 使用示例
 * 
 * 本文件展示如何使用 AIDOS REST API 进行项目管理、需求管理、任务管理和代理管理
 * 
 * 运行方式:
 * 1. 启动API服务器: npm run api
 * 2. 运行示例: npx ts-node examples/api-examples.ts
 * 
 * 或使用 curl 命令 (见下方)
 */

const BASE_URL = process.env.AIDOS_API_URL || 'http://localhost:3000';

// ==================== 工具函数 ====================

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// ==================== Projects API 示例 ====================

export async function demoProjects() {
  console.log('\n========== Projects API ==========\n');

  // 1. 获取项目列表
  console.log('1. 获取项目列表:');
  const projects = await request('/api/projects?page=1&limit=10');
  console.log(JSON.stringify(projects, null, 2));

  // 2. 创建项目
  console.log('\n2. 创建项目:');
  const newProject = await request('/api/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: '示例项目',
      description: '这是一个使用AIDOS API创建的示例项目',
    }),
  });
  console.log(JSON.stringify(newProject, null, 2));
  
  // 保存项目ID供后续使用
  const projectId = (newProject as any).data?.id;
  
  if (projectId) {
    // 3. 获取单个项目
    console.log('\n3. 获取单个项目:');
    const project = await request(`/api/projects/${projectId}`);
    console.log(JSON.stringify(project, null, 2));

    // 4. 更新项目
    console.log('\n4. 更新项目:');
    const updatedProject = await request(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'active',
        description: '更新后的描述',
      }),
    });
    console.log(JSON.stringify(updatedProject, null, 2));

    // 5. 删除项目
    console.log('\n5. 删除项目:');
    const deleteResult = await request(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
    console.log(JSON.stringify(deleteResult, null, 2));
  }
}

// ==================== Requirements API 示例 ====================

export async function demoRequirements(projectId: string) {
  console.log('\n========== Requirements API ==========\n');

  // 1. 获取需求列表
  console.log('1. 获取需求列表:');
  const requirements = await request(`/api/requirements?projectId=${projectId}`);
  console.log(JSON.stringify(requirements, null, 2));

  // 2. 创建需求
  console.log('\n2. 创建需求:');
  const newRequirement = await request('/api/requirements', {
    method: 'POST',
    body: JSON.stringify({
      projectId,
      title: '用户登录功能',
      description: '实现用户注册和登录功能',
      priority: 'high',
    }),
  });
  console.log(JSON.stringify(newRequirement, null, 2));

  const requirementId = (newRequirement as any).data?.id;

  if (requirementId) {
    // 3. 获取单个需求
    console.log('\n3. 获取单个需求:');
    const requirement = await request(`/api/requirements/${requirementId}`);
    console.log(JSON.stringify(requirement, null, 2));

    // 4. 更新需求
    console.log('\n4. 更新需求:');
    const updatedRequirement = await request(`/api/requirements/${requirementId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'in_progress',
      }),
    });
    console.log(JSON.stringify(updatedRequirement, null, 2));

    return requirementId;
  }
  
  return null;
}

// ==================== Tasks API 示例 ====================

export async function demoTasks(requirementId: string) {
  console.log('\n========== Tasks API ==========\n');

  // 1. 获取任务列表
  console.log('1. 获取任务列表:');
  const tasks = await request(`/api/tasks?requirementId=${requirementId}`);
  console.log(JSON.stringify(tasks, null, 2));

  // 2. 创建任务
  console.log('\n2. 创建任务:');
  const newTask = await request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      requirementId,
      title: '实现登录API',
      description: '实现用户登录的RESTful API',
    }),
  });
  console.log(JSON.stringify(newTask, null, 2));

  const taskId = (newTask as any).data?.id;

  if (taskId) {
    // 3. 获取单个任务
    console.log('\n3. 获取单个任务:');
    const task = await request(`/api/tasks/${taskId}`);
    console.log(JSON.stringify(task, null, 2));

    // 4. 更新任务
    console.log('\n4. 更新任务:');
    const updatedTask = await request(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'completed',
        result: 'API实现完成',
      }),
    });
    console.log(JSON.stringify(updatedTask, null, 2));

    return taskId;
  }
  
  return null;
}

// ==================== Agents API 示例 ====================

export async function demoAgents() {
  console.log('\n========== Agents API ==========\n');

  // 1. 获取代理列表
  console.log('1. 获取代理列表:');
  const agents = await request('/api/agents');
  console.log(JSON.stringify(agents, null, 2));

  // 2. 创建代理
  console.log('\n2. 创建代理:');
  const newAgent = await request('/api/agents', {
    method: 'POST',
    body: JSON.stringify({
      name: '开发者代理',
      type: 'developer',
      capabilities: ['code_generation', 'code_review'],
    }),
  });
  console.log(JSON.stringify(newAgent, null, 2));

  const agentId = (newAgent as any).data?.id;

  if (agentId) {
    // 3. 获取单个代理
    console.log('\n3. 获取单个代理:');
    const agent = await request(`/api/agents/${agentId}`);
    console.log(JSON.stringify(agent, null, 2));

    // 4. 更新代理
    console.log('\n4. 更新代理:');
    const updatedAgent = await request(`/api/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'busy',
      }),
    });
    console.log(JSON.stringify(updatedAgent, null, 2));

    return agentId;
  }
  
  return null;
}

// ==================== WebSocket 示例 ====================

export function demoWebSocket() {
  console.log('\n========== WebSocket 示例 ==========\n');
  console.log('WebSocket连接示例 (JavaScript):');
  console.log(`
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  console.log('WebSocket connected');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// 发送消息
ws.send(JSON.stringify({ type: 'ping' }));

// 关闭连接
ws.close();
  `);
}

// ==================== 主函数 ====================

async function main() {
  try {
    // 检查服务器是否运行
    console.log('检查服务器状态...');
    const health = await request('/health');
    console.log('服务器状态:', health);

    // 运行示例
    await demoProjects();
    
    // 先创建一个项目用于演示
    const project = await request('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: 'API测试项目',
        description: '用于API示例测试',
      }),
    });
    const projectId = (project as any).data?.id;
    
    if (projectId) {
      await demoRequirements(projectId);
    }
    
    await demoAgents();
    demoWebSocket();

    console.log('\n========== 所有示例完成 ==========\n');
  } catch (error) {
    console.error('错误:', error);
    console.log('\n提示: 请确保API服务器正在运行 (npm run api)');
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

export default main;
