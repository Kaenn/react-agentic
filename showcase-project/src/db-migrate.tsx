import {
  Command,
  useRuntimeVar,
  runtimeFn,
  If,
  Else,
  AskUser,
  Return,
  XmlBlock,
} from 'react-agentic';

// Types
interface MigrationContext {
  hasPendingMigrations: boolean;
  pendingCount: number;
  migrations: string[];
  error?: string;
}

// Runtime function (runs in Node.js, not Claude)
async function checkMigrations(): Promise<MigrationContext> {
  const fs = await import('fs/promises');
  try {
    const files = await fs.readdir('./migrations');
    const pending = files.filter(f => f.endsWith('.pending.sql'));
    return {
      hasPendingMigrations: pending.length > 0,
      pendingCount: pending.length,
      migrations: pending,
    };
  } catch {
    return {
      hasPendingMigrations: false,
      pendingCount: 0,
      migrations: [],
      error: 'No migrations directory found',
    };
  }
}

const CheckMigrations = runtimeFn(checkMigrations);

export default (
  <Command
    name="db-migrate"
    description="Check and run pending database migrations"
  >
    {() => {
      const ctx = useRuntimeVar<MigrationContext>('CTX');
      const userChoice = useRuntimeVar<string>('CHOICE');

      return (
        <>
          <XmlBlock name="objective">
            Check for pending migrations and optionally run them.
          </XmlBlock>

          <h2>Step 1: Check Migrations</h2>

          <CheckMigrations.Call args={{}} output={ctx} />

          <If condition={ctx.error}>
            <p>Error: {ctx.error}</p>
            <Return status="ERROR" message="Migration check failed" />
          </If>

          <If condition={!ctx.hasPendingMigrations}>
            <p>No pending migrations. Database is up to date.</p>
            <Return status="SUCCESS" message="No migrations needed" />
          </If>
          <Else>
            <p>Found {ctx.pendingCount} pending migration(s):</p>
            <pre>{ctx.migrations.join('\n')}</pre>

            <AskUser
              question="Run these migrations?"
              header="Migrate"
              options={[
                { value: 'run', label: 'Run migrations', description: 'Execute all pending' },
                { value: 'skip', label: 'Skip', description: 'Do nothing' },
              ]}
              output={userChoice}
            />

            <If condition={userChoice === 'run'}>
              <p>Running migrations...</p>
              <pre>psql -f migrations/*.pending.sql</pre>
            </If>
          </Else>
        </>
      );
    }}
  </Command>
);
