/**
 * Flowchart Module
 * Displays task workflow using Mermaid.js
 */

const Flowchart = (function() {
  let currentTasks = [];
  let isRendering = false;

  /**
   * Generate Mermaid flowchart from tasks
   */
  function generateMermaid(tasks) {
    if (!tasks || tasks.length === 0) {
      return 'flowchart TD\n    empty[No tasks yet]';
    }

    const lines = ['flowchart TD'];
    
    // Define node styles
    const styles = [];
    
    // Add nodes
    for (const task of tasks) {
      const escapedLabel = task.name.replace(/"/g, "'");
      const status = task.status || 'pending';
      
      // Node with ID and label
      lines.push(`    ${task.id}["${escapedLabel}"]`);
      
      // Add style class
      switch(status) {
        case 'completed':
          lines.push(`    class ${task.id} completed`);
          break;
        case 'running':
          lines.push(`    class ${task.id} running`);
          break;
        case 'failed':
          lines.push(`    class ${task.id} failed`);
          break;
        case 'blocked':
          lines.push(`    class ${task.id} blocked`);
          break;
        default:
          lines.push(`    class ${task.id} pending`);
      }
    }

    // Add dependencies as edges
    for (const task of tasks) {
      if (task.dependencies && task.dependencies.length > 0) {
        for (const dep of task.dependencies) {
          // Check if dependency exists
          if (tasks.find(t => t.id === dep)) {
            lines.push(`    ${dep} --> ${task.id}`);
          }
        }
      }
    }

    // Add style definitions
    lines.push('');
    lines.push('    classDef pending fill:#64748b,stroke:#64748b,color:#fff');
    lines.push('    classDef running fill:#3b82f6,stroke:#3b82f6,color:#fff');
    lines.push('    classDef completed fill:#10b981,stroke:#10b981,color:#fff');
    lines.push('    classDef failed fill:#ef4444,stroke:#ef4444,color:#fff');
    lines.push('    classDef blocked fill:#f59e0b,stroke:#f59e0b,color:#fff');

    return lines.join('\n');
  }

  /**
   * Render flowchart
   */
  async function render(tasks) {
    currentTasks = tasks;
    
    const container = document.getElementById('flowchart');
    if (!container) return;

    if (isRendering) return;
    isRendering = true;

    try {
      const mermaidCode = generateMermaid(tasks);
      container.innerHTML = '';

      // Create a temporary element for Mermaid to render
      const tempDiv = document.createElement('div');
      tempDiv.className = 'mermaid';
      tempDiv.textContent = mermaidCode;
      container.appendChild(tempDiv);

      // Render with Mermaid
      if (window.mermaid) {
        await window.mermaid.run({ nodes: [tempDiv] });
      }
    } catch (error) {
      console.error('Flowchart render error:', error);
      container.innerHTML = '<div class="empty-state">Failed to render flowchart</div>';
    } finally {
      isRendering = false;
    }
  }

  /**
   * Refresh flowchart with current tasks
   */
  function refresh() {
    const tasks = TaskList.getTasks();
    render(tasks);
  }

  /**
   * Update flowchart from WebSocket data
   */
  function update(data) {
    if (Array.isArray(data)) {
      currentTasks = data;
      render(data);
    } else if (data.tasks) {
      currentTasks = data.tasks;
      render(data.tasks);
    }
  }

  /**
   * Get current tasks
   */
  function getTasks() {
    return [...currentTasks];
  }

  return {
    render,
    refresh,
    update,
    getTasks,
  };
})();

// Export for use in other modules
window.Flowchart = Flowchart;
