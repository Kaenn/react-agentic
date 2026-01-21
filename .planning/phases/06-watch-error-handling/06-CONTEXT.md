# Phase 6: Watch & Error Handling - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Production-ready CLI with watch mode, dry run, and developer-friendly error messages. Users can rebuild automatically on file changes, preview output without writing files, and see source-located errors. This phase completes the CLI experience established in Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Error message format
- Contextual verbosity: show offending code snippet with pointer to error location
- Collect all errors: continue parsing, report all errors at end (don't stop at first)
- No fix suggestions: just show the error, let developer figure it out
- TypeScript-style output: file:line:col prefix format, similar to tsc

### Watch mode behavior
- Rebuild scope: changed file + dependents (files that import the changed file)
- Terminal-only notifications: print rebuild status to terminal, no sounds
- Clear terminal before each rebuild: fresh output for current state
- Full build on start: build all matching files immediately, then watch for changes

### Dry run output
- Validation + file hierarchy: like Next.js build output showing all pages
- Show file sizes: display expected file sizes for each output
- No change status markers: list all output files equally without new/update indicators
- Errors only on failure: if any errors exist, just show errors, no hierarchy until clean

### Exit codes & signals
- Simple exit codes: 0 for success, 1 for any failure
- Graceful interrupt: print "Stopping watch..." on Ctrl+C, then exit cleanly
- Partial failure = exit 1: any file failure means non-zero exit for CI
- Build summary: show file hierarchy created (Next.js build style)

### Claude's Discretion
- Exact debounce timing for watch mode file changes
- Code snippet line count (how many lines of context around error)
- File hierarchy tree formatting/styling
- Internal error handling and recovery

</decisions>

<specifics>
## Specific Ideas

- "Like Next.js build output" — file hierarchy with sizes displayed after successful build
- TypeScript-style errors for familiarity with tsc users
- Clear terminal on rebuild for clean current-state visibility

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-watch-error-handling*
*Context gathered: 2026-01-21*
