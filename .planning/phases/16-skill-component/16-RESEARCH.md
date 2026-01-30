# Phase 16: Skill Component - Research

**Researched:** 2026-01-22
**Domain:** Claude Code Skills / TSX-to-Markdown Transpilation
**Confidence:** HIGH

## Summary

Phase 16 extends react-agentic to support Claude Code Skills, a new document type distinct from Commands and Agents. Skills live in `.claude/skills/{name}/` directories and use a SKILL.md file with specific YAML frontmatter fields. The implementation follows established patterns from Command and Agent components but introduces multi-file output capability.

**Key findings:**
- Skills use a simpler frontmatter format than Commands/Agents with fewer required fields
- Skills support static file copying alongside TSX-generated content (hybrid approach)
- The build process must handle multiple output files per source file (unlike 1:1 for Command/Agent)
- Skills have their own YAML fields: `disable-model-invocation`, `allowed-tools`, `user-invocable`, etc.

**Primary recommendation:** Implement Skill component following Agent patterns, add SkillFile and SkillStatic as child components, extend build command to handle multi-file output with directory creation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-morph | existing | JSX parsing and AST transformation | Already in project, proven for similar work |
| gray-matter | existing | YAML frontmatter serialization | Already used for Command/Agent frontmatter |
| globby | existing | File glob patterns | Already used for build command |
| fs/promises | Node.js | File/directory operations | Native, async, already used |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| path | Node.js | Path manipulation | Skill directory paths |
| fast-glob (if needed) | n/a | Fast file matching for SkillStatic | Only if globby insufficient for src patterns |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual YAML | gray-matter | gray-matter handles edge cases, already proven |
| copyFile | fs-extra | fs/promises.copyFile sufficient, no new dep needed |

**Installation:**
```bash
# No new dependencies required - use existing stack
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── ir/
│   └── nodes.ts           # Add SkillDocumentNode, SkillFrontmatterNode, SkillFileNode, SkillStaticNode
├── parser/
│   └── transformer.ts     # Add transformSkill, transformSkillFile, transformSkillStatic
├── emitter/
│   └── emitter.ts         # Add emitSkill, emitSkillFile methods
├── jsx.ts                  # Add Skill, SkillFile, SkillStatic components
└── cli/
    └── commands/
        └── build.ts       # Extend for multi-file skill output
```

### Pattern 1: Skill Document Node
**What:** New IR node type for Skill documents (similar to AgentDocumentNode)
**When to use:** Parsing `<Skill>` component
**Example:**
```typescript
// Source: Existing AgentDocumentNode pattern
export interface SkillDocumentNode {
  kind: 'skillDocument';
  frontmatter: SkillFrontmatterNode;
  children: BlockNode[];
  files: SkillFileNode[];      // Generated files from <SkillFile>
  statics: SkillStaticNode[];  // Static files from <SkillStatic>
}

export interface SkillFrontmatterNode {
  kind: 'skillFrontmatter';
  name: string;                        // Required: skill directory name
  description: string;                 // Required: what skill does, when to use
  disableModelInvocation?: boolean;    // Optional: prevent auto-invoke
  userInvocable?: boolean;             // Optional: hide from / menu
  allowedTools?: string[];             // Optional: tools without permission
  argumentHint?: string;               // Optional: [filename] hint
  model?: string;                      // Optional: model override
  context?: 'fork';                    // Optional: run in subagent
  agent?: string;                      // Optional: which subagent
}

export interface SkillFileNode {
  kind: 'skillFile';
  name: string;                        // Output filename (e.g., "reference.md")
  children: BlockNode[];               // Content to generate
}

export interface SkillStaticNode {
  kind: 'skillStatic';
  src: string;                         // Source path relative to TSX file
  dest?: string;                       // Optional destination path override
}
```

### Pattern 2: Multi-File Build Output
**What:** Build command produces multiple files per skill source
**When to use:** Processing Skill components
**Example:**
```typescript
// Source: Adapted from existing build.ts pattern
interface SkillBuildResult {
  inputFile: string;
  skillName: string;
  outputs: Array<{
    outputPath: string;          // .claude/skills/{name}/SKILL.md
    content: string;             // Generated markdown
    size: number;
  }>;
  statics: Array<{
    src: string;                 // Absolute source path
    dest: string;                // .claude/skills/{name}/scripts/...
  }>;
}

// Build process:
// 1. Create skill directory
// 2. Write SKILL.md
// 3. Write each SkillFile
// 4. Copy each SkillStatic
```

### Pattern 3: Component API Design
**What:** JSX component interfaces matching Claude Code SKILL.md format
**When to use:** Defining Skill, SkillFile, SkillStatic components
**Example:**
```typescript
// Source: Official Claude Code docs - https://code.claude.com/docs/en/skills
export interface SkillProps {
  name: string;                        // Required: skill name (directory name)
  description: string;                 // Required: what/when description
  disableModelInvocation?: boolean;    // Default: false
  userInvocable?: boolean;             // Default: true
  allowedTools?: string[];             // e.g., ['Read', 'Bash(python:*)']
  argumentHint?: string;               // e.g., '[filename]'
  model?: string;                      // Model override
  context?: 'fork';                    // Subagent context
  agent?: string;                      // Subagent type
  children?: ReactNode;                // Skill body content
}

export interface SkillFileProps {
  name: string;                        // Output filename
  children?: ReactNode;                // File content
}

export interface SkillStaticProps {
  src: string;                         // Source path (relative to TSX)
  dest?: string;                       // Destination path (relative to skill dir)
}
```

### Anti-Patterns to Avoid
- **Don't reuse Command/Agent frontmatter format:** Skills have different fields (no `tools` string, uses `allowed-tools` array)
- **Don't assume single-file output:** Skills can produce SKILL.md + supporting files
- **Don't hardcode file extension:** SkillFile should work for .md, .py, .sh, etc.
- **Don't resolve @ references in content:** Keep @ references verbatim (existing project rule)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML frontmatter | String concatenation | gray-matter | Handles quoting, escaping, arrays correctly |
| Directory creation | Manual mkdir | fs/promises.mkdir with recursive | Handles nested paths safely |
| File copying | readFile + writeFile | fs/promises.copyFile | Preserves metadata, handles edge cases |
| Path resolution | String manipulation | path.join, path.relative | Cross-platform, handles ../ correctly |

**Key insight:** The existing codebase already has all needed utilities. Skill implementation should reuse patterns from Agent component.

## Common Pitfalls

### Pitfall 1: YAML Field Naming Mismatch
**What goes wrong:** Using camelCase in frontmatter when Claude Code expects kebab-case
**Why it happens:** TypeScript uses camelCase props, YAML uses kebab-case keys
**How to avoid:** Map props to YAML keys in emitter (e.g., `disableModelInvocation` -> `disable-model-invocation`)
**Warning signs:** Skills not triggering, frontmatter validation errors

### Pitfall 2: Static File Path Resolution
**What goes wrong:** SkillStatic src paths break when TSX file is in different directory
**Why it happens:** Relative paths are relative to TSX file, not CWD
**How to avoid:** Resolve src relative to sourceFile.getFilePath() directory
**Warning signs:** "File not found" errors, wrong files copied

### Pitfall 3: Directory Creation Race
**What goes wrong:** Parallel writes to same skill directory fail
**Why it happens:** Multiple SkillFile/SkillStatic processed concurrently
**How to avoid:** Create skill directory once before writing any files
**Warning signs:** ENOENT errors, partial skill output

### Pitfall 4: Skill Name Validation
**What goes wrong:** Invalid skill names pass through
**Why it happens:** Missing validation for Claude Code's naming rules
**How to avoid:** Validate: lowercase, numbers, hyphens only, max 64 chars, no "anthropic"/"claude"
**Warning signs:** Skills not discovered, frontmatter parse errors

## Code Examples

Verified patterns from official sources:

### SKILL.md Frontmatter Format
```yaml
# Source: https://code.claude.com/docs/en/skills
---
name: deploy
description: Deploy the application to production. Use when deploying or releasing code.
disable-model-invocation: true
allowed-tools:
  - Read
  - Bash(git:*)
argument-hint: '[environment]'
---
```

### Emitter Frontmatter Generation
```typescript
// Source: Adapted from existing emitAgentFrontmatter pattern
private emitSkillFrontmatter(node: SkillFrontmatterNode): string {
  const data: Record<string, unknown> = {
    name: node.name,
    description: node.description,
  };

  // Map camelCase props to kebab-case YAML keys
  if (node.disableModelInvocation !== undefined) {
    data['disable-model-invocation'] = node.disableModelInvocation;
  }
  if (node.userInvocable !== undefined) {
    data['user-invocable'] = node.userInvocable;
  }
  if (node.allowedTools && node.allowedTools.length > 0) {
    data['allowed-tools'] = node.allowedTools;
  }
  if (node.argumentHint) {
    data['argument-hint'] = node.argumentHint;
  }
  if (node.model) {
    data['model'] = node.model;
  }
  if (node.context) {
    data['context'] = node.context;
  }
  if (node.agent) {
    data['agent'] = node.agent;
  }

  return matter.stringify('', data).trimEnd();
}
```

### Multi-File Build Output
```typescript
// Source: Adapted from existing runBuild pattern
async function processSkill(
  doc: SkillDocumentNode,
  inputFile: string,
  sourceFile: SourceFile
): Promise<SkillBuildResult> {
  const skillName = doc.frontmatter.name;
  const skillDir = `.claude/skills/${skillName}`;

  // 1. Generate SKILL.md
  const skillMd = emitSkill(doc, sourceFile);
  const outputs = [{
    outputPath: `${skillDir}/SKILL.md`,
    content: skillMd,
    size: Buffer.byteLength(skillMd, 'utf8'),
  }];

  // 2. Generate SkillFiles
  for (const file of doc.files) {
    const content = emitSkillFile(file, sourceFile);
    outputs.push({
      outputPath: `${skillDir}/${file.name}`,
      content,
      size: Buffer.byteLength(content, 'utf8'),
    });
  }

  // 3. Resolve SkillStatic paths
  const inputDir = path.dirname(inputFile);
  const statics = doc.statics.map(s => ({
    src: path.resolve(inputDir, s.src),
    dest: `${skillDir}/${s.dest || s.src}`,
  }));

  return { inputFile, skillName, outputs, statics };
}
```

### Skill Component Usage (TSX)
```tsx
// Source: Designed for Phase 16 requirements
import { Skill, SkillFile, SkillStatic, Markdown } from '../jsx.js';

export default function DeploySkill() {
  return (
    <Skill
      name="deploy"
      description="Deploy the application to production. Use when deploying or releasing code."
      disableModelInvocation={true}
      allowedTools={['Read', 'Bash(git:*)', 'Bash(npm:*)']}
      argumentHint="[environment]"
    >
      <Markdown>{`# Deploy

Deploy $ARGUMENTS to the target environment.

## Process

1. Run tests
2. Build application
3. Deploy to $ARGUMENTS

## Reference

See [scripts/deploy.sh](scripts/deploy.sh) for deployment script.
`}</Markdown>

      <SkillFile name="reference.md">
        <Markdown>{`# API Reference

Detailed deployment documentation...
`}</Markdown>
      </SkillFile>

      <SkillStatic src="scripts/deploy.sh" />
      <SkillStatic src="scripts/validate.sh" />
    </Skill>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual SKILL.md authoring | TSX-authored skills | Phase 16 | Type-safe skill creation |
| Static-only skills | Hybrid static/generated | Phase 16 | Dynamic content with static scripts |
| Single-file output | Multi-file skill directories | Phase 16 | Full skill structure support |

**Deprecated/outdated:**
- None for this phase (new feature)

## Open Questions

Things that couldn't be fully resolved:

1. **Nested SkillFile directories**
   - What we know: SkillFile name can include paths (e.g., "examples/basic.md")
   - What's unclear: Should we auto-create subdirectories or require explicit paths?
   - Recommendation: Support paths in name, auto-create directories like mkdir -p

2. **SkillStatic glob patterns**
   - What we know: Current requirement is single file src
   - What's unclear: Should we support glob patterns (e.g., "scripts/*.sh")?
   - Recommendation: Start with single files, add glob support in future if needed

3. **Skill validation strictness**
   - What we know: Claude Code has specific naming rules
   - What's unclear: Should we validate at compile time or warn?
   - Recommendation: Compile-time error for invalid names (fail fast)

## Sources

### Primary (HIGH confidence)
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills) - Official skill format, frontmatter fields, directory structure
- [Skill Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) - Authoring guidelines, naming conventions
- Existing codebase: `src/parser/transformer.ts`, `src/emitter/emitter.ts`, `src/ir/nodes.ts` - Proven patterns

### Secondary (MEDIUM confidence)
- [Anthropic Skills Repository](https://github.com/anthropics/skills) - Real skill examples
- [Skill Creator SKILL.md](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) - Reference implementation

### Tertiary (LOW confidence)
- None required - all findings verified with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project dependencies
- Architecture: HIGH - Following established Command/Agent patterns
- Pitfalls: HIGH - Based on official docs and similar implementations

**Research date:** 2026-01-22
**Valid until:** 60 days (Claude Code skills format is stable)
