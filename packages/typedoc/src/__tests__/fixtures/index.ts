/**
 * Options of a build.
 */
export interface BuildOptions {
  /**
   * The entry module.
   *
   * Relative to the working directory.
   */
  input: string;
  /**
   * Whether to minify the output.
   *
   * @default false
   */
  minify?: boolean;
  /**
   * Where to write the output.
   *
   * @experimental
   */
  output?: { dir: string; format?: 'esm' | 'cjs' };
}

/**
 * Options of a watched build.
 */
export interface WatchOptions extends BuildOptions {
  /** Milliseconds to wait for further changes. */
  delay?: number;
}

/**
 * The events of a {@link Watcher}, with the arguments of their listeners.
 */
export interface WatcherEvents {
  /** A build finished. */
  done: [duration: number];
  /** A build failed. */
  error: [error: Error, details: { file: string }];
}

/**
 * Watches files and rebuilds.
 */
export class Watcher {
  /**
   * Stops watching.
   *
   * @param force Whether to stop running builds too.
   * @returns Whether it was watching.
   */
  close(force?: boolean): boolean {
    return Boolean(force);
  }
}

/**
 * Builds once.
 *
 * @param options The options.
 * @returns The output files.
 * @kind async
 * @example
 * ```js
 * await build({ input: 'main.js' });
 * ```
 */
export function build(options: BuildOptions): Promise<string[]> {
  return Promise.resolve([options.input]);
}

/**
 * Watches and rebuilds.
 *
 * @deprecated Use {@link build} in a loop.
 */
export function watch(options: WatchOptions): Watcher {
  return options && new Watcher();
}

/** The supported formats. */
export type Format = 'esm' | 'cjs';

/** The version. */
export const VERSION: string = '1.0.0';
