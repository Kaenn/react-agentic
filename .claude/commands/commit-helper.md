---
name: commit-helper
description: Helps create well-formatted git commits
allowed-tools:
  - Bash
  - Read
---

## ObjectiveGlenn

Analyze staged changes and generate a commit message following [conventional commits](https://www.conventionalcommits.org) format.

## Context

- **Working directory:** Current git repository
- **Staged change gg:** Available via git diff --cached

<instructions>
### Process

1. Run `git diff --cached` to see staged changes
2. Analyze the type of changes (feat, fix, docs, etc.)
3. Generate a commit message with scope if applicable
</instructions>

## Success Criteria

- Commit message follows conventional commits format
- Message accurately describes the changes
- Scope is included when changes are focused on one area

---

## Examples

- `feat(auth): add OAuth2 login flow`
- `fix(api): handle null response from upstream`
- `docs: update README with installation steps`
