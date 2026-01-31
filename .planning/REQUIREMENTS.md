# Requirements: React Agentic v3.0

**Defined:** 2026-01-31
**Core Value:** Compile-time safety for Claude Code commands — malformed commands fail at build time, not runtime.

## v3.0 Requirements

Requirements for v3.0 Primitive/Composite Architecture. Each maps to roadmap phases.

### Foundation

- [x] **FOUND-01**: Baseline snapshot tests capture current behavior before refactoring
- [x] **FOUND-02**: Primitive registry explicitly lists compiler-owned components in code
- [x] **FOUND-03**: MarkdownContent type defined for document-level content (full feature set)
- [x] **FOUND-04**: SubComponentContent type defined for sub-component content (subset, no SpawnAgent etc.)
- [x] **FOUND-05**: Both content types exported for user component typing

### Reference Printing

- [x] **REF-01**: RuntimeVar interpolation `{ctx}` emits `$CTX` shell variable syntax in markdown
- [x] **REF-02**: RuntimeVar interpolation `{ctx.data.status}` emits `$CTX.data.status` (dot notation for paths)
- [x] **REF-03**: RuntimeFn has `.name`, `.call`, `.input`, `.output` properties for reference metadata
- [x] **REF-04**: `<Ref>` component for explicit variable/function reference rendering in markdown context

### Component Composition

- [x] **COMP-01**: Custom components accept `children` prop with typed content
- [x] **COMP-02**: Props passed to custom components available inside component
- [x] **COMP-03**: Prop passing unified across static and runtime transformer paths
- [x] **COMP-04**: Fragment composition (multiple elements from composite without wrapper)

### Content Validation

- [x] **VALID-01**: TypeScript compile-time errors for invalid content nesting
- [x] **VALID-02**: SubComponentContent forbids: SpawnAgent, OnStatus, control flow at wrong level
- [x] **VALID-03**: Clear error messages when content constraints violated

### Composite Library

- [x] **LIB-01**: If/Else moved to composite layer (user-definable pattern)
- [x] **LIB-02**: Loop/Break moved to composite layer
- [x] **LIB-03**: SpawnAgent moved to composite layer
- [x] **LIB-04**: Step, Table, List, ExecutionContext moved to composite layer
- [x] **LIB-05**: Composites exported from `react-agentic/composites`
- [x] **LIB-06**: Composite source serves as reference implementation

### Documentation

- [x] **DOC-01**: Primitive vs composite boundary documented
- [ ] **DOC-02**: Migration guide for existing components using string templates *(deferred — no migration needed pre-production)*
- [x] **DOC-03**: Examples of user-defined composites

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
| FOUND-01 | Phase 27 | Complete |
| FOUND-02 | Phase 27 | Complete |
| FOUND-03 | Phase 28 | Complete |
| FOUND-04 | Phase 28 | Complete |
| FOUND-05 | Phase 28 | Complete |
| REF-01 | Phase 29 | Complete |
| REF-02 | Phase 29 | Complete |
| REF-03 | Phase 29 | Complete |
| REF-04 | Phase 29 | Complete |
| COMP-01 | Phase 30 | Complete |
| COMP-02 | Phase 30 | Complete |
| COMP-03 | Phase 30 | Complete |
| COMP-04 | Phase 30 | Complete |
| VALID-01 | Phase 31 | Complete |
| VALID-02 | Phase 31 | Complete |
| VALID-03 | Phase 31 | Complete |
| LIB-01 | Phase 32 | Complete |
| LIB-02 | Phase 32 | Complete |
| LIB-03 | Phase 32 | Complete |
| LIB-04 | Phase 32 | Complete |
| LIB-05 | Phase 32 | Complete |
| LIB-06 | Phase 32 | Complete |
| DOC-01 | Phase 33 | Complete |
| DOC-02 | Phase 33 | Deferred |
| DOC-03 | Phase 33 | Complete |

**Coverage:**
- v3.0 requirements: 25 total
- Complete: 24
- Deferred: 1 (DOC-02 — no migration needed pre-production)

---
*Requirements defined: 2026-01-31*
*v3.0 milestone shipped: 2026-01-31*
