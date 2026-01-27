# Phase 24: Parser/Emitter Integration - Research

**Research Question:** What do I need to know to PLAN this phase well?

**Objective:** Wire all new v2.0 components (Phase 20-23) through transformer and emitter with comprehensive tests.

## Components Status Analysis

### Phase 20: Module Restructure
**Status:** ✅ Complete (infrastructure only, no new components)
- Reorganized jsx.ts into primitives/ and workflow/ directories
- No parser/emitter changes needed (pure organization)

### Phase 21: Structured Props ✅
**Components:** Table, List (prop-based)

**Parser Status:** ✅ IMPLEMENTED
- `transformTable()` at line 1193 in transformer.ts
- `transformPropList()` (called for `<List>` component, distinct from HTML `<ul>/<ol>`)
- Dispatch at lines 742-748 in transformElement()
- Supports:
  - Table: headers, rows (2D array), align, emptyCell
  - List: items array, ordered boolean, start number

**Emitter Status:** ✅ IMPLEMENTED
- `emitTable()` at line 460 in emitter.ts
- Handles TableNode with alignment, pipe escaping, newline conversion
- ListNode emission already supported (reuses existing list logic)
- Case handler at line 226-227

**Test Coverage:** ⚠️ NONE
- No test files found for Table/List components
- Phase 21 plan included test-table-list.tsx but it was deleted after verification

### Phase 22: Semantic Components ✅
**Components:** ExecutionContext, SuccessCriteria, OfferNext, XmlSection, DeviationRules, CommitRules, WaveExecution, CheckpointHandling

**Parser Status:** ✅ IMPLEMENTED
- `transformExecutionContext()` at line 1296 in transformer.ts
- `transformSuccessCriteria()` (parses checkbox items)
- `transformOfferNext()` (parses route objects)
- `transformXmlSection()` (dynamic tag name)
- `transformXmlWrapper()` (for DeviationRules, CommitRules, etc.)
- Dispatch at lines 752-770 in transformElement()

**Emitter Status:** ✅ IMPLEMENTED
- `emitExecutionContext()` at line 937 in emitter.ts
- `emitSuccessCriteria()` at line 967 (checkbox list)
- `emitOfferNext()` at line 988 (route bullet list)
- All emit proper XML-wrapped sections
- Case handlers at lines 228-235

**Test Coverage:** ⚠️ NONE
- No dedicated test files for semantic components
- Components likely used in other test files but not systematically tested

### Phase 23: Context Access Patterns ✅
**Components:** If<T>, Else, Loop<T>, OnStatus, Step, ReadState, WriteState
**Pattern:** Render props for Command/Agent

**Parser Status:** ✅ IMPLEMENTED
- `transformIf()` at line 1081 in transformer.ts
- `transformElse()` (sibling detection logic)
- `transformLoop()` (supports generic T parameter)
- `transformOnStatus()` (output reference tracking)
- `transformStep()` at line 1441 (numeric literal parsing)
- `transformReadState()`, `transformWriteState()`
- Render props: `analyzeRenderPropsChildren()` at transformer.ts
- Dispatch at lines 711-739 in transformElement()

**Emitter Status:** ✅ IMPLEMENTED
- `emitIf()` at line 662 in emitter.ts ("**If {test}:**" pattern)
- `emitElse()` at line 684 ("**Otherwise:**" pattern)
- `emitLoop()` at line 705 ("**For each {as} in {items}:**" pattern)
- `emitOnStatus()` at line 735 ("**On {status}:**" pattern)
- `emitStep()` at line 799 (supports heading/bold/xml variants)
- `emitReadState()`, `emitWriteState()` (skill invocation format)
- Case handlers at lines 242-255

**Test Coverage:** ⚠️ LIMITED
- Conditional tests exist: 4.1-simple-if-condition.tsx, 4.2-if-else-pair.tsx, 9.4-conditional-agent-spawning.tsx
- No systematic tests for Loop, OnStatus, Step, ReadState/WriteState
- Render props: test-render-props.tsx exists

## Current Architecture

### Transformer Flow
```
JSX Element → transformElement() → transform{Component}() → IR Node
```

**Pattern:**
1. Component name check in transformElement() (lines 647-788)
2. Dispatch to specific transform method (e.g., transformTable())
3. Parse attributes using parser.ts helpers:
   - `getAttributeValue()` - string attributes
   - `getArrayAttributeValue()` - array literals
   - `parseRowsAttribute()` - 2D arrays for Table
   - Numeric literal parsing - custom logic for number props
4. Return typed IR node (e.g., TableNode)

### Emitter Flow
```
IR Node → emitBlock() → emit{NodeType}() → Markdown string
```

**Pattern:**
1. Switch on node.kind in emitBlock() (lines 212-263)
2. Dispatch to specific emit method (e.g., emitTable())
3. Generate markdown with proper escaping/formatting
4. Return string for concatenation

### Key Helpers (parser.ts)
- `getElementName()` - Extract component name
- `getAttributeValue()` - String attribute parsing
- `getArrayAttributeValue()` - Array literal parsing
- `extractTypeArguments()` - Generic type parameters (for If<T>, Loop<T>)
- `analyzeRenderPropsChildren()` - Detect render props pattern
- `extractVariableDeclarations()` - useVariable tracking
- `extractOutputDeclarations()` - useOutput tracking

## What's Already Done vs Missing

### ✅ Already Complete
1. **All IR nodes defined** - nodes.ts has all Phase 21-23 node types
2. **All transformers implemented** - Every component has its transform method
3. **All emitters implemented** - Every IR node has its emit method
4. **Transformer dispatch complete** - All components added to transformElement() switch
5. **Emitter dispatch complete** - All node kinds added to emitBlock() switch
6. **Integration verified** - Phases 21-23 each had verification steps

### ⚠️ Missing Components

#### 1. **Systematic Unit Tests**
**Problem:** No comprehensive test coverage for v2.0 components
- Table/List: No test files
- Semantic components: No dedicated tests
- Context patterns: Partial coverage (If/Else tested, Loop/Step not)

**Impact:** Changes to transformer/emitter could break these components without detection

#### 2. **Integration Test**
**Problem:** No single test file demonstrating all v2.0 features together
- Success criteria requires "integration test demonstrates all new components"
- Would verify components work in combination (e.g., Table inside Step, ExecutionContext with render props)

#### 3. **Documentation Updates**
**Problem:** Documentation doesn't cover Phase 21-23 components
- docs/README.md lists old components only
- No examples for Table, List, semantic components, Step
- No guide for render props pattern

**Files needing updates:**
- docs/README.md - Add Table, List, semantic components, Step to component overview
- docs/command.md or new docs/components.md - Usage examples
- Create docs/semantic-components.md - ExecutionContext, SuccessCriteria, etc.
- Create docs/workflow-primitives.md - Step, If/Else/Loop patterns

## Test Strategy

### Unit Test Pattern (from Phase 21-02)
**Reference:** Phase 21 created test-table-list.tsx as verification, then deleted it

**Pattern:**
1. Create test-{component}.tsx in src/app/
2. Build: `node dist/cli/index.js build src/app/test-{component}.tsx`
3. Verify output in .claude/commands/test-{component}.md
4. Clean up test file after verification

**Issue:** Tests were deleted - no permanent test suite

**Solution Options:**
1. Keep test files permanently (bloats src/app/)
2. Create tests/ directory for verification tests
3. Use automated test framework (Jest/Vitest) with snapshot testing

### Integration Test Requirements
**From Success Criteria:** "Integration test demonstrates all new components in a single command"

**Should include:**
- Table with alignment and escaping
- List (bullet and ordered)
- ExecutionContext with multiple paths
- SuccessCriteria with mixed checked/unchecked
- OfferNext with route descriptions
- XmlSection and wrapper components (DeviationRules, etc.)
- If/Else/Loop control flow
- Step component (all variants)
- Command with render props pattern
- ReadState/WriteState state operations

## Testing Infrastructure Analysis

### Current State
**No test framework found:**
- No `src/**/*.test.ts` files
- No Jest/Vitest configuration
- No test scripts in package.json beyond `npm test` placeholder

**Verification method:**
- Manual build and inspect output markdown
- Used during Phases 21-23 but no permanent tests

### Recommendations for Phase 24

#### Option A: Manual Verification (Fast, matches current pattern)
**Pros:**
- Consistent with Phase 21-23 approach
- No new dependencies
- Quick to implement

**Cons:**
- No regression protection
- Manual process prone to errors
- Tests must be re-run manually

**Approach:**
1. Create comprehensive test files in src/app/verification/
2. Document build + verify steps in 24-03-PLAN.md
3. Keep test files permanently for future verification
4. Use git to track output changes

#### Option B: Automated Testing (Robust, new infrastructure)
**Pros:**
- Regression protection
- Automated in CI/CD
- Industry standard

**Cons:**
- New dependencies (Jest/Vitest)
- Setup time investment
- Out of scope for Phase 24?

**Approach:**
1. Add Vitest to project
2. Create snapshot tests for each component
3. Test transformer output (IR nodes)
4. Test emitter output (markdown)

**Decision needed:** Does Phase 24 include test infrastructure setup, or just verification tests?

## Documentation Requirements

### Files to Create/Update

#### 1. Update docs/README.md
Add to component overview:
- Table and List (structured props)
- ExecutionContext, SuccessCriteria, OfferNext
- XmlSection and wrapper components
- Step component
- Render props pattern

#### 2. Create docs/structured-components.md
Document Table and List:
- Props reference
- Alignment options
- Escaping rules (pipes, newlines)
- Examples

#### 3. Create docs/semantic-components.md
Document workflow sections:
- ExecutionContext (file path references)
- SuccessCriteria (checkbox lists)
- OfferNext (route navigation)
- XML wrapper components (DeviationRules, etc.)
- XmlSection (dynamic tags)

#### 4. Create docs/workflow-primitives.md
Document control flow:
- If/Else conditionals
- Loop iteration
- OnStatus handlers
- Step numbered sections
- Variant options (heading/bold/xml)

#### 5. Update docs/command.md and docs/agent.md
Add render props pattern:
```tsx
<Command name="example" description="test">
  {(ctx) => (
    <>
      <p>Command: {ctx.name}</p>
      <p>Output: {ctx.outputPath}</p>
    </>
  )}
</Command>
```

## Key Decisions Needed for Planning

### 1. Test Strategy
**Question:** Manual verification or automated testing?
- **Recommendation:** Manual verification (matches Phase 21-23 pattern, faster)
- Keep verification tests permanently in src/app/verification/

### 2. Documentation Scope
**Question:** Which docs are mandatory vs nice-to-have?
- **Mandatory:** Component reference in docs/README.md
- **High priority:** Semantic components guide (new patterns)
- **Medium priority:** Structured components guide
- **Lower priority:** Detailed workflow primitives guide

### 3. Plan Breakdown
**Question:** How to structure 3 plans?

**Recommendation:**
- **Plan 24-01:** Verification Tests (Table, List, semantic components)
- **Plan 24-02:** Integration Test + Control Flow Tests (If/Else/Loop/Step)
- **Plan 24-03:** Documentation Updates (all docs/)

## Risk Assessment

### Low Risk
- ✅ All components already implemented in transformer/emitter
- ✅ All IR nodes defined
- ✅ Dispatch logic complete

### Medium Risk
- ⚠️ No systematic test coverage - could miss edge cases
- ⚠️ Documentation debt - users may not discover new features

### No Risk
- No new implementation needed (everything works from Phase 21-23)
- Just testing and documenting existing functionality

## Summary: What Planner Needs to Know

### Implementation Status
**Everything is already implemented:**
- All Phase 21-23 components transform JSX → IR correctly
- All IR nodes emit markdown correctly
- Transformer dispatch handles all components
- Emitter dispatch handles all IR nodes

**Phase 24 is pure verification + documentation:**
- No new code needed (unless tests find bugs)
- Focus is proving components work as specified
- Document new features for users

### Plan Structure Recommendation

#### Plan 24-01: Unit Verification Tests
**Goal:** Create test files for each component group with expected output verification

**Components to test:**
- Table (alignment, escaping, headerless)
- List (bullet, ordered, start number)
- ExecutionContext (paths, prefix)
- SuccessCriteria (checkbox states)
- OfferNext (route objects)
- XmlSection (dynamic tags)
- XML wrappers (DeviationRules, CommitRules, etc.)

**Output:** src/app/verification/test-{component}.tsx files
**Verification:** Build + inspect markdown output

#### Plan 24-02: Integration & Control Flow Tests
**Goal:** Integration test using all components + control flow verification

**Components to test:**
- If/Else (already has tests, verify coverage)
- Loop (create test)
- OnStatus (create test)
- Step (all variants)
- ReadState/WriteState (verify state operations)
- Render props pattern (verify Command + Agent)
- Integration test (all components together)

**Output:** src/app/verification/integration-test.tsx
**Verification:** Build + inspect combined output

#### Plan 24-03: Documentation Updates
**Goal:** Document all v2.0 components for users

**Files to update:**
- docs/README.md (component overview)
- docs/command.md, docs/agent.md (render props)
- New: docs/structured-components.md
- New: docs/semantic-components.md
- New: docs/workflow-primitives.md

**Verification:** Documentation complete, examples accurate

### Key Patterns to Follow

#### Test File Pattern
```tsx
import { Command, Table, ExecutionContext, ... } from '../../jsx.js';

export default function TestComponentName() {
  return (
    <Command name="test-component" description="Verify component output">
      <h2>Test Case 1</h2>
      <Table headers={["A", "B"]} rows={[["1", "2"]]} />

      <h2>Test Case 2</h2>
      <ExecutionContext paths={["@file.md"]} />

      {/* More test cases */}
    </Command>
  );
}
```

#### Verification Process
```bash
# Build test
npm run build
node dist/cli/index.js build src/app/verification/test-{component}.tsx

# Inspect output
cat .claude/commands/test-{component}.md

# Verify:
# 1. Markdown syntax correct
# 2. Component-specific features work (escaping, alignment, etc.)
# 3. Edge cases handled (empty arrays, missing props, etc.)
```

#### Documentation Pattern
From existing docs, follow:
- Clear component purpose statement
- Props table with types
- Multiple usage examples
- Edge case notes (escaping, optional props)
- Link to related components

## Open Questions

1. **Should verification tests be permanent or temporary?**
   - Recommendation: Permanent (in src/app/verification/)
   - Enables regression testing in future phases

2. **Do we need automated testing infrastructure?**
   - Recommendation: No for Phase 24 (out of scope)
   - Consider for future milestone (v2.1?)

3. **Which documentation is mandatory for success criteria?**
   - Recommendation: All components must be documented in README
   - Detailed guides are lower priority but valuable

4. **Should integration test go in src/app/ or examples/?**
   - Recommendation: src/app/verification/integration-test.tsx
   - Can copy to examples/ if desired for showcase

## References

### Existing Test Files
- src/app/basic/test-conditional.tsx (If/Else pattern)
- src/app/scenarios/4.1-simple-if-condition.tsx
- src/app/scenarios/4.2-if-else-pair.tsx
- src/app/test-render-props.tsx (render props pattern)

### Key Source Files
- src/parser/transformer.ts (lines 647-788: component dispatch)
- src/emitter/emitter.ts (lines 212-263: IR dispatch)
- src/ir/nodes.ts (all IR node definitions)
- src/parser/parser.ts (attribute parsing helpers)

### Prior Phase Summaries
- .planning/phases/21-structured-props/21-02-SUMMARY.md
- .planning/phases/22-semantic-components/22-04-SUMMARY.md
- .planning/phases/23-context-access-patterns/23-03-SUMMARY.md

---

**Research complete. Ready for planning.**
