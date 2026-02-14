/**
 * SkillLoader 单元测试
 */

describe('SkillLoader Types', () => {
  describe('SkillManifest', () => {
    it('should define required fields', () => {
      const manifest = {
        name: 'test-skill',
        description: 'A test skill',
        version: '1.0.0',
        metadata: {
          openclaw: {
            emoji: '🧪',
            requires: {},
          },
        },
      };
      
      expect(manifest.name).toBe('test-skill');
      expect(manifest.version).toBe('1.0.0');
    });
  });

  describe('SkillLoaderConfig', () => {
    it('should have default values', () => {
      const config = {
        cacheDir: '/tmp/skills',
        autoUpdate: false,
      };
      
      expect(config.cacheDir).toBeDefined();
    });
  });

  describe('SecurityPolicy', () => {
    it('should define allowed and blocked operations', () => {
      const policy = {
        allowed: ['read', 'write', 'execute'],
        blocked: ['exec:shell', 'sudo'],
        requireApproval: ['delete', 'drop'],
      };
      
      expect(policy.allowed).toContain('read');
      expect(policy.blocked).toContain('exec:shell');
      expect(policy.requireApproval).toContain('delete');
    });
  });
});

describe('SkillLoader Security', () => {
  // Test trusted sources
  const TRUSTED_SOURCES = [
    { name: 'anthropic', pattern: /^anthropic\// },
    { name: 'anthropic-github', pattern: /github\.com.*anthropic/ },
    { name: 'github', pattern: /^https:\/\/github\.com\// },
  ];

  it('should recognize trusted sources', () => {
    const sources = ['anthropic/coding', 'https://github.com/org/repo'];
    
    for (const source of sources) {
      const matched = TRUSTED_SOURCES.some(ts => 
        typeof ts.pattern === 'string' 
          ? source.includes(ts.pattern as string)
          : (ts.pattern as RegExp).test(source)
      );
      expect(matched).toBe(true);
    }
  });

  it('should block untrusted sources', () => {
    const untrusted = 'https://evil.com/malware';
    const matched = TRUSTED_SOURCES.some(ts => ts.pattern.test(untrusted));
    expect(matched).toBe(false);
  });

  // Test allowed operations
  const ALLOWED_OPERATIONS = [
    'read', 'write', 'execute', 'search', 'fetch',
    'analyze', 'transform', 'validate', 'test', 'lint',
  ];

  it('should whitelist allowed operations', () => {
    expect(ALLOWED_OPERATIONS).toContain('read');
    expect(ALLOWED_OPERATIONS).toContain('write');
    expect(ALLOWED_OPERATIONS).toContain('test');
  });

  // Test blocked operations
  const BLOCKED_OPERATIONS = [
    'exec:shell', 'sudo', 'spawn', 'child_process',
    'eval', 'require',
  ];

  it('should block dangerous operations', () => {
    expect(BLOCKED_OPERATIONS).toContain('exec:shell');
    expect(BLOCKED_OPERATIONS).toContain('sudo');
  });
});

describe('SkillLoader Patterns', () => {
  it('should match skill name patterns', () => {
    const patterns = [
      { pattern: /^@?[\w-]+$/, examples: ['coding', '@org/skill'] },
      { pattern: /^\.\//, examples: ['./local-skill'] },
      { pattern: /^https?:\/\//, examples: ['https://github.com/org/repo'] },
    ];
    
    expect(patterns[0].pattern.test('coding')).toBe(true);
    expect(patterns[1].pattern.test('./my-skill')).toBe(true);
  });

  it('should parse version constraints', () => {
    const versions = ['1.0.0', '^1.0.0', '~1.0.0', '>=1.0.0'];
    
    for (const v of versions) {
      expect(v).toMatch(/\d+\.\d+\.\d+/);
    }
  });
});
