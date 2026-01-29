# API Reference

Low-level utility functions for advanced use cases. These utilities are exported from the public API and useful when building tooling, custom transformers, or advanced runtime integrations.

> **Note:** Most users won't need these functions directly. They're primarily used internally by the compiler and for building custom tooling.

---

## Agent Utilities

Functions for working with AgentRef objects.

### isAgentRef()

Type guard that checks if a value is an AgentRef object.

**Signature:**
```typescript
function isAgentRef(value: unknown): value is AgentRef
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `value` | `unknown` | Value to check |

**Returns:** `boolean` — `true` if value is an AgentRef object

**Example:**
```typescript
import { isAgentRef, defineAgent } from 'react-agentic';

const MyAgent = defineAgent({ name: 'my-agent' });

if (isAgentRef(MyAgent)) {
  console.log('Valid agent reference');
}

// Works with any value
isAgentRef('string');     // false
isAgentRef({ name: 'x' }); // true (has required shape)
isAgentRef(null);          // false
```

**Use Case:** Validate inputs in tooling or custom components that accept `string | AgentRef`.

---

### getAgentName()

Extract the agent name from either a string or AgentRef.

**Signature:**
```typescript
function getAgentName(agent: string | AgentRef): string
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `agent` | `string \| AgentRef` | Agent reference or string name |

**Returns:** `string` — The agent name

**Example:**
```typescript
import { getAgentName, defineAgent } from 'react-agentic';

const MyAgent = defineAgent({ name: 'code-reviewer' });

getAgentName(MyAgent);       // 'code-reviewer'
getAgentName('code-reviewer'); // 'code-reviewer'
```

**Use Case:** Normalize agent references when generating Task() calls or building prompts.

---

### getAgentPath()

Extract the path from an AgentRef, if present.

**Signature:**
```typescript
function getAgentPath(agent: string | AgentRef): string | undefined
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `agent` | `string \| AgentRef` | Agent reference or string name |

**Returns:** `string | undefined` — The agent's file path, or undefined if not set

**Example:**
```typescript
import { getAgentPath, defineAgent } from 'react-agentic';

const AgentWithPath = defineAgent({
  name: 'my-agent',
  path: '~/.claude/agents/my-agent.md'
});

const AgentWithoutPath = defineAgent({ name: 'simple-agent' });

getAgentPath(AgentWithPath);    // '~/.claude/agents/my-agent.md'
getAgentPath(AgentWithoutPath); // undefined
getAgentPath('string-agent');   // undefined
```

**Use Case:** Implement "load from file" patterns where agents read their definitions from disk.

---

## Runtime Variable Utilities

Functions for working with RuntimeVar proxies created by `useRuntimeVar()`.

### isRuntimeVar()

Type guard that checks if a value is a RuntimeVar proxy.

**Signature:**
```typescript
function isRuntimeVar(value: unknown): value is RuntimeVar<unknown>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `value` | `unknown` | Value to check |

**Returns:** `boolean` — `true` if value is a RuntimeVar proxy

**Example:**
```typescript
import { isRuntimeVar, useRuntimeVar } from 'react-agentic';

const ctx = useRuntimeVar<{ status: string }>('CTX');

isRuntimeVar(ctx);         // true
isRuntimeVar(ctx.status);  // true (nested access returns proxy)
isRuntimeVar('literal');   // false
isRuntimeVar(42);          // false
```

**Use Case:** Detect RuntimeVar usage in custom transformers to generate jq expressions instead of literal values.

---

### getRuntimeVarInfo()

Extract metadata from a RuntimeVar proxy.

**Signature:**
```typescript
function getRuntimeVarInfo(runtimeVar: RuntimeVar<unknown>): {
  varName: string;
  path: readonly string[];
}
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `runtimeVar` | `RuntimeVar<unknown>` | RuntimeVar proxy to inspect |

**Returns:** Object with:
- `varName` — Shell variable name (e.g., `'CTX'`)
- `path` — Property access path as string array (e.g., `['user', 'name']`)

**Example:**
```typescript
import { getRuntimeVarInfo, useRuntimeVar } from 'react-agentic';

interface User { name: string; email: string }
const ctx = useRuntimeVar<{ user: User }>('CTX');

getRuntimeVarInfo(ctx);
// { varName: 'CTX', path: [] }

getRuntimeVarInfo(ctx.user);
// { varName: 'CTX', path: ['user'] }

getRuntimeVarInfo(ctx.user.name);
// { varName: 'CTX', path: ['user', 'name'] }
```

**Use Case:** Build custom code generation that needs to access RuntimeVar internals.

---

### toJqExpression()

Generate a complete shell jq command from a RuntimeVar.

**Signature:**
```typescript
function toJqExpression(runtimeVar: RuntimeVar<unknown>): string
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `runtimeVar` | `RuntimeVar<unknown>` | RuntimeVar proxy to convert |

**Returns:** `string` — Shell command like `$(echo "$VAR" | jq -r '.path')`

**Example:**
```typescript
import { toJqExpression, useRuntimeVar } from 'react-agentic';

const ctx = useRuntimeVar<{ user: { name: string } }>('CTX');

toJqExpression(ctx);
// '$(echo "$CTX" | jq -r '.')'

toJqExpression(ctx.user);
// '$(echo "$CTX" | jq -r '.user')'

toJqExpression(ctx.user.name);
// '$(echo "$CTX" | jq -r '.user.name')'
```

**Use Case:** Generate shell code that extracts values from JSON stored in shell variables.

---

### toJqPath()

Generate a jq path expression without the shell wrapper.

**Signature:**
```typescript
function toJqPath(runtimeVar: RuntimeVar<unknown>): string
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `runtimeVar` | `RuntimeVar<unknown>` | RuntimeVar proxy to convert |

**Returns:** `string` — jq path like `.user.name`

**Example:**
```typescript
import { toJqPath, useRuntimeVar } from 'react-agentic';

const ctx = useRuntimeVar<{ data: { items: string[] } }>('CTX');

toJqPath(ctx);           // '.'
toJqPath(ctx.data);      // '.data'
toJqPath(ctx.data.items); // '.data.items'
```

**Use Case:** Build custom jq commands or integrate with other JSON tools.

---

## Runtime Function Utilities

Functions for working with RuntimeFn wrappers created by `runtimeFn()`.

### isRuntimeFn()

Type guard that checks if a value is a RuntimeFn wrapper.

**Signature:**
```typescript
function isRuntimeFn(value: unknown): value is RuntimeFnComponent<object, unknown>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `value` | `unknown` | Value to check |

**Returns:** `boolean` — `true` if value is a RuntimeFnComponent

**Example:**
```typescript
import { isRuntimeFn, runtimeFn } from 'react-agentic';

async function myFunc(args: { x: number }) {
  return { result: args.x * 2 };
}

const Fn = runtimeFn(myFunc);

isRuntimeFn(Fn);       // true
isRuntimeFn(myFunc);   // false (unwrapped function)
isRuntimeFn({});       // false
```

**Use Case:** Detect RuntimeFn wrappers in JSX traversal for code generation.

---

### getRuntimeFnRegistry()

Get all registered runtime functions.

**Signature:**
```typescript
function getRuntimeFnRegistry(): Map<string, RuntimeFunction<object, unknown>>
```

**Parameters:** None

**Returns:** `Map<string, RuntimeFunction<object, unknown>>` — Copy of the registry mapping function names to functions

**Example:**
```typescript
import { getRuntimeFnRegistry, runtimeFn } from 'react-agentic';

async function initProject(args: { path: string }) {
  return { success: true };
}

async function validateConfig(args: { config: object }) {
  return { valid: true };
}

runtimeFn(initProject);
runtimeFn(validateConfig);

const registry = getRuntimeFnRegistry();
// Map(2) { 'initProject' => [Function], 'validateConfig' => [Function] }

for (const [name, fn] of registry) {
  console.log(`Registered: ${name}`);
}
```

**Use Case:** Extract all runtime functions for bundling into `runtime.js`.

---

### clearRuntimeFnRegistry()

Reset the runtime function registry.

**Signature:**
```typescript
function clearRuntimeFnRegistry(): void
```

**Parameters:** None

**Returns:** `void`

**Example:**
```typescript
import { clearRuntimeFnRegistry, getRuntimeFnRegistry, runtimeFn } from 'react-agentic';

async function myFunc(args: {}) { return {}; }
runtimeFn(myFunc);

getRuntimeFnRegistry().size; // 1

clearRuntimeFnRegistry();

getRuntimeFnRegistry().size; // 0
```

**Use Case:** Reset state between builds or tests to ensure clean extraction.

---

### getRuntimeFn()

Look up a registered runtime function by name.

**Signature:**
```typescript
function getRuntimeFn(name: string): RuntimeFunction<object, unknown> | undefined
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Function name to look up |

**Returns:** `RuntimeFunction<object, unknown> | undefined` — The function if found

**Example:**
```typescript
import { getRuntimeFn, runtimeFn } from 'react-agentic';

async function processData(args: { input: string }) {
  return { output: args.input.toUpperCase() };
}

runtimeFn(processData);

const fn = getRuntimeFn('processData');
if (fn) {
  // Can invoke the function directly
  const result = await fn({ input: 'hello' });
  // { output: 'HELLO' }
}

getRuntimeFn('nonexistent'); // undefined
```

**Use Case:** Access specific functions for testing or custom invocation outside the normal build pipeline.
