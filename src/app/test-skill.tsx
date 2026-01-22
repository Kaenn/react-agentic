/**
 * Test Skill - Integration test for Skill component
 *
 * Run: node dist/cli/index.js build src/app/test-skill.tsx
 * Output: .claude/skills/deploy/SKILL.md
 */

import { Skill, SkillFile, SkillStatic, Markdown } from '../jsx.js';

export default function DeploySkill() {
  return (
    <Skill
      name="deploy"
      description="Deploy the application to production. Use when the user asks to deploy, release, or publish code."
      disableModelInvocation={true}
      allowedTools={['Read', 'Bash(git:*)', 'Bash(npm:*)']}
      argumentHint="[environment]"
    >
      <h1>Deploy Skill</h1>

      <Markdown>{`
## Overview

Deploy $ARGUMENTS to the target environment.

## Process

1. Validate environment variable
2. Run pre-flight checks
3. Build the application
4. Deploy to target

## Reference

See the deployment scripts in the scripts/ directory.
`}</Markdown>

      <SkillFile name="reference.md">
        <Markdown>{`
# Deployment Reference

## Environments

- **staging**: Pre-production testing
- **production**: Live environment

## Scripts

- \`scripts/validate.sh\` - Validate deployment prerequisites
- \`scripts/deploy.sh\` - Main deployment script
`}</Markdown>
      </SkillFile>

    </Skill>
  );
}
