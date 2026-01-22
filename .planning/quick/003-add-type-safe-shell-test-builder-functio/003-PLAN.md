# Quick Task 003: Add Type-Safe Shell Test Builder Functions

## Goal

Add type-safe helper functions to `jsx.ts` that generate shell test expressions from `VariableRef` values, enabling compile-time type safety for conditional tests.

## Tasks

### Task 1: Add shell test builder functions to jsx.ts

Add new section after Conditional Logic section with:

1. **File test functions:**
   - `fileExists(varRef)` → `[ -f $VAR_NAME ]`
   - `dirExists(varRef)` → `[ -d $VAR_NAME ]`

2. **String test functions:**
   - `isEmpty(varRef)` → `[ -z $VAR_NAME ]`
   - `notEmpty(varRef)` → `[ -n $VAR_NAME ]`
   - `equals(varRef, value)` → `[ $VAR_NAME = value ]`

3. **Composable operators:**
   - `and(...tests)` → `test1 && test2`
   - `or(...tests)` → `test1 || test2`

**File:** `src/jsx.ts`

**Pattern:** Each function takes `VariableRef` and returns shell test string. Use `$${varRef.name}` for variable interpolation.

## Acceptance Criteria

- [ ] All 7 functions exported from jsx.ts
- [ ] TypeScript compiles successfully
- [ ] Functions return correct shell syntax
- [ ] JSDoc documentation for each function
