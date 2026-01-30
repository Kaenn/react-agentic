/**
 * FileAdapter - JSON file storage for state
 *
 * Features:
 * - Pretty JSON formatting for human readability
 * - Creates file with defaults if missing
 * - Creates parent directories as needed
 * - Last-write-wins concurrency (no locking)
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { StateAdapter, StateConfig, getNestedValue, setNestedValue } from './types.js';

export class FileAdapter<T = unknown> implements StateAdapter<T> {
  private readonly filePath: string;
  private readonly defaults: T;

  constructor(config: StateConfig) {
    this.filePath = config.location;
    this.defaults = config.defaults as T;
  }

  async read(): Promise<T> {
    if (!(await this.exists())) {
      await this.write(this.defaults);
      return this.defaults;
    }
    const content = await fs.readFile(this.filePath, 'utf-8');
    return JSON.parse(content) as T;
  }

  async write(value: T): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const content = JSON.stringify(value, null, 2);
    await fs.writeFile(this.filePath, content, 'utf-8');
  }

  async readField(fieldPath: string): Promise<unknown> {
    const state = await this.read();
    return getNestedValue(state, fieldPath);
  }

  async writeField(fieldPath: string, value: unknown): Promise<void> {
    const state = await this.read() as Record<string, unknown>;
    setNestedValue(state, fieldPath, value);
    await this.write(state as T);
  }

  async merge(partial: Partial<T>): Promise<void> {
    const state = await this.read();
    const merged = { ...state, ...partial };
    await this.write(merged);
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.filePath);
      return true;
    } catch {
      return false;
    }
  }
}
