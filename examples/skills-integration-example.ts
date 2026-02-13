/**
 * Example: Auto-Find and Install Skills
 * 
 * This example demonstrates how to use the Skills CLI integration
 * to automatically find and install skills that solve development problems.
 * 
 * Run with: npx ts-node examples/skills-integration-example.ts
 */

import { SkillLoader, SkillSearchResult, SkillUpdateInfo } from '../src/core/skillloader';

async function main() {
  console.log('=== Skills CLI Integration Demo ===\n');

  // Initialize skill loader
  const loader = new SkillLoader({
    skillsPath: './skills',
    autoLoad: true,
    cacheEnabled: true,
  });

  await loader.initialize();

  // 1. Show trusted sources
  console.log('1. Trusted Skill Sources:');
  const trustedSources = loader.getTrustedSources();
  trustedSources.forEach((source: { name: string; description: string }) => {
    console.log(`   - ${source.name}: ${source.description}`);
  });
  console.log();

  // 2. Demonstrate search capability (using example data for speed)
  console.log('2. Skill Search Capability:');
  console.log('   Use loader.findSkills(query) to search for skills.');
  console.log('   Example searches:');
  console.log('   - findSkills("pr") → PR review skills');
  console.log('   - findSkills("commit") → Commit message skills');
  console.log('   - findSkills("typescript") → TypeScript skills');
  console.log();

  // 3. Install skill capability
  console.log('3. Install Skill Capability:');
  console.log('   Use loader.installSkill("owner/repo") to install skills.');
  console.log('   Only trusted sources are allowed by default:');
  console.log('   - vercel-labs/*');
  console.log('   - ComposioHQ/*');
  console.log('   - openai/*');
  console.log('   - anthropic/*');
  console.log('   - GitHub URLs');
  console.log();
  console.log('   Example: await loader.installSkill("vercel-labs/pr-review")');
  console.log();

  // 4. Check for updates
  console.log('4. Check for Updates:');
  console.log('   Use loader.checkForUpdates() to check for skill updates.');
  console.log('   Returns array of SkillUpdateInfo with version comparisons.');
  console.log();

  // 5. Auto-solve development problems
  console.log('5. Auto-Solve Development Problems:');
  console.log('   Use loader.autoSolveWithSkills(problem) to:');
  console.log('   - Analyze the problem description');
  console.log('   - Search for relevant skills');
  console.log('   - Auto-install from trusted sources');
  console.log('   - Return recommendations');
  console.log();
  
  const exampleSolution = await loader.autoSolveWithSkills('I need help with TypeScript PR reviews');
  console.log('   Example result for "I need help with TypeScript PR reviews":');
  exampleSolution.recommendations.forEach((rec: string) => {
    console.log(`   - ${rec}`);
  });
  console.log();

  // 6. Show security features
  console.log('6. Security Sandbox Features:');
  const policy = loader.getSecurityPolicy();
  console.log(`   - Allow untrusted sources: ${policy.allowUntrusted}`);
  console.log(`   - Require manifest: ${policy.requireManifest}`);
  console.log(`   - Verify signatures: ${policy.verifySignatures}`);
  console.log(`   - Allowed operations: ${policy.allowedOperations.slice(0, 8).join(', ')}...`);
  console.log(`   - Blocked operations: ${policy.blockedOperations.join(', ')}`);
  console.log();
  
  // Demonstrate security validation
  console.log('   Security Validation Example:');
  const validation = loader.validateSkillManifest({
    id: 'test-skill',
    name: 'test-skill',
    description: 'A test skill',
    version: '1.0.0',
    tags: [],
    files: ['index.js'],
    config: {
      options: {
        permissions: ['read', 'write', 'exec:shell'],  // Should trigger warning
      },
    },
  });
  console.log(`   - Valid: ${validation.isValid}`);
  if (validation.errors.length > 0) {
    console.log(`   - Errors: ${validation.errors.join(', ')}`);
  }
  if (validation.warnings.length > 0) {
    console.log(`   - Warnings: ${validation.warnings.join(', ')}`);
  }
  console.log();

  // 7. Available skills
  console.log('7. Currently Loaded Skills:');
  const allSkills = loader.getAllSkills();
  if (allSkills.length > 0) {
    allSkills.forEach((skill: { name: string; version: string; description: string; tags: string[] }) => {
      console.log(`   - ${skill.name} (v${skill.version}) - ${skill.description}`);
      console.log(`     Tags: ${skill.tags.join(', ')}`);
    });
  } else {
    console.log('   No skills loaded yet.');
  }
  console.log();

  console.log('=== Demo Complete ===');
  console.log('\nQuick Reference:');
  console.log('  loader.findSkills(query)       - Search for skills');
  console.log('  loader.installSkill(ref)        - Install a skill');
  console.log('  loader.checkForUpdates()         - Check for updates');
  console.log('  loader.autoSolveWithSkills(problem) - Auto-solve problems');
  console.log('  loader.validateSkillManifest(manifest) - Validate security');
}

main().catch(console.error);
