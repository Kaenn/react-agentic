/**
 * CLI Output Utilities - Colored terminal output with NO_COLOR support
 */
import pc from 'picocolors';

/**
 * Log successful file processing
 */
export function logSuccess(inputFile: string, outputFile: string): void {
  console.log(`${pc.green('✓')} ${pc.dim(inputFile)} → ${pc.cyan(outputFile)}`);
}

/**
 * Log file processing error
 */
export function logError(inputFile: string, message: string): void {
  console.error(`${pc.red('✗')} ${pc.dim(inputFile)}: ${message}`);
}

/**
 * Log informational message
 */
export function logInfo(message: string): void {
  console.log(pc.dim(message));
}

/**
 * Log build summary
 */
export function logSummary(successCount: number, errorCount: number): void {
  console.log('');
  if (errorCount === 0) {
    console.log(pc.green(`Built ${successCount} file(s) successfully`));
  } else {
    console.log(
      pc.yellow(`Built ${successCount} file(s) with ${pc.red(String(errorCount))} error(s)`)
    );
  }
}

/**
 * Log warning message
 */
export function logWarning(message: string): void {
  console.log(pc.yellow(message));
}

/**
 * Build result for tree output
 */
export interface BuildResult {
  inputFile: string;
  outputPath: string;
  content: string;
  size: number;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Log build tree output (Next.js-style)
 */
export function logBuildTree(results: BuildResult[], dryRun: boolean): void {
  const header = dryRun ? 'Would create:' : 'Output:';
  console.log(pc.bold(header));

  for (const result of results) {
    const sizeStr = formatBytes(result.size).padStart(8);
    console.log(`  ${pc.cyan(result.outputPath)}  ${pc.dim(sizeStr)}`);
  }

  console.log('');
}
