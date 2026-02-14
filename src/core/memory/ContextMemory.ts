/**
 * ContextMemory - 上下文感知记忆
 */

export class ContextMemory {
  private store: Map<string, Map<string, any>> = new Map();

  /**
   * 存储上下文
   */
  remember(namespace: string, key: string, value: any): void {
    if (!this.store.has(namespace)) {
      this.store.set(namespace, new Map());
    }
    this.store.get(namespace)!.set(key, value);
  }

  /**
   * 回忆上下文
   */
  recall(namespace: string, key: string): any | undefined {
    return this.store.get(namespace)?.get(key);
  }

  /**
   * 忘记上下文
   */
  forget(namespace: string, key: string): void {
    this.store.get(namespace)?.delete(key);
  }

  /**
   * 获取命名空间下所有上下文
   */
  recallAll(namespace: string): Record<string, any> {
    const ns = this.store.get(namespace);
    if (!ns) return {};
    return Object.fromEntries(ns);
  }

  /**
   * 清空所有
   */
  clear(): void {
    this.store.clear();
  }
}

export const contextMemory = new ContextMemory();
