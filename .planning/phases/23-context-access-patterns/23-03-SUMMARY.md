---
phase: 23-context-access-patterns
plan: 03
subsystem: primitives
tags: [step, workflow, variant, markdown, xml]

# Dependency graph
requires:
  - phase: 20-module-restructure
    provides: primitives directory structure
provides:
  - Step component with StepProps interface
  - StepVariant type (heading, bold, xml)
  - StepNode IR node type
  - transformStep parser method
  - emitStep emitter method
affects: [future-workflow-patterns, documentation-generation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - variant-based output formatting
    - numeric literal attribute parsing

key-files:
  created:
    - src/primitives/step.ts
  modified:
    - src/jsx.ts
    - src/ir/nodes.ts
    - src/parser/transformer.ts
    - src/emitter/emitter.ts

# Decisions
decisions:
  - id: step-number-type
    choice: String (to support sub-steps like "1.1")
    rationale: number prop stored as string in IR to support both "1" and "1.1"
  - id: numeric-literal-parsing
    choice: Support both number={1} and number="1.1" syntax
    rationale: TypeScript users expect numeric literals; string needed for sub-steps
  - id: default-variant
    choice: heading variant as default
    rationale: Most common use case is markdown heading format

# Performance
metrics:
  duration: 5m 31s
  completed: 2026-01-27
---

# Phase 23 Plan 03: Step Component Summary

**One-liner:** Step component with variant-based output (heading/bold/xml) for numbered workflow sections.

## What Was Done

Created the Step component for documenting numbered workflow steps with three output format variants.

### Commits

| Hash | Description |
| :--- | :--- |
| 046fff3 | Add Step component definition |
| ce6d9d3 | Export Step from jsx.ts |
| 0a1ec02 | Add StepNode to IR |
| e23b3fb | Add Step transformation in transformer |
| f2bdcc6 | Add Step emission in emitter |
| 739566f | Add test command and fix numeric literal parsing |
| 2395080 | Clean up test files |

### Files Changed

**Created:**
- `src/primitives/step.ts` - Step component with StepProps and StepVariant

**Modified:**
- `src/jsx.ts` - Export Step, StepProps, StepVariant
- `src/ir/nodes.ts` - Add StepNode and StepVariant types
- `src/parser/transformer.ts` - Add Step to SPECIAL_COMPONENTS, transformStep method
- `src/emitter/emitter.ts` - Add emitStep method with variant handling

## Output Examples

**Heading variant (default):**
```tsx
<Step number={1} name="Setup">
  <p>Install dependencies.</p>
</Step>
```
Emits:
```markdown
## Step 1: Setup

Install dependencies.
```

**Bold variant:**
```tsx
<Step number={2} name="Configure" variant="bold">
  <p>Update settings.</p>
</Step>
```
Emits:
```markdown
**Step 2: Configure**

Update settings.
```

**XML variant:**
```tsx
<Step number={3} name="Deploy" variant="xml">
  <p>Deploy to production.</p>
</Step>
```
Emits:
```markdown
<step number="3" name="Deploy">

Deploy to production.

</step>
```

**Sub-steps:**
```tsx
<Step number="1.1" name="Install Node.js">
  <p>Download from nodejs.org.</p>
</Step>
```
Emits:
```markdown
## Step 1.1: Install Node.js

Download from nodejs.org.
```

## Decisions Made

1. **Number prop as string in IR** - Stored as string to support both integer steps ("1") and sub-steps ("1.1"). Parser converts numeric literals to string.

2. **Support both number={1} and number="1.1"** - Added numeric literal parsing to transformStep for TypeScript ergonomics.

3. **Default to heading variant** - Most common use case is markdown headings for step documentation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Numeric literal parsing for number prop**
- **Found during:** Task 6
- **Issue:** getAttributeValue only handles string literals, not numeric literals like `number={1}`
- **Fix:** Added explicit numeric literal parsing in transformStep
- **Files modified:** src/parser/transformer.ts
- **Commit:** 739566f

## Verification Results

- [x] `npm run build` passes
- [x] Step exported from jsx.ts
- [x] All three variants emit correctly (heading, bold, xml)
- [x] Sub-step numbering works ("1.1", "1.2")
- [x] TypeScript enforces required props (number, name)
- [x] Test files cleaned up

## Next Phase Readiness

No blockers. Step component ready for use in workflow documentation.
