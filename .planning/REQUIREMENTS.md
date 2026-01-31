# Requirements: React Agentic v3.0

**Defined:** 2026-01-31
**Core Value:** Compile-time safety for Claude Code commands — malformed commands fail at build time, not runtime.

## v3.0 Requirements

Requirements for v3.0 Primitive/Composite Architecture. Each maps to roadmap phases.

### Foundation

- [ ] **FOUND-01**: Baseline snapshot tests capture current behavior before refactoring
- [ ] **FOUND-02**: Primitive registry explicitly lists compiler-owned components in code
- [ ] **FOUND-03**: MarkdownContent type defined for document-level content (full feature set)
- [ ] **FOUND-04**: SubComponentContent type defined for sub-component content (subset, no SpawnAgent etc.)
- [ ] **FOUND-05**: Both content types exported for user component typing

### Reference Printing

- [ ] **REF-01**: RuntimeVar interpolation `{ctx}` emits `$CTX` shell variable syntax in markdown
- [ ] **REF-02**: RuntimeVar interpolation `{ctx.data.status}` emits `$CTX.data.status` (dot notation for paths)
- [ ] **REF-03**: RuntimeFn has `.name`, `.call`, `.input`, `.output` properties for reference metadata
- [ ] **REF-04**: `<Ref>` component for explicit variable/function reference rendering in markdown context

### Component Composition

- [ ] **COMP-01**: Custom components accept `children` prop with typed content
- [ ] **COMP-02**: Props passed to custom components available inside component
- [ ] **COMP-03**: Prop passing unified across static and runtime transformer paths
- [ ] **COMP-04**: Fragment composition (multiple elements from composite without wrapper)

### Content Validation

- [ ] **VALID-01**: TypeScript compile-time errors for invalid content nesting
- [ ] **VALID-02**: SubComponentContent forbids: SpawnAgent, OnStatus, control flow at wrong level
- [ ] **VALID-03**: Clear error messages when content constraints violated

### Composite Library

- [ ] **LIB-01**: If/Else moved to composite layer (user-definable pattern)
- [ ] **LIB-02**: Loop/Break moved to composite layer
- [ ] **LIB-03**: SpawnAgent moved to composite layer
- [ ] **LIB-04**: Step, Table, List, ExecutionContext moved to composite layer
- [ ] **LIB-05**: Composites exported from `react-agentic/composites`
- [ ] **LIB-06**: Composite source serves as reference implementation

### Documentation

- [ ] **DOC-01**: Primitive vs composite boundary documented
- [ ] **DOC-02**: Migration guide for existing components using string templates
- [ ] **DOC-03**: Examples of user-defined composites

## Future Requirements

Deferred to future milestones.

### Advanced Composition

- **ADV-01**: Slot-based composition (asChild pattern) — adds complexity, layer on later
- **ADV-02**: Context propagation for deeply nested composites

### Tooling

- **TOOL-01**: Config file support for build options
- **TOOL-02**: Incremental compilation

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Runtime evaluation in composites | Composites are compile-time transforms only |
| Implicit children detection | Explicit children prop in signature required |
| Deep prop merging | Props passed explicitly at each level |
| Component state across builds | Each invocation independent |
| Nested component definition | Components must be at module level |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 27 | Pending |
| FOUND-02 | Phase 27 | Pending |
| FOUND-03 | Phase 28 | Pending |
| FOUND-04 | Phase 28 | Pending |
| FOUND-05 | Phase 28 | Pending |
| REF-01 | Phase 29 | Pending |
| REF-02 | Phase 29 | Pending |
| REF-03 | Phase 29 | Pending |
| REF-04 | Phase 29 | Pending |
| COMP-01 | Phase 30 | Pending |
| COMP-02 | Phase 30 | Pending |
| COMP-03 | Phase 30 | Pending |
| COMP-04 | Phase 30 | Pending |
| VALID-01 | Phase 31 | Complete |
| VALID-02 | Phase 31 | Complete |
| VALID-03 | Phase 31 | Complete |
| LIB-01 | Phase 32 | Pending |
| LIB-02 | Phase 32 | Pending |
| LIB-03 | Phase 32 | Pending |
| LIB-04 | Phase 32 | Pending |
| LIB-05 | Phase 32 | Pending |
| LIB-06 | Phase 32 | Pending |
| DOC-01 | Phase 33 | Pending |
| DOC-02 | Phase 33 | Pending |
| DOC-03 | Phase 33 | Pending |

**Coverage:**
- v3.0 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0

---
*Requirements defined: 2026-01-31*
*Last updated: 2026-01-31 after roadmap creation*
