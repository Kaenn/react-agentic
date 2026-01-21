/**
 * File Watcher - Watch for file changes with debouncing
 */
import chokidar from 'chokidar';
import type { FSWatcher } from 'chokidar';

export interface Watcher {
  close(): Promise<void>;
}

export interface WatcherOptions {
  debounceMs?: number;
  onReady?: () => void;
}

/**
 * Create a file watcher with debounced rebuild callback
 *
 * @param files - Array of file paths to watch (use globby to expand first)
 * @param onRebuild - Callback when files change (receives changed file paths)
 * @param options - Configuration options
 */
export function createWatcher(
  files: string[],
  onRebuild: (changedFiles: string[]) => Promise<void>,
  options: WatcherOptions = {}
): Watcher {
  const debounceMs = options.debounceMs ?? 200;

  let timeout: NodeJS.Timeout | null = null;
  let pending: Set<string> = new Set();
  let isRebuilding = false;

  const watcher: FSWatcher = chokidar.watch(files, {
    ignoreInitial: true, // Don't fire on startup - do full build first
    awaitWriteFinish: {
      stabilityThreshold: 100, // Wait for writes to complete
      pollInterval: 50,
    },
  });

  const triggerRebuild = async () => {
    if (isRebuilding) {
      // If already rebuilding, reschedule
      timeout = setTimeout(triggerRebuild, debounceMs);
      return;
    }

    const changedFiles = Array.from(pending);
    pending.clear();

    if (changedFiles.length === 0) return;

    isRebuilding = true;
    try {
      await onRebuild(changedFiles);
    } finally {
      isRebuilding = false;
    }
  };

  watcher.on('all', (event, filePath) => {
    if (event === 'add' || event === 'change' || event === 'unlink') {
      pending.add(filePath);

      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(triggerRebuild, debounceMs);
    }
  });

  if (options.onReady) {
    watcher.on('ready', options.onReady);
  }

  watcher.on('error', (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Watcher error:', message);
  });

  return {
    async close() {
      if (timeout) clearTimeout(timeout);
      await watcher.close();
    },
  };
}
