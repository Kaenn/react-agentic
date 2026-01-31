# Phase 28: Content Types - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Type definitions that constrain what content is valid in different contexts. Enables TypeScript compile-time errors when users misuse components (e.g., SpawnAgent inside a SubComponent). This phase creates the type foundation — validation enforcement is Phase 31.

</domain>

<decisions>
## Implementation Decisions

### Type Granularity
- Two top-level contexts: Command and Agent (not a single MarkdownContent)
- **CommandContent**: global primitives + command-specific primitives (everything allowed)
- **AgentContent**: global primitives + agent-specific primitives (everything allowed)
- **SubComponentContent** inherits parent context constraints — a SubComponent inside a Command can use command primitives, one inside an Agent can use agent primitives
- This enables nesting without breaking context-specific constraints
- No third "inline-only" tier — two contexts with inheritance is sufficient

### Discriminant Design
- TypeScript-only enforcement — no runtime validation during compilation
- Constraint based on component type: `<Command>` inherently allows command primitives, `<Agent>` allows agent primitives
- Integration with JSX.Element typing and parallel types: Claude's discretion based on existing jsx.ts architecture

### Error Messaging
- Use native TypeScript errors (standard "type X not assignable to type Y")
- Errors should reference actual component names (SpawnAgent, If) not internal IR names
- Error location and IDE tooltip content: Claude's discretion for optimal debugging experience

### Claude's Discretion
- Branded types vs tag field vs structural discrimination
- Integration approach with React's JSX.Element
- Error surfacing at call site vs definition site
- JSDoc documentation on exported types
- Export location (root vs subpath)

</decisions>

<specifics>
## Specific Ideas

- SubComponent should be able to contain "the full content of Agent or Command without creating errors" — the constraint system must allow valid nesting
- A SubComponent that can contain other SubComponents specific to its context type (Command or Agent)
- User explicitly types children: `function MyCard({ children }: { children: SubComponentContent })`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-content-types*
*Context gathered: 2026-01-31*
