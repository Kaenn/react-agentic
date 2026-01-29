/**
 * Test Runtime Sub Component
 *
 * Demonstrates runtime features:
 * - Sub compoenent working
 */

import {
  Command,
  useRuntimeVar,
  runtimeFn,
  If,
  Else,
  XmlBlock,
} from '../jsx.js';
import { ReactNode } from 'react';

// Define runtime function types
interface InitArgs {
  projectPath: string;
}

interface InitResult {
  success: boolean;
  error?: string;
  projectName?: string;
}

// Simple component
const Glenn = (): ReactNode => {
  return (
    <>
      <h2>Glenn</h2>
    </>
  );
}

// Component with props
const Greeting = ({ name }: { name: string }): ReactNode => {
  return <p>Hello {name}!</p>;
}

// Component with children
const Card = ({ children }: { children?: ReactNode }): ReactNode => {
  return (
    <XmlBlock name="card">
      {children}
    </XmlBlock>
  );
}

// Nested component usage
const Header = (): ReactNode => {
  return (
    <>
      <h1>Header Section</h1>
      <Glenn />
    </>
  );
}

// Runtime function that will be extracted to runtime.js
async function initProject(args: InitArgs): Promise<InitResult> {
  // This function runs in Node.js, not in Claude's context
  const fs = await import('fs/promises');

  try {
    const stat = await fs.stat(args.projectPath);
    if (!stat.isDirectory()) {
      return { success: false, error: 'Path is not a directory' };
    }

    // Read package.json to get project name
    const pkgPath = `${args.projectPath}/package.json`;
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));

    return {
      success: true,
      projectName: pkg.name || 'unknown'
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}

// Wrap for runtime usage
const Init = runtimeFn(initProject);

export default (
  <Command name="test-sub-component" folder="glenn" description="Test runtime features">
    {() => {
      // Declare typed script variable
      const ctx = useRuntimeVar<InitResult>('CTX');

      return (
        <>
          {/* Test 1: Simple component */}
          <Glenn />

          {/* Test 2: Nested components */}
          <Header />

          {/* Test 3: Component with props */}
          <Greeting name="World" />

          {/* Test 4: Component with children */}
          <Card>
            <p>This is card content</p>
          </Card>

          <h2>Runtime Test Command</h2>

          This command demonstrates runtime features:
          - TypeScript runtime functions
          - Typed conditions with RuntimeVar
          - jq-based variable access

          {/* Call runtime function */}
          <Init.Call
            args={{ projectPath: "." }}
            output={ctx}
          />

          {/* Typed conditional based on result */}
          <If condition={ctx.error}>
            <p>Error initializing project</p>
          </If>
          <Else>
            <p>Successfully initialized project</p>
          </Else>
        </>
      );
    }}
  </Command>
);
