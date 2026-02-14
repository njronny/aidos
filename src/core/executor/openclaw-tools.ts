/**
 * OpenClaw Tools - 简化版
 * 提供基础的 shell 执行能力
 */

import { exec as nodeExec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(nodeExec);

export interface ExecOptions {
  command: string;
  timeout?: number;
  workdir?: string;
}

export async function exec(options: ExecOptions): Promise<string> {
  const { command, timeout = 60, workdir } = options;
  
  const opts: any = {
    timeout: timeout * 1000,
    maxBuffer: 10 * 1024 * 1024,
  };
  
  if (workdir) opts.cwd = workdir;
  
  try {
    const { stdout, stderr } = await execAsync(command, opts);
    return (stdout || stderr || '').toString();
  } catch (error: any) {
    if (error.killed) {
      throw new Error(`Command timed out after ${timeout}s`);
    }
    throw error;
  }
}

export default { exec };
