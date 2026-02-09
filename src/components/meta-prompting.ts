/**
 * Meta-prompting components for context composition
 *
 * Note: ReadFile component removed in Phase 38 Plan 04.
 * Use Assign with file() source helper instead:
 *
 * import { useVariable, Assign, file } from 'react-agentic';
 * const stateContent = useVariable("STATE_CONTENT");
 * <Assign var={stateContent} from={file(".planning/STATE.md")} />
 */
