/**
 * 前端显示测试工具
 * 用于测试各种前端显示场景：文本、列表、表格、图表、响应式布局等
 */

// ==================== React 组件 ====================

import React, { useState, useEffect } from 'react';

/**
 * 测试前端显示主组件
 * 提供多种测试场景：文本、列表、表格、分页、加载状态等
 */
export const DisplayTestPanel = ({ config = {} }) => {
  const [testData, setTestData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('list'); // list | table | grid
  
  const {
    dataSource = [],
    pageSize = 10,
    showPagination = true,
    showLoading = true,
    theme = 'light'
  } = config;

  useEffect(() => {
    if (dataSource.length > 0) {
      setTestData(dataSource);
    } else {
      loadTestData();
    }
  }, [dataSource]);

  const loadTestData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-data');
      const result = await response.json();
      setTestData(result.data || []);
    } catch (error) {
      console.error('加载测试数据失败:', error);
      setTestData(generateMockData(50));
    }
    setLoading(false);
  };

  const generateMockData = (count) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      title: `测试标题 ${i + 1}`,
      description: `这是第 ${i + 1} 条测试描述内容，用于验证前端显示效果。`,
      status: ['active', 'pending', 'completed'][i % 3],
      value: Math.floor(Math.random() * 1000),
      createdAt: new Date(Date.now() - i * 86400000).toISOString()
    }));
  };

  const paginatedData = showPagination
    ? testData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : testData;

  const totalPages = Math.ceil(testData.length / pageSize);

  const getStatusColor = (status) => {
    const colors = {
      active: '#4CAF50',
      pending: '#FF9800',
      completed: '#2196F3'
    };
    return colors[status] || '#999';
  };

  return (
    <div className={`display-test-panel theme-${theme}`}>
      <div className="test-controls">
        <div className="control-group">
          <label>视图模式:</label>
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
            <option value="list">列表视图</option>
            <option value="table">表格视图</option>
            <option value="grid">网格视图</option>
          </select>
        </div>
        <button onClick={loadTestData} disabled={loading}>
          {loading ? '加载中...' : '刷新数据'}
        </button>
      </div>

      {loading && showLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>加载测试数据中...</p>
        </div>
      )}

      {!loading && (
        <>
          {viewMode === 'list' && (
            <TestListView data={paginatedData} getStatusColor={getStatusColor} />
          )}
          {viewMode === 'table' && (
            <TestTableView data={paginatedData} getStatusColor={getStatusColor} />
          )}
          {viewMode === 'grid' && (
            <TestGridView data={paginatedData} getStatusColor={getStatusColor} />
          )}
        </>
      )}

      {showPagination && totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            上一页
          </button>
          <span>{currentPage} / {totalPages}</span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * 列表视图组件
 */
const TestListView = ({ data, getStatusColor }) => (
  <div className="test-list-view">
    {data.map(item => (
      <div key={item.id} className="list-item">
        <div className="item-header">
          <h3>{item.title}</h3>
          <span 
            className="status-badge"
            style={{ backgroundColor: getStatusColor(item.status) }}
          >
            {item.status}
          </span>
        </div>
        <p className="item-description">{item.description}</p>
        <div className="item-meta">
          <span>值: {item.value}</span>
          <span>时间: {new Date(item.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    ))}
  </div>
);

/**
 * 表格视图组件
 */
const TestTableView = ({ data, getStatusColor }) => (
  <div className="test-table-view">
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>标题</th>
          <th>描述</th>
          <th>状态</th>
          <th>值</th>
          <th>创建时间</th>
        </tr>
      </thead>
      <tbody>
        {data.map(item => (
          <tr key={item.id}>
            <td>{item.id}</td>
            <td>{item.title}</td>
            <td>{item.description}</td>
            <td>
              <span 
                className="status-badge"
                style={{ backgroundColor: getStatusColor(item.status) }}
              >
                {item.status}
              </span>
            </td>
            <td>{item.value}</td>
            <td>{new Date(item.createdAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/**
 * 网格视图组件
 */
const TestGridView = ({ data, getStatusColor }) => (
  <div className="test-grid-view">
    {data.map(item => (
      <div key={item.id} className="grid-card">
        <div className="card-header">
          <h3>{item.title}</h3>
          <span 
            className="status-badge"
            style={{ backgroundColor: getStatusColor(item.status) }}
          >
            {item.status}
          </span>
        </div>
        <p className="card-description">{item.description}</p>
        <div className="card-stats">
          <div className="stat">
            <label>值</label>
            <span>{item.value}</span>
          </div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * 响应式布局测试组件
 */
export const ResponsiveTest = () => {
  const [breakpoint, setBreakpoint] = useState('');
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 576) setBreakpoint('xs');
      else if (width < 768) setBreakpoint('sm');
      else if (width < 992) setBreakpoint('md');
      else if (width < 1200) setBreakpoint('lg');
      else setBreakpoint('xl');
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="responsive-test">
      <div className="breakpoint-indicator">
        当前断点: <strong>{breakpoint}</strong> 
        ({window.innerWidth}px)
      </div>
      <div className="responsive-grid">
        <div className="col-12 col-sm-6 col-md-4 col-lg-3">列1</div>
        <div className="col-12 col-sm-6 col-md-4 col-lg-3">列2</div>
        <div className="col-12 col-sm-6 col-md-4 col-lg-3">列3</div>
        <div className="col-12 col-sm-6 col-md-4 col-lg-3">列4</div>
      </div>
    </div>
  );
};

// ==================== Express API ====================

/**
 * Express 路由 - 测试数据 API
 */
const express = require('express');
const router = express.Router();

/**
 * @route GET /api/test-data
 * @desc 获取测试数据
 * @query {number} page - 页码
 * @query {number} pageSize - 每页数量
 */
router.get('/test-data', (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  
  const total = 100;
  const data = Array.from({ length: parseInt(pageSize) }, (_, i) => ({
    id: (parseInt(page) - 1) * parseInt(pageSize) + i + 1,
    title: `测试标题 ${(parseInt(page) - 1) * parseInt(pageSize) + i + 1}`,
    description: `这是第 ${(parseInt(page) - 1) * parseInt(pageSize) + i + 1} 条测试描述内容。`,
    status: ['active', 'pending', 'completed'][i % 3],
    value: Math.floor(Math.random() * 1000),
    createdAt: new Date(Date.now() - i * 86400000).toISOString()
  }));

  res.json({
    success: true,
    data,
    pagination: {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  });
});

/**
 * @route POST /api/test-data
 * @desc 创建测试数据
 */
router.post('/test-data', (req, res) => {
  const { title, description, status, value } = req.body;
  
  if (!title) {
    return res.status(400).json({
      success: false,
      message: '标题不能为空'
    });
  }

  const newItem = {
    id: Date.now(),
    title,
    description: description || '',
    status: status || 'pending',
    value: value || 0,
    createdAt: new Date().toISOString()
  };

  res.status(201).json({
    success: true,
    data: newItem,
    message: '创建成功'
  });
});

/**
 * @route GET /api/test-data/:id
 * @desc 获取单条测试数据
 */
router.get('/test-data/:id', (req, res) => {
  const { id } = req.params;
  
  // 模拟数据
  const item = {
    id: parseInt(id),
    title: `测试标题 ${id}`,
    description: '测试描述内容',
    status: 'active',
    value: Math.floor(Math.random() * 1000),
    createdAt: new Date().toISOString()
  };

  res.json({
    success: true,
    data: item
  });
});

/**
 * @route PUT /api/test-data/:id
 * @desc 更新测试数据
 */
router.put('/test-data/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  res.json({
    success: true,
    data: { id: parseInt(id), ...updates },
    message: '更新成功'
  });
});

/**
 * @route DELETE /api/test-data/:id
 * @desc 删除测试数据
 */
router.delete('/test-data/:id', (req, res) => {
  const { id } = req.params;
  
  res.json({
    success: true,
    message: `删除成功 ID: ${id}`
  });
});

// ==================== 测试工具类 ====================

/**
 * 前端显示测试工具类
 */
class DisplayTestUtils {
  /**
   * 生成模拟数据
   */
  static generateMockData(count, options = {}) {
    const {
      titlePrefix = '测试',
      descPrefix = '描述',
      statuses = ['active', 'pending', 'completed']
    } = options;

    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      title: `${titlePrefix} ${i + 1}`,
      description: `${descPrefix} ${i + 1} - 用于测试前端显示效果`,
      status: statuses[i % statuses.length],
      value: Math.floor(Math.random() * 1000),
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      tags: Array.from({ length: Math.floor(Math.random() * 4) + 1 }, 
        (_, j) => `标签${j + 1}`)
    }));
  }

  /**
   * 分页数据
   */
  static paginate(data, page = 1, pageSize = 10) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      data: data.slice(start, end),
      pagination: {
        page,
        pageSize,
        total: data.length,
        totalPages: Math.ceil(data.length / pageSize)
      }
    };
  }

  /**
   * 过滤数据
   */
  static filter(data, filters = {}) {
    return data.filter(item => {
      if (filters.status && item.status !== filters.status) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        if (!item.title.toLowerCase().includes(search) && 
            !item.description.toLowerCase().includes(search)) {
          return false;
        }
      }
      if (filters.minValue && item.value < filters.minValue) return false;
      if (filters.maxValue && item.value > filters.maxValue) return false;
      return true;
    });
  }

  /**
   * 排序数据
   */
  static sort(data, sortBy = 'id', order = 'asc') {
    return [...data].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (order === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
  }

  /**
   * 验证响应式断点
   */
  static getBreakpoint() {
    const width = window.innerWidth;
    if (width < 576) return 'xs';
    if (width < 768) return 'sm';
    if (width < 992) return 'md';
    if (width < 1200) return 'lg';
    return 'xl';
  }

  /**
   * 格式化日期
   */
  static formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * 防抖函数
   */
  static debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * 节流函数
   */
  static throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// ==================== 导出 ====================

export default DisplayTestUtils;
export { DisplayTestPanel, ResponsiveTest, router as testApiRouter };
