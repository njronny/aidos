/**
 * SecurityScanner - 安全扫描服务
 * 依赖漏洞检测、代码安全扫描
 */

export type VulnerabilitySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Vulnerability {
  id: string;
  name: string;
  severity: VulnerabilitySeverity;
  description: string;
  package?: string;
  version?: string;
  fix?: string;
}

export interface SecurityIssue {
  type: 'secret' | 'sql' | 'xss' | 'command' | 'path';
  severity: VulnerabilitySeverity;
  line: number;
  message: string;
}

export interface ScanResult {
  timestamp: Date;
  vulnerabilities: Vulnerability[];
  issues: SecurityIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

// 已知的漏洞库 (简化版)
const KNOWN_VULNERABILITIES: Record<string, string[]> = {
  'lodash': ['4.17.0', '4.17.1', '4.17.2', '4.17.3', '4.17.4', '4.17.5', '4.17.9', '4.17.10', '4.17.11', '4.17.12', '4.17.13', '4.17.14', '4.17.15', '4.17.16', '4.17.17', '4.17.18', '4.17.19', '4.17.20'],
  'axios': ['0.0.0', '0.1.0', '0.2.0', '0.3.0', '0.4.0', '0.5.0', '0.6.0', '0.7.0', '0.8.0', '0.9.0', '0.10.0', '0.11.0', '0.12.0', '0.13.0', '0.14.0', '0.15.0', '0.16.0', '0.17.0', '0.18.0', '0.19.0', '0.20.0'],
  'express': ['3.0.0', '3.1.0', '3.2.0', '3.3.0', '3.4.0', '3.5.0', '3.6.0', '3.7.0', '3.8.0', '3.9.0', '3.10.0', '3.11.0', '3.12.0', '3.13.0', '3.14.0', '3.15.0', '3.16.0', '3.17.0', '3.18.0', '3.19.0', '3.20.0'],
};

// 安全模式检测
const SECURITY_PATTERNS: Array<{
  type: 'secret' | 'sql' | 'xss' | 'command' | 'path';
  pattern: RegExp;
  severity: VulnerabilitySeverity;
  message: string;
}> = [
  { type: 'secret', pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/gi, severity: 'critical' as VulnerabilitySeverity, message: 'Hardcoded API key detected' },
  { type: 'secret', pattern: /password\s*=\s*['"][^'"]+['"]/gi, severity: 'high' as VulnerabilitySeverity, message: 'Hardcoded password detected' },
  { type: 'secret', pattern: /secret\s*=\s*['"][^'"]+['"]/gi, severity: 'high' as VulnerabilitySeverity, message: 'Hardcoded secret detected' },
  { type: 'secret', pattern: /token\s*=\s*['"][^'"]+['"]/gi, severity: 'high' as VulnerabilitySeverity, message: 'Hardcoded token detected' },
  { type: 'sql', pattern: /\+\s*['"`]/gi, severity: 'medium' as VulnerabilitySeverity, message: 'Potential SQL injection risk' },
  { type: 'sql', pattern: /['"]\s*\+\s*\w+\s*['"]/gi, severity: 'medium' as VulnerabilitySeverity, message: 'Potential SQL injection risk' },
  { type: 'xss', pattern: /innerHTML\s*=\s*/gi, severity: 'high' as VulnerabilitySeverity, message: 'Potential XSS vulnerability' },
  { type: 'command', pattern: /exec\s*\(\s*/gi, severity: 'critical' as VulnerabilitySeverity, message: 'Command injection risk' },
  { type: 'command', pattern: /eval\s*\(\s*/gi, severity: 'high' as VulnerabilitySeverity, message: 'Eval usage is dangerous' },
  { type: 'path', pattern: /__dirname|__filename/gi, severity: 'low' as VulnerabilitySeverity, message: 'Path traversal potential' },
];

export class SecurityScanner {
  private vulnerabilities: Vulnerability[] = [];
  private issues: SecurityIssue[] = [];

  /**
   * 扫描依赖漏洞
   */
  async scanDependencies(dependencies: Record<string, string>): Promise<ScanResult> {
    this.vulnerabilities = [];

    for (const [pkg, version] of Object.entries(dependencies)) {
      const vulnerableVersions = KNOWN_VULNERABILITIES[pkg.toLowerCase()];
      
      if (vulnerableVersions && vulnerableVersions.includes(version)) {
        this.vulnerabilities.push({
          id: `CVE-${pkg}-${version}`,
          name: `${pkg} vulnerability`,
          severity: 'high',
          description: `Package ${pkg}@${version} has known vulnerabilities`,
          package: pkg,
          version,
          fix: `Upgrade to latest version`,
        });
      }
    }

    return this.createResult();
  }

  /**
   * 扫描代码安全问题
   */
  async scanCode(code: string): Promise<ScanResult> {
    this.issues = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of SECURITY_PATTERNS) {
        pattern.pattern.lastIndex = 0;
        if (pattern.pattern.test(line)) {
          this.issues.push({
            type: pattern.type,
            severity: pattern.severity,
            line: i + 1,
            message: pattern.message,
          });
        }
      }
    }

    return this.createResult();
  }

  /**
   * 生成安全报告
   */
  getReport(): ScanResult {
    return this.createResult();
  }

  /**
   * 创建扫描结果
   */
  private createResult(): ScanResult {
    const summary = {
      critical: this.vulnerabilities.filter(v => v.severity === 'critical').length + this.issues.filter(i => i.severity === 'critical').length,
      high: this.vulnerabilities.filter(v => v.severity === 'high').length + this.issues.filter(i => i.severity === 'high').length,
      medium: this.vulnerabilities.filter(v => v.severity === 'medium').length + this.issues.filter(i => i.severity === 'medium').length,
      low: this.vulnerabilities.filter(v => v.severity === 'low').length + this.issues.filter(i => i.severity === 'low').length,
    };

    return {
      timestamp: new Date(),
      vulnerabilities: this.vulnerabilities,
      issues: this.issues,
      summary,
    };
  }

  /**
   * 检查是否有严重漏洞
   */
  hasCriticalIssues(): boolean {
    return this.vulnerabilities.some(v => v.severity === 'critical') || 
           this.issues.some(i => i.severity === 'critical');
  }
}

export const securityScanner = new SecurityScanner();
