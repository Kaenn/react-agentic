# v2.0 Requirements: TSX Syntax Improvements

## Code Organization

- [ ] **ORG-01**: Module structure splits jsx.ts into primitives/ and workflow/ directories
- [ ] **ORG-02**: Central index.ts re-exports all components from both directories
- [ ] **ORG-03**: workflow/sections/ subdirectory contains semantic XML wrapper components

## Semantic Components

- [ ] **SEM-01**: ExecutionContext component accepts `paths: string[]` prop and emits `<execution_context>` with @ imports
- [ ] **SEM-02**: SuccessCriteria component accepts `items: string[]` prop and emits `<success_criteria>` with checkbox list
- [ ] **SEM-03**: OfferNext component accepts `routes: OfferNextRoute[]` prop and emits typed route navigation section
- [ ] **SEM-04**: DeviationRules component emits `<deviation_rules>` section with children content
- [ ] **SEM-05**: CommitRules component emits `<commit_rules>` section with children content
- [ ] **SEM-06**: WaveExecution component emits `<wave_execution>` section with children content
- [ ] **SEM-07**: CheckpointHandling component emits `<checkpoint_handling>` section with children content

## Structured Props

- [ ] **PROP-01**: Table component accepts `headers: string[]` and `rows: string[][]` props and emits markdown table
- [ ] **PROP-02**: List component accepts `items: string[]` prop and emits markdown bullet list

## Context Access

- [ ] **CTX-01**: Command component supports optional render props pattern `{(ctx) => children}` with typed context
- [ ] **CTX-02**: Agent component supports optional render props pattern `{(ctx) => children}` with typed context
- [ ] **CTX-03**: Workflow components (Bash, Loop, If) accept explicit generic type parameters `<T>`
- [ ] **CTX-04**: Step component accepts `name: string` and `number: number` props for numbered workflow sections

## Parser/Emitter

- [ ] **PAR-01**: Transformer recognizes all new components and converts to IR nodes
- [ ] **PAR-02**: Emitter generates correct markdown for all new IR nodes
- [ ] **PAR-03**: Unit tests cover each new component with expected input → output

---

## Future Requirements (Deferred)

- Additional state providers (localfile, supabase, postgres)
- State migration tooling
- Config file support for build options
- Incremental compilation
- Parallel processing

## Out of Scope

- Breaking changes to existing component APIs — existing patterns continue to work
- Runtime JSX evaluation — remain compile-time only
- React compatibility — this is not React, just uses TSX syntax

---

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| ORG-01 | — | — |
| ORG-02 | — | — |
| ORG-03 | — | — |
| SEM-01 | — | — |
| SEM-02 | — | — |
| SEM-03 | — | — |
| SEM-04 | — | — |
| SEM-05 | — | — |
| SEM-06 | — | — |
| SEM-07 | — | — |
| PROP-01 | — | — |
| PROP-02 | — | — |
| CTX-01 | — | — |
| CTX-02 | — | — |
| CTX-03 | — | — |
| CTX-04 | — | — |
| PAR-01 | — | — |
| PAR-02 | — | — |
| PAR-03 | — | — |
