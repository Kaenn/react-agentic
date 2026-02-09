# Component Rename Tracker

## Renames

- [x] `Backend` → `SpawnBackend`
- [x] `Agent` → Remove (redundant with Teammate + AgentTypeDef)
- [x] `Lifecycle` → `WorkflowSteps`
- [x] `Pattern` → `OrchestrationPattern`
- [x] `Table` → `MarkdownTable`
- [x] `Note` → `Callout`

## Enum Renames

- [x] `NoteType` → `CalloutType`

## File Updates After Renames

- [x] Update `examples.md` with new component names
- [x] Update `IMPLEMENTATION_PLAN.md` with new component names
- [x] Update `index.md` with new component names

## Summary

| Old Name | New Name | Status |
|----------|----------|--------|
| Backend | SpawnBackend | ✅ |
| Agent | (removed) | ✅ |
| Lifecycle | WorkflowSteps | ✅ |
| Pattern | OrchestrationPattern | ✅ |
| Table | MarkdownTable | ✅ |
| Note | Callout | ✅ |
| NoteType | CalloutType | ✅ |

## Files Changed

- `SpawnBackend.spec.tsx` (new, replaces Backend.spec.tsx)
- `WorkflowSteps.spec.tsx` (new, replaces Lifecycle.spec.tsx)
- `OrchestrationPattern.spec.tsx` (new, replaces Pattern.spec.tsx)
- `MarkdownTable.spec.tsx` (new, replaces Table.spec.tsx)
- `Callout.spec.tsx` (new, replaces Note.spec.tsx)
- `enums.ts` (updated NoteType → CalloutType)
- `examples.md` (updated component names)
- `IMPLEMENTATION_PLAN.md` (updated component names)
- `index.md` (updated component names and file list)

## Files Removed

- `Backend.spec.tsx`
- `Agent.spec.tsx`
- `Lifecycle.spec.tsx`
- `Pattern.spec.tsx`
- `Table.spec.tsx`
- `Note.spec.tsx`
