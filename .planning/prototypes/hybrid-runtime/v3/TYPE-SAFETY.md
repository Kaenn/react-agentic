# V3 Type Safety

## The Problem in V2

```tsx
// V2: No type checking on args or output
<Init.Call args={{ wrong: "key" }} output={anyVar} />  // No error! 😱
```

## The Solution in V3

The key is **branded types** (also called nominal types):

```typescript
// Without branding (structural typing)
type A = { value: string };
type B = { value: string };
// A and B are interchangeable - same structure = same type

// With branding (nominal typing)
declare const brandA: unique symbol;
declare const brandB: unique symbol;
type A = { value: string; [brandA]: true };
type B = { value: string; [brandB]: true };
// A and B are NOT interchangeable - different brands
```

## How V3 ScriptVar Works

```typescript
declare const __scriptVarBrand: unique symbol;

interface ScriptVar<T> {
  readonly [__scriptVarBrand]: T;  // Brand with the type itself!
  readonly __varName: string;
  readonly __path: readonly string[];
}
```

This means:
- `ScriptVar<string>` has brand `string`
- `ScriptVar<PlanPhaseContext>` has brand `PlanPhaseContext`
- They cannot be assigned to each other

## TypeScript Errors You'll See

### 1. Wrong Args Key

```tsx
const Init = runtimeFn(init);
// init expects: { arguments: string }

<Init.Call args={{ wrong: "value" }} output={ctx} />
//                 ^^^^^
// Error: Object literal may only specify known properties,
//        and 'wrong' does not exist in type '{ arguments: string }'
```

### 2. Wrong Args Type

```tsx
<Init.Call args={{ arguments: 123 }} output={ctx} />
//                            ^^^
// Error: Type 'number' is not assignable to type 'string'
```

### 3. Missing Required Arg

```tsx
// getResearchContext expects: { phaseId: string; phaseDir: string }

<GetResearchContext.Call
  args={{ phaseId: ctx.phaseId }}  // Missing phaseDir!
  output={researchCtx}
/>
// Error: Property 'phaseDir' is missing in type '{ phaseId: ... }'
```

### 4. Wrong Output Type

```tsx
// init returns: Promise<PlanPhaseContext>
// So output must be: ScriptVar<PlanPhaseContext>

const wrongVar = useScriptVar<string>('wrong');

<Init.Call args={{ arguments: "$ARGUMENTS" }} output={wrongVar} />
//                                                    ^^^^^^^^
// Error: Type 'ScriptVar<string>' is not assignable to type 'ScriptVar<PlanPhaseContext>'
//   Type 'string' is not assignable to type 'PlanPhaseContext'
```

### 5. Output When Function Returns Void

```tsx
// archiveExistingPlans returns: Promise<void>

const result = useScriptVar<string>('result');

<ArchiveExistingPlans.Call
  args={{ phaseDir: ctx.phaseDir }}
  output={result}  // ❌ Error!
/>
// Error: 'output' does not exist in type 'CallPropsArgsOnly<{ phaseDir: string }>'
```

### 6. Missing Output When Function Returns Value

```tsx
// init returns: Promise<PlanPhaseContext>
// So output is REQUIRED

<Init.Call args={{ arguments: "$ARGUMENTS" }} />
//         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Error: Property 'output' is missing in type '{ args: ... }'
```

## How runtimeFn Captures Types

```typescript
// The function signature
async function init(args: { arguments: string }): Promise<PlanPhaseContext> { ... }

// runtimeFn extracts TArgs and TReturn from the function type
const Init = runtimeFn(init);
// TArgs = { arguments: string }
// TReturn = PlanPhaseContext

// Init.Call props are derived from these types:
type InitCallProps = {
  args: { arguments: string };
  output: ScriptVar<PlanPhaseContext>;
}
```

## Comparison Table

| Scenario | V2 | V3 |
|----------|----|----|
| Wrong args key | ❌ No error | ✅ Error |
| Wrong args type | ❌ No error | ✅ Error |
| Missing args | ❌ No error | ✅ Error |
| Wrong output type | ❌ No error | ✅ Error |
| Output on void fn | ❌ No error | ✅ Error |
| Missing output | ❌ No error | ✅ Error |

## Implementation Requirements

For this to work, you need:

1. **TypeScript strict mode** in tsconfig.json:
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true
     }
   }
   ```

2. **Proper JSX configuration**:
   ```json
   {
     "compilerOptions": {
       "jsx": "react-jsx",
       "jsxImportSource": "react-agentic"
     }
   }
   ```

3. **Export runtime function types** from the runtime file so TSX can import them.
