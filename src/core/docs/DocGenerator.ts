/**
 * DocGenerator - 文档自动生成服务
 */

export type DocType = 'api' | 'changelog' | 'readme' | 'markdown';

export interface APIEndpoint {
  path: string;
  method: string;
  description: string;
  params?: string[];
  response?: string;
}

export interface ProjectInfo {
  name: string;
  description: string;
  techStack: string[];
}

export interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export class DocGenerator {
  /**
   * 生成 API 文档
   */
  async generateAPIDocs(code: string): Promise<{ endpoints: APIEndpoint[]; markdown: string }> {
    const endpoints = this.extractEndpoints(code);
    const markdown = this.generateAPIMarkdown(endpoints);
    
    return { endpoints, markdown };
  }

  /**
   * 生成 changelog
   */
  generateChangelog(commits: Commit[]): string {
    const features: string[] = [];
    const fixes: string[] = [];
    const others: string[] = [];

    for (const commit of commits) {
      const msg = commit.message.toLowerCase();
      if (msg.startsWith('feat')) {
        features.push(`- ${commit.message} (${commit.hash.slice(0, 7)})`);
      } else if (msg.startsWith('fix')) {
        fixes.push(`- ${commit.message} (${commit.hash.slice(0, 7)})`);
      } else {
        others.push(`- ${commit.message} (${commit.hash.slice(0, 7)})`);
      }
    }

    let changelog = '# Changelog\n\n';
    
    if (features.length > 0) {
      changelog += '## Features\n' + features.join('\n') + '\n\n';
    }
    if (fixes.length > 0) {
      changelog += '## Bug Fixes\n' + fixes.join('\n') + '\n\n';
    }
    if (others.length > 0) {
      changelog += '## Other Changes\n' + others.join('\n') + '\n';
    }

    return changelog;
  }

  /**
   * 生成 README
   */
  generateREADME(info: ProjectInfo): string {
    return `# ${info.name}

${info.description}

## Tech Stack

${info.techStack.map(t => `- ${t}`).join('\n')}

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## API

See [API Docs](./docs/api.md)

## License

MIT
`;
  }

  /**
   * 从代码提取 API 端点
   */
  private extractEndpoints(code: string): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];
    const methods = ['Get', 'Post', 'Put', 'Delete', 'Patch'];
    
    for (const method of methods) {
      const regex = new RegExp(`@${method}\\(['"\`]([^'"\`]+)['"\`]\\)?[^)]+\\)[^}]*?([^*]+)`, 'gi');
      let match;
      while ((match = regex.exec(code)) !== null) {
        endpoints.push({
          path: match[1] || '/',
          method: method.toUpperCase(),
          description: (match[2] || 'API endpoint').trim(),
        });
      }
    }

    return endpoints;
  }

  /**
   * 生成 API Markdown 文档
   */
  private generateAPIMarkdown(endpoints: APIEndpoint[]): string {
    let md = '# API Documentation\n\n';
    
    for (const endpoint of endpoints) {
      md += `## ${endpoint.method} ${endpoint.path}\n\n`;
      md += `${endpoint.description}\n\n`;
      md += '---\n\n';
    }

    return md;
  }
}

export const docGenerator = new DocGenerator();
