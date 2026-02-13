/**
 * 科学计算器 - Scientific Calculator
 * A fully functional scientific calculator with memory, history, and advanced functions
 */

class ScientificCalculator {
  constructor() {
    this.currentInput = '0';
    this.expression = '';
    this.memory = 0;
    this.history = [];
    this.isRadian = true; // 使用弧度制
    
    // 从localStorage加载历史记录
    this.loadHistory();
    
    // 绑定UI元素
    this.resultEl = document.getElementById('result');
    this.expressionEl = document.getElementById('expression');
    this.historyPanel = document.getElementById('historyPanel');
    this.historyList = document.getElementById('historyList');
  }

  // ========== 输入操作 ==========
  
  /**
   * 插入数字或运算符
   */
  insert(value) {
    if (this.currentInput === '0' && value !== '.') {
      this.currentInput = value;
    } else if (value === '.' && this.currentInput.includes('.')) {
      // 避免重复小数点
      return;
    } else {
      this.currentInput += value;
    }
    this.updateDisplay();
  }

  /**
   * 插入数学函数
   */
  insertFunction(func) {
    const funcs = {
      'sin': 'sin(',
      'cos': 'cos(',
      'tan': 'tan(',
      'log': 'log(',
      'ln': 'ln(',
      'sqrt': 'sqrt(',
      'pow2': '^2',
      'pow3': '^3',
      'powY': '^',
      'factorial': 'factorial(',
      'pi': 'π',
      'e': 'e',
      'exp': 'exp(',
      'abs': 'abs(',
      'inverse': '^(-1)'
    };
    
    const value = funcs[func];
    if (value) {
      if (this.currentInput === '0') {
        this.currentInput = value;
      } else {
        this.currentInput += value;
      }
      this.updateDisplay();
    }
  }

  /**
   * 清除显示
   */
  clear() {
    this.currentInput = '0';
    this.expression = '';
    this.updateDisplay();
  }

  /**
   * 清除当前输入
   */
  clearEntry() {
    this.currentInput = '0';
    this.updateDisplay();
  }

  /**
   * 退格删除
   */
  backspace() {
    if (this.currentInput.length > 1) {
      this.currentInput = this.currentInput.slice(0, -1);
    } else {
      this.currentInput = '0';
    }
    this.updateDisplay();
  }

  /**
   * 正负号切换
   */
  toggleSign() {
    if (this.currentInput !== '0') {
      if (this.currentInput.startsWith('-')) {
        this.currentInput = this.currentInput.slice(1);
      } else {
        this.currentInput = '-' + this.currentInput;
      }
    }
    this.updateDisplay();
  }

  // ========== 计算 ==========

  /**
   * 执行计算
   */
  calculate() {
    try {
      let expression = this.currentInput;
      
      // 预处理表达式
      expression = this.preprocessExpression(expression);
      
      // 验证表达式
      if (!this.isValidExpression(expression)) {
        throw new Error('Invalid expression');
      }

      // 计算结果
      const result = this.evaluate(expression);
      
      // 保存到历史
      this.addToHistory(this.currentInput, result);
      
      // 更新显示
      this.expression = this.currentInput;
      this.currentInput = String(result);
      this.updateDisplay();
      
    } catch (error) {
      this.currentInput = 'Error';
      this.updateDisplay();
      setTimeout(() => {
        this.currentInput = '0';
        this.updateDisplay();
      }, 1500);
    }
  }

  /**
   * 预处理表达式 - 转换特殊符号和函数
   */
  preprocessExpression(expr) {
    let result = expr;
    
    // 替换显示符号为计算符号
    result = result.replace(/×/g, '*');
    result = result.replace(/÷/g, '/');
    result = result.replace(/π/g, 'Math.PI');
    result = result.replace(/(?<![\w])e(?![\w])/g, 'Math.E');
    
    // 替换数学函数
    result = result.replace(/sin\(/g, 'Math.sin(');
    result = result.replace(/cos\(/g, 'Math.cos(');
    result = result.replace(/tan\(/g, 'Math.tan(');
    result = result.replace(/log\(/g, 'Math.log10(');
    result = result.replace(/ln\(/g, 'Math.log(');
    result = result.replace(/sqrt\(/g, 'Math.sqrt(');
    result = result.replace(/abs\(/g, 'Math.abs(');
    result = result.replace(/exp\(/g, 'Math.exp(');
    result = result.replace(/factorial\(/g, 'this.factorial(');
    result = result.replace(/\^2/g, '**2');
    result = result.replace(/\^3/g, '**3');
    result = result.replace(/\^\(/g, '**(');
    result = result.replace(/\^(-1)/g, '**( -1)');
    
    return result;
  }

  /**
   * 验证表达式
   */
  isValidExpression(expr) {
    // 检查括号匹配
    let count = 0;
    for (const char of expr) {
      if (char === '(') count++;
      if (char === ')') count--;
      if (count < 0) return false;
    }
    return count === 0;
  }

  /**
   * 求值表达式 (使用Function构造函数)
   */
  evaluate(expr) {
    // 使用安全的求值方式
    const safeEval = new Function('return ' + expr);
    let result = safeEval.call(this);
    
    // 处理无穷大和NaN
    if (!isFinite(result)) {
      throw new Error('Result is infinite');
    }
    
    // 四舍五入避免浮点误差
    if (typeof result === 'number') {
      result = Math.round(result * 1e10) / 1e10;
    }
    
    return result;
  }

  /**
   * 阶乘函数
   */
  factorial(n) {
    n = Math.round(n);
    if (n < 0) return NaN;
    if (n > 170) return Infinity;
    if (n === 0 || n === 1) return 1;
    
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  // ========== 内存操作 ==========

  /**
   * 内存清除
   */
  memoryClear() {
    this.memory = 0;
    this.updateDisplay();
  }

  /**
   * 内存调用
   */
  memoryRecall() {
    if (this.memory !== 0) {
      this.currentInput = String(this.memory);
      this.updateDisplay();
    }
  }

  /**
   * 内存加
   */
  memoryAdd() {
    const currentValue = parseFloat(this.currentInput) || 0;
    this.memory += currentValue;
    this.currentInput = '0';
    this.updateDisplay();
  }

  /**
   * 内存减
   */
  memorySubtract() {
    const currentValue = parseFloat(this.currentInput) || 0;
    this.memory -= currentValue;
    this.currentInput = '0';
    this.updateDisplay();
  }

  /**
   * 内存保存
   */
  memorySave() {
    this.memory = parseFloat(this.currentInput) || 0;
    this.currentInput = '0';
    this.updateDisplay();
  }

  // ========== 历史记录 ==========

  /**
   * 切换历史面板显示
   */
  toggleHistory() {
    this.historyPanel.classList.toggle('show');
  }

  /**
   * 添加到历史记录
   */
  addToHistory(expression, result) {
    const item = {
      expression: expression,
      result: result,
      timestamp: new Date().toISOString()
    };
    
    this.history.unshift(item);
    
    // 最多保存50条
    if (this.history.length > 50) {
      this.history.pop();
    }
    
    this.saveHistory();
    this.renderHistory();
  }

  /**
   * 清空历史记录
   */
  clearHistory() {
    this.history = [];
    this.saveHistory();
    this.renderHistory();
  }

  /**
   * 渲染历史记录
   */
  renderHistory() {
    if (this.history.length === 0) {
      this.historyList.innerHTML = '<div class="history-item">暂无计算历史</div>';
      return;
    }
    
    this.historyList.innerHTML = this.history.map((item, index) => `
      <div class="history-item">
        <div class="expression">${item.expression}</div>
        <div class="result">= ${item.result}</div>
      </div>
    `).join('');
  }

  /**
   * 保存历史记录到localStorage
   */
  saveHistory() {
    try {
      localStorage.setItem('calculator_history', JSON.stringify(this.history));
    } catch (e) {
      console.warn('Could not save history:', e);
    }
  }

  /**
   * 从localStorage加载历史记录
   */
  loadHistory() {
    try {
      const saved = localStorage.getItem('calculator_history');
      if (saved) {
        this.history = JSON.parse(saved);
      }
    } catch (e) {
      this.history = [];
    }
  }

  // ========== UI更新 ==========

  /**
   * 更新显示
   */
  updateDisplay() {
    this.resultEl.textContent = this.currentInput;
    this.expressionEl.textContent = this.expression;
    
    // 更新内存指示器
    this.updateMemoryIndicator();
  }

  /**
   * 更新内存指示器
   */
  updateMemoryIndicator() {
    // 可以添加内存指示器的视觉反馈
  }
}

// 初始化计算器
let calc;

document.addEventListener('DOMContentLoaded', () => {
  calc = new ScientificCalculator();
  
  // 键盘支持
  document.addEventListener('keydown', (e) => {
    const key = e.key;
    
    if (key >= '0' && key <= '9') {
      calc.insert(key);
    } else if (key === '.') {
      calc.insert('.');
    } else if (key === '+') {
      calc.insert('+');
    } else if (key === '-') {
      calc.insert('-');
    } else if (key === '*') {
      calc.insert('*');
    } else if (key === '/') {
      calc.insert('/');
    } else if (key === 'Enter' || key === '=') {
      e.preventDefault();
      calc.calculate();
    } else if (key === 'Escape') {
      calc.clear();
    } else if (key === 'Backspace') {
      calc.backspace();
    } else if (key === '(' || key === ')') {
      calc.insert(key);
    } else if (key === '^') {
      calc.insertFunction('powY');
    }
  });
});

// 导出供HTML调用
window.calc = null;
