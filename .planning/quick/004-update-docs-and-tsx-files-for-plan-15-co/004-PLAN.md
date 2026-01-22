---
phase: quick
plan: 004
type: execute
wave: 1
depends_on: []
files_modified:
  - docs/communication.md
  - docs/conditionals.md
  - src/app/basic/test-conditional.tsx
  - src/app/basic/test-simple-orchestrator.tsx
autonomous: true
---

<objective>
Update documentation and TSX examples to cover Phase 15 features: `useOutput`, `OnStatus`, and `output.field()`.

Purpose: Complete the Phase 15 feature set by documenting the command-side output handling patterns.
Output: Updated docs and TSX examples demonstrating useOutput/OnStatus usage.
</objective>

<context>
@docs/communication.md (SpawnAgent docs - needs OnStatus section)
@docs/conditionals.md (If/Else docs - OnStatus follows similar pattern)
@src/app/basic/test-conditional.tsx (example file - can add OnStatus example)
@src/app/basic/test-simple-orchestrator.tsx (orchestrator example - ideal for output handling)
@src/app/gsd/plan-phase.tsx (reference implementation using OnStatus)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update communication.md with Output Handling section</name>
  <files>docs/communication.md</files>
  <action>
Add a new section "## Handling Agent Output" after the "Combining with Conditionals" section.

The section should cover:

1. **useOutput hook** - Declare output reference for typed agent output:
   ```tsx
   import { useOutput, OnStatus } from '../jsx.js';
   import type { MyAgentOutput } from './my-agent.js';

   const output = useOutput<MyAgentOutput>("my-agent");
   ```

2. **OnStatus component** - Conditional rendering based on agent status:
   ```tsx
   <OnStatus output={output} status="SUCCESS">
     <p>Agent completed with {output.field('confidence')} confidence.</p>
   </OnStatus>

   <OnStatus output={output} status="BLOCKED">
     <p>Agent blocked by: {output.field('blockedBy')}</p>
   </OnStatus>

   <OnStatus output={output} status="ERROR">
     <p>Agent encountered an error.</p>
   </OnStatus>
   ```

3. **output.field()** - Compile-time interpolation to `{output.key}` placeholders

4. **Output format** - Show how OnStatus emits as `**On SUCCESS:**` / `**On BLOCKED:**` prose

Include a complete example showing SpawnAgent followed by OnStatus handlers, referencing the pattern in plan-phase.tsx.

Update the Tips section to mention:
- Use `OnStatus` to handle different agent return statuses
- Always import the agent's output type for type safety
  </action>
  <verify>
- Read docs/communication.md and confirm new section exists
- Section contains useOutput, OnStatus, and output.field() documentation
- Examples show the complete pattern from import to usage
  </verify>
  <done>communication.md has comprehensive "Handling Agent Output" section covering Phase 15 features</done>
</task>

<task type="auto">
  <name>Task 2: Update test-simple-orchestrator.tsx with OnStatus example</name>
  <files>src/app/basic/test-simple-orchestrator.tsx</files>
  <action>
Update the test orchestrator command to demonstrate the useOutput/OnStatus pattern:

1. Add imports for `useOutput`, `OnStatus` from jsx.js
2. Import the agent's output type (SimpleOrchestratorOutput if exists, or define one)
3. Add `useOutput` declaration after the existing useVariable declarations:
   ```tsx
   const agentOutput = useOutput<SimpleOrchestratorOutput>("basic/simple-orchestrator-agent");
   ```
4. After the SpawnAgent in Step 2, add OnStatus handlers:
   ```tsx
   <OnStatus output={agentOutput} status="SUCCESS">
     <p>Agent completed successfully. Output: {agentOutput.field('message')}</p>
   </OnStatus>

   <OnStatus output={agentOutput} status="ERROR">
     <p>Agent failed: {agentOutput.field('message')}</p>
   </OnStatus>
   ```

If SimpleOrchestratorOutput doesn't exist in the agent file, create a minimal one extending BaseOutput with a `result` field, or use BaseOutput directly since it has `status` and `message`.

The goal is to show the pattern working alongside the existing If/Else conditional logic.
  </action>
  <verify>
- Build the file: `node dist/cli/index.js build "src/app/basic/test-simple-orchestrator.tsx"`
- Verify no TypeScript errors
- Verify output contains `**On SUCCESS:**` and `**On ERROR:**` sections
  </verify>
  <done>test-simple-orchestrator.tsx demonstrates useOutput/OnStatus alongside SpawnAgent and If/Else</done>
</task>

<task type="auto">
  <name>Task 3: Add OnStatus reference to conditionals.md</name>
  <files>docs/conditionals.md</files>
  <action>
Add a brief "Related: OnStatus" section at the end of conditionals.md (before Tips or as a new section after Tips).

Content:
```markdown
## Related: OnStatus

For status-based conditional rendering after agent execution, see `OnStatus` in [Communication](./communication.md#handling-agent-output).

`OnStatus` follows a similar pattern to `If/Else` but operates on agent output status rather than shell conditions:

| Component | Condition Source | Use Case |
|-----------|------------------|----------|
| `<If>/<Else>` | Shell test expressions | File checks, variable values |
| `<OnStatus>` | Agent return status | Handle SUCCESS/BLOCKED/ERROR |
```

This creates a natural bridge between the two conditional patterns.
  </action>
  <verify>
- Read docs/conditionals.md and confirm new section exists
- Section links to communication.md
- Table clearly differentiates If/Else from OnStatus
  </verify>
  <done>conditionals.md references OnStatus with clear differentiation from If/Else</done>
</task>

</tasks>

<verification>
After all tasks:
1. `node dist/cli/index.js build "src/app/basic/test-simple-orchestrator.tsx"` succeeds
2. Generated markdown in `.claude/commands/test:simple-orchestrator.md` contains OnStatus sections
3. Documentation in docs/ is consistent and cross-referenced
</verification>

<success_criteria>
- [ ] communication.md has "Handling Agent Output" section with useOutput, OnStatus, output.field()
- [ ] test-simple-orchestrator.tsx compiles and demonstrates the pattern
- [ ] conditionals.md references OnStatus with clear differentiation
- [ ] All files build without errors
</success_criteria>

<output>
After completion, update `.planning/STATE.md`:
- Add quick task 004 to the Quick Tasks Completed table
</output>
