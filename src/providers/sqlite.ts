/**
 * SQLite Provider
 *
 * Generates bash/sqlite3 CLI skills for state operations.
 * All skills output JSON and use proper SQL escaping.
 */

import type { OperationNode } from '../ir/nodes.js';
import { registerProvider, type ProviderTemplate, type ProviderContext, type GeneratedSkill } from './index.js';

/**
 * Escape a value for SQL single-quoted string
 * Doubles single quotes: O'Brien -> O''Brien
 */
function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Convert arg name to CLI flag format
 * bump_type -> --bump-type
 */
function toCliFlag(arg: string): string {
  return '--' + arg.replace(/_/g, '-');
}

/**
 * Convert CLI flag back to shell variable
 * --bump-type -> BUMP_TYPE
 */
function toShellVar(arg: string): string {
  return arg.toUpperCase();
}

/**
 * Generate skill frontmatter
 */
function frontmatter(name: string, description: string, tools: string[]): string {
  const toolsYaml = tools.map(t => `  - ${t}`).join('\n');
  return `---
name: ${name}
description: ${description}
allowed-tools:
${toolsYaml}
---`;
}

/**
 * Generate argument parsing bash code
 */
function argParser(args: string[]): string {
  if (args.length === 0) return '';

  const varInits = args.map(arg => `${toShellVar(arg)}=""`).join('\n');
  const cases = args.map(arg =>
    `    ${toCliFlag(arg)}) ${toShellVar(arg)}="$2"; shift 2 ;;`
  ).join('\n');

  return `# Parse arguments
${varInits}
while [[ $# -gt 0 ]]; do
  case $1 in
${cases}
    *) shift ;;
  esac
done`;
}

/**
 * Generate table existence check
 */
function tableCheck(stateName: string): string {
  return `# Check table exists
if ! sqlite3 "$DB" "SELECT 1 FROM ${stateName} LIMIT 1" 2>/dev/null; then
  echo '{"error": "State not initialized. Run /${stateName}:init first"}'
  exit 1
fi`;
}

/**
 * SQLite provider implementation
 */
export class SQLiteProvider implements ProviderTemplate {
  readonly name = 'sqlite';

  generateInit(ctx: ProviderContext): GeneratedSkill {
    const { stateName, database, schema } = ctx;

    // Generate CREATE TABLE columns
    const columns = schema.fields.map(f => {
      let def = `  ${f.name} ${f.sqlType}`;
      if (f.defaultValue) {
        def += ` DEFAULT ${f.sqlType === 'TEXT' ? `'${escapeSql(f.defaultValue)}'` : f.defaultValue}`;
      }
      if (f.enumValues && f.enumValues.length > 0) {
        const checks = f.enumValues.map(v => `'${escapeSql(v)}'`).join(', ');
        def += ` CHECK(${f.name} IN (${checks}))`;
      }
      return def;
    }).join(',\n');

    const content = `${frontmatter(
      `${stateName}.init`,
      `Initialize ${stateName} state table. Run once before using ${stateName} state.`,
      ['Bash(sqlite3:*)', 'Bash(mkdir:*)']
    )}

# Initialize ${stateName.charAt(0).toUpperCase() + stateName.slice(1)} State

Create the SQLite table for ${stateName} state.

## Process

\`\`\`bash
mkdir -p "$(dirname "${database}")"
sqlite3 "${database}" <<'SQL'
CREATE TABLE IF NOT EXISTS ${stateName} (
${columns}
);
-- Insert default row if not exists
INSERT OR IGNORE INTO ${stateName} (rowid) VALUES (1);
SQL
echo '{"status": "initialized", "table": "${stateName}"}'
\`\`\`
`;

    return {
      filename: `${stateName}.init.md`,
      content
    };
  }

  generateRead(ctx: ProviderContext): GeneratedSkill {
    const { stateName, database } = ctx;

    const content = `${frontmatter(
      `${stateName}.read`,
      `Read ${stateName} state. Returns current state as JSON.`,
      ['Bash(sqlite3:*)']
    )}

# Read ${stateName.charAt(0).toUpperCase() + stateName.slice(1)} State

Read the current ${stateName} state from SQLite.

## Arguments

- \`--field {name}\`: Optional field to read (e.g., \`lastVersion\`)

## Process

\`\`\`bash
DB="${database}"

# Parse arguments
FIELD=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --field) FIELD="$2"; shift 2 ;;
    *) shift ;;
  esac
done

${tableCheck(stateName)}

# Read state
if [ -z "$FIELD" ]; then
  sqlite3 -json "$DB" "SELECT * FROM ${stateName} WHERE rowid = 1" | jq '.[0]'
else
  sqlite3 -json "$DB" "SELECT $FIELD FROM ${stateName} WHERE rowid = 1" | jq ".[0].$FIELD"
fi
\`\`\`
`;

    return {
      filename: `${stateName}.read.md`,
      content
    };
  }

  generateWrite(ctx: ProviderContext): GeneratedSkill {
    const { stateName, database } = ctx;

    const content = `${frontmatter(
      `${stateName}.write`,
      `Write to ${stateName} state. Updates fields in state.`,
      ['Bash(sqlite3:*)']
    )}

# Write ${stateName.charAt(0).toUpperCase() + stateName.slice(1)} State

Update ${stateName} state fields in SQLite.

## Arguments

- \`--field {name}\`: Field to update (e.g., \`lastVersion\`)
- \`--value {val}\`: Value to set

## Process

\`\`\`bash
DB="${database}"

# Parse arguments
FIELD=""
VALUE=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --field) FIELD="$2"; shift 2 ;;
    --value) VALUE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Validate
if [ -z "$FIELD" ] || [ -z "$VALUE" ]; then
  echo '{"error": "Both --field and --value required"}'
  exit 1
fi

${tableCheck(stateName)}

# Escape value for SQL (double single quotes)
SAFE_VALUE=$(printf '%s' "$VALUE" | sed "s/'/''/g")

# Update and return new state
sqlite3 "$DB" "UPDATE ${stateName} SET $FIELD = '$SAFE_VALUE' WHERE rowid = 1"
sqlite3 -json "$DB" "SELECT * FROM ${stateName} WHERE rowid = 1" | jq '.[0]'
\`\`\`
`;

    return {
      filename: `${stateName}.write.md`,
      content
    };
  }

  generateDelete(ctx: ProviderContext): GeneratedSkill {
    const { stateName, database, schema } = ctx;

    // Generate default values for reset
    const resets = schema.fields.map(f => {
      const val = f.sqlType === 'TEXT' ? `'${escapeSql(f.defaultValue || '')}'` : (f.defaultValue || '0');
      return `${f.name} = ${val}`;
    }).join(', ');

    const content = `${frontmatter(
      `${stateName}.delete`,
      `Reset ${stateName} state to defaults.`,
      ['Bash(sqlite3:*)']
    )}

# Reset ${stateName.charAt(0).toUpperCase() + stateName.slice(1)} State

Reset ${stateName} state to default values.

## Process

\`\`\`bash
DB="${database}"

${tableCheck(stateName)}

# Reset to defaults
sqlite3 "$DB" "UPDATE ${stateName} SET ${resets} WHERE rowid = 1"
sqlite3 -json "$DB" "SELECT * FROM ${stateName} WHERE rowid = 1" | jq '.[0]'
\`\`\`
`;

    return {
      filename: `${stateName}.delete.md`,
      content
    };
  }

  generateOperation(ctx: ProviderContext, operation: OperationNode): GeneratedSkill {
    const { stateName, database } = ctx;
    const { name, sqlTemplate, args } = operation;

    // Generate argument docs
    const argDocs = args.map(arg =>
      `- \`${toCliFlag(arg)} {value}\`: ${arg.replace(/_/g, ' ')}`
    ).join('\n');

    // Generate argument parser
    const parser = argParser(args);

    // Generate SQL with shell variable substitution
    // Replace $arg with shell variable interpolation
    let sqlWithVars = sqlTemplate;
    for (const arg of args) {
      // Replace $arg with escaped shell variable
      const regex = new RegExp(`\\$${arg}`, 'g');
      sqlWithVars = sqlWithVars.replace(regex, `'$SAFE_${toShellVar(arg)}'`);
    }

    // Generate escaping for each arg
    const escapes = args.map(arg =>
      `SAFE_${toShellVar(arg)}=$(printf '%s' "$${toShellVar(arg)}" | sed "s/'/''/g")`
    ).join('\n');

    const content = `${frontmatter(
      `${stateName}.${name}`,
      `${name.charAt(0).toUpperCase() + name.slice(1)} operation on ${stateName} state.`,
      ['Bash(sqlite3:*)']
    )}

# ${name.charAt(0).toUpperCase() + name.slice(1)} ${stateName.charAt(0).toUpperCase() + stateName.slice(1)}

Custom operation on ${stateName} state.

## Arguments

${argDocs || '(no arguments)'}

## Process

\`\`\`bash
DB="${database}"

${parser}

${tableCheck(stateName)}

# Escape values for SQL
${escapes || '# (no escaping needed)'}

# Execute operation
sqlite3 "$DB" "${sqlWithVars.trim()}"
sqlite3 -json "$DB" "SELECT * FROM ${stateName} WHERE rowid = 1" | jq '.[0]'
\`\`\`
`;

    return {
      filename: `${stateName}.${name}.md`,
      content
    };
  }
}

// Register SQLite provider
registerProvider(new SQLiteProvider());
