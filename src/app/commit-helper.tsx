export default function CommitHelperCommand() {
  return (
    <Command
      name="commit-helper"
      description="Helps create well-formatted git commits"
      allowedTools={['Bash', 'Read']}
    >
      <h2>Objective</h2>
      <p>
        Analyze staged changes and generate a commit message following{' '}
        <a href="https://www.conventionalcommits.org">conventional commits</a>{' '}
        format.
      </p>

      <h2>Context</h2>
      <ul>
        <li><b>Working directory:</b> Current git repository</li>
        <li><b>Staged changes:</b> Available via git diff --cached</li>
      </ul>

      <div name="instructions">
        <h3>Process</h3>
        <ol>
          <li>Run <code>git diff --cached</code> to see staged changes</li>
          <li>Analyze the type of changes (feat, fix, docs, etc.)</li>
          <li>Generate a commit message with scope if applicable</li>
        </ol>
      </div>

      <h2>Success Criteria</h2>
      <ul>
        <li>Commit message follows conventional commits format</li>
        <li>Message accurately describes the changes</li>
        <li>Scope is included when changes are focused on one area</li>
      </ul>

      <hr />

      <Markdown>
## Examples

- `feat(auth): add OAuth2 login flow`
- `fix(api): handle null response from upstream`
- `docs: update README with installation steps`
      </Markdown>
    </Command>
  );
}
