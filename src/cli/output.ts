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
