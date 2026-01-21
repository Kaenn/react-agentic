
export function CommitHelperCommand() {
  return (
    <Command
        name="commit-helper"
        description="Helps create well-formatted git commits"
        allowedTools={['Bash', 'Read']}
      />

      <h2>Objective</h2>
      Analyze staged changes and generate a commit message following conventional commits format.<br/>

      <h2>Context</h2>
      <b>Working directory:</b> Current git repository<br/>
      <b>Staged changes:</b> Available via git diff --cached<br/>


      <h2>Success Criteria</h2>
      <ul>
        <li>Sucess criteria 1</li>
        <li>Sucess criteria 2</li>
      </ul>
    </Command>
  );
}