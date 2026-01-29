# State System

Typed, persistent state for Commands and Agents with compile-time validation.

## Overview

The state system provides:
- **Type-safe state access** via TypeScript interfaces
- **Persistent storage** via FileAdapter (JSON files)
- **Nested field access** via dot-notation paths
- **Read/write operations** via ReadState/WriteState components

## Quick Start

```tsx
import { Command, useVariable, useStateRef, ReadState, WriteState } from 'react-agentic';

// 1. Define your state schema
interface ProjectState {
  name: string;
  phase: number;
  config: { debug: boolean };
}

// 2. Create a state reference
const projectState = useStateRef<ProjectState>('projectContext');

// 3. Read state into a variable
const phase = useVariable('PHASE');
<ReadState state={projectState} into={phase} field="phase" />

// 4. Write state
<WriteState state={projectState} field="phase" value="2" />
```

## Components

### useStateRef

Declares a reference to a state key for use in ReadState/WriteState.

```tsx
const state = useStateRef<TSchema>(key: string): StateRef<TSchema>
```

**Parameters:**
- `key`: State identifier (e.g., "projectContext")
- `TSchema`: TypeScript interface for compile-time validation

**Returns:** StateRef for use in state components

### ReadState

Reads state value into a shell variable.

```tsx
<ReadState
  state={stateRef}      // Required: StateRef from useStateRef
  into={variableRef}    // Required: VariableRef to store result
  field="path.to.field" // Optional: nested field path
/>
```

**Examples:**

```tsx
// Read full state
<ReadState state={projectState} into={fullState} />

// Read specific field
<ReadState state={projectState} into={phase} field="phase" />

// Read nested field
<ReadState state={projectState} into={debug} field="config.debug" />
```

**Output:**
```
Use skill `/react-agentic:state-read projectContext --field "phase"` and store result in `PHASE`.
```

### WriteState

Writes to state - either a single field or merge partial update.

```tsx
// Field mode
<WriteState
  state={stateRef}    // Required: StateRef
  field="path"        // Required: field path
  value={val}         // Required: string or VariableRef
/>

// Merge mode
<WriteState
  state={stateRef}    // Required: StateRef
  merge={partial}     // Required: partial object to merge
/>
```

**Examples:**

```tsx
// Write single field with literal
<WriteState state={projectState} field="phase" value="2" />

// Write single field with variable
const newPhase = useVariable('NEW_PHASE');
<WriteState state={projectState} field="phase" value={newPhase} />

// Write nested field
<WriteState state={projectState} field="config.debug" value="true" />

// Merge partial update (shallow merge)
<WriteState state={projectState} merge={{ name: 'New Name', phase: 3 }} />
```

**Output:**
```
Use skill `/react-agentic:state-write projectContext --field "phase" --value "2"`.
Use skill `/react-agentic:state-write projectContext --merge '{ name: "New Name", phase: 3 }'`.
```

## Storage

State is persisted to JSON files via FileAdapter:

- **Location:** Configurable per-state (default: `.state/{key}.json`)
- **Format:** Pretty-printed JSON for readability
- **Behavior:** Creates file with defaults if missing
- **Concurrency:** Last-write-wins (no locking)

### FileAdapter

```typescript
import { FileAdapter, StateConfig } from 'react-agentic';

const config: StateConfig = {
  location: '.state/project.json',
  defaults: { name: '', phase: 0, config: { debug: false } }
};

const adapter = new FileAdapter(config);
const state = await adapter.read();
await adapter.writeField('phase', 1);
await adapter.merge({ name: 'My Project' });
```

## Type Safety

The state system provides compile-time validation:

```tsx
interface ProjectState {
  name: string;
  phase: number;
}

const state = useStateRef<ProjectState>('project');

// These field paths are validated at compile time
<ReadState state={state} field="name" />      // OK
<ReadState state={state} field="phase" />     // OK
<ReadState state={state} field="invalid" />   // Would error (future: path validation)

<WriteState state={state} field="name" value="test" />  // OK
<WriteState state={state} merge={{ name: 'x' }} />      // OK
```

## Best Practices

1. **Define interfaces for all state**: Enables compile-time validation
2. **Use descriptive state keys**: `projectContext` not `state1`
3. **Prefer field writes over merge**: More explicit, easier to track
4. **Store state files in `.state/`**: Keep organized, easy to gitignore
5. **Initialize with sensible defaults**: Avoid undefined values

## CLI Skills

State operations compile to CLI skill invocations:

- `/react-agentic:state-read {key}` - Read full state
- `/react-agentic:state-read {key} --field {path}` - Read field
- `/react-agentic:state-write {key} --field {path} --value {val}` - Write field
- `/react-agentic:state-write {key} --merge '{json}'` - Merge update

These skills are invoked by Claude at runtime when executing the command.
